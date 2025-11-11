/**
 * Logger - Structured logging utility
 * Provides consistent logging across the extension
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(context = 'Extension') {
    this.context = context;
    this.level = LOG_LEVELS.INFO;
    this.logs = [];
    this.maxLogs = 1000;
  }

  /**
   * Set the logging level
   * @param {string} level - 'DEBUG', 'INFO', 'WARN', or 'ERROR'
   */
  setLevel(level) {
    const upperLevel = level.toUpperCase();
    if (LOG_LEVELS[upperLevel] !== undefined) {
      this.level = LOG_LEVELS[upperLevel];
    }
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {any} [data] - Additional data
   */
  debug(message, data) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {any} [data] - Additional data
   */
  info(message, data) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {any} [data] - Additional data
   */
  warn(message, data) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  /**
   * Log an error message
   * @param {Error|string} error - Error object or message
   * @param {any} [context] - Additional context
   */
  error(error, context) {
    const message = error instanceof Error ? error.message : error;
    const data = {
      context,
      stack: error instanceof Error ? error.stack : undefined
    };
    this.log(LOG_LEVELS.ERROR, message, data);
  }

  /**
   * Internal log method
   * @param {number} level - Log level
   * @param {string} message - Log message
   * @param {any} [data] - Additional data
   */
  log(level, message, data) {
    if (level < this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    
    const logEntry = {
      timestamp,
      level: levelName,
      context: this.context,
      message,
      data
    };

    // Store in memory
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console
    const prefix = `[${timestamp}] [${this.context}] [${levelName}]`;
    
    switch (level) {
      case LOG_LEVELS.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LOG_LEVELS.INFO:
        console.log(prefix, message, data || '');
        break;
      case LOG_LEVELS.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LOG_LEVELS.ERROR:
        console.error(prefix, message, data || '');
        break;
    }
  }

  /**
   * Get recent logs
   * @param {number} [count=100] - Number of logs to retrieve
   * @returns {Array} Array of log entries
   */
  getRecentLogs(count = 100) {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
  }

  /**
   * Create a child logger with a specific context
   * @param {string} context - Context name
   * @returns {Logger} New logger instance
   */
  child(context) {
    const childLogger = new Logger(`${this.context}:${context}`);
    childLogger.level = this.level;
    return childLogger;
  }
}

// Create default logger instance
let defaultLogger = null;

/**
 * Get the default logger instance
 * @returns {Logger}
 */
function getLogger() {
  if (!defaultLogger) {
    defaultLogger = new Logger('CodingIdleGame');
  }
  return defaultLogger;
}

/**
 * Create a logger with a specific context
 * @param {string} context - Context name
 * @returns {Logger}
 */
function createLogger(context) {
  return new Logger(context);
}

module.exports = {
  Logger,
  getLogger,
  createLogger,
  LOG_LEVELS
};
