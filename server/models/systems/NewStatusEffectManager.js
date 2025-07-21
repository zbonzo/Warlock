/**
 * @fileoverview New Status Effect Manager for individual effect instances
 * Manages collections of StatusEffect instances with proper stacking and calculations
 */
const StatusEffect = require('./StatusEffect');
const config = require('../../config');
const messages = require('../../config/messages');
const logger = require('../../utils/logger');

/**
 * New StatusEffectManager that handles individual StatusEffect instances
 * Supports multiple instances of the same effect type with proper calculation merging
 */
class NewStatusEffectManager {
  /**
   * Create a new status effect manager
   * @param {Map} entities - Map of entities (players and/or monsters)
   * @param {Object} warlockSystem - Warlock system for detection (optional)
   */
  constructor(entities = new Map(), warlockSystem = null) {
    this.entities = entities; // Can include both players and monsters
    this.warlockSystem = warlockSystem;
    
    // Map of entityId -> Array of StatusEffect instances
    this.effectsByEntity = new Map();
    
    // Global effect counter for debugging
    this.totalEffectsApplied = 0;
    
    logger.debug('NewStatusEffectManager initialized');
  }

  /**
   * Add an entity to track (player or monster)
   * @param {string} entityId - Entity ID
   * @param {Object} entity - Entity object
   */
  addEntity(entityId, entity) {
    this.entities.set(entityId, entity);
    if (!this.effectsByEntity.has(entityId)) {
      this.effectsByEntity.set(entityId, []);
    }
  }

  /**
   * Remove an entity from tracking
   * @param {string} entityId - Entity ID
   */
  removeEntity(entityId) {
    this.entities.delete(entityId);
    this.effectsByEntity.delete(entityId);
  }

  /**
   * Apply a status effect to an entity
   * @param {string} targetId - Target entity ID
   * @param {string} effectType - Type of effect
   * @param {Object} params - Effect parameters
   * @param {string} sourceId - Source entity ID (who applied it)
   * @param {string} sourceName - Source entity name
   * @param {Array} log - Event log
   * @returns {StatusEffect|null} Created effect instance or null if failed
   */
  applyEffect(targetId, effectType, params = {}, sourceIdOrLog = null, sourceName = null, log = []) {
    // Handle legacy 4-parameter signature: applyEffect(targetId, effectType, params, log)
    let actualSourceId = sourceIdOrLog;
    let actualSourceName = sourceName;
    let actualLog = log;
    
    if (Array.isArray(sourceIdOrLog) && sourceName === null) {
      // Legacy signature detected: (targetId, effectType, params, log)
      actualSourceId = 'System';
      actualSourceName = 'Combat';
      actualLog = sourceIdOrLog;
    }

    const target = this.entities.get(targetId);
    if (!target) {
      logger.warn(`Cannot apply effect ${effectType}: target ${targetId} not found`);
      return null;
    }

    // Get effect configuration
    const effectConfig = config.statusEffects[effectType];
    if (!effectConfig) {
      logger.warn(`Unknown effect type: ${effectType}`);
      return null;
    }

    // Initialize effects array for this entity if needed
    if (!this.effectsByEntity.has(targetId)) {
      this.effectsByEntity.set(targetId, []);
    }

    const existingEffects = this.effectsByEntity.get(targetId);
    const sameTypeEffects = existingEffects.filter(e => e.type === effectType && e.isActive);

    // Check if we should stack, refresh, or replace
    let newEffect = null;

    if (effectConfig.stackable && sameTypeEffects.length > 0) {
      // For stackable effects like poison, create new instance
      newEffect = new StatusEffect(effectType, params, actualSourceId, actualSourceName, targetId);
      existingEffects.push(newEffect);
      this.logEffectMessage(effectType, 'stacked', target, actualLog, params, actualSourceName);
    } else if (effectConfig.refreshable && sameTypeEffects.length > 0) {
      // Refresh existing effect
      const existingEffect = sameTypeEffects[0]; // Take the first one
      existingEffect.refresh(params, effectConfig.stackable);
      newEffect = existingEffect;
      this.logEffectMessage(effectType, 'refreshed', target, actualLog, params, actualSourceName);
    } else if (sameTypeEffects.length > 0) {
      // Effect exists and is not stackable or refreshable - do nothing
      logger.debug(`Effect ${effectType} already exists on ${targetId} and is not stackable/refreshable`);
      return sameTypeEffects[0];
    } else {
      // Apply new effect
      newEffect = new StatusEffect(effectType, params, actualSourceId, actualSourceName, targetId);
      existingEffects.push(newEffect);
      this.logEffectMessage(effectType, 'applied', target, actualLog, params, actualSourceName);
    }

    // Handle special effect application logic
    this.handleSpecialEffectApplication(target, effectType, params, newEffect);

    this.totalEffectsApplied++;
    logger.debug(`Applied ${effectType} to ${targetId} (total effects: ${this.getTotalActiveEffects()})`);

    return newEffect;
  }

