/**
 * Resource Manager - Lifecycle management for timers, listeners, and other resources
 * Ensures proper cleanup to prevent memory leaks
 */

const { getEventBus } = require('./eventBus');

class ResourceManager {
  constructor() {
    this.timers = new Map();
    this.listeners = new Map();
    this.disposables = new Map();
    this.eventBus = getEventBus();
    this.nextId = 1;
  }

  /**
   * Register a timer (setInterval or setTimeout)
   * @param {Function} callback - Timer callback
   * @param {number} interval - Interval in milliseconds
   * @param {boolean} isInterval - True for setInterval, false for setTimeout
   * @param {string} [description] - Optional description for debugging
   * @returns {number} Timer ID
   */
  registerTimer(callback, interval, isInterval = true, description = '') {
    const timerId = this.nextId++;
    const nativeTimerId = isInterval 
      ? setInterval(callback, interval)
      : setTimeout(() => {
          callback();
          this.timers.delete(timerId); // Auto-cleanup for setTimeout
        }, interval);

    this.timers.set(timerId, {
      nativeTimerId,
      isInterval,
      interval,
      description,
      createdAt: Date.now()
    });

    console.log(`[ResourceManager] Timer registered: ${timerId} (${description || 'unnamed'})`);
    return timerId;
  }

  /**
   * Clear a specific timer
   * @param {number} timerId - Timer ID returned by registerTimer
   * @returns {boolean} True if timer was found and cleared
   */
  clearTimer(timerId) {
    const timer = this.timers.get(timerId);
    if (!timer) {
      return false;
    }

    if (timer.isInterval) {
      clearInterval(timer.nativeTimerId);
    } else {
      clearTimeout(timer.nativeTimerId);
    }

    this.timers.delete(timerId);
    console.log(`[ResourceManager] Timer cleared: ${timerId}`);
    return true;
  }

  /**
   * Clear all registered timers
   */
  clearAllTimers() {
    console.log(`[ResourceManager] Clearing ${this.timers.size} timers`);
    
    this.timers.forEach((timer, timerId) => {
      if (timer.isInterval) {
        clearInterval(timer.nativeTimerId);
      } else {
        clearTimeout(timer.nativeTimerId);
      }
    });

    this.timers.clear();
  }

  /**
   * Get the number of active timers
   * @returns {number}
   */
  getTimerCount() {
    return this.timers.size;
  }

  /**
   * Get information about all active timers
   * @returns {Array} Array of timer info objects
   */
  getTimerInfo() {
    const info = [];
    this.timers.forEach((timer, timerId) => {
      info.push({
        id: timerId,
        type: timer.isInterval ? 'interval' : 'timeout',
        interval: timer.interval,
        description: timer.description,
        age: Date.now() - timer.createdAt
      });
    });
    return info;
  }

  /**
   * Register an event listener
   * @param {string} listenerId - Unique identifier for this listener
   * @param {Function} unsubscribe - Unsubscribe function
   * @param {string} [description] - Optional description
   */
  registerListener(listenerId, unsubscribe, description = '') {
    if (this.listeners.has(listenerId)) {
      console.warn(`[ResourceManager] Listener already registered: ${listenerId}`);
      return;
    }

    this.listeners.set(listenerId, {
      unsubscribe,
      description,
      createdAt: Date.now()
    });

    console.log(`[ResourceManager] Listener registered: ${listenerId} (${description || 'unnamed'})`);
  }

  /**
   * Unregister a specific listener
   * @param {string} listenerId - Listener ID
   * @returns {boolean} True if listener was found and removed
   */
  unregisterListener(listenerId) {
    const listener = this.listeners.get(listenerId);
    if (!listener) {
      return false;
    }

    try {
      listener.unsubscribe();
    } catch (error) {
      console.error(`[ResourceManager] Error unsubscribing listener ${listenerId}:`, error);
    }

    this.listeners.delete(listenerId);
    console.log(`[ResourceManager] Listener unregistered: ${listenerId}`);
    return true;
  }

