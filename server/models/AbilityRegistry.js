/**
 * Enhanced AbilityRegistry class with threat system integration
 * This assumes the existing AbilityRegistry structure but adds systems parameter passing
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
  }

  /**
   * Register multiple class abilities with the same handler
   * @param {Array} abilityTypes - Array of ability types
   * @param {Function} handler - Handler function
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
   * ENHANCED: Execute a class ability with systems parameter for threat tracking
   * @param {string} abilityType - Type of ability to execute
   * @param {Object} actor - Player using the ability
   * @param {Object|string} target - Target of the ability
   * @param {Object} ability - Ability configuration
   * @param {Array} log - Event log to append messages to
   * @param {Object} systems - Game systems including monsterController for threat tracking
   * @returns {boolean} Whether the ability was successful
   */
  executeClassAbility(abilityType, actor, target, ability, log, systems) {
    const handler = this.classAbilities.get(abilityType);

    if (!handler) {
      logger.warn(`No handler registered for class ability: ${abilityType}`);
      return false;
    }

    try {
      // Execute the handler with all parameters including systems
      return handler(actor, target, ability, log, systems);
    } catch (error) {
      logger.error(`Error executing class ability ${abilityType}:`, error);
      return false;
    }
  }

  /**
   * ENHANCED: Execute a racial ability with systems parameter for threat tracking
   * @param {string} abilityType - Type of racial ability to execute
   * @param {Object} actor - Player using the ability
   * @param {Object|string} target - Target of the ability
   * @param {Object} ability - Ability configuration
   * @param {Array} log - Event log to append messages to
   * @param {Object} systems - Game systems including monsterController for threat tracking
   * @returns {boolean} Whether the ability was successful
   */
  executeRacialAbility(abilityType, actor, target, ability, log, systems) {
    const handler = this.racialAbilities.get(abilityType);

    if (!handler) {
      logger.warn(`No handler registered for racial ability: ${abilityType}`);
      return false;
    }

    try {
      // Execute the handler with all parameters including systems
      return handler(actor, target, ability, log, systems);
    } catch (error) {
      logger.error(`Error executing racial ability ${abilityType}:`, error);
      return false;
    }
  }

  /**
   * Get debug information about registered handlers
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      classAbilities: Array.from(this.classAbilities.keys()),
      racialAbilities: Array.from(this.racialAbilities.keys()),
      totalRegistered: this.classAbilities.size + this.racialAbilities.size,
    };
  }
}

module.exports = AbilityRegistry;
