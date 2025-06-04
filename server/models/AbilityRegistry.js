/**
 * @fileoverview Fixed Ability Registry that properly passes coordination information
 * Maps ability types to their handler functions with enhanced parameter support
 */
const logger = require('@utils/logger');

/**
 * AbilityRegistry manages the mapping of ability types to their handler functions
 * Enhanced to support coordination bonuses and comeback mechanics
 */
class AbilityRegistry {
  constructor() {
    this.classAbilities = new Map();
    this.racialAbilities = new Map();
  }

  /**
   * Register a class ability handler
   * @param {string} abilityType - Type of ability
   * @param {Function} handler - Handler function
   */
  registerClassAbility(abilityType, handler) {
    this.classAbilities.set(abilityType, handler);
    logger.debug(`Registered class ability handler: ${abilityType}`);
  }

  /**
   * Register multiple class abilities with the same handler
   */
  registerClassAbilities(abilityTypes, handler) {
    abilityTypes.forEach((type) => {
      this.registerClassAbility(type, handler);
    });
  }

  /**
   * Register a racial ability handler
   * @param {string} abilityType - Type of racial ability
   * @param {Function} handler - Handler function
   */
  registerRacialAbility(abilityType, handler) {
    this.racialAbilities.set(abilityType, handler);
    logger.debug(`Registered racial ability handler: ${abilityType}`);
  }

  /**
   * Check if a class ability is registered
   * @param {string} abilityType - Type of ability
   * @returns {boolean} Whether the ability is registered
   */
  hasClassAbility(abilityType) {
    return this.classAbilities.has(abilityType);
  }

  /**
   * Check if a racial ability is registered
   * @param {string} abilityType - Type of racial ability
   * @returns {boolean} Whether the ability is registered
   */
  hasRacialAbility(abilityType) {
    return this.racialAbilities.has(abilityType);
  }

  /**
   * FIXED: Execute a class ability with coordination support
   * @param {string} abilityType - Type of ability to execute
   * @param {Object} actor - Player using the ability
   * @param {Object|string} target - Target of the ability
   * @param {Object} ability - Ability configuration
   * @param {Array} log - Event log to append messages to
   * @param {Object} systems - Game systems object
   * @param {Object} coordinationInfo - Coordination bonus information
   * @returns {boolean} Whether the ability was successfully executed
   */
  executeClassAbility(
    abilityType,
    actor,
    target,
    ability,
    log,
    systems,
    coordinationInfo = {}
  ) {
    const handler = this.classAbilities.get(abilityType);

    if (!handler) {
      logger.warn(`No handler found for class ability: ${abilityType}`);
      return false;
    }

    try {
      // FIXED: Pass coordination info to the handler
      return handler(actor, target, ability, log, systems, coordinationInfo);
    } catch (error) {
      logger.error(`Error executing class ability ${abilityType}:`, error);

      // Add error message to log
      const errorLog = {
        type: 'ability_error',
        public: false,
        attackerId: actor.id,
        message: '',
        privateMessage: `An error occurred while using ${ability.name}.`,
        attackerMessage: '',
      };
      log.push(errorLog);

      return false;
    }
  }

  /**
   * Execute a racial ability
   * @param {string} abilityType - Type of racial ability to execute
   * @param {Object} actor - Player using the ability
   * @param {Object|string} target - Target of the ability
   * @param {Object} racialAbility - Racial ability configuration
   * @param {Array} log - Event log to append messages to
   * @param {Object} systems - Game systems object
   * @returns {boolean} Whether the ability was successfully executed
   */
  executeRacialAbility(
    abilityType,
    actor,
    target,
    racialAbility,
    log,
    systems
  ) {
    const handler = this.racialAbilities.get(abilityType);

    if (!handler) {
      logger.warn(`No handler found for racial ability: ${abilityType}`);
      return false;
    }

    try {
      return handler(actor, target, racialAbility, log, systems);
    } catch (error) {
      logger.error(`Error executing racial ability ${abilityType}:`, error);

      // Add error message to log
      const errorLog = {
        type: 'racial_ability_error',
        public: false,
        attackerId: actor.id,
        message: '',
        privateMessage: `An error occurred while using your racial ability.`,
        attackerMessage: '',
      };
      log.push(errorLog);

      return false;
    }
  }

  /**
   * Get all registered class abilities
   * @returns {Array} Array of registered class ability types
   */
  getRegisteredClassAbilities() {
    return Array.from(this.classAbilities.keys());
  }

  /**
   * Get all registered racial abilities
   * @returns {Array} Array of registered racial ability types
   */
  getRegisteredRacialAbilities() {
    return Array.from(this.racialAbilities.keys());
  }

  /**
   * Clear all registered abilities (useful for testing)
   */
  clear() {
    this.classAbilities.clear();
    this.racialAbilities.clear();
    logger.debug('Cleared all ability registrations');
  }

  /**
   * Get registration statistics
   * @returns {Object} Registration statistics
   */
  getStats() {
    return {
      classAbilities: this.classAbilities.size,
      racialAbilities: this.racialAbilities.size,
      totalAbilities: this.classAbilities.size + this.racialAbilities.size,
    };
  }

  /**
   * Get debug information about registered handlers
   */
  getDebugInfo() {
    const info = {
      classAbilities: Array.from(this.classAbilities.keys()),
      racialAbilities: Array.from(this.racialAbilities.keys()),
      totalRegistered: this.classAbilities.size + this.racialAbilities.size,
    };

    return info;
  }
}

module.exports = AbilityRegistry;
