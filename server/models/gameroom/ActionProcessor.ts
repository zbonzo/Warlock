/**
 * @fileoverview Action processing utilities for GameRoom - TypeScript version
 * Handles action validation, coordination analysis, and action execution
 * Phase 9: TypeScript Migration - Converted from ActionProcessor.js
 */

import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import type { GameRoom } from '../GameRoom.js';
import type { Player } from '../Player.js';
import type { Monster } from '../../types/generated.js';
import type { 
  Ability
} from '../../types/generated.js';

/**
 * Pending action interface for class abilities
 */
export interface PendingAction {
  actorId: string;
  actionType: string;
  targetId: string;
  ability: Ability;
  priority: number;
  bloodRageActive?: boolean;
  keenSensesActive?: boolean;
}

/**
 * Pending racial action interface
 */
export interface PendingRacialAction {
  actorId: string;
  targetId: string;
  racialAbility: {
    name: string;
    description: string;
    type: string;
    usageLimit?: number;
  };
}

/**
 * Validation result for actions
 */
interface ActionValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Target validation result
 */
interface TargetValidationResult {
  success: boolean;
  targetId: string;
  reason?: string;
}

/**
 * Validation results for all actions
 */
interface ValidationResults {
  validActions: PendingAction[];
  invalidActions: Array<{
    action: PendingAction;
    reason: string;
  }>;
}

/**
 * Coordination bonus information
 */
interface CoordinationBonus {
  actors: string[];
  bonusMultiplier: number;
}

/**
 * Coordination analysis results
 */
interface CoordinationAnalysis {
  coordinationMap: Map<string, string[]>;
  coordinatedDamage: Map<string, CoordinationBonus> | null;
  coordinatedHealing: Map<string, CoordinationBonus> | null;
  damageActions: PendingAction[];
  healingActions: PendingAction[];
}

/**
 * Action processing result
 */
interface ActionProcessingResult {
  success: boolean;
  action?: PendingAction;
  target?: Player | Monster | null;
  results?: ActionProcessingResult[];
  reason?: string;
  error?: Error;
}

/**
 * ActionProcessor handles all action-related operations
 */
export class ActionProcessor {
  private gameRoom: GameRoom;
  private pendingActions: PendingAction[];
  private pendingRacialActions: PendingRacialAction[];

  constructor(gameRoom: GameRoom) {
    this.gameRoom = gameRoom;
    this.pendingActions = [];
    this.pendingRacialActions = [];
  }

