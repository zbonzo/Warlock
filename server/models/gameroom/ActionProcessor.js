/**
 * @fileoverview Action processing utilities for GameRoom
 * Handles action validation, coordination analysis, and action execution
 */
const config = require('@config');
const logger = require('@utils/logger');

/**
 * ActionProcessor handles all action-related operations
 */
class ActionProcessor {
  constructor(gameRoom) {
    this.gameRoom = gameRoom;
    this.pendingActions = [];
    this.pendingRacialActions = [];
  }

  /**
   * Add a class ability action for a player
   * @param {string} actorId - ID of acting player
   * @param {string} actionType - Type of action/ability
   * @param {string} targetId - ID of target
   * @param {Object} options - Additional options
   * @returns {boolean} Success status
   */
  addAction(actorId, actionType, targetId, options = {}) {
    if (!this.gameRoom.started) return false;

    const actor = this.gameRoom.players.get(actorId);
    if (!actor || !actor.isAlive) return false;

    // Prevent duplicate actions
    if (actor.hasSubmittedAction) return false;

    // Check if ability exists and is unlocked
    const ability = actor.getAbility(actionType);
    if (!ability) return false;

    // Check cooldown
    if (actor.isAbilityOnCooldown(actionType)) {
      return false;
    }

    // Validate ability is registered with the system
    if (!this.gameRoom.systems.abilityRegistry.hasClassAbility(actionType)) {
      logger.warn(`Unregistered ability attempted: ${actionType}`);
      return false;
    }

    // Handle multi-target abilities
    let finalTargetId = targetId;
    if (targetId === 'multi') {
      const isAOEAbility = this.isAreaOfEffectAbility(ability);
      if (!isAOEAbility) {
        return false;
      }
      finalTargetId = '__multi__';
    } else {
      // Validate single target
      const validationResult = this.validateSingleTarget(actorId, targetId, ability);
      if (!validationResult.success) {
        return false;
      }
      finalTargetId = validationResult.targetId;
    }

    // Submit the action
    const submissionResult = actor.submitAction(actionType, finalTargetId, ability);
    if (!submissionResult.success) {
      return false;
    }

    // Add to pending actions
    this.pendingActions.push({
      actorId,
      actionType,
      targetId: finalTargetId,
      ability,
      priority: ability.priority || 0,
      ...options
    });

    return true;
  }

  /**
   * Add a racial ability action for a player
   * @param {string} actorId - ID of acting player  
   * @param {string} targetId - ID of target
   * @returns {boolean} Success status
   */
  addRacialAction(actorId, targetId) {
    if (!this.gameRoom.started) return false;

    const actor = this.gameRoom.players.get(actorId);
    if (!actor || !actor.isAlive || !actor.canUseRacialAbility()) return false;

    // Prevent duplicate racial actions
    if (this.pendingRacialActions.some(a => a.actorId === actorId)) {
      return false;
    }

    // Validate racial ability exists
    if (!actor.racialAbility || !actor.racialAbility.name) return false;

    // Validate target
    const validationResult = this.validateRacialTarget(actorId, targetId, actor.racialAbility);
    if (!validationResult.success) {
      return false;
    }

    this.pendingRacialActions.push({
      actorId,
      targetId: validationResult.targetId,
      racialAbility: actor.racialAbility
    });

    return true;
  }

  /**
   * Validate all submitted actions before processing
   * @returns {Object} Validation results
   */
  validateAllSubmittedActions() {
    const validActions = [];
    const invalidActions = [];

    for (const action of this.pendingActions) {
      const actor = this.gameRoom.players.get(action.actorId);
      if (!actor || !actor.isAlive) {
        invalidActions.push({ action, reason: 'Actor not alive' });
        continue;
      }

      const validation = this.validateActionAtExecution(action);
      if (validation.isValid) {
        validActions.push(action);
      } else {
        invalidActions.push({ action, reason: validation.reason });
      }
    }

    return { validActions, invalidActions };
  }

