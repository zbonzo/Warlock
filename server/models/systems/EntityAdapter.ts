/**
 * @fileoverview Entity Adapter for Status Effect System
 * Provides a unified interface for players and monsters to work with the new status effect system
 */

import logger from '../../utils/logger.js';
import config from '../../config/index.js';
import NewStatusEffectManager from './NewStatusEffectManager.js';

interface BaseEntity {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  entityType: 'player' | 'monster';
  armor?: number;
  damageMod?: number;
  hasSubmittedAction?: boolean;
  submittedAction?: any;
  actionSubmissionTime?: number;
  actionValidationState?: string;
  statusEffects?: Record<string, any>;
}

interface Player extends BaseEntity {
  entityType: 'player';
  race?: string;
  isWarlock?: boolean;
  pendingDeath?: boolean;
  stoneArmorIntact?: boolean;
  stoneArmorValue?: number;
  abilities?: any[];
  unlocked?: any[];
  class?: string;
  baseDmg?: never; // Only monsters have this
  age?: never; // Only monsters have this
}

interface Monster extends BaseEntity {
  entityType: 'monster';
  race: 'Monster';
  isWarlock: false;
  pendingDeath: false;
  baseDmg?: number;
  age?: number;
}

type Entity = Player | Monster;


/**
 * EntityAdapter provides a unified interface for entities (players/monsters)
 * Ensures compatibility with the new status effect system
 */
class EntityAdapter {
  /**
   * Adapt a player object to work with the new status effect system
   */
  static adaptPlayer(player: Partial<Player>): Player {
    // Ensure required properties exist
    if (!player.id && (player as any).socketId) {
      player.id = (player as any).socketId;
    }

    if (!player.name) {
      player.name = `Player_${player.id}`;
    }

    // Ensure HP properties
    if (player.hp === undefined) {
      player.hp = player.maxHp || 100;
    }
    if (player.maxHp === undefined) {
      player.maxHp = player.hp || 100;
    }

    // Ensure isAlive property
    if (player.isAlive === undefined) {
      player.isAlive = player.hp > 0;
    }

    // Add entity type
    (player as Player).entityType = 'player';

    // Add status effect calculation helpers
    this.addCalculationHelpers(player as Player);

    // Add legacy compatibility methods
    this.addLegacyCompatibility(player as Player);

    return player as Player;
  }

  /**
   * Adapt a monster object to work with the new status effect system
   */
  static adaptMonster(monster: Partial<Monster>): Monster {
    // Ensure required properties exist
    if (!monster.id) {
      monster.id = '__monster__';
    }

    if (!monster.name) {
      monster.name = 'Monster';
    }

    // Ensure HP properties
    if (monster.hp === undefined) {
      monster.hp = monster.maxHp || 200;
    }
    if (monster.maxHp === undefined) {
      monster.maxHp = monster.hp || 200;
    }

    // Ensure isAlive property
    if (monster.isAlive === undefined) {
      monster.isAlive = monster.hp > 0;
    }

    // Add entity type
    (monster as Monster).entityType = 'monster';

    // Monsters don't have races, but add placeholder
    (monster as Monster).race = 'Monster';

    // Add status effect calculation helpers
    this.addCalculationHelpers(monster as Monster);

    // Add monster-specific methods
    this.addMonsterMethods(monster as Monster);

    return monster as Monster;
  }

  /**
   * Add calculation helper methods to an entity
   */
  private static addCalculationHelpers(entity: Entity): void {
    // Get base armor value
    (entity as any).getBaseArmor = function(this: Entity) {
      return this.armor || 0;
    };

    // Get base damage value
    (entity as any).getBaseDamage = function(this: Entity, baseDamage: number) {
      if (this.entityType === 'player') {
        return Math.floor(baseDamage * (this.damageMod || 1));
      }
      return baseDamage;
    };

    // Process stone armor degradation (for Rockhewn)
    (entity as any).processStoneArmorDegradation = function(this: Entity, damage: number) {
      if ((this as Player).race === 'Rockhewn' && (this as any).stoneArmorIntact) {
        const degradation = Math.min(damage, 1); // Degrade by 1 per hit
        (this as any).stoneArmorValue = Math.max(0, ((this as any).stoneArmorValue || 0) - degradation);

        if ((this as any).stoneArmorValue <= 0) {
          (this as any).stoneArmorIntact = false;
        }

        logger.debug(`Stone armor degraded: ${this.name} armor: ${(this as any).stoneArmorValue}`);
      }
    };

    // Clear action submission (for stunned entities)
    (entity as any).clearActionSubmission = function(this: Entity) {
      if (this.hasSubmittedAction) {
        this.hasSubmittedAction = false;
        this.submittedAction = undefined;
        this.actionSubmissionTime = undefined;
        this.actionValidationState = 'none';
      }
    };
  }

