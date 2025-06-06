/**
 * @fileoverview Fixed Ability Registry that properly passes coordination information
 * Maps ability types to their handler functions with enhanced parameter support
 */
const logger = require('@utils/logger');
const config = require('@config');
const messages = require('@messages');

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
      const variance = config.gameBalance.abilityVariance;

      const critChance = variance.critChance || 0;
      const failChance = variance.failChance || 0;
      const ultraFailChance = variance.ultraFailChance || 0;
      const critMultiplier = variance.critMultiplier || 1.5;

      const roll = Math.random();

      let finalTarget = target;
      let outcome = 'normal';

      if (roll < ultraFailChance) {
        outcome = 'ultraFail';
      } else if (roll < ultraFailChance + failChance) {
        outcome = 'fail';
      } else if (roll < ultraFailChance + failChance + critChance) {
        outcome = 'crit';
      }

      const categoryMap = {
        Attack: 'attacks',
        Heal: 'healing',
        Defense: 'defense',
        Special: 'special',
      };
      const categoryKey = categoryMap[ability.category] || 'attacks';

      if (outcome === 'fail') {
        const failMsg = messages.getAbilityMessage(
          `abilities.${categoryKey}`,
          categoryKey === 'healing'
            ? 'healingFailed'
            : categoryKey === 'defense'
            ? 'defenseFailed'
            : categoryKey === 'special'
            ? 'specialAbilityFailed'
            : 'abilityFailed'
        );
        log.push({
          type: 'ability_fail',
          public: false,
          attackerId: actor.id,
          message: '',
          privateMessage: messages.formatMessage(failMsg, {
            playerName: actor.name,
            abilityName: ability.name,
          }),
          attackerMessage: '',
        });
        return false;
      }

      if (outcome === 'ultraFail') {
        const newTargetId = systems.gameStateUtils.getRandomTarget({
          actorId: actor.id,
          excludeIds: [actor.id],
          includeMonster: true,
          monsterRef: systems.monsterController.getState(),
        });
        if (newTargetId) {
          finalTarget =
            newTargetId === config.MONSTER_ID
              ? config.MONSTER_ID
              : systems.players.get(newTargetId);

          // Overwrite the announcement log to show new target
          const last = log[log.length - 1];
          if (last && last.type === 'action_announcement') {
            const targetName =
              finalTarget === config.MONSTER_ID
                ? 'the Monster'
                : finalTarget === 'multi'
                ? 'multiple targets'
                : finalTarget.name;
            last.targetId = finalTarget.id || 'monster';
            last.message = messages.getEvent('playerAttacks', {
              playerName: actor.name,
              abilityName: ability.name,
              targetName,
            });
          }

          log.push({
            type: 'ability_ultra_fail',
            public: false,
            attackerId: actor.id,
            message: '',
            privateMessage: `ULTRA FAIL! Your ${ability.name} hit ${
              finalTarget === config.MONSTER_ID
                ? 'the Monster'
                : finalTarget.name
            } instead!`,
            attackerMessage: '',
          });
        }
      }

      if (outcome === 'crit' || outcome === 'ultraFail') {
        actor.tempCritMultiplier = critMultiplier;
        const critMsg = messages.getAbilityMessage(
          `abilities.${categoryKey}`,
          'abilityCrit'
        );
        const tn =
          finalTarget === config.MONSTER_ID
            ? 'the Monster'
            : finalTarget === 'multi'
            ? 'multiple targets'
            : finalTarget.name;
        log.push({
          type: 'ability_crit',
          public: true,
          attackerId: actor.id,
          targetId: finalTarget.id || finalTarget,
          message: messages.formatMessage(critMsg, {
            playerName: actor.name,
            abilityName: ability.name,
            targetName: tn,
            amount:
              ability.params.amount ||
              ability.params.damage ||
              ability.params.armor ||
              '',
          }),
          privateMessage: '',
          attackerMessage: '',
        });
      }

      // Copy ability if defense crit modifies armor
      let abilityCopy = ability;
      if (
        (outcome === 'crit' || outcome === 'ultraFail') &&
        ability.category === 'Defense' &&
        ability.params?.armor
      ) {
        abilityCopy = {
          ...ability,
          params: {
            ...ability.params,
            armor: Math.floor(ability.params.armor * critMultiplier),
          },
        };
      }

      const result = handler(actor, finalTarget, abilityCopy, log, systems, {
        ...coordinationInfo,
      });

      if (actor.tempCritMultiplier) delete actor.tempCritMultiplier;

      return result;
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
      const variance = config.gameBalance.abilityVariance;

      const critChance = variance.critChance || 0;
      const failChance = variance.failChance || 0;
      const ultraFailChance = variance.ultraFailChance || 0;
      const critMultiplier = variance.critMultiplier || 1.5;

      const roll = Math.random();

      let finalTarget = target;
      let outcome = 'normal';

      if (roll < ultraFailChance) {
        outcome = 'ultraFail';
      } else if (roll < ultraFailChance + failChance) {
        outcome = 'fail';
      } else if (roll < ultraFailChance + failChance + critChance) {
        outcome = 'crit';
      }

      if (outcome === 'fail') {
        const failMsg = messages.getAbilityMessage(
          'abilities.racial',
          'racialAbilityFailed'
        );
        log.push({
          type: 'racial_ability_fail',
          public: false,
          attackerId: actor.id,
          message: '',
          privateMessage: messages.formatMessage(failMsg, {
            playerName: actor.name,
          }),
          attackerMessage: '',
        });
        return false;
      }

      if (outcome === 'ultraFail') {
        const newTargetId = systems.gameStateUtils.getRandomTarget({
          actorId: actor.id,
          excludeIds: [actor.id],
          includeMonster: true,
          monsterRef: systems.monsterController.getState(),
        });
        if (newTargetId) {
          finalTarget =
            newTargetId === config.MONSTER_ID
              ? config.MONSTER_ID
              : systems.players.get(newTargetId);
          log.push({
            type: 'racial_ability_ultra_fail',
            public: false,
            attackerId: actor.id,
            message: '',
            privateMessage: `ULTRA FAIL! Your racial ability hit ${
              finalTarget === config.MONSTER_ID
                ? 'the Monster'
                : finalTarget.name
            } instead!`,
            attackerMessage: '',
          });
        }
      }

      if (outcome === 'crit' || outcome === 'ultraFail') {
        actor.tempCritMultiplier = critMultiplier;
        const critMsg = messages.getAbilityMessage(
          'abilities.racial',
          'racialAbilityCrit'
        );
        if (critMsg) {
          log.push({
            type: 'racial_ability_crit',
            public: true,
            attackerId: actor.id,
            message: messages.formatMessage(critMsg, {
              playerName: actor.name,
            }),
            privateMessage: '',
            attackerMessage: '',
          });
        }
      }

      const result = handler(actor, finalTarget, racialAbility, log, systems);

      if (actor.tempCritMultiplier) delete actor.tempCritMultiplier;

      return result;
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