  /**
   * Remove a specific effect instance
   * @param {string} targetId - Target entity ID
   * @param {string} effectId - Specific effect instance ID
   * @param {Array} log - Event log
   * @returns {boolean} Whether effect was removed
   */
  removeEffect(targetId, effectId, log = []) {
    const effects = this.effectsByEntity.get(targetId) || [];
    const effectIndex = effects.findIndex(e => e.id === effectId);
    
    if (effectIndex === -1) return false;

    const effect = effects[effectIndex];
    effect.onExpired(this.entities.get(targetId), log);
    effects.splice(effectIndex, 1);

    logger.debug(`Removed effect ${effect.type} (${effectId}) from ${targetId}`);
    return true;
  }

  /**
   * Remove all effects of a specific type from an entity
   * @param {string} targetId - Target entity ID
   * @param {string} effectType - Effect type to remove
   * @param {Array} log - Event log
   * @returns {number} Number of effects removed
   */
  removeEffectsByType(targetId, effectType, log = []) {
    const effects = this.effectsByEntity.get(targetId) || [];
    const toRemove = effects.filter(e => e.type === effectType);
    
    let removed = 0;
    for (const effect of toRemove) {
      if (this.removeEffect(targetId, effect.id, log)) {
        removed++;
      }
    }

    return removed;
  }

  /**
   * Process all timed effects for all entities
   * @param {Array} log - Event log
   */
  processTimedEffects(log = []) {
    for (const [entityId, entity] of this.entities.entries()) {
      if (!entity.isAlive && entity.isAlive !== undefined) continue; // Skip dead entities
      
      this.processEntityEffects(entityId, entity, log);
    }
  }

  /**
   * Process effects for a single entity
   * @param {string} entityId - Entity ID
   * @param {Object} entity - Entity object
   * @param {Array} log - Event log
   * @private
   */
  processEntityEffects(entityId, entity, log) {
    const effects = this.effectsByEntity.get(entityId) || [];
    const toRemove = [];

    // Sort effects by priority (lower numbers first)
    const sortedEffects = effects
      .filter(e => e.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const effect of sortedEffects) {
      const result = effect.processTurn(entity, log);
      
      // Handle any side effects
      for (const sideEffect of result.effects || []) {
        this.handleSideEffect(sideEffect, entityId, entity, log);
      }

      // Mark for removal if expired
      if (result.shouldRemove) {
        toRemove.push(effect.id);
      }
    }

    // Remove expired effects
    for (const effectId of toRemove) {
      this.removeEffect(entityId, effectId, log);
    }
  }

  /**
   * Check if an entity has a specific effect type
   * @param {string} entityId - Entity ID
   * @param {string} effectType - Effect type to check
   * @returns {boolean} Whether entity has the effect
   */
  hasEffect(entityId, effectType) {
    const effects = this.effectsByEntity.get(entityId) || [];
    return effects.some(e => e.type === effectType && e.isActive);
  }

  /**
   * Get all active effects of a specific type for an entity
   * @param {string} entityId - Entity ID
   * @param {string} effectType - Effect type
   * @returns {Array<StatusEffect>} Array of matching effects
   */
  getEffectsByType(entityId, effectType) {
    const effects = this.effectsByEntity.get(entityId) || [];
    return effects.filter(e => e.type === effectType && e.isActive);
  }

