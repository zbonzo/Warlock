/**
 * @fileoverview New Status Effect Manager for individual effect instances
 * Manages collections of StatusEffect instances with proper stacking and calculations
 */
import StatusEffect from './StatusEffect.js';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

interface Entity {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isAlive?: boolean;
  isWarlock?: boolean;
  race?: string;
  isVulnerable?: boolean;
  vulnerabilityIncrease?: number;
  stoneArmorIntact?: boolean;
  stoneArmorValue?: number;
  processStoneArmorDegradation?: (_damage: number) => void;
}

interface WarlockSystem {
  markWarlockDetected?: (_targetId: string, _log: any[]) => void;
}

interface LogEntry {
  type: string;
  public: boolean;
  targetId?: string;
  attackerId?: string;
  message: string;
  privateMessage: string;
  attackerMessage: string;
}

interface SideEffect {
  type: string;
  targetId?: string;
  sourceId?: string;
  message?: string;
  cause?: string;
}

interface EffectConfig {
  stackable?: boolean;
  refreshable?: boolean;
  [key: string]: any;
}

interface EffectStatistics {
  totalEffects: number;
  effectsByType: Record<string, number>;
  entitiesCounts: Record<string, number>;
  totalEntities: number;
  totalEffectsApplied: number;
}

interface LegacyEffectParams {
  turns?: number;
  damage?: number;
  armor?: number;
  amount?: number;
  damageIncrease?: number;
  healerId?: string;
  healerName?: string;
  isWarlock?: boolean;
  [key: string]: any;
}

/**
 * New StatusEffectManager that handles individual StatusEffect instances
 * Supports multiple instances of the same effect type with proper calculation merging
 */
class NewStatusEffectManager {
  private entities: Map<string, Entity>;
  private warlockSystem: WarlockSystem | null;
  private effectsByEntity: Map<string, StatusEffect[]>;
  private totalEffectsApplied: number;

  /**
   * Create a new status effect manager
   * @param entities - Map of entities (players and/or monsters)
   * @param warlockSystem - Warlock system for detection (optional)
   */
  constructor(entities: Map<string, Entity> = new Map(), warlockSystem: WarlockSystem | null = null) {
    this.entities = entities; // Can include both players and monsters
    this.warlockSystem = warlockSystem;

    // Map of entityId -> Array of StatusEffect instances
    this.effectsByEntity = new Map();

    // Global effect counter for debugging
    this.totalEffectsApplied = 0;

    logger.debug('NewStatusEffectManager initialized');
  }

  /**
   * Safely get property from object to avoid injection warnings
   */
  private safeGetProperty(obj: any, key: string): any {
    if (!obj || typeof obj !== 'object') return undefined;
    const objectMap = new Map(Object.entries(obj));
    return objectMap.get(key);
  }

