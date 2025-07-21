/**
 * @fileoverview Status Effect System Factory
 * Creates and configures the new status effect system with proper integration
 */
const NewStatusEffectManager = require('./NewStatusEffectManager');
const EntityAdapter = require('./EntityAdapter');
const StatusEffect = require('./StatusEffect');
const logger = require('../../utils/logger');

/**
 * Factory for creating and configuring the new status effect system
 */
class StatusEffectSystemFactory {
  /**
   * Create a new status effect system for a game room
   * @param {Map} players - Player map
   * @param {Object} monster - Monster object
   * @param {Object} warlockSystem - Warlock system (optional)
   * @param {boolean} migrateExisting - Whether to migrate existing status effects
   * @returns {Object} Status effect system components
   */
  static createSystem(players, monster = null, warlockSystem = null, migrateExisting = false) {
    logger.info('Creating new status effect system');

    // Create entities map with adapted entities
    const entities = EntityAdapter.createEntitiesMap(players, monster);

    // Create the new status effect manager
    const manager = new NewStatusEffectManager(entities, warlockSystem);

    // Apply racial passive effects to all players
    for (const [playerId, player] of players.entries()) {
      if (player.race) {
        manager.applyRacialPassives(playerId, player.race);
      }
    }

    // Migrate existing status effects if requested
    if (migrateExisting) {
      for (const [entityId, entity] of entities.entries()) {
        EntityAdapter.migrateLegacyStatusEffects(entity, manager);
      }
    }

    // Replace legacy methods with new system methods
    this.replaceLegacyMethods(entities, manager);

    logger.info(`Status effect system created with ${entities.size} entities`);

    return {
      manager,
      entities,
      // Convenience methods
      processEffects: (log) => manager.processTimedEffects(log),
      applyEffect: (targetId, type, params, sourceId, sourceName, log) => 
        manager.applyEffect(targetId, type, params, sourceId, sourceName, log),
      hasEffect: (entityId, type) => manager.hasEffect(entityId, type),
      removeEffect: (entityId, effectId, log) => manager.removeEffect(entityId, effectId, log),
      calculateModified: (entityId, type, baseValue) => 
        manager.calculateModifiedValue(entityId, type, baseValue),
      getStats: () => manager.getEffectStatistics(),
    };
  }

  /**
   * Replace legacy status effect methods with new system methods
   * @param {Map} entities - Entities map
   * @param {NewStatusEffectManager} manager - Status effect manager
   * @private
   */
  static replaceLegacyMethods(entities, manager) {
    for (const [entityId, entity] of entities.entries()) {
      // Replace hasStatusEffect
      entity.hasStatusEffect = function(effectType) {
        return manager.hasEffect(this.id, effectType);
      };

      // Replace applyStatusEffect
      entity.applyStatusEffect = function(effectType, params) {
        return manager.applyEffect(this.id, effectType, params, this.id, this.name);
      };

      // Replace removeStatusEffect
      entity.removeStatusEffect = function(effectType) {
        return manager.removeEffectsByType(this.id, effectType);
      };

      // Add new methods
      entity.getActiveEffects = function() {
        return manager.getAllEffects(this.id);
      };

      entity.getEffectsOfType = function(effectType) {
        return manager.getEffectsByType(this.id, effectType);
      };

      entity.isActionPrevented = function(actionType) {
        return manager.isActionPrevented(this.id, actionType);
      };

      // Enhanced armor calculation
      const originalGetEffectiveArmor = entity.getEffectiveArmor;
      entity.getEffectiveArmor = function() {
        let baseArmor = 0;
        
        // Ensure all required properties exist before calling original method
        if (this.armor === undefined) {
          this.armor = 0;
        }
        if (!this.statusEffects) {
          this.statusEffects = {};
        }
        if (this.stoneArmorValue === undefined) {
          this.stoneArmorValue = this.race === 'Rockhewn' ? 6 : 0;
        }
        if (this.stoneArmorIntact === undefined) {
          this.stoneArmorIntact = this.race === 'Rockhewn';
        }
        
        // Get original armor if method exists
        if (originalGetEffectiveArmor) {
          try {
            baseArmor = originalGetEffectiveArmor.call(this);
          } catch (error) {
            // Fallback if original method fails
            baseArmor = this.armor || 0;
            if (this.race === 'Rockhewn' && this.stoneArmorIntact) {
              baseArmor += this.stoneArmorValue || 0;
            }
          }
        } else {
          baseArmor = this.armor || 0;
          
          // Add stone armor for Rockhewn
          if (this.race === 'Rockhewn' && this.stoneArmorIntact) {
            baseArmor += this.stoneArmorValue || 0;
          }
        }

        // Apply status effect modifications
        return manager.calculateModifiedValue(this.id, 'armor', baseArmor);
      };

      // Enhanced damage calculation
      const originalModifyDamage = entity.modifyDamage;
      entity.modifyDamage = function(baseDamage) {
        let modifiedDamage = baseDamage;
        
        // Apply original modifications if they exist
        if (originalModifyDamage) {
          modifiedDamage = originalModifyDamage.call(this, baseDamage);
        } else if (this.damageMod) {
          modifiedDamage = Math.floor(baseDamage * this.damageMod);
        }

        // Apply status effect modifications for damage dealt
        return manager.calculateModifiedValue(this.id, 'damageDealt', modifiedDamage);
      };

      // Enhanced damage taken calculation
      entity.calculateIncomingDamage = function(baseDamage) {
        // Apply status effect modifications for damage taken
        return manager.calculateModifiedValue(this.id, 'damageTaken', baseDamage);
      };

      // Sync legacy flags periodically
      entity.syncStatusFlags = function() {
        EntityAdapter.syncLegacyFlags(this, manager);
      };
    }

    logger.debug('Legacy methods replaced with new status effect system methods');
  }

