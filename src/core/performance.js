/**
 * Performance Monitor - Track extension performance metrics
 * Helps identify performance issues and resource usage
 */

const { getResourceManager } = require('./resourceManager');
const { getEventBus } = require('./eventBus');

class PerformanceMonitor {
  constructor() {
    this.resourceManager = getResourceManager();
    this.eventBus = getEventBus();
    this.metrics = {
      memoryUsage: 0,
      activeTimers: 0,
      activeListeners: 0,
      webviewActive: false,
      lastUpdateTime: 0,
      updateDurations: [],
      maxUpdateDurations: 100 // Keep last 100 measurements
    };
    this.thresholds = {
      memoryWarning: 50 * 1024 * 1024,    // 50MB
      memoryCritical: 100 * 1024 * 1024,  // 100MB
      timerWarning: 10,
      updateDurationWarning: 100 // ms
    };
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   * @param {number} [interval=5000] - Monitoring interval in milliseconds
   */
  start(interval = 5000) {
    if (this.isMonitoring) {
      console.log('[PerformanceMonitor] Already monitoring');
      return;
    }

    console.log('[PerformanceMonitor] Starting performance monitoring');
    this.isMonitoring = true;

    // Initial measurement
    this.updateMetrics();

    // Register monitoring interval
    this.monitoringInterval = this.resourceManager.registerTimer(
      () => this.updateMetrics(),
      interval,
      true,
      'Performance monitoring'
    );

    this.eventBus.emit('performance:monitoringStarted');
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[PerformanceMonitor] Stopping performance monitoring');
    
    if (this.monitoringInterval !== null) {
      this.resourceManager.clearTimer(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.eventBus.emit('performance:monitoringStopped');
  }

  /**
   * Update performance metrics
   */
  updateMetrics() {
    const startTime = Date.now();

    // Get memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage = memUsage.heapUsed;
    }

    // Get resource counts
    const resourceStats = this.resourceManager.getStats();
    this.metrics.activeTimers = resourceStats.timers;
    this.metrics.activeListeners = resourceStats.listeners;

    // Record update time
    this.metrics.lastUpdateTime = Date.now();

    // Calculate update duration
    const duration = Date.now() - startTime;
    this.metrics.updateDurations.push(duration);
    
    // Keep only recent measurements
    if (this.metrics.updateDurations.length > this.metrics.maxUpdateDurations) {
      this.metrics.updateDurations.shift();
    }

    // Check for performance issues
    this.checkPerformance();
  }

  /**
   * Check for performance issues and emit warnings
   */
  checkPerformance() {
    const issues = [];

    // Check memory usage
    if (this.metrics.memoryUsage > this.thresholds.memoryCritical) {
      issues.push({
        type: 'memory',
        severity: 'critical',
        message: `Memory usage is critical: ${this.formatBytes(this.metrics.memoryUsage)}`,
        value: this.metrics.memoryUsage
      });
    } else if (this.metrics.memoryUsage > this.thresholds.memoryWarning) {
      issues.push({
        type: 'memory',
        severity: 'warning',
        message: `Memory usage is high: ${this.formatBytes(this.metrics.memoryUsage)}`,
        value: this.metrics.memoryUsage
      });
    }

    // Check timer count
    if (this.metrics.activeTimers > this.thresholds.timerWarning) {
      issues.push({
        type: 'timers',
        severity: 'warning',
        message: `Too many active timers: ${this.metrics.activeTimers}`,
        value: this.metrics.activeTimers
      });
    }

    // Check update duration
    const avgDuration = this.getAverageUpdateDuration();
    if (avgDuration > this.thresholds.updateDurationWarning) {
      issues.push({
        type: 'updateDuration',
        severity: 'warning',
        message: `Update loop is slow: ${avgDuration.toFixed(2)}ms average`,
        value: avgDuration
      });
    }

    // Emit warnings
    if (issues.length > 0) {
      this.eventBus.emit('performance:issues', issues);
    }
  }

  /**
   * Get current performance metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      memoryUsage: this.metrics.memoryUsage,
      memoryUsageMB: this.metrics.memoryUsage / (1024 * 1024),
      activeTimers: this.metrics.activeTimers,
      activeListeners: this.metrics.activeListeners,
      webviewActive: this.metrics.webviewActive,
      lastUpdateTime: this.metrics.lastUpdateTime,
      averageUpdateDuration: this.getAverageUpdateDuration()
    };
  }

  /**
   * Check if performance is degraded
   * @returns {boolean}
   */
  isPerformanceDegraded() {
    return (
      this.metrics.memoryUsage > this.thresholds.memoryWarning ||
      this.metrics.activeTimers > this.thresholds.timerWarning ||
      this.getAverageUpdateDuration() > this.thresholds.updateDurationWarning
    );
  }

  /**
   * Get performance recommendations
   * @returns {string[]} Array of recommendations
   */
  getRecommendations() {
    const recommendations = [];

    if (this.metrics.memoryUsage > this.thresholds.memoryWarning) {
      recommendations.push('Consider enabling Performance Mode to reduce memory usage');
      recommendations.push('Disable visual effects if not needed');
    }

    if (this.metrics.activeTimers > this.thresholds.timerWarning) {
      recommendations.push('Too many active timers detected - check for timer leaks');
      recommendations.push('Consider consolidating timers into a single update loop');
    }

    const avgDuration = this.getAverageUpdateDuration();
    if (avgDuration > this.thresholds.updateDurationWarning) {
      recommendations.push('Update loop is slow - optimize update logic');
      recommendations.push('Consider reducing update frequency');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is good!');
    }

    return recommendations;
  }

  /**
   * Set webview active state
   * @param {boolean} active - Whether webview is active
   */
  setWebviewActive(active) {
    this.metrics.webviewActive = active;
  }

  /**
   * Record an update duration
   * @param {number} duration - Duration in milliseconds
   */
  recordUpdateDuration(duration) {
    this.metrics.updateDurations.push(duration);
    
    if (this.metrics.updateDurations.length > this.metrics.maxUpdateDurations) {
      this.metrics.updateDurations.shift();
    }
  }

  /**
   * Get average update duration
   * @returns {number} Average duration in milliseconds
   */
  getAverageUpdateDuration() {
    if (this.metrics.updateDurations.length === 0) {
      return 0;
    }

    const sum = this.metrics.updateDurations.reduce((a, b) => a + b, 0);
    return sum / this.metrics.updateDurations.length;
  }

  /**
   * Format bytes to human-readable string
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get performance report
   * @returns {Object} Detailed performance report
   */
  getReport() {
    const metrics = this.getMetrics();
    const recommendations = this.getRecommendations();
    const isDegraded = this.isPerformanceDegraded();

    return {
      timestamp: Date.now(),
      metrics,
      isDegraded,
      recommendations,
      thresholds: this.thresholds,
      resourceLeaks: this.resourceManager.detectLeaks()
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics.updateDurations = [];
    console.log('[PerformanceMonitor] Metrics reset');
  }

  /**
   * Dispose and cleanup
   */
  dispose() {
    this.stop();
    this.reset();
  }
}

// Create singleton instance
let performanceMonitorInstance = null;

/**
 * Get the global performance monitor instance
 * @returns {PerformanceMonitor}
 */
function getPerformanceMonitor() {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
}

module.exports = {
  PerformanceMonitor,
  getPerformanceMonitor
};
