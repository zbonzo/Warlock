/**
 * @fileoverview Entity Adapter for Status Effect System
 * Provides a unified interface for players and monsters to work with the new status effect system
 */
const logger = require('../../utils/logger');

/**
 * EntityAdapter provides a unified interface for entities (players/monsters)
 * Ensures compatibility with the new status effect system
 */
class EntityAdapter {
  /**
   * Adapt a player object to work with the new status effect system
   * @param {Object} player - Player object
   * @returns {Object} Adapted player object
   */
  static adaptPlayer(player) {
    // Ensure required properties exist
    if (!player.id && player.socketId) {
      player.id = player.socketId;
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
    player.entityType = 'player';

    // Add status effect calculation helpers
    this.addCalculationHelpers(player);
    
    // Add legacy compatibility methods
    this.addLegacyCompatibility(player);

    return player;
  }

  /**
   * Adapt a monster object to work with the new status effect system
   * @param {Object} monster - Monster object
   * @returns {Object} Adapted monster object
   */
  static adaptMonster(monster) {
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
    monster.entityType = 'monster';

    // Monsters don't have races, but add placeholder
    monster.race = 'Monster';

    // Add status effect calculation helpers
    this.addCalculationHelpers(monster);

    // Add monster-specific methods
    this.addMonsterMethods(monster);

    return monster;
  }

  /**
   * Add calculation helper methods to an entity
   * @param {Object} entity - Entity to modify
   * @private
   */
  static addCalculationHelpers(entity) {
    // Get base armor value
    entity.getBaseArmor = function() {
      return this.armor || 0;
    };

    // Get base damage value
    entity.getBaseDamage = function(baseDamage) {
      if (this.entityType === 'player') {
        return Math.floor(baseDamage * (this.damageMod || 1));
      }
      return baseDamage;
    };

    // Process stone armor degradation (for Rockhewn)
    entity.processStoneArmorDegradation = function(damage) {
      if (this.race === 'Rockhewn' && this.stoneArmorIntact) {
        const degradation = Math.min(damage, 1); // Degrade by 1 per hit
        this.stoneArmorValue = Math.max(0, (this.stoneArmorValue || 0) - degradation);
        
        if (this.stoneArmorValue <= 0) {
          this.stoneArmorIntact = false;
        }
        
        logger.debug(`Stone armor degraded: ${this.name} armor: ${this.stoneArmorValue}`);
      }
    };

    // Clear action submission (for stunned entities)
    entity.clearActionSubmission = function() {
      if (this.hasSubmittedAction) {
        this.hasSubmittedAction = false;
        this.submittedAction = null;
        this.actionSubmissionTime = null;
        this.actionValidationState = 'none';
      }
    };
  }

  /**
   * Add legacy compatibility methods to maintain existing API
   * @param {Object} entity - Entity to modify
   * @private
   */
  static addLegacyCompatibility(entity) {
    // Legacy status effect methods for backward compatibility
    entity.hasStatusEffect = function(effectName) {
      // This will be overridden by the status effect manager
      logger.warn('Using legacy hasStatusEffect - should be replaced by StatusEffectManager');
      return this.statusEffects && this.statusEffects[effectName] !== undefined;
    };

    entity.applyStatusEffect = function(effectName, data) {
      // This will be overridden by the status effect manager
      logger.warn('Using legacy applyStatusEffect - should be replaced by StatusEffectManager');
      this.statusEffects = this.statusEffects || {};
      this.statusEffects[effectName] = data;
    };

    entity.removeStatusEffect = function(effectName) {
      // This will be overridden by the status effect manager
      logger.warn('Using legacy removeStatusEffect - should be replaced by StatusEffectManager');
      if (this.statusEffects && this.statusEffects[effectName]) {
        delete this.statusEffects[effectName];
      }
    };
  }

  /**
   * Add monster-specific methods
   * @param {Object} monster - Monster to modify
   * @private
   */
  static addMonsterMethods(monster) {
    // Monster doesn't have some player-specific properties
    monster.isWarlock = false;
    monster.pendingDeath = false;

    // Monster age tracking
    if (monster.age === undefined) {
      monster.age = 1;
    }

    // Monster damage calculation
    monster.calculateAttackDamage = function() {
      const config = require('@config');
      return config.gameBalance.calculateMonsterDamage
        ? config.gameBalance.calculateMonsterDamage(this.age)
        : (this.baseDmg || 20) * (this.age + 1);
    };
  }

  /**
   * Validate that an entity has all required properties for the status effect system
   * @param {Object} entity - Entity to validate
   * @returns {boolean} Whether entity is valid
   */
  static validateEntity(entity) {
    const required = ['id', 'name', 'hp', 'maxHp', 'isAlive', 'entityType'];
    
    for (const prop of required) {
      if (entity[prop] === undefined) {
        logger.error(`Entity missing required property: ${prop}`, entity);
        return false;
      }
    }

    return true;
  }

  /**
   * Create a merged entities map for the status effect manager
   * @param {Map} players - Player map
   * @param {Object} monster - Monster object
   * @returns {Map} Combined entities map
   */
  static createEntitiesMap(players, monster = null) {
    const entities = new Map();

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
   * @param {Object} entity - Entity with legacy status effects
   * @param {NewStatusEffectManager} manager - New status effect manager
   */
  static migrateLegacyStatusEffects(entity, manager) {
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
          effectData.sourceId || entity.id,
          effectData.sourceName || 'Legacy',
          [] // Empty log for migration
        );
      }
    }

    // Clear legacy status effects to avoid conflicts
    entity.statusEffects = {};
  }

  /**
   * Sync status effect flags back to legacy system for compatibility
   * @param {Object} entity - Entity to sync
   * @param {NewStatusEffectManager} manager - Status effect manager
   */
  static syncLegacyFlags(entity, manager) {
    // Update vulnerability flags
    const vulnerableEffects = manager.getEffectsByType(entity.id, 'vulnerable');
    if (vulnerableEffects.length > 0) {
      entity.isVulnerable = true;
      // Use the highest vulnerability value
      entity.vulnerabilityIncrease = Math.max(
        ...vulnerableEffects.map(e => e.params.damageIncrease || 0)
      );
    } else {
      entity.isVulnerable = false;
      entity.vulnerabilityIncrease = 0;
    }

    // Update other legacy flags as needed
    // This maintains compatibility with existing code that checks these flags
  }
}

module.exports = EntityAdapter;