  /**
   * Unregister all listeners
   */
  unregisterAllListeners() {
    console.log(`[ResourceManager] Unregistering ${this.listeners.size} listeners`);

    this.listeners.forEach((listener, listenerId) => {
      try {
        listener.unsubscribe();
      } catch (error) {
        console.error(`[ResourceManager] Error unsubscribing listener ${listenerId}:`, error);
      }
    });

    this.listeners.clear();
  }

  /**
   * Get the number of active listeners
   * @returns {number}
   */
  getListenerCount() {
    return this.listeners.size;
  }

  /**
   * Register a disposable resource (e.g., VSCode disposables)
   * @param {string} resourceId - Unique identifier
   * @param {Object} disposable - Object with dispose() method
   * @param {string} [description] - Optional description
   */
  registerDisposable(resourceId, disposable, description = '') {
    if (!disposable || typeof disposable.dispose !== 'function') {
      throw new Error('Disposable must have a dispose() method');
    }

    if (this.disposables.has(resourceId)) {
      console.warn(`[ResourceManager] Disposable already registered: ${resourceId}`);
      return;
    }

    this.disposables.set(resourceId, {
      disposable,
      description,
      createdAt: Date.now()
    });

    console.log(`[ResourceManager] Disposable registered: ${resourceId} (${description || 'unnamed'})`);
  }

  /**
   * Dispose a specific resource
   * @param {string} resourceId - Resource ID
   * @returns {boolean} True if resource was found and disposed
   */
  disposeResource(resourceId) {
    const resource = this.disposables.get(resourceId);
    if (!resource) {
      return false;
    }

    try {
      resource.disposable.dispose();
    } catch (error) {
      console.error(`[ResourceManager] Error disposing resource ${resourceId}:`, error);
    }

    this.disposables.delete(resourceId);
    console.log(`[ResourceManager] Resource disposed: ${resourceId}`);
    return true;
  }

  /**
   * Dispose all registered resources
   */
  disposeAllResources() {
    console.log(`[ResourceManager] Disposing ${this.disposables.size} resources`);

    this.disposables.forEach((resource, resourceId) => {
      try {
        resource.disposable.dispose();
      } catch (error) {
        console.error(`[ResourceManager] Error disposing resource ${resourceId}:`, error);
      }
    });

    this.disposables.clear();
  }

  /**
   * Clean up all resources (timers, listeners, disposables)
   */
  cleanup() {
    console.log('[ResourceManager] Starting cleanup');
    
    this.clearAllTimers();
    this.unregisterAllListeners();
    this.disposeAllResources();

    console.log('[ResourceManager] Cleanup complete');
    this.eventBus.emit('resources:cleaned');
  }

  /**
   * Get resource statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      timers: this.timers.size,
      listeners: this.listeners.size,
      disposables: this.disposables.size,
      total: this.timers.size + this.listeners.size + this.disposables.size
    };
  }

  /**
   * Check for potential resource leaks
   * @returns {Object} Leak detection results
   */
  detectLeaks() {
    const warnings = [];
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    // Check for old timers
    this.timers.forEach((timer, timerId) => {
      const age = now - timer.createdAt;
      if (age > maxAge) {
        warnings.push({
          type: 'timer',
          id: timerId,
          age,
          description: timer.description
        });
      }
    });

    // Check for old listeners
    this.listeners.forEach((listener, listenerId) => {
      const age = now - listener.createdAt;
      if (age > maxAge) {
        warnings.push({
          type: 'listener',
          id: listenerId,
          age,
          description: listener.description
        });
      }
    });

    return {
      hasLeaks: warnings.length > 0,
      warnings
    };
  }
}

// Create singleton instance
let resourceManagerInstance = null;

/**
 * Get the global resource manager instance
 * @returns {ResourceManager}
 */
function getResourceManager() {
  if (!resourceManagerInstance) {
    resourceManagerInstance = new ResourceManager();
  }
  return resourceManagerInstance;
}

module.exports = {
  ResourceManager,
  getResourceManager
};
