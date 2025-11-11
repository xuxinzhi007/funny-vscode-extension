/**
 * Error Handler - Centralized error handling and recovery
 * Provides consistent error handling across the extension
 */

const { getLogger } = require('./logger');

const ERROR_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

class ErrorHandler {
  constructor() {
    this.logger = getLogger().child('ErrorHandler');
    this.errorCallbacks = [];
  }

  /**
   * Handle an error
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @param {string} context.module - Module where error occurred
   * @param {string} context.operation - Operation that failed
   * @param {any} [context.data] - Additional context data
   */
  handle(error, context = {}) {
    const severity = this.determineSeverity(error, context);
    
    // Log the error
    this.logger.error(error, {
      severity,
      module: context.module,
      operation: context.operation,
      data: context.data
    });

    // Take action based on severity
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        this.handleCritical(error, context);
        break;
      case ERROR_SEVERITY.WARNING:
        this.handleWarning(error, context);
        break;
      case ERROR_SEVERITY.INFO:
        this.handleInfo(error, context);
        break;
    }

    // Notify error callbacks
    this.notifyCallbacks(error, context, severity);
  }

  /**
   * Determine error severity
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {string} Severity level
   */
  determineSeverity(error, context) {
    // Critical errors
    if (context.module === 'storage' || context.module === 'gameState') {
      return ERROR_SEVERITY.CRITICAL;
    }

    // Check error message for critical keywords
    const message = error.message.toLowerCase();
    if (message.includes('corrupt') || message.includes('fatal')) {
      return ERROR_SEVERITY.CRITICAL;
    }

    // UI and feature errors are warnings
    if (context.module === 'ui' || context.module === 'feature') {
      return ERROR_SEVERITY.WARNING;
    }

    // Default to info
    return ERROR_SEVERITY.INFO;
  }

  /**
   * Handle critical errors
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  handleCritical(error, context) {
    this.logger.error('CRITICAL ERROR', {
      error: error.message,
      context
    });

    // Show error message to user
    const vscode = require('vscode');
    vscode.window.showErrorMessage(
      `Critical error in ${context.module || 'extension'}: ${error.message}`,
      'View Logs'
    ).then(selection => {
      if (selection === 'View Logs') {
        this.showErrorLogs();
      }
    });
  }

  /**
   * Handle warning errors
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  handleWarning(error, context) {
    this.logger.warn('Warning', {
      error: error.message,
      context
    });

    // Optionally show warning to user
    if (context.showToUser) {
      const vscode = require('vscode');
      vscode.window.showWarningMessage(
        `${context.module || 'Extension'}: ${error.message}`
      );
    }
  }

  /**
   * Handle info-level errors
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  handleInfo(error, context) {
    this.logger.info('Handled error', {
      error: error.message,
      context
    });
  }

  /**
   * Wrap an async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {Object} context - Error context
   * @returns {Function} Wrapped function
   */
  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        return null;
      }
    };
  }

  /**
   * Wrap a sync function with error handling
   * @param {Function} fn - Function to wrap
   * @param {Object} context - Error context
   * @returns {Function} Wrapped function
   */
  wrapSync(fn, context = {}) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handle(error, context);
        return null;
      }
    };
  }

  /**
   * Try to execute a function with error handling
   * @param {Function} fn - Function to execute
   * @param {Object} context - Error context
   * @param {any} [defaultValue] - Default value to return on error
   * @returns {any} Function result or default value
   */
  try(fn, context = {}, defaultValue = null) {
    try {
      return fn();
    } catch (error) {
      this.handle(error, context);
      return defaultValue;
    }
  }

  /**
   * Try to execute an async function with error handling
   * @param {Function} fn - Async function to execute
   * @param {Object} context - Error context
   * @param {any} [defaultValue] - Default value to return on error
   * @returns {Promise<any>} Function result or default value
   */
  async tryAsync(fn, context = {}, defaultValue = null) {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return defaultValue;
    }
  }

  /**
   * Register an error callback
   * @param {Function} callback - Callback function (error, context, severity) => void
   */
  onError(callback) {
    if (typeof callback === 'function') {
      this.errorCallbacks.push(callback);
    }
  }

  /**
   * Notify all error callbacks
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @param {string} severity - Error severity
   */
  notifyCallbacks(error, context, severity) {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error, context, severity);
      } catch (err) {
        this.logger.error('Error in error callback', err);
      }
    });
  }

  /**
   * Show error logs to user
   */
  showErrorLogs() {
    const logs = this.logger.getRecentLogs(50);
    const errorLogs = logs.filter(log => log.level === 'ERROR' || log.level === 'WARN');
    
    const vscode = require('vscode');
    const outputChannel = vscode.window.createOutputChannel('Coding Idle Game - Errors');
    
    errorLogs.forEach(log => {
      outputChannel.appendLine(`[${log.timestamp}] [${log.level}] ${log.message}`);
      if (log.data) {
        outputChannel.appendLine(JSON.stringify(log.data, null, 2));
      }
    });
    
    outputChannel.show();
  }

  /**
   * Create a scoped error handler
   * @param {string} module - Module name
   * @returns {Object} Scoped error handler methods
   */
  scope(module) {
    return {
      handle: (error, context = {}) => {
        this.handle(error, { ...context, module });
      },
      wrap: (fn, context = {}) => {
        return this.wrap(fn, { ...context, module });
      },
      wrapSync: (fn, context = {}) => {
        return this.wrapSync(fn, { ...context, module });
      },
      try: (fn, context = {}, defaultValue = null) => {
        return this.try(fn, { ...context, module }, defaultValue);
      },
      tryAsync: (fn, context = {}, defaultValue = null) => {
        return this.tryAsync(fn, { ...context, module }, defaultValue);
      }
    };
  }
}

// Create singleton instance
let errorHandlerInstance = null;

/**
 * Get the global error handler instance
 * @returns {ErrorHandler}
 */
function getErrorHandler() {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler();
  }
  return errorHandlerInstance;
}

module.exports = {
  ErrorHandler,
  getErrorHandler,
  ERROR_SEVERITY
};