  /**
   * Get all active effects for an entity
   * @param {string} entityId - Entity ID
   * @returns {Array<StatusEffect>} Array of all active effects
   */
  getAllEffects(entityId) {
    const effects = this.effectsByEntity.get(entityId) || [];
    return effects.filter(e => e.isActive);
  }

  /**
   * Calculate the combined effect of all status effects on a value
   * @param {string} entityId - Entity ID
   * @param {string} calculationType - Type of calculation
   * @param {number} baseValue - Base value before effects
   * @returns {number} Modified value after all effects
   */
  calculateModifiedValue(entityId, calculationType, baseValue) {
    const effects = this.getAllEffects(entityId);
    
    let additive = 0;
    let percentageTotal = 0;
    let multiplicative = 1;

    // Collect all contributions
    for (const effect of effects) {
      const contribution = effect.getCalculationContribution(calculationType);
      additive += contribution.additive;
      percentageTotal += contribution.percentage; // Additive percentage changes
      multiplicative *= contribution.multiplicative;
    }

    // Apply modifications in order: base + additive, then percentage (additive), then multiplicative
    let result = baseValue + additive;
    result = result * (1 + percentageTotal / 100);
    result = result * multiplicative;

    return Math.max(0, Math.floor(result));
  }

  /**
   * Check if an entity is prevented from performing an action
   * @param {string} entityId - Entity ID
   * @param {string} actionType - Type of action
   * @returns {boolean} Whether the action is prevented
   */
  isActionPrevented(entityId, actionType) {
    const effects = this.getAllEffects(entityId);
    return effects.some(effect => effect.preventsAction(actionType));
  }

  /**
   * Apply racial passive effects to an entity
   * @param {string} entityId - Entity ID
   * @param {string} race - Race name
   * @param {Array} log - Event log
   */
  applyRacialPassives(entityId, race, log = []) {
    const racialConfig = config.raceAttributes[race];
    if (!racialConfig) return;

    // Apply racial passive effects based on race
    switch (race) {
      case 'Rockhewn':
        this.applyEffect(entityId, 'stoneArmor', {
          armor: 6,
          isPassive: true,
          isPermanent: true,
          degradationPerHit: 1
        }, entityId, 'Stone Armor', log);
        break;

      case 'Crestfallen':
        this.applyEffect(entityId, 'moonbeam', {
          isPassive: true,
          isPermanent: true,
          healthThreshold: 0.5
        }, entityId, 'Moonbeam', log);
        break;

      case 'Kinfolk':
        this.applyEffect(entityId, 'lifeBond', {
          healingPercent: 0.05,
          isPassive: true,
          isPermanent: true
        }, entityId, 'Life Bond', log);
        break;

      case 'Lich':
        this.applyEffect(entityId, 'undying', {
          resurrectedHp: 1,
          isPassive: true,
          usesLeft: 1
        }, entityId, 'Undying', log);
        break;
    }
  }

  /**
   * Handle special effect application logic
   * @param {Object} target - Target entity
   * @param {string} effectType - Effect type
   * @param {Object} params - Effect parameters
   * @param {StatusEffect} effect - Effect instance
   * @private
   */
  handleSpecialEffectApplication(target, effectType, params, effect) {
    switch (effectType) {
      case 'vulnerable':
        // Set vulnerability flags for easier damage calculation
        if (target.isVulnerable !== undefined) {
          target.isVulnerable = true;
          target.vulnerabilityIncrease = params.damageIncrease || 25;
        }
        break;

      case 'stunned':
        // Stun logic is handled in action validation
        break;

      case 'healingOverTime':
        // Store healer information for detection
        if (params.healerId && params.healerName) {
          effect.params.healerId = params.healerId;
          effect.params.healerName = params.healerName;
          effect.params.isWarlock = params.isWarlock || false;
        }
        break;
    }
  }

