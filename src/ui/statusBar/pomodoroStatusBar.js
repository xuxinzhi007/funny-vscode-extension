/**
 * Pomodoro Status Bar - Display Pomodoro timer in status bar
 */

const vscode = require('vscode');
const { getEventBus } = require('../../core/eventBus');
const { getLogger } = require('../../utils/logger');

let statusBarItem = null;
let pomodoroTimer = null;

/**
 * Create and initialize Pomodoro status bar
 * @param {PomodoroTimer} timer - Pomodoro timer instance
 * @returns {vscode.StatusBarItem}
 */
function createPomodoroStatusBar(timer) {
  const logger = getLogger().child('PomodoroStatusBar');
  const eventBus = getEventBus();

  pomodoroTimer = timer;

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );

  statusBarItem.command = 'funny-vscode-extension.togglePomodoro';
  statusBarItem.tooltip = '点击开始/暂停番茄钟';

  // Initial update
  updatePomodoroStatusBar();

  // Listen to Pomodoro events
  eventBus.on('pomodoro:started', () => {
    updatePomodoroStatusBar();
    logger.info('Status bar updated: session started');
  });

  eventBus.on('pomodoro:tick', () => {
    updatePomodoroStatusBar();
  });

  eventBus.on('pomodoro:paused', () => {
    updatePomodoroStatusBar();
    logger.info('Status bar updated: session paused');
  });

  eventBus.on('pomodoro:resumed', () => {
    updatePomodoroStatusBar();
    logger.info('Status bar updated: session resumed');
  });

  eventBus.on('pomodoro:stopped', () => {
    updatePomodoroStatusBar();
    logger.info('Status bar updated: session stopped');
  });

  eventBus.on('pomodoro:completed', () => {
    updatePomodoroStatusBar();
    logger.info('Status bar updated: session completed');
  });

  statusBarItem.show();
  logger.info('Pomodoro status bar created');

  return statusBarItem;
}

/**
 * Update Pomodoro status bar display
 */
function updatePomodoroStatusBar() {
  if (!statusBarItem || !pomodoroTimer) {
    return;
  }

  const state = pomodoroTimer.getState();

  if (state.isActive) {
    // Active session
    const icon = state.sessionType === 'work' ? '🍅' : '☕';
    const time = pomodoroTimer.getFormattedTime();
    statusBarItem.text = `${icon} ${time}`;
    statusBarItem.tooltip = `番茄钟进行中 (${state.sessionType === 'work' ? '工作' : '休息'}) - 点击暂停`;
  } else if (state.isPaused) {
    // Paused session
    const icon = state.sessionType === 'work' ? '🍅' : '☕';
    const time = pomodoroTimer.getFormattedTime();
    statusBarItem.text = `${icon} ${time} ⏸️`;
    statusBarItem.tooltip = '番茄钟已暂停 - 点击继续';
  } else {
    // Idle
    const stats = pomodoroTimer.getStats();
    statusBarItem.text = `🍅 ${stats.todayCompleted}/${stats.totalCompleted}`;
    statusBarItem.tooltip = `今日完成 ${stats.todayCompleted} 个番茄钟 - 点击开始`;
  }
}

/**
 * Get status bar item
 * @returns {vscode.StatusBarItem}
 */
function getPomodoroStatusBar() {
  return statusBarItem;
}

/**
 * Dispose status bar
 */
function disposePomodoroStatusBar() {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = null;
  }
}

module.exports = {
  createPomodoroStatusBar,
  updatePomodoroStatusBar,
  getPomodoroStatusBar,
  disposePomodoroStatusBar
};
