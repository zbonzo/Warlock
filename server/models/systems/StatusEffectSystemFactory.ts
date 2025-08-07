/**
 * @fileoverview Status Effect System Factory
 * Creates and configures the new status effect system with proper integration
 */
import NewStatusEffectManager from './NewStatusEffectManager.js';
import EntityAdapter from './EntityAdapter.js';
import StatusEffect from './StatusEffect.js';
import logger from '../../utils/logger.js';
import config from '../../config/index.js';

interface Player {
  id: string;
  name: string;
  race?: string;
  [key: string]: any;
}

interface Monster {
  id: string;
  name: string;
  race: 'Monster';
  [key: string]: any;
}

interface WarlockSystem {
  markWarlockDetected?: (playerId: string, log: any[]) => void;
}

interface StatusEffectSystem {
  manager: NewStatusEffectManager;
  entities: Map<string, any>;
  processEffects: (log: any[]) => void;
  applyEffect: (targetId: string, type: string, params: any, sourceId: string | null, sourceName: string | null, log: any[]) => any;
  hasEffect: (entityId: string, type: string) => boolean;
  removeEffect: (entityId: string, effectId: string, log: any[]) => boolean;
  calculateModified: (entityId: string, type: string, baseValue: number) => number;
  getStats: () => any;
}

interface TestScenarios {
  testPoisonStacking: () => { poisonEffects: StatusEffect[]; log: any[] };
  testPercentageCalculations: () => { damageDealt: number; damageTaken: number; log: any[] };
  testRacialPassives: () => { stats: any; log: any[] };
}

interface ValidationResults {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: any;
}

/**
 * Factory for creating and configuring the new status effect system
 */
class StatusEffectSystemFactory {
  /**
   * Create a new status effect system for a game room
   */
  static createSystem(
    players: Map<string, Player>, 
    monster: Monster | null = null, 
    warlockSystem: WarlockSystem | null = null, 
    migrateExisting: boolean = false
  ): StatusEffectSystem {
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
   * @private
   */
  private static replaceLegacyMethods(entities: Map<string, any>, manager: NewStatusEffectManager): void {
    for (const [entityId, entity] of entities.entries()) {
      // Replace hasStatusEffect
      entity.hasStatusEffect = function(effectType: string) {
        return manager.hasEffect(this.id, effectType);
      };

      // Replace applyStatusEffect
      entity.applyStatusEffect = function(effectType: string, params: any) {
        return manager.applyEffect(this.id, effectType, params, this.id, this.name);
      };

      // Replace removeStatusEffect
      entity.removeStatusEffect = function(effectType: string) {
        return manager.removeEffectsByType(this.id, effectType);
      };

      // Add new methods
      entity.getActiveEffects = function() {
        return manager.getAllEffects(this.id);
      };

      entity.getEffectsOfType = function(effectType: string) {
        return manager.getEffectsByType(this.id, effectType);
      };

      entity.isActionPrevented = function(actionType: string) {
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
      entity.modifyDamage = function(baseDamage: number) {
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
      entity.calculateIncomingDamage = function(baseDamage: number) {
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
   */
  static applyRacialPassives(entityId: string, race: string, manager: NewStatusEffectManager): void {
    const racialConfig = config.raceAttributes[race];
    if (!racialConfig) return;

    logger.debug(`Applying racial passives for ${race} to ${entityId}`);

    switch (race) {
      case 'Rockhewn':
        // Stone armor as a permanent status effect
        manager.applyEffect(entityId, 'stoneArmor', {
          armor: 6,
          initialArmor: 6,
          degradationPerHit: 1,
          name: 'Stone Armor',
          description: 'Starts with 6 armor that degrades by 1 with each hit taken.'
        });
        break;

      case 'Crestfallen':
        // Moonbeam as a passive detection ability
        manager.applyEffect(entityId, 'moonbeam', {
          healthThreshold: 0.5,
          name: 'Moonbeam',
          description: 'When wounded (below 50% HP), attacks against you reveal if the attacker is corrupted.'
        });
        break;

      case 'Kinfolk':
        // Life Bond as a passive healing ability
        manager.applyEffect(entityId, 'lifeBond', {
          healingPercent: 0.05,
          name: 'Life Bond',
          description: "At the end of each round, heal for 5% of the monster's remaining HP."
        });
        break;

      case 'Lich':
        // Undying as a passive resurrection ability
        manager.applyEffect(entityId, 'undying', {
          resurrectedHp: 1,
          usesLeft: 1,
          name: 'Undying',
          description: 'Return to 1 HP the first time you would die.'
        });
        break;
    }
  }

  /**
   * Create test scenarios for the new system
   */
  static createTestScenarios(manager: NewStatusEffectManager, entities: Map<string, any>): TestScenarios {
    return {
      // Test poison stacking
      testPoisonStacking: () => {
        const log: any[] = [];
        const playerId = entities.keys().next().value;
        if (!playerId) {
          logger.warn('No player ID available for poison stacking test');
          return { poisonEffects: [], log };
        }
        
        // Apply multiple poison effects
        manager.applyEffect(playerId, 'poison', { damage: 5, turns: 3 }, 'test1', 'Test Source 1', log);
        manager.applyEffect(playerId, 'poison', { damage: 3, turns: 2 }, 'test2', 'Test Source 2', log);
        
        const poisonEffects = manager.getEffectsByType(playerId, 'poison');
        logger.info(`Poison stacking test: ${poisonEffects.length} poison effects applied`);
        
        return { poisonEffects, log };
      },

      // Test percentage calculations
      testPercentageCalculations: () => {
        const log: any[] = [];
        const playerId = entities.keys().next().value;
        if (!playerId) {
          logger.warn('No player ID available for percentage calculations test');
          return { damageDealt: 100, damageTaken: 100, log };
        }
        
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
        const log: any[] = [];
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
   */
  static validateSystem(system: StatusEffectSystem): ValidationResults {
    const results: ValidationResults = {
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

    // Note: Orphaned effects check removed due to private property access restrictions
    // This would require adding a public method to NewStatusEffectManager to access effectsByEntity

    logger.info('Status effect system validation:', results);
    return results;
  }
}

export default StatusEffectSystemFactory;