  /**
   * Handle side effects from effect processing
   * @param {Object} sideEffect - Side effect data
   * @param {string} entityId - Entity ID
   * @param {Object} entity - Entity object
   * @param {Array} log - Event log
   * @private
   */
  handleSideEffect(sideEffect, entityId, entity, log) {
    switch (sideEffect.type) {
      case 'warlock_detection':
        if (this.warlockSystem && this.warlockSystem.markWarlockDetected) {
          this.warlockSystem.markWarlockDetected(sideEffect.targetId, log);
        }
        
        const detectionLog = {
          type: 'healing_over_time_detection',
          public: true,
          targetId: sideEffect.targetId,
          attackerId: sideEffect.sourceId,
          message: sideEffect.message,
          privateMessage: `Your healing over time detected that ${entity.name} is a Warlock!`,
          attackerMessage: `Your healing over time revealed that ${entity.name} is corrupted!`,
        };
        log.push(detectionLog);
        break;

      case 'death':
        // Death is already handled in the effect processing
        logger.debug(`Entity ${entityId} died from ${sideEffect.cause}`);
        break;
    }
  }

  /**
   * Log effect messages using the centralized message system
   * @param {string} effectType - Effect type
   * @param {string} messageType - Message type
   * @param {Object} target - Target entity
   * @param {Array} log - Event log
   * @param {Object} params - Effect parameters
   * @param {string} sourceName - Source name
   * @private
   */
  logEffectMessage(effectType, messageType, target, log, params, sourceName) {
    const message = config.statusEffects.getEffectMessage(effectType, messageType, {
      playerName: target.name || 'Monster',
      sourceName: sourceName,
      damage: params.damage,
      armor: params.armor,
      turns: params.turns || params.duration,
      amount: params.amount,
      damageIncrease: params.damageIncrease,
    });

    if (message) {
      log.push({
        type: `status_effect_${messageType}`,
        public: true,
        targetId: target.id,
        message: message,
        privateMessage: '',
        attackerMessage: '',
      });
    }
  }

  /**
   * Clear all effects from an entity (used on death/resurrection)
   * @param {string} entityId - Entity ID
   */
  clearAllEffects(entityId) {
    const effects = this.effectsByEntity.get(entityId) || [];
    
    // Deactivate all effects
    for (const effect of effects) {
      effect.isActive = false;
    }

    // Clear the array
    this.effectsByEntity.set(entityId, []);

    // Clear legacy flags if they exist
    const entity = this.entities.get(entityId);
    if (entity) {
      if (entity.isVulnerable !== undefined) {
        entity.isVulnerable = false;
        entity.vulnerabilityIncrease = 0;
      }
    }

    logger.debug(`Cleared all effects from ${entityId}`);
  }

  /**
   * Get statistics about active effects
   * @returns {Object} Statistics object
   */
  getEffectStatistics() {
    let totalEffects = 0;
    const effectsByType = {};
    const entitiesCounts = {};

    for (const [entityId, effects] of this.effectsByEntity.entries()) {
      const activeEffects = effects.filter(e => e.isActive);
      totalEffects += activeEffects.length;

      for (const effect of activeEffects) {
        effectsByType[effect.type] = (effectsByType[effect.type] || 0) + 1;
        
        if (!entitiesCounts[effect.type]) {
          entitiesCounts[effect.type] = new Set();
        }
        entitiesCounts[effect.type].add(entityId);
      }
    }

    // Convert sets to counts
    for (const effectType of Object.keys(entitiesCounts)) {
      entitiesCounts[effectType] = entitiesCounts[effectType].size;
    }

    return {
      totalEffects,
      effectsByType,
      entitiesCounts,
      totalEntities: this.entities.size,
      totalEffectsApplied: this.totalEffectsApplied,
    };
  }

  /**
   * Get total number of active effects across all entities
   * @returns {number} Total active effects
   */
  getTotalActiveEffects() {
    let total = 0;
    for (const effects of this.effectsByEntity.values()) {
      total += effects.filter(e => e.isActive).length;
    }
    return total;
  }

  /**
   * Debug method to get all active effects across all entities
   * @returns {Object} All active effects organized by entity
   */
  getAllActiveEffects() {
    const activeEffects = {};

    for (const [entityId, effects] of this.effectsByEntity.entries()) {
      const activeEntityEffects = effects.filter(e => e.isActive);
      if (activeEntityEffects.length > 0) {
        const entity = this.entities.get(entityId);
        activeEffects[entityId] = {
          entityName: entity?.name || 'Unknown',
          effects: activeEntityEffects.map(e => e.getSummary())
        };
      }
    }

    return activeEffects;
  }

  /**
   * COMPATIBILITY METHODS - Maintain compatibility with legacy GameRoom.js interface
   */