  /**
   * Create racial passive status effects for an entity
   * @param {string} entityId - Entity ID
   * @param {string} race - Race name
   * @param {NewStatusEffectManager} manager - Status effect manager
   */
  static applyRacialPassives(entityId, race, manager) {
    const racialConfig = require('../../config').raceAttributes[race];
    if (!racialConfig) return;

    logger.debug(`Applying racial passives for ${race} to ${entityId}`);

    switch (race) {
      case 'Rockhewn':
        // Stone armor as a permanent status effect
        const stoneArmorEffect = StatusEffect.createRacialEffect('stoneArmor', entityId, {
          armor: 6,
          initialArmor: 6,
          degradationPerHit: 1,
          name: 'Stone Armor',
          description: 'Starts with 6 armor that degrades by 1 with each hit taken.'
        });
        manager.effectsByEntity.get(entityId).push(stoneArmorEffect);
        break;

      case 'Crestfallen':
        // Moonbeam as a passive detection ability
        const moonbeamEffect = StatusEffect.createRacialEffect('moonbeam', entityId, {
          healthThreshold: 0.5,
          name: 'Moonbeam',
          description: 'When wounded (below 50% HP), attacks against you reveal if the attacker is corrupted.'
        });
        manager.effectsByEntity.get(entityId).push(moonbeamEffect);
        break;

      case 'Kinfolk':
        // Life Bond as a passive healing ability
        const lifeBondEffect = StatusEffect.createRacialEffect('lifeBond', entityId, {
          healingPercent: 0.05,
          name: 'Life Bond',
          description: "At the end of each round, heal for 5% of the monster's remaining HP."
        });
        manager.effectsByEntity.get(entityId).push(lifeBondEffect);
        break;

      case 'Lich':
        // Undying as a passive resurrection ability
        const undyingEffect = StatusEffect.createRacialEffect('undying', entityId, {
          resurrectedHp: 1,
          usesLeft: 1,
          name: 'Undying',
          description: 'Return to 1 HP the first time you would die.'
        });
        manager.effectsByEntity.get(entityId).push(undyingEffect);
        break;
    }
  }

  /**
   * Create test scenarios for the new system
   * @param {NewStatusEffectManager} manager - Status effect manager
   * @param {Map} entities - Entities map
   * @returns {Object} Test scenario functions
   */
  static createTestScenarios(manager, entities) {
    return {
      // Test poison stacking
      testPoisonStacking: () => {
        const log = [];
        const playerId = entities.keys().next().value;
        
        // Apply multiple poison effects
        manager.applyEffect(playerId, 'poison', { damage: 5, turns: 3 }, 'test1', 'Test Source 1', log);
        manager.applyEffect(playerId, 'poison', { damage: 3, turns: 2 }, 'test2', 'Test Source 2', log);
        
        const poisonEffects = manager.getEffectsByType(playerId, 'poison');
        logger.info(`Poison stacking test: ${poisonEffects.length} poison effects applied`);
        
        return { poisonEffects, log };
      },

      // Test percentage calculations
      testPercentageCalculations: () => {
        const log = [];
        const playerId = entities.keys().next().value;
        
        // Apply multiple percentage effects
        manager.applyEffect(playerId, 'vulnerable', { damageIncrease: 25, turns: 3 }, 'test', 'Test', log);
        manager.applyEffect(playerId, 'weakened', { damageReduction: 0.2, turns: 2 }, 'test', 'Test', log);
        
        const damageDealt = manager.calculateModifiedValue(playerId, 'damageDealt', 100);
        const damageTaken = manager.calculateModifiedValue(playerId, 'damageTaken', 100);
        
        logger.info(`Percentage test: base 100 -> dealt: ${damageDealt}, taken: ${damageTaken}`);
        
        return { damageDealt, damageTaken, log };
      },

      // Test racial passives
      testRacialPassives: () => {
        const log = [];
        for (const [entityId, entity] of entities.entries()) {
          if (entity.race && entity.race !== 'Monster') {
            manager.applyRacialPassives(entityId, entity.race, log);
          }
        }
        
        const stats = manager.getEffectStatistics();
        logger.info(`Racial passives test: ${stats.totalEffects} total effects applied`);
        
        return { stats, log };
      }
    };
  }

  /**
   * Validate system integrity
   * @param {Object} system - Status effect system
   * @returns {Object} Validation results
   */
  static validateSystem(system) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      stats: system.getStats()
    };

    // Check entity validity
    for (const [entityId, entity] of system.entities.entries()) {
      if (!EntityAdapter.validateEntity(entity)) {
        results.valid = false;
        results.errors.push(`Invalid entity: ${entityId}`);
      }
    }

    // Check for orphaned effects
    for (const [entityId, effects] of system.manager.effectsByEntity.entries()) {
      if (!system.entities.has(entityId)) {
        results.warnings.push(`Orphaned effects for entity: ${entityId}`);
      }
    }

    logger.info('Status effect system validation:', results);
    return results;
  }
}

module.exports = StatusEffectSystemFactory;