  /**
   * Add a class ability action for a player
   */
  addAction(
    actorId: string, 
    actionType: string, 
    targetId: string, 
    options: Partial<PendingAction> = {}
  ): boolean {
    if (!this.gameRoom.gameState.hasStarted()) return false;

    const actor = this.gameRoom.gameState.getPlayersMap().get(actorId);
    if (!actor || !(actor as any)['isAlive']) return false;

    // Prevent duplicate actions
    if ((actor as any).hasSubmittedAction) return false;

    // Check if ability exists and is unlocked
    const ability = (actor as any)['getAbility'](actionType);
    if (!ability) return false;

    // Check cooldown
    if ((actor as any).isAbilityOnCooldown(actionType)) {
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
    const submissionResult = (actor as any).submitAction(actionType, finalTargetId, ability);
    if (!submissionResult.success) {
      return false;
    }

    // Add to pending actions
    this.pendingActions.push({
      actorId,
      actionType,
      targetId: finalTargetId,
      ability,
      priority: (ability as any)['priority'] || 0,
      ...options
    });

    return true;
  }

  /**
   * Add a racial ability action for a player
   */
  addRacialAction(actorId: string, targetId: string): boolean {
    if (!this.gameRoom.gameState.hasStarted()) return false;

    const actor = this.gameRoom.gameState.getPlayersMap().get(actorId);
    if (!actor || !(actor as any)['isAlive'] || !(actor as any).canUseRacialAbility()) return false;

    // Prevent duplicate racial actions
    if (this.pendingRacialActions.some(a => a.actorId === actorId)) {
      return false;
    }

    // Validate racial ability exists
    if (!(actor as any)['racialAbility'] || !(actor as any)['racialAbility'].name) return false;

    // Validate target
    const validationResult = this.validateRacialTarget(actorId, targetId, (actor as any)['racialAbility']);
    if (!validationResult.success) {
      return false;
    }

    this.pendingRacialActions.push({
      actorId,
      targetId: validationResult.targetId,
      racialAbility: (actor as any)['racialAbility']
    });

    return true;
  }

  /**
   * Validate all submitted actions before processing
   */
  validateAllSubmittedActions(): ValidationResults {
    const validActions: PendingAction[] = [];
    const invalidActions: Array<{ action: PendingAction; reason: string }> = [];

    for (const action of this.pendingActions) {
      const actor = this.gameRoom.gameState.getPlayersMap().get(action.actorId);
      if (!actor || !(actor as any)['isAlive']) {
        invalidActions.push({ action, reason: 'Actor not alive' });
        continue;
      }

      const validation = this.validateActionAtExecution(action);
      if (validation.isValid) {
        validActions.push(action);
      } else {
        invalidActions.push({ action, reason: validation.reason || 'Unknown validation error' });
      }
    }

    return { validActions, invalidActions };
  }

  /**
   * Analyze coordination between players for bonuses
   */
  analyzeCoordination(): CoordinationAnalysis {
    const coordinationMap = new Map<string, string[]>();
    const damageActions: PendingAction[] = [];
    const healingActions: PendingAction[] = [];

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
        coordinationMap.get(targetId)!.push(action.actorId);
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
   */
  processPlayerActions(log: string[]): { results: ActionProcessingResult[]; coordination: CoordinationAnalysis } {
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
    const results: ActionProcessingResult[] = [];

    for (const action of sortedActions) {
      const result = this.processIndividualAction(action, log);
      results.push(result);

      // Apply cooldown if action was successful
      if (result.success && (action.ability as any)['cooldown'] > 0) {
        const actor = this.gameRoom.gameState.getPlayersMap().get(action.actorId);
        if (actor) {
          (actor as any).applyCooldown(action.actionType, (action.ability as any)['cooldown']);
        }
      }
    }

    return { results, coordination };
  }

  /**
   * Process racial abilities for the round
   */
  processRacialAbilities(log: string[]): void {
    for (const action of this.pendingRacialActions) {
      const actor = this.gameRoom.gameState.getPlayersMap().get(action.actorId);
      if (!actor || !(actor as any)['isAlive']) {
        continue;
      }

      let target: any = null;
      if (action.targetId !== config.MONSTER_ID) {
        target = this.gameRoom.gameState.getPlayersMap().get(action.targetId) || null;
        if (!target || !(target as any)['isAlive']) {
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
        (actor as any).markRacialAbilityUsed();
      }
    }
  }

  /**
   * Clear all pending actions (called after processing)
   */
  clearPendingActions(): void {
    this.pendingActions = [];
    this.pendingRacialActions = [];
  }

  /**
   * Get current pending actions for inspection
   */
  getPendingActions(): { classActions: PendingAction[]; racialActions: PendingRacialAction[] } {
    return {
      classActions: [...this.pendingActions],
      racialActions: [...this.pendingRacialActions]
    };
  }

  // Private helper methods
  private isAreaOfEffectAbility(ability: Ability): boolean {
    return (ability as any)['target'] === 'Multi' || (ability as any)['category'] === 'AOE';
  }

  private isDamageAbility(ability: Ability): boolean {
    return (ability as any)['category'] === 'Attack' || (ability as any)['effect'] === 'damage';
  }

  private isHealingAbility(ability: Ability): boolean {
    return (ability as any)['category'] === 'Heal' || (ability as any)['effect'] === 'heal';
  }

  private validateSingleTarget(actorId: string, targetId: string, ability: Ability): TargetValidationResult {
    // Handle targeting logic
    if (targetId !== config.MONSTER_ID && targetId !== actorId) {
      const targetPlayer = this.gameRoom.gameState.getPlayersMap().get(targetId);
      if (targetPlayer && (targetPlayer as any).hasStatusEffect('invisible')) {
        // Handle invisible target redirection
        const potentialTargets = Array.from(this.gameRoom.gameState.getPlayersMap().values())
          .filter(p => (p as any)['isAlive'] && (p as any).id !== actorId && !(p as any).hasStatusEffect('invisible'));
        
        if (potentialTargets.length === 0) {
          return { success: false, targetId: '', reason: 'No valid targets available' };
        }
        
        const redirectTarget = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
        return { success: true, targetId: (redirectTarget as any).id };
      }
    }

    return { success: true, targetId };
  }

  private validateRacialTarget(
    actorId: string, 
    targetId: string, 
    racialAbility: PendingRacialAction['racialAbility']
  ): TargetValidationResult {
    // Validate racial ability target
    if (targetId !== config.MONSTER_ID && targetId !== actorId) {
      const target = this.gameRoom.gameState.getPlayersMap().get(targetId);
      if (!target || !(target as any)['isAlive']) {
        return { success: false, targetId: '', reason: 'Invalid target' };
      }
    }

    return { success: true, targetId };
  }

  private validateActionAtExecution(action: PendingAction): ActionValidationResult {
    const actor = this.gameRoom.gameState.getPlayersMap().get(action.actorId);
    if (!actor || !(actor as any)['isAlive']) {
      return { isValid: false, reason: 'Actor not alive' };
    }

    // Add more validation as needed
    return { isValid: true };
  }

  private calculateCoordinatedActions(
    actions: PendingAction[], 
    coordinationMap: Map<string, string[]>
  ): Map<string, CoordinationBonus> | null {
    // Implementation for calculating coordination bonuses
    const coordinated = new Map<string, CoordinationBonus>();
    
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

  private processIndividualAction(action: PendingAction, log: string[]): ActionProcessingResult {
    const actor = this.gameRoom.gameState.getPlayersMap().get(action.actorId);
    if (!actor || !(actor as any)['isAlive']) {
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

  private getValidMultiTargets(action: PendingAction): Array<any> {
    // Get valid targets for multi-target abilities
    const ability = action.ability;
    if ((ability as any)['target'] === 'Multi') {
      return this.gameRoom.systems.combatSystem.getEnemyTargets(
        this.gameRoom.gameState.getPlayersMap().get(action.actorId)
      );
    }
    return [];
  }

  private getSingleTarget(targetId: string): any {
    if (targetId === config.MONSTER_ID) {
      return this.gameRoom.gameState.getMonster();
    }
    return this.gameRoom.gameState.getPlayersMap().get(targetId) || null;
  }

  private processSingleTargetAction(
    action: PendingAction, 
    target: any, 
    log: string[]
  ): ActionProcessingResult {
    if (!target) {
      return { success: false, reason: 'Target not found' };
    }

    const actor = this.gameRoom.gameState.getPlayersMap().get(action.actorId);
    if (!actor) {
      return { success: false, reason: 'Actor not found' };
    }

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
      logger.error(`Error executing ability ${action.actionType}:`, { error, context: 'ActionProcessor' });
      return { 
        success: false, 
        reason: 'Execution error', 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  }

  private processMultiTargetAction(
    action: PendingAction, 
    targets: Array<any>, 
    log: string[]
  ): ActionProcessingResult {
    // Process multi-target action implementation
    const results: ActionProcessingResult[] = [];
    for (const target of targets) {
      const result = this.processSingleTargetAction(
        { ...action, targetId: (target as any).id }, 
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

export default ActionProcessor;