  /**
   * Analyze coordination between players for bonuses
   * @returns {Object} Coordination analysis results
   */
  analyzeCoordination() {
    const coordinationMap = new Map();
    const damageActions = [];
    const healingActions = [];

    // Categorize actions
    for (const action of this.pendingActions) {
      const ability = action.ability;
      const isDamageAbility = this.isDamageAbility(ability);
      const isHealingAbility = this.isHealingAbility(ability);

      if (isDamageAbility) {
        damageActions.push(action);
      }
      if (isHealingAbility) {
        healingActions.push(action);
      }

      // Track coordination on targets
      if (isDamageAbility || isHealingAbility) {
        const targetId = action.targetId;
        if (!coordinationMap.has(targetId)) {
          coordinationMap.set(targetId, []);
        }
        coordinationMap.get(targetId).push(action.actorId);
      }
    }

    // Calculate coordination bonuses
    const coordinatedDamage = this.calculateCoordinatedActions(damageActions, coordinationMap);
    const coordinatedHealing = this.calculateCoordinatedActions(healingActions, coordinationMap);

    return {
      coordinationMap,
      coordinatedDamage,
      coordinatedHealing,
      damageActions,
      healingActions
    };
  }

  /**
   * Process all pending actions for the round
   * @param {Array} log - Event log to append to
   * @returns {Object} Processing results
   */
  processPlayerActions(log) {
    const coordination = this.analyzeCoordination();
    
    // Log coordination bonuses
    if (coordination.coordinatedDamage) {
      log.push(
        `🤝 Coordinated damage: Multiple players targeting the same enemies grants bonus damage!`
      );
    }
    if (coordination.coordinatedHealing) {
      log.push(
        `🤝 Coordinated healing: Multiple players healing allies grants bonus healing!`
      );
    }

    // Reset coordination tracking in combat system
    this.gameRoom.systems.combatSystem.resetCoordinationTracking();

    // Process actions by priority
    const sortedActions = [...this.pendingActions].sort((a, b) => b.priority - a.priority);
    const results = [];

    for (const action of sortedActions) {
      const result = this.processIndividualAction(action, log);
      results.push(result);

      // Apply cooldown if action was successful
      if (result.success && action.ability.cooldown > 0) {
        const actor = this.gameRoom.players.get(action.actorId);
        if (actor) {
          actor.applyCooldown(action.actionType, action.ability.cooldown);
        }
      }
    }

    return { results, coordination };
  }

  /**
   * Process racial abilities for the round
   * @param {Array} log - Event log to append to
   */
  processRacialAbilities(log) {
    for (const action of this.pendingRacialActions) {
      const actor = this.gameRoom.players.get(action.actorId);
      if (!actor || !actor.isAlive) {
        continue;
      }

      let target = null;
      if (action.targetId !== config.MONSTER_ID && !target) {
        target = this.gameRoom.players.get(action.targetId);
        if (!target || !target.isAlive) {
          continue;
        }
      }

      // Execute racial ability
      const success = this.gameRoom.systems.racialAbilitySystem.executeRacialAbility(
        actor,
        target,
        action.racialAbility,
        log,
        this.gameRoom.systems
      );

      if (success) {
        actor.markRacialAbilityUsed();
      }
    }
  }

  /**
   * Clear all pending actions (called after processing)
   */
  clearPendingActions() {
    this.pendingActions = [];
    this.pendingRacialActions = [];
  }

  /**
   * Get current pending actions for inspection
   * @returns {Object} Current pending actions
   */
  getPendingActions() {
    return {
      classActions: [...this.pendingActions],
      racialActions: [...this.pendingRacialActions]
    };
  }

  // Private helper methods
  isAreaOfEffectAbility(ability) {
    return ability.target === 'Multi' || ability.category === 'AOE';
  }

  isDamageAbility(ability) {
    return ability.category === 'Attack' || ability.effect === 'damage';
  }

  isHealingAbility(ability) {
    return ability.category === 'Heal' || ability.effect === 'heal';
  }