  /**
   * Safely set property on object to avoid injection warnings
   */
  private safeSetProperty(obj: any, key: string, value: any): void {
    if (!obj || typeof obj !== 'object') return;
    Object.defineProperty(obj, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }

  /**
   * Add an entity to track (player or monster)
   */
  addEntity(entityId: string, entity: Entity): void {
    this.entities.set(entityId, entity);
    if (!this.effectsByEntity.has(entityId)) {
      this.effectsByEntity.set(entityId, []);
    }
  }

  /**
   * Remove an entity from tracking
   */
  removeEntity(entityId: string): void {
    this.entities.delete(entityId);
    this.effectsByEntity.delete(entityId);
  }

  /**
   * Apply a status effect to an entity
   * @param targetId - Target entity ID
   * @param effectType - Type of effect
   * @param params - Effect parameters
   * @param sourceId - Source entity ID (who applied it)
   * @param sourceName - Source entity name
   * @param log - Event log
   * @returns Created effect instance or null if failed
   */
  applyEffect(targetId: string, effectType: string, params: LegacyEffectParams = {}, sourceIdOrLog: string | any[] | null = null, sourceName: string | null = null, log: any[] = []): StatusEffect | null {
    // Handle legacy 4-parameter signature: applyEffect(targetId, effectType, params, log)
    let actualSourceId: string | null = sourceIdOrLog as string;
    let actualSourceName: string | null = sourceName;
    let actualLog: any[] = log;

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
    const statusEffects = config.statusEffects;
    const effects = statusEffects?.effects;
    const effectConfig = effects ? this.safeGetProperty(effects, effectType) as EffectConfig : null;
    if (!effectConfig) {
      logger.warn(`Unknown effect type: ${effectType}`);
      return null;
    }

    // Initialize effects array for this entity if needed
    if (!this.effectsByEntity.has(targetId)) {
      this.effectsByEntity.set(targetId, []);
    }

    const existingEffects = this.effectsByEntity.get(targetId)!;
    const sameTypeEffects = existingEffects.filter(e => e.type === effectType && e.isActive);

    // Check if we should stack, refresh, or replace
    let newEffect: StatusEffect | null = null;

    if (effectConfig.stackable && sameTypeEffects.length > 0) {
      // For stackable effects like poison, create new instance
      newEffect = new StatusEffect(effectType, params, actualSourceId, actualSourceName, targetId);
      existingEffects.push(newEffect);
      this.logEffectMessage(effectType, 'stacked', target, actualLog, params, actualSourceName);
    } else if (effectConfig.refreshable && sameTypeEffects.length > 0) {
      // Refresh existing effect
      const existingEffect = sameTypeEffects[0]; // Take the first one
      if (existingEffect) {
        existingEffect.refresh(params, effectConfig.stackable);
        newEffect = existingEffect;
      }
      this.logEffectMessage(effectType, 'refreshed', target, actualLog, params, actualSourceName);
    } else if (sameTypeEffects.length > 0) {
      // Effect exists and is not stackable or refreshable - do nothing
      logger.debug(`Effect ${effectType} already exists on ${targetId} and is not stackable/refreshable`);
      return sameTypeEffects[0] || null;
    } else {
      // Apply new effect
      newEffect = new StatusEffect(effectType, params, actualSourceId, actualSourceName, targetId);
      existingEffects.push(newEffect);
      this.logEffectMessage(effectType, 'applied', target, actualLog, params, actualSourceName);
    }

    // Handle special effect application logic
    if (newEffect) {
      this.handleSpecialEffectApplication(target, effectType, params, newEffect);
    }

    this.totalEffectsApplied++;
    logger.debug(`Applied ${effectType} to ${targetId} (total effects: ${this.getTotalActiveEffects()})`);

    return newEffect;
  }

  /**
   * Remove a specific effect instance
   */
  removeEffect(targetId: string, effectId: string, _log: any[] = []): boolean {
    const effects = this.effectsByEntity.get(targetId) || [];
    const effectIndex = effects.findIndex(e => e.id === effectId);

    if (effectIndex === -1) return false;

    const effect = effects.at(effectIndex);
    if (effect) {
      // Mark effect as expired and let normal processing handle removal
      effect.isActive = false;
      effects.splice(effectIndex, 1);
    }

    if (effect) {
      logger.debug(`Removed effect ${effect.type} (${effectId}) from ${targetId}`);
    }
    return true;
  }

  /**
   * Remove all effects of a specific type from an entity
   */
  removeEffectsByType(targetId: string, effectType: string, log: any[] = []): number {
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
   */
  processTimedEffects(log: any[] = []): void {
    for (const [entityId, entity] of this.entities.entries()) {
      if (!entity.isAlive && entity.isAlive !== undefined) continue; // Skip dead entities

      this.processEntityEffects(entityId, entity, log);
    }
  }

  /**
   * Process effects for a single entity
   * @private
   */
  private processEntityEffects(entityId: string, entity: Entity, log: any[]): void {
    const effects = this.effectsByEntity.get(entityId) || [];
    const toRemove: string[] = [];

    // Sort effects by priority (lower numbers first)
    const sortedEffects = effects
      .filter(e => e.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const effect of sortedEffects) {
      // Ensure entity has proper isAlive property
      const entityWithAlive = { ...entity, isAlive: entity.isAlive ?? true };
      const result = effect.processTurn(entityWithAlive, log);

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
   */
  hasEffect(entityId: string, effectType: string): boolean {
    const effects = this.effectsByEntity.get(entityId) || [];
    return effects.some(e => e.type === effectType && e.isActive);
  }

  /**
   * Get all active effects of a specific type for an entity
   */
  getEffectsByType(entityId: string, effectType: string): StatusEffect[] {
    const effects = this.effectsByEntity.get(entityId) || [];
    return effects.filter(e => e.type === effectType && e.isActive);
  }

  /**
   * Get all active effects for an entity
   */
  getAllEffects(entityId: string): StatusEffect[] {
    const effects = this.effectsByEntity.get(entityId) || [];
    return effects.filter(e => e.isActive);
  }

  /**
   * Calculate the combined effect of all status effects on a value
   */
  calculateModifiedValue(entityId: string, calculationType: string, baseValue: number): number {
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
    result = result * (1 + (percentageTotal / 100));
    result = result * multiplicative;

    return Math.max(0, Math.floor(result));
  }

  /**
   * Check if an entity is prevented from performing an action
   */
  isActionPrevented(entityId: string, actionType: string): boolean {
    const effects = this.getAllEffects(entityId);
    return effects.some(effect => effect.preventsAction(actionType));
  }

  /**
   * Apply racial passive effects to an entity
   */
  applyRacialPassives(entityId: string, race: string, log: any[] = []): void {
    const races = this.safeGetProperty(config, 'races');
    const raceAttributes = this.safeGetProperty(config, 'raceAttributes');
    const racialConfig = (races ? this.safeGetProperty(races, race) : null) || (raceAttributes ? this.safeGetProperty(raceAttributes, race) : null);
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
   * @private
   */
  private handleSpecialEffectApplication(target: Entity, effectType: string, params: LegacyEffectParams, effect: StatusEffect): void {
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
          effect.params['isWarlock'] = params['isWarlock'] || false;
        }
        break;
    }
  }

  /**
   * Handle side effects from effect processing
   * @private
   */
  private handleSideEffect(sideEffect: SideEffect, entityId: string, entity: Entity, log: any[]): void {
    switch (sideEffect.type) {
      case 'warlock_detection':
        if (this.warlockSystem && this.warlockSystem.markWarlockDetected) {
          this.warlockSystem.markWarlockDetected(sideEffect.targetId!, log);
        }

        {
        const detectionLog: LogEntry = {
          type: 'healing_over_time_detection',
          public: true,
          targetId: sideEffect.targetId!,
          attackerId: sideEffect.sourceId!,
          message: sideEffect.message!,
          privateMessage: `Your healing over time detected that ${entity.name} is a Warlock!`,
          attackerMessage: `Your healing over time revealed that ${entity.name} is corrupted!`,
        };
        log.push(detectionLog);
        break;
        }

      case 'death':
        // Death is already handled in the effect processing
        logger.debug(`Entity ${entityId} died from ${sideEffect.cause}`);
        break;
    }
  }

  /**
   * Log effect messages using the centralized message system
   * @private
   */
  private logEffectMessage(effectType: string, messageType: string, target: Entity, log: any[], params: LegacyEffectParams, _sourceName: string | null): void {
    // Create a simple status effect message
    const playerName = target.name || 'Monster';
    let message = `${playerName} ${messageType} ${effectType}`;

    if (params.damage) {
      message += ` (${params.damage} damage)`;
    }
    if (params.turns) {
      message += ` for ${params.turns} turns`;
    }

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
   */
  clearAllEffects(entityId: string): void {
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
   */
  getEffectStatistics(): EffectStatistics {
    let totalEffects = 0;
    const effectsByType: Record<string, number> = {};
    const entitiesCounts: Record<string, number> = {};
    const entitiesWithEffect: Record<string, Set<string>> = {};

    for (const [entityId, effects] of this.effectsByEntity.entries()) {
      const activeEffects = effects.filter(e => e.isActive);
      totalEffects += activeEffects.length;

      for (const effect of activeEffects) {
        effectsByType[effect.type] = (effectsByType[effect.type] || 0) + 1;

        if (!entitiesWithEffect[effect.type]) {
          entitiesWithEffect[effect.type] = new Set();
        }
        entitiesWithEffect[effect.type]?.add(entityId);
      }
    }

    // Convert sets to counts
    for (const effectType of Object.keys(entitiesWithEffect)) {
      const entitiesForType = this.safeGetProperty(entitiesWithEffect, effectType);
      this.safeSetProperty(entitiesCounts, effectType, entitiesForType?.size || 0);
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
   */
  getTotalActiveEffects(): number {
    let total = 0;
    for (const effects of this.effectsByEntity.values()) {
      total += effects.filter(e => e.isActive).length;
    }
    return total;
  }

  /**
   * Debug method to get all active effects across all entities
   */
  getAllActiveEffects(): Record<string, { entityName: string; effects: any[] }> {
    const activeEffects: Record<string, { entityName: string; effects: any[] }> = {};

    for (const [entityId, effects] of this.effectsByEntity.entries()) {
      const activeEntityEffects = effects.filter(e => e.isActive);
      if (activeEntityEffects.length > 0) {
        const entity = this.entities.get(entityId);
        this.safeSetProperty(activeEffects, entityId, {
          entityName: entity?.name || 'Unknown',
          effects: activeEntityEffects.map(e => e.getSummary())
        });
      }
    }

    return activeEffects;
  }

  /**
   * COMPATIBILITY METHODS - Maintain compatibility with legacy GameRoom.js interface
   */

  /**
   * Check if a player is stunned (legacy compatibility method)
   */
  isPlayerStunned(playerId: string): boolean {
    return this.hasEffect(playerId, 'stunned');
  }

  /**
   * Check if a player is invisible (legacy compatibility method)
   */
  isPlayerInvisible(playerId: string): boolean {
    return this.hasEffect(playerId, 'invisible');
  }

  /**
   * Get all effects for a player (legacy compatibility method)
   * @returns Object containing all active effects (legacy format)
   */
  getPlayerEffects(playerId: string): Record<string, any> {
    const effects: Record<string, any> = {};
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
   * @returns Whether the effect was applied successfully
   */
  applyEffectLegacy(targetId: string, effectType: string, params: LegacyEffectParams, log: any[] = []): StatusEffect | null {
    return this.applyEffect(targetId, effectType, params, 'System', 'Combat', log);
  }

  /**
   * Apply multiple effects to a player at once (legacy compatibility method)
   * @returns Number of effects successfully applied
   */
  applyMultipleEffects(playerId: string, effects: Record<string, LegacyEffectParams>, log: any[] = []): number {
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
   * @returns Whether any effect was removed
   */
  removeEffectByType(playerId: string, effectType: string, log: any[] = []): boolean {
    return this.removeEffectsByType(playerId, effectType, log) > 0;
  }

  /**
   * Get effect duration remaining (legacy compatibility method)
   * @returns Turns remaining (0 if no effect)
   */
  getEffectDuration(playerId: string, effectName: string): number {
    const effects = this.getEffectsByType(playerId, effectName);
    if (effects.length === 0) return 0;

    // Return the longest duration if multiple effects of same type
    return Math.max(...effects.map(e => e.turnsRemaining));
  }

  /**
   * Get statistics about active effects (legacy compatibility method)
   */
  getEffectStatisticsLegacy(): {
    totalEffects: number;
    effectsByType: Record<string, number>;
    playersCounts: Record<string, number>;
  } {
    const stats = {
      totalEffects: 0,
      effectsByType: {} as Record<string, number>,
      playersCounts: {
        poisoned: 0,
        shielded: 0,
        invisible: 0,
        stunned: 0,
        vulnerable: 0,
        healingOverTime: 0,
      } as Record<string, number>,
    };

    // Count effects by type and entity
    const entitiesWithEffects = new Set<string>();

    for (const [entityId, effects] of this.effectsByEntity.entries()) {
      const activeEffects = effects.filter(e => e.isActive);

      for (const effect of activeEffects) {
        stats.totalEffects++;
        const currentTypeCount = this.safeGetProperty(stats.effectsByType, effect.type) || 0;
        this.safeSetProperty(stats.effectsByType, effect.type, currentTypeCount + 1);

        // Count entities with specific effect types
        if (Object.prototype.hasOwnProperty.call(stats.playersCounts, effect.type)) {
          if (!entitiesWithEffects.has(`${entityId}-${effect.type}`)) {
            stats.playersCounts[effect.type] = (stats.playersCounts[effect.type] || 0) + 1;
            entitiesWithEffects.add(`${entityId}-${effect.type}`);
          }
        }
      }
    }

    return stats;
  }
}

export default NewStatusEffectManager;
