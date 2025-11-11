/**
 * Pomodoro Timer - Time management system with game integration
 * Implements the Pomodoro Technique with rewards
 */

const { getEventBus } = require('../core/eventBus');
const { getResourceManager } = require('../core/resourceManager');
const { getLogger } = require('../utils/logger');
const { formatTime } = require('../utils/formatters');

// Session types
const SESSION_TYPE = {
  WORK: 'work',
  BREAK: 'break',
  LONG_BREAK: 'longBreak'
};

// Session states
const SESSION_STATE = {
  IDLE: 'idle',
  ACTIVE: 'active',
  PAUSED: 'paused'
};

class PomodoroTimer {
  constructor(gameState) {
    this.gameState = gameState;
    this.eventBus = getEventBus();
    this.resourceManager = getResourceManager();
    this.logger = getLogger().child('PomodoroTimer');

    // Initialize state
    this.state = SESSION_STATE.IDLE;
    this.sessionType = SESSION_TYPE.WORK;
    this.remainingSeconds = 0;
    this.totalSeconds = 0;
    this.timerId = null;

    // Statistics
    this.completedSessions = 0;
    this.completedToday = 0;
    this.currentStreak = 0;
    this.longestStreak = 0;

    // Configuration (default values, can be overridden)
    this.config = {
      workDuration: 25,        // minutes
      breakDuration: 5,        // minutes
      longBreakDuration: 15,   // minutes
      sessionsUntilLongBreak: 4
    };

    this.logger.info('Pomodoro timer initialized');
  }

  /**
   * Update configuration
   * @param {Object} config - Configuration object
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    this.logger.info('Configuration updated', this.config);
  }

  /**
   * Start a work session
   * @param {number} [duration] - Duration in minutes (optional)
   */
  startWork(duration) {
    if (this.state === SESSION_STATE.ACTIVE) {
      this.logger.warn('Session already active');
      return false;
    }

    const minutes = duration || this.config.workDuration;
    this.sessionType = SESSION_TYPE.WORK;
    this.totalSeconds = minutes * 60;
    this.remainingSeconds = this.totalSeconds;
    this.state = SESSION_STATE.ACTIVE;

    this.startTimer();

    this.logger.info(`Work session started: ${minutes} minutes`);
    this.eventBus.emit('pomodoro:started', {
      type: this.sessionType,
      duration: minutes
    });

    return true;
  }

  /**
   * Start a break session
   * @param {boolean} [isLongBreak] - Whether this is a long break
   */
  startBreak(isLongBreak = false) {
    if (this.state === SESSION_STATE.ACTIVE) {
      this.logger.warn('Session already active');
      return false;
    }

    const minutes = isLongBreak 
      ? this.config.longBreakDuration 
      : this.config.breakDuration;
    
    this.sessionType = isLongBreak ? SESSION_TYPE.LONG_BREAK : SESSION_TYPE.BREAK;
    this.totalSeconds = minutes * 60;
    this.remainingSeconds = this.totalSeconds;
    this.state = SESSION_STATE.ACTIVE;

    this.startTimer();

    this.logger.info(`Break session started: ${minutes} minutes (${isLongBreak ? 'long' : 'short'})`);
    this.eventBus.emit('pomodoro:started', {
      type: this.sessionType,
      duration: minutes
    });

    return true;
  }

  /**
   * Pause the current session
   */
  pause() {
    if (this.state !== SESSION_STATE.ACTIVE) {
      this.logger.warn('No active session to pause');
      return false;
    }

    this.state = SESSION_STATE.PAUSED;
    this.stopTimer();

    this.logger.info('Session paused');
    this.eventBus.emit('pomodoro:paused', {
      type: this.sessionType,
      remaining: this.remainingSeconds
    });

    return true;
  }

  /**
   * Resume the paused session
   */
  resume() {
    if (this.state !== SESSION_STATE.PAUSED) {
      this.logger.warn('No paused session to resume');
      return false;
    }

    this.state = SESSION_STATE.ACTIVE;
    this.startTimer();

    this.logger.info('Session resumed');
    this.eventBus.emit('pomodoro:resumed', {
      type: this.sessionType,
      remaining: this.remainingSeconds
    });

    return true;
  }

  /**
   * Stop the current session
   */
  stop() {
    if (this.state === SESSION_STATE.IDLE) {
      this.logger.warn('No session to stop');
      return false;
    }

    const wasActive = this.state === SESSION_STATE.ACTIVE;
    this.state = SESSION_STATE.IDLE;
    this.stopTimer();
    this.remainingSeconds = 0;

    this.logger.info('Session stopped');
    this.eventBus.emit('pomodoro:stopped', {
      type: this.sessionType,
      wasActive
    });

    return true;
  }

  /**
   * Start the countdown timer
   */
  startTimer() {
    // Clear existing timer if any
    this.stopTimer();

    // Register timer with resource manager
    this.timerId = this.resourceManager.registerTimer(
      () => this.tick(),
      1000,
      true,
      'Pomodoro countdown'
    );
  }