  validateSingleTarget(actorId, targetId, ability) {
    // Handle targeting logic
    if (targetId !== config.MONSTER_ID && targetId !== actorId) {
      const targetPlayer = this.gameRoom.players.get(targetId);
      if (targetPlayer && targetPlayer.hasStatusEffect('invisible')) {
        // Handle invisible target redirection
        const potentialTargets = Array.from(this.gameRoom.players.values())
          .filter(p => p.isAlive && p.id !== actorId && !p.hasStatusEffect('invisible'));
        
        if (potentialTargets.length === 0) {
          return { success: false, reason: 'No valid targets available' };
        }
        
        const redirectTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
        return { success: true, targetId: redirectTarget.id };
      }
    }

    return { success: true, targetId };
  }

  validateRacialTarget(actorId, targetId, racialAbility) {
    // Validate racial ability target
    if (targetId !== config.MONSTER_ID && targetId !== actorId) {
      const target = this.gameRoom.players.get(targetId);
      if (!target || !target.isAlive) {
        return { success: false, reason: 'Invalid target' };
      }
    }

    return { success: true, targetId };
  }

  validateActionAtExecution(action) {
    const actor = this.gameRoom.players.get(action.actorId);
    if (!actor || !actor.isAlive) {
      return { isValid: false, reason: 'Actor not alive' };
    }

    // Add more validation as needed
    return { isValid: true };
  }

  calculateCoordinatedActions(actions, coordinationMap) {
    // Implementation for calculating coordination bonuses
    const coordinated = new Map();
    
    for (const [targetId, actors] of coordinationMap) {
      if (actors.length > 1) {
        coordinated.set(targetId, {
          actors,
          bonusMultiplier: Math.min(0.5, actors.length * 0.15)
        });
      }
    }

    return coordinated.size > 0 ? coordinated : null;
  }

  processIndividualAction(action, log) {
    const actor = this.gameRoom.players.get(action.actorId);
    if (!actor || !actor.isAlive) {
      return { success: false, reason: 'Actor not alive' };
    }

    // Handle multi-target vs single target
    if (action.targetId === '__multi__') {
      const targets = this.getValidMultiTargets(action);
      return this.processMultiTargetAction(action, targets, log);
    } else {
      const target = this.getSingleTarget(action.targetId);
      return this.processSingleTargetAction(action, target, log);
    }
  }

  getValidMultiTargets(action) {
    // Get valid targets for multi-target abilities
    const ability = action.ability;
    if (ability.target === 'Multi') {
      return this.gameRoom.systems.combatSystem.getEnemyTargets(
        this.gameRoom.players.get(action.actorId)
      );
    }
    return [];
  }

  getSingleTarget(targetId) {
    if (targetId === config.MONSTER_ID) {
      return this.gameRoom.monster;
    }
    return this.gameRoom.players.get(targetId);
  }

  processSingleTargetAction(action, target, log) {
    const actor = this.gameRoom.players.get(action.actorId);
    const coordinationInfo = this.gameRoom.systems.combatSystem.trackCoordination(
      action.actorId, 
      action.targetId
    );

    try {
      const success = this.gameRoom.systems.abilityRegistry.executeClassAbility(
        action.actionType,
        actor,
        target,
        action.ability,
        log,
        this.gameRoom.systems,
        coordinationInfo
      );
      
      return { success, action, target };
    } catch (error) {
      logger.error(`Error executing ability ${action.actionType}:`, error);
      return { success: false, reason: 'Execution error', error };
    }
  }

  processMultiTargetAction(action, targets, log) {
    // Process multi-target action implementation
    const results = [];
    for (const target of targets) {
      const result = this.processSingleTargetAction(
        { ...action, targetId: target.id }, 
        target, 
        log
      );
      results.push(result);
    }
    
    return { 
      success: results.some(r => r.success), 
      results, 
      action 
    };
  }
}

module.exports = ActionProcessor;