  /**
   * Check if a player is stunned (legacy compatibility method)
   * @param {string} playerId - Player ID to check
   * @returns {boolean} Whether the player is stunned
   */
  isPlayerStunned(playerId) {
    return this.hasEffect(playerId, 'stunned');
  }

  /**
   * Check if a player is invisible (legacy compatibility method) 
   * @param {string} playerId - Player ID to check
   * @returns {boolean} Whether the player is invisible
   */
  isPlayerInvisible(playerId) {
    return this.hasEffect(playerId, 'invisible');
  }

  /**
   * Get all effects for a player (legacy compatibility method)
   * @param {string} playerId - Player ID
   * @returns {Object} Object containing all active effects (legacy format)
   */
  getPlayerEffects(playerId) {
    const effects = {};
    const activeEffects = this.getAllEffects(playerId);
    
    // Convert to legacy format (single effect per type)
    for (const effect of activeEffects) {
      if (effect.isActive) {
        effects[effect.type] = {
          turns: effect.turnsRemaining,
          ...effect.params
        };
      }
    }
    
    return effects;
  }

  /**
   * Apply effect with legacy signature (for CombatSystem compatibility)
   * @param {string} targetId - Target ID
   * @param {string} effectType - Effect type
   * @param {Object} params - Effect parameters
   * @param {Array} log - Event log
   * @returns {boolean} Whether the effect was applied successfully
   */
  applyEffectLegacy(targetId, effectType, params, log = []) {
    return this.applyEffect(targetId, effectType, params, 'System', 'Combat', log);
  }

  /**
   * Apply multiple effects to a player at once (legacy compatibility method)
   * @param {string} playerId - Player ID
   * @param {Object} effects - Object with effect names as keys and params as values
   * @param {Array} log - Event log
   * @returns {number} Number of effects successfully applied
   */
  applyMultipleEffects(playerId, effects, log = []) {
    let appliedCount = 0;

    for (const [effectName, params] of Object.entries(effects)) {
      if (this.applyEffect(playerId, effectName, params, playerId, 'System', log)) {
        appliedCount++;
      }
    }

    return appliedCount;
  }

  /**
   * Remove a specific effect by type (legacy compatibility method)
   * @param {string} playerId - Player ID
   * @param {string} effectType - Effect type to remove
   * @param {Array} log - Event log
   * @returns {boolean} Whether any effect was removed
   */
  removeEffectByType(playerId, effectType, log = []) {
    return this.removeEffectsByType(playerId, effectType, log) > 0;
  }

  /**
   * Get effect duration remaining (legacy compatibility method)
   * @param {string} playerId - Player ID
   * @param {string} effectName - Effect name
   * @returns {number} Turns remaining (0 if no effect)
   */
  getEffectDuration(playerId, effectName) {
    const effects = this.getEffectsByType(playerId, effectName);
    if (effects.length === 0) return 0;
    
    // Return the longest duration if multiple effects of same type
    return Math.max(...effects.map(e => e.turnsRemaining));
  }

  /**
   * Get statistics about active effects (legacy compatibility method)
   * @returns {Object} Statistics object
   */
  getEffectStatistics() {
    const stats = {
      totalEffects: 0,
      effectsByType: {},
      playersCounts: {
        poisoned: 0,
        shielded: 0,
        invisible: 0,
        stunned: 0,
        vulnerable: 0,
        healingOverTime: 0,
      },
    };

    // Count effects by type and entity
    const entitiesWithEffects = new Set();
    
    for (const [entityId, effects] of this.effectsByEntity.entries()) {
      const activeEffects = effects.filter(e => e.isActive);
      
      for (const effect of activeEffects) {
        stats.totalEffects++;
        stats.effectsByType[effect.type] = (stats.effectsByType[effect.type] || 0) + 1;
        
        // Count entities with specific effect types
        if (stats.playersCounts.hasOwnProperty(effect.type)) {
          if (!entitiesWithEffects.has(`${entityId}-${effect.type}`)) {
            stats.playersCounts[effect.type]++;
            entitiesWithEffects.add(`${entityId}-${effect.type}`);
          }
        }
      }
    }

    return stats;
  }
}

module.exports = NewStatusEffectManager;