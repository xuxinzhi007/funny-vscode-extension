/**
 * Code Statistics Tracker - Track coding activity and provide insights
 * Monitors code changes, file modifications, and provides rewards
 */

const vscode = require('vscode');
const { getEventBus } = require('../core/eventBus');
const { getResourceManager } = require('../core/resourceManager');
const { getLogger } = require('../utils/logger');

class CodeStatistics {
  constructor(gameState, storage) {
    this.gameState = gameState;
    this.storage = storage;
    this.eventBus = getEventBus();
    this.resourceManager = getResourceManager();
    this.logger = getLogger().child('CodeStatistics');

    // Current session stats
    this.sessionStats = {
      linesAdded: 0,
      linesDeleted: 0,
      filesModified: new Set(),
      saveCount: 0,
      sessionStart: Date.now(),
      coinsEarned: 0
    };

    // File tracking
    this.fileStats = new Map();

    // Listeners
    this.textChangeListener = null;
    this.saveListener = null;

    this.logger.info('Code statistics tracker initialized');
  }

  /**
   * Initialize tracking listeners
   */
  initialize() {
    // Listen to text document changes
    this.textChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
      this.handleTextChange(event);
    });

    // Listen to document saves
    this.saveListener = vscode.workspace.onDidSaveTextDocument(document => {
      this.handleDocumentSave(document);
    });

    // Register listeners with resource manager
    this.resourceManager.registerListener(
      'code-stats-text-change',
      () => this.textChangeListener.dispose(),
      'Code statistics text change listener'
    );

    this.resourceManager.registerListener(
      'code-stats-save',
      () => this.saveListener.dispose(),
      'Code statistics save listener'
    );

    this.logger.info('Code statistics tracking started');
  }

  /**
   * Handle text document changes
   * @param {vscode.TextDocumentChangeEvent} event
   */
  handleTextChange(event) {
    if (!event.contentChanges.length) return;
    if (!event.document.uri.fsPath) return;

    // Skip non-code files
    if (this.isNonCodeFile(event.document)) return;

    const filePath = event.document.uri.fsPath;

    // Track file modification
    this.sessionStats.filesModified.add(filePath);

    // Count line changes
    event.contentChanges.forEach(change => {
      const linesAdded = this.countLines(change.text);
      const linesDeleted = change.range.end.line - change.range.start.line;

      if (linesAdded > 0) {
        this.sessionStats.linesAdded += linesAdded;
        this.updateFileStats(filePath, linesAdded, 0);
      }

      if (linesDeleted > 0) {
        this.sessionStats.linesDeleted += linesDeleted;
        this.updateFileStats(filePath, 0, linesDeleted);
      }
    });

    // Check for milestone rewards
    this.checkMilestones();

    // Emit event
    this.eventBus.emit('code:changed', {
      linesAdded: this.sessionStats.linesAdded,
      linesDeleted: this.sessionStats.linesDeleted,
      filesModified: this.sessionStats.filesModified.size
    });
  }

  /**
   * Handle document save
   * @param {vscode.TextDocument} document
   */
  handleDocumentSave(document) {
    if (this.isNonCodeFile(document)) return;

    this.sessionStats.saveCount++;

    // Update file stats
    const filePath = document.uri.fsPath;
    const fileData = this.fileStats.get(filePath);
    if (fileData) {
      fileData.lastModified = Date.now();
    }

    // Check for save milestones
    if (this.sessionStats.saveCount % 10 === 0) {
      this.grantReward(5, `完成 ${this.sessionStats.saveCount} 次保存`);
    }

    this.eventBus.emit('code:saved', {
      saveCount: this.sessionStats.saveCount,
      filePath
    });
  }

  /**
   * Update file statistics
   * @param {string} filePath
   * @param {number} linesAdded
   * @param {number} linesDeleted
   */
  updateFileStats(filePath, linesAdded, linesDeleted) {
    if (!this.fileStats.has(filePath)) {
      this.fileStats.set(filePath, {
        path: filePath,
        editCount: 0,
        linesAdded: 0,
        linesDeleted: 0,
        lastModified: Date.now()
      });
    }

    const fileData = this.fileStats.get(filePath);
    fileData.editCount++;
    fileData.linesAdded += linesAdded;
    fileData.linesDeleted += linesDeleted;
    fileData.lastModified = Date.now();
  }

  /**
   * Check for milestone rewards
   */
  checkMilestones() {
    const netLines = this.sessionStats.linesAdded - this.sessionStats.linesDeleted;

    // Every 100 lines
    if (netLines > 0 && netLines % 100 === 0) {
      const milestone = Math.floor(netLines / 100);
      const lastMilestone = Math.floor((netLines - 1) / 100);
      
      if (milestone > lastMilestone) {
        this.grantReward(10, `编写了 ${netLines} 行代码`);
      }
    }
  }

  /**
   * Grant reward
   * @param {number} amount
   * @param {string} reason
   */
  grantReward(amount, reason) {
    if (this.gameState) {
      this.gameState.coins += amount;
      this.gameState.totalCoinsEarned += amount;
      this.sessionStats.coinsEarned += amount;
    }

    this.eventBus.emit('coins:earned', {
      amount,
      source: 'coding',
      reason
    });

    this.logger.info(`Granted ${amount} coins: ${reason}`);
  }

  /**
   * Count lines in text
   * @param {string} text
   * @returns {number}
   */
  countLines(text) {
    if (!text) return 0;
    // Count newlines + 1 for the last line if text doesn't end with newline
    const lines = text.split('\n').length;
    return text.endsWith('\n') ? lines - 1 : lines;
  }

  /**
   * Check if file should be excluded from tracking
   * @param {vscode.TextDocument} document
   * @returns {boolean}
   */
  isNonCodeFile(document) {
    const scheme = document.uri.scheme;
    const fileName = document.fileName || '';

    // Skip non-file schemes
    if (scheme !== 'file' && scheme !== 'untitled') {
      return true;
    }

    // Skip certain file types
    const excludedExtensions = ['.log', '.txt', '.md', '.json', '.xml'];
    const hasExcludedExt = excludedExtensions.some(ext => fileName.endsWith(ext));

    return hasExcludedExt;
  }

  /**
   * Get current session statistics
   * @returns {Object}
   */
  getSessionStats() {
    const duration = Math.floor((Date.now() - this.sessionStats.sessionStart) / 1000);
    const netLines = this.sessionStats.linesAdded - this.sessionStats.linesDeleted;

    return {
      linesAdded: this.sessionStats.linesAdded,
      linesDeleted: this.sessionStats.linesDeleted,
      netLines,
      filesModified: this.sessionStats.filesModified.size,
      saveCount: this.sessionStats.saveCount,
      sessionDuration: duration,
      coinsEarned: this.sessionStats.coinsEarned
    };
  }

  /**
   * Get daily statistics
   * @returns {Object}
   */
  getDailyStats() {
    if (!this.gameState.statistics || !this.gameState.statistics.today) {
      return this.getSessionStats();
    }

    return this.gameState.statistics.today;
  }

  /**
   * Get top edited files
   * @param {number} limit
   * @returns {Array}
   */
  getTopFiles(limit = 10) {
    const files = Array.from(this.fileStats.values());
    
    // Sort by edit count
    files.sort((a, b) => b.editCount - a.editCount);

    return files.slice(0, limit).map(file => ({
      path: this.getRelativePath(file.path),
      editCount: file.editCount,
      linesChanged: file.linesAdded + file.linesDeleted,
      lastModified: file.lastModified
    }));
  }

  /**
   * Get relative path for display
   * @param {string} fullPath
   * @returns {string}
   */
  getRelativePath(fullPath) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || !workspaceFolders.length) {
      return fullPath;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    if (fullPath.startsWith(workspaceRoot)) {
      return fullPath.substring(workspaceRoot.length + 1);
    }

    return fullPath;
  }

  /**
   * Reset daily statistics (called at midnight)
   */
  resetDaily() {
    // Save current session to history
    if (this.gameState.statistics) {
      const today = new Date().toISOString().split('T')[0];
      const dailyStats = {
        date: today,
        ...this.getSessionStats()
      };

      // Add to history
      if (!this.gameState.statistics.history) {
        this.gameState.statistics.history = [];
      }
      this.gameState.statistics.history.push(dailyStats);

      // Keep only last 30 days
      if (this.gameState.statistics.history.length > 30) {
        this.gameState.statistics.history.shift();
      }
    }

    // Reset session stats
    this.sessionStats = {
      linesAdded: 0,
      linesDeleted: 0,
      filesModified: new Set(),
      saveCount: 0,
      sessionStart: Date.now(),
      coinsEarned: 0
    };

    this.logger.info('Daily statistics reset');
    this.eventBus.emit('statistics:dailyReset');
  }

  /**
   * Load state from saved data
   * @param {Object} savedState
   */
  loadState(savedState) {
    if (!savedState) return;

    // Load session stats if from today
    const today = new Date().toISOString().split('T')[0];
    if (savedState.today && savedState.today.date === today) {
      this.sessionStats.linesAdded = savedState.today.linesAdded || 0;
      this.sessionStats.linesDeleted = savedState.today.linesDeleted || 0;
      this.sessionStats.saveCount = savedState.today.saveCount || 0;
      this.sessionStats.coinsEarned = savedState.today.coinsEarned || 0;
    }

    this.logger.info('Statistics state loaded');
  }

  /**
   * Dispose and cleanup
   */
  dispose() {
    this.resourceManager.unregisterListener('code-stats-text-change');
    this.resourceManager.unregisterListener('code-stats-save');
    this.logger.info('Code statistics tracker disposed');
  }
}

// Create singleton instance
let codeStatisticsInstance = null;

/**
 * Get the global code statistics instance
 * @param {Object} [gameState] - Game state object
 * @param {Object} [storage] - Storage object
 * @returns {CodeStatistics}
 */
function getCodeStatistics(gameState, storage) {
  if (!codeStatisticsInstance && gameState) {
    codeStatisticsInstance = new CodeStatistics(gameState, storage);
  }
  return codeStatisticsInstance;
}

module.exports = {
  CodeStatistics,
  getCodeStatistics
};
