/**
 * @fileoverview Registry for game abilities and their handlers
 * Centralizes ability registration and execution
 */

/**
 * AbilityRegistry manages ability registration and execution
 * Provides a central lookup for all ability handlers
 */
class AbilityRegistry {
  /**
   * Create a new ability registry
   */
  constructor() {
    this.classAbilities = new Map();
    this.racialAbilities = new Map();
    this.systems = null;
  }

  /**
   * Set system references for ability handlers
   * @param {Object} systems - Game systems object
   */
  setSystems(systems) {
    this.systems = systems;
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
   * @param {Array<string>} abilityTypes - Array of ability types
   * @param {Function} handler - Handler function
   */
  registerClassAbilities(abilityTypes, handler) {
    for (const type of abilityTypes) {
      this.registerClassAbility(type, handler);
    }
  }

  /**
   * Register a racial ability handler
   * @param {string} abilityType - Type of ability
   * @param {Function} handler - Handler function
   */
  registerRacialAbility(abilityType, handler) {
    this.racialAbilities.set(abilityType, handler);
  }

  /**
   * Check if a class ability type is registered
   * @param {string} abilityType - Type to check
   * @returns {boolean} Whether the ability is registered
   */
  hasClassAbility(abilityType) {
    return this.classAbilities.has(abilityType);
  }

  /**
   * Check if a racial ability type is registered
   * @param {string} abilityType - Type to check
   * @returns {boolean} Whether the ability is registered
   */
  hasRacialAbility(abilityType) {
    return this.racialAbilities.has(abilityType);
  }

  /**
   * Execute a class ability handler
   * @param {string} abilityType - Type of ability to execute
   * @param {Object} actor - Actor using the ability
   * @param {Object|string} target - Target of the ability
   * @param {Object} ability - Ability configuration
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the ability execution was successful
   */
  executeClassAbility(abilityType, actor, target, ability, log) {
    const handler = this.classAbilities.get(abilityType);
    if (!handler) return false;
    
    try {
      return handler(actor, target, ability, log, this.systems);
    } catch (error) {
      console.error(`Error executing ability ${abilityType}:`, error);
      log.push(`${actor.name} tries to use ${ability.name}, but something goes wrong!`);
      return false;
    }
  }

  /**
   * Execute a racial ability handler
   * @param {string} abilityType - Type of ability to execute
   * @param {Object} actor - Actor using the ability
   * @param {Object|string} target - Target of the ability
   * @param {Object} racialAbility - Racial ability configuration
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the ability execution was successful
   */
  executeRacialAbility(abilityType, actor, target, racialAbility, log) {
    const handler = this.racialAbilities.get(abilityType);
    if (!handler) return false;
    
    try {
      return handler(actor, target, racialAbility, log, this.systems);
    } catch (error) {
      console.error(`Error executing racial ability ${abilityType}:`, error);
      log.push(`${actor.name} tries to use ${racialAbility.name}, but something goes wrong!`);
      return false;
    }
  }

  /**
   * Get debug information about registered abilities
   * @returns {Object} Ability registration stats
   */
  getDebugInfo() {
    return {
      classAbilities: Array.from(this.classAbilities.keys()),
      racialAbilities: Array.from(this.racialAbilities.keys()),
      totalClassAbilities: this.classAbilities.size,
      totalRacialAbilities: this.racialAbilities.size
    };
  }
}

module.exports = AbilityRegistry;