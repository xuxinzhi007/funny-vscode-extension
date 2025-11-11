/**
 * Event Bus - Centralized event management system
 * Enables decoupled communication between modules
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  once(event, handler) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }

    this.onceListeners.get(event).push(handler);
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    // Call regular listeners
    const handlers = this.listeners.get(event);
    if (handlers && handlers.length > 0) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }

    // Call once listeners and remove them
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers && onceHandlers.length > 0) {
      onceHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in once event handler for "${event}":`, error);
        }
      });
      this.onceListeners.delete(event);
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name
   */
  off(event) {
    if (!event || typeof event !== 'string') {
      throw new Error('Event name must be a non-empty string');
    }

    this.listeners.delete(event);
    this.onceListeners.delete(event);
  }

  /**
   * Remove all listeners for all events
   */
  clear() {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /**
   * Get the number of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    const regularCount = this.listeners.has(event) ? this.listeners.get(event).length : 0;
    const onceCount = this.onceListeners.has(event) ? this.onceListeners.get(event).length : 0;
    return regularCount + onceCount;
  }

  /**
   * Get all event names that have listeners
   * @returns {string[]} Array of event names
   */
  eventNames() {
    const names = new Set([
      ...this.listeners.keys(),
      ...this.onceListeners.keys()
    ]);
    return Array.from(names);
  }
}

// Create singleton instance
let eventBusInstance = null;

/**
 * Get the global event bus instance
 * @returns {EventBus}
 */
function getEventBus() {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

module.exports = {
  EventBus,
  getEventBus
};
