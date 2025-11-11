/**
 * Activation Manager - Lazy loading system for extension modules
 * Improves startup performance by loading modules on-demand
 */

const { getEventBus } = require('./eventBus');

class ActivationManager {
  constructor() {
    this.modules = new Map();
    this.activeModules = new Map();
    this.eventBus = getEventBus();
  }

  /**
   * Register a lazy-loadable module
   * @param {string} moduleId - Unique module identifier
   * @param {Function} loader - Function that loads and initializes the module
   * @param {string[]} triggers - Activation triggers (commands, events, etc.)
   * @returns {void}
   */
  registerModule(moduleId, loader, triggers = []) {
    if (!moduleId || typeof moduleId !== 'string') {
      throw new Error('Module ID must be a non-empty string');
    }
    if (typeof loader !== 'function') {
      throw new Error('Loader must be a function');
    }
    if (!Array.isArray(triggers)) {
      throw new Error('Triggers must be an array');
    }

    this.modules.set(moduleId, {
      loader,
      triggers,
      loadedAt: null
    });

    console.log(`[ActivationManager] Registered module: ${moduleId} with triggers:`, triggers);
  }

  /**
   * Activate a module if not already active
   * @param {string} moduleId - Module identifier
   * @returns {Promise<any>} The loaded module instance
   */
  async activateModule(moduleId) {
    // Check if already active
    if (this.activeModules.has(moduleId)) {
      console.log(`[ActivationManager] Module already active: ${moduleId}`);
      return this.activeModules.get(moduleId);
    }

    // Check if module is registered
    const moduleConfig = this.modules.get(moduleId);
    if (!moduleConfig) {
      throw new Error(`Module not registered: ${moduleId}`);
    }

    console.log(`[ActivationManager] Activating module: ${moduleId}`);

    try {
      // Load the module
      const startTime = Date.now();
      const moduleInstance = await moduleConfig.loader();
      const loadTime = Date.now() - startTime;

      // Store the active module
      this.activeModules.set(moduleId, moduleInstance);
      moduleConfig.loadedAt = Date.now();

      console.log(`[ActivationManager] Module activated: ${moduleId} (${loadTime}ms)`);

      // Emit activation event
      this.eventBus.emit('module:activated', { moduleId, loadTime });

      return moduleInstance;
    } catch (error) {
      console.error(`[ActivationManager] Failed to activate module: ${moduleId}`, error);
      this.eventBus.emit('module:activationFailed', { moduleId, error });
      throw error;
    }
  }

  /**
   * Check if a module is currently active
   * @param {string} moduleId - Module identifier
   * @returns {boolean}
   */
  isModuleActive(moduleId) {
    return this.activeModules.has(moduleId);
  }

  /**
   * Get an active module instance
   * @param {string} moduleId - Module identifier
   * @returns {any|null} Module instance or null if not active
   */
  getModule(moduleId) {
    return this.activeModules.get(moduleId) || null;
  }

  /**
   * Deactivate and cleanup a module
   * @param {string} moduleId - Module identifier
   * @returns {Promise<void>}
   */
  async deactivateModule(moduleId) {
    if (!this.activeModules.has(moduleId)) {
      console.log(`[ActivationManager] Module not active: ${moduleId}`);
      return;
    }

    console.log(`[ActivationManager] Deactivating module: ${moduleId}`);

    try {
      const moduleInstance = this.activeModules.get(moduleId);

      // Call dispose method if available
      if (moduleInstance && typeof moduleInstance.dispose === 'function') {
        await moduleInstance.dispose();
      }

      // Remove from active modules
      this.activeModules.delete(moduleId);

      // Update module config
      const moduleConfig = this.modules.get(moduleId);
      if (moduleConfig) {
        moduleConfig.loadedAt = null;
      }

      console.log(`[ActivationManager] Module deactivated: ${moduleId}`);

      // Emit deactivation event
      this.eventBus.emit('module:deactivated', { moduleId });
    } catch (error) {
      console.error(`[ActivationManager] Error deactivating module: ${moduleId}`, error);
      throw error;
    }
  }

  /**
   * Deactivate all modules
   * @returns {Promise<void>}
   */
  async deactivateAll() {
    console.log('[ActivationManager] Deactivating all modules');

    const moduleIds = Array.from(this.activeModules.keys());
    for (const moduleId of moduleIds) {
      try {
        await this.deactivateModule(moduleId);
      } catch (error) {
        console.error(`[ActivationManager] Error deactivating ${moduleId}:`, error);
      }
    }
  }

  /**
   * Get list of registered modules
   * @returns {string[]} Array of module IDs
   */
  getRegisteredModules() {
    return Array.from(this.modules.keys());
  }

  /**
   * Get list of active modules
   * @returns {string[]} Array of active module IDs
   */
  getActiveModules() {
    return Array.from(this.activeModules.keys());
  }

  /**
   * Get module statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = {
      registered: this.modules.size,
      active: this.activeModules.size,
      modules: []
    };

    this.modules.forEach((config, moduleId) => {
      stats.modules.push({
        id: moduleId,
        active: this.activeModules.has(moduleId),
        loadedAt: config.loadedAt,
        triggers: config.triggers
      });
    });

    return stats;
  }
}

// Create singleton instance
let activationManagerInstance = null;

/**
 * Get the global activation manager instance
 * @returns {ActivationManager}
 */
function getActivationManager() {
  if (!activationManagerInstance) {
    activationManagerInstance = new ActivationManager();
  }
  return activationManagerInstance;
}

module.exports = {
  ActivationManager,
  getActivationManager
};