  /**
   * Add legacy compatibility methods to maintain existing API
   */
  private static addLegacyCompatibility(entity: Entity): void {
    // Legacy status effect methods for backward compatibility
    (entity as any).hasStatusEffect = function(this: Entity, effectName: string) {
      // This will be overridden by the status effect manager
      logger.warn('Using legacy hasStatusEffect - should be replaced by StatusEffectManager');
      return this.statusEffects && this.statusEffects[effectName] !== undefined;
    };

    (entity as any).applyStatusEffect = function(this: Entity, effectName: string, data: any) {
      // This will be overridden by the status effect manager
      logger.warn('Using legacy applyStatusEffect - should be replaced by StatusEffectManager');
      this.statusEffects = this.statusEffects || {};
      this.statusEffects[effectName] = data;
    };

    (entity as any).removeStatusEffect = function(this: Entity, effectName: string) {
      // This will be overridden by the status effect manager
      logger.warn('Using legacy removeStatusEffect - should be replaced by StatusEffectManager');
      if (this.statusEffects && this.statusEffects[effectName]) {
        delete this.statusEffects[effectName];
      }
    };
  }

  /**
   * Add monster-specific methods
   */
  private static addMonsterMethods(monster: Monster): void {
    // Monster doesn't have some player-specific properties
    monster.isWarlock = false;
    monster.pendingDeath = false;

    // Monster age tracking
    if (monster.age === undefined) {
      monster.age = 1;
    }

    // Monster damage calculation
    (monster as any).calculateAttackDamage = function(this: Monster) {
      return config.calculateMonsterDamage
        ? config.calculateMonsterDamage(this.age!)
        : (this.baseDmg || 20) * ((this.age || 1) + 1);
    };
  }

  /**
   * Validate that an entity has all required properties for the status effect system
   */
  static validateEntity(entity: Partial<Entity>): boolean {
    const required = ['id', 'name', 'hp', 'maxHp', 'isAlive', 'entityType'];

    for (const prop of required) {
      if ((entity as any)[prop] === undefined) {
        logger.error(`Entity missing required property: ${prop}`, entity);
        return false;
      }
    }

    return true;
  }

  /**
   * Create a merged entities map for the status effect manager
   */
  static createEntitiesMap(players: Map<string, Partial<Player>>, monster: Partial<Monster> | null = null): Map<string, Entity> {
    const entities = new Map<string, Entity>();

    // Add all players
    for (const [playerId, player] of players.entries()) {
      const adaptedPlayer = this.adaptPlayer(player);
      entities.set(playerId, adaptedPlayer);
    }

    // Add monster if provided
    if (monster) {
      const adaptedMonster = this.adaptMonster(monster);
      entities.set(adaptedMonster.id, adaptedMonster);
    }

    logger.debug(`Created entities map with ${entities.size} entities`);
    return entities;
  }

  /**
   * Migrate legacy status effects to the new system
   */
  static migrateLegacyStatusEffects(entity: Entity, manager: NewStatusEffectManager): void {
    if (!entity.statusEffects || typeof entity.statusEffects !== 'object') {
      return;
    }

    logger.debug(`Migrating legacy status effects for ${entity.name}`);

    // Convert legacy status effects to new system
    for (const [effectType, effectData] of Object.entries(entity.statusEffects)) {
      if (effectData && typeof effectData === 'object') {
        manager.applyEffect(
          entity.id,
          effectType,
          effectData,
          (effectData as any).sourceId || entity.id,
          (effectData as any).sourceName || 'Legacy',
          [] // Empty log for migration
        );
      }
    }

    // Clear legacy status effects to avoid conflicts
    entity.statusEffects = {};
  }

  /**
   * Sync status effect flags back to legacy system for compatibility
   */
  static syncLegacyFlags(entity: Entity, manager: NewStatusEffectManager): void {
    // Update vulnerability flags
    const vulnerableEffects = manager.getEffectsByType(entity.id, 'vulnerable');
    if (vulnerableEffects.length > 0) {
      (entity as any).isVulnerable = true;
      // Use the highest vulnerability value
      (entity as any).vulnerabilityIncrease = Math.max(
        ...vulnerableEffects.map((e: any) => e.params.damageIncrease || 0)
      );
    } else {
      (entity as any).isVulnerable = false;
      (entity as any).vulnerabilityIncrease = 0;
    }

    // Update other legacy flags as needed
    // This maintains compatibility with existing code that checks these flags
  }
}

export default EntityAdapter;