  /**
   * Stop the countdown timer
   */
  stopTimer() {
    if (this.timerId !== null) {
      this.resourceManager.clearTimer(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Timer tick - called every second
   */
  tick() {
    if (this.state !== SESSION_STATE.ACTIVE) {
      return;
    }

    this.remainingSeconds--;

    // Emit tick event
    this.eventBus.emit('pomodoro:tick', {
      type: this.sessionType,
      remaining: this.remainingSeconds,
      total: this.totalSeconds
    });

    // Check if session completed
    if (this.remainingSeconds <= 0) {
      this.completeSession();
    }
  }

  /**
   * Complete the current session
   */
  completeSession() {
    const sessionType = this.sessionType;
    this.state = SESSION_STATE.IDLE;
    this.stopTimer();

    if (sessionType === SESSION_TYPE.WORK) {
      // Work session completed
      this.completedSessions++;
      this.completedToday++;
      this.currentStreak++;

      if (this.currentStreak > this.longestStreak) {
        this.longestStreak = this.currentStreak;
      }

      // Grant rewards
      this.grantRewards();

      // Update game state
      if (this.gameState.pomodoro) {
        this.gameState.pomodoro.completedToday = this.completedToday;
        this.gameState.pomodoro.completedTotal = this.completedSessions;
        this.gameState.pomodoro.currentStreak = this.currentStreak;
        this.gameState.pomodoro.longestStreak = this.longestStreak;
        this.gameState.pomodoro.lastSessionDate = new Date().toISOString().split('T')[0];
      }

      this.logger.info(`Work session completed (${this.completedSessions} total, ${this.completedToday} today)`);
    } else {
      // Break completed
      this.logger.info(`Break session completed`);
    }

    this.eventBus.emit('pomodoro:completed', {
      type: sessionType,
      completedSessions: this.completedSessions,
      completedToday: this.completedToday
    });
  }

  /**
   * Grant rewards for completing a work session
   */
  grantRewards() {
    const baseReward = 50;
    let totalReward = baseReward;

    // Bonus for completing 4 sessions (one full cycle)
    if (this.completedSessions % this.config.sessionsUntilLongBreak === 0) {
      totalReward += 200;
      this.logger.info('Bonus reward for completing full Pomodoro cycle!');
    }

    // Grant coins
    if (this.gameState) {
      this.gameState.coins += totalReward;
      this.gameState.totalCoinsEarned += totalReward;
    }

    this.eventBus.emit('coins:earned', {
      amount: totalReward,
      source: 'pomodoro',
      session: this.completedSessions
    });

    this.logger.info(`Granted ${totalReward} coins for Pomodoro completion`);
  }

  /**
   * Get current session state
   * @returns {Object} Current state
   */
  getState() {
    return {
      isActive: this.state === SESSION_STATE.ACTIVE,
      isPaused: this.state === SESSION_STATE.PAUSED,
      sessionType: this.sessionType,
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      completedSessions: this.completedSessions,
      completedToday: this.completedToday,
      currentStreak: this.currentStreak,
      progress: this.totalSeconds > 0 
        ? ((this.totalSeconds - this.remainingSeconds) / this.totalSeconds) * 100 
        : 0
    };
  }

  /**
   * Get session statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      todayCompleted: this.completedToday,
      totalCompleted: this.completedSessions,
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      nextLongBreak: this.config.sessionsUntilLongBreak - (this.completedSessions % this.config.sessionsUntilLongBreak)
    };
  }

  /**
   * Get formatted time remaining
   * @returns {string} Formatted time (e.g., "25:00")
   */
  getFormattedTime() {
    return formatTime(this.remainingSeconds, true);
  }

  /**
   * Check if it's time for a long break
   * @returns {boolean}
   */
  isLongBreakTime() {
    return this.completedSessions > 0 && 
           this.completedSessions % this.config.sessionsUntilLongBreak === 0;
  }

  /**
   * Reset daily statistics (called at midnight)
   */
  resetDaily() {
    this.completedToday = 0;
    this.logger.info('Daily statistics reset');
    this.eventBus.emit('pomodoro:dailyReset');
  }

  /**
   * Load state from saved data
   * @param {Object} savedState - Saved state object
   */
  loadState(savedState) {
    if (!savedState) return;

    this.completedSessions = savedState.completedTotal || 0;
    this.completedToday = savedState.completedToday || 0;
    this.currentStreak = savedState.currentStreak || 0;
    this.longestStreak = savedState.longestStreak || 0;

    // Check if we need to reset daily stats
    const today = new Date().toISOString().split('T')[0];
    if (savedState.lastSessionDate !== today) {
      this.resetDaily();
    }

    this.logger.info('State loaded from save data');
  }

  /**
   * Dispose and cleanup
   */
  dispose() {
    this.stop();
    this.logger.info('Pomodoro timer disposed');
  }
}

// Create singleton instance
let pomodoroTimerInstance = null;

/**
 * Get the global Pomodoro timer instance
 * @param {Object} [gameState] - Game state object (required for first call)
 * @returns {PomodoroTimer}
 */
function getPomodoroTimer(gameState) {
  if (!pomodoroTimerInstance && gameState) {
    pomodoroTimerInstance = new PomodoroTimer(gameState);
  }
  return pomodoroTimerInstance;
}

module.exports = {
  PomodoroTimer,
  getPomodoroTimer,
  SESSION_TYPE,
  SESSION_STATE
};
