/**
 * Enhanced AbilityRegistry class with detailed debug logging
 */
const logger = require('@utils/logger'); // FIXED: Add missing import

class AbilityRegistry {
  constructor() {
    this.classAbilities = new Map();
    this.racialAbilities = new Map();
  }

  /**
   * Register a class ability handler with logging
   */
  registerClassAbility(abilityType, handler) {
    this.classAbilities.set(abilityType, handler);
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
   */
  registerRacialAbility(abilityType, handler) {
    this.racialAbilities.set(abilityType, handler);
  }

  /**
   * Check if a class ability is registered
   */
  hasClassAbility(abilityType) {
    return this.classAbilities.has(abilityType);
  }

  /**
   * Check if a racial ability is registered
   */
  hasRacialAbility(abilityType) {
    return this.racialAbilities.has(abilityType);
  }

  /**
   * ENHANCED: Execute a class ability with detailed debugging
   */
  executeClassAbility(abilityType, actor, target, ability, log, systems) {
    const handler = this.classAbilities.get(abilityType);

    if (!handler) {
      logger.warn(`No handler registered for class ability: ${abilityType}`);
      logger.warn(
        `Available handlers: ${Array.from(this.classAbilities.keys()).join(
          ', '
        )}`
      );
      return false;
    }

    try {
      const result = handler(actor, target, ability, log, systems);
      return result;
    } catch (error) {
      logger.error(`Error executing class ability ${abilityType}:`, error);
      return false;
    }
  }

  /**
   * ENHANCED: Execute a racial ability with detailed debugging
   */
  executeRacialAbility(abilityType, actor, target, ability, log, systems) {
    const handler = this.racialAbilities.get(abilityType);

    if (!handler) {
      logger.warn(`No handler registered for racial ability: ${abilityType}`);
      logger.warn(
        `Available handlers: ${Array.from(this.racialAbilities.keys()).join(
          ', '
        )}`
      );
      return false;
    }

    try {
      const result = handler(actor, target, ability, log, systems);
      return result;
    } catch (error) {
      logger.error(`Error executing racial ability ${abilityType}:`, error);
      return false;
    }
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
