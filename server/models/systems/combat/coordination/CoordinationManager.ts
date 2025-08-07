/**
 * @fileoverview Coordination system for combat actions
 * Handles coordination bonuses when players use similar abilities
 */

import type { Player, PlayerAction } from '../../../../types/generated.js';
import type { CoordinationInfo, ActionValidationResult } from '../interfaces.js';

import config from '../../../../config/index.js';
import logger from '../../../../utils/logger.js';

/**
 * Coordination manager class
 */
export class CoordinationManager {
  private coordinationThreshold: number;
  private maxCoordinationBonus: number;
  private baseCoordinationBonus: number;

  constructor() {
    const gameBalance = config.gameBalance || {};
    const coordinationConfig = gameBalance.coordinationBonus || {};
    this.coordinationThreshold = (coordinationConfig as any).threshold || 2;
    this.maxCoordinationBonus = (coordinationConfig as any).maxBonus || 0.5;
    this.baseCoordinationBonus = (coordinationConfig as any).baseBonus || 0.15;
  }

  /**
   * Analyze coordination bonuses for all actions
   */
  analyzeCoordinationBonuses(validationResults: ActionValidationResult[]): Map<string, CoordinationInfo> {
    const coordinationMap = new Map<string, CoordinationInfo>();

    try {
      // Get all valid actions
      const validActions = validationResults.filter(result => result.isValid);
      
      if (validActions.length < this.coordinationThreshold) {
        return coordinationMap;
      }

      // Group actions by type/ability
      const actionGroups = this.groupActionsByType(validActions);

      // Calculate coordination bonuses for each group
      for (const [actionType, actions] of actionGroups.entries()) {
        if (actions.length >= this.coordinationThreshold) {
          const coordinationInfo = this.calculateCoordinationInfo(actionType, actions);
          
          // Apply coordination info to all participants
          for (const action of actions) {
            coordinationMap.set(action.playerId, coordinationInfo);
          }

          logger.info(`Coordination bonus applied for ${actionType}: ${actions.length} players, ${coordinationInfo.bonusMultiplier}x multiplier`);
        }
      }

      return coordinationMap;

    } catch (error) {
      logger.error('Error analyzing coordination bonuses:', error as any);
      return coordinationMap;
    }
  }

  /**
   * Group actions by type for coordination analysis
   */
  private groupActionsByType(validationResults: ActionValidationResult[]): Map<string, ActionValidationResult[]> {
    const actionGroups = new Map<string, ActionValidationResult[]>();

    for (const result of validationResults) {
      const action = result.action;
      let groupKey: string;

      // Determine grouping key based on action type
      const abilityId = action.actionData?.['abilityId'];
      if (abilityId) {
        // Group by ability category or specific ability
        // Note: getAbilityConfig not available in current config - using fallback
        groupKey = abilityId;
      } else {
        // Group by action type
        groupKey = action.actionType || 'unknown';
      }

      if (!actionGroups.has(groupKey)) {
        actionGroups.set(groupKey, []);
      }

      actionGroups.get(groupKey)!.push(result);
    }

    return actionGroups;
  }

  /**
   * Calculate coordination info for a group of actions
   */
  private calculateCoordinationInfo(actionType: string, actions: ActionValidationResult[]): CoordinationInfo {
    const participantCount = actions.length;
    const participantNames = actions.map(action => {
      // This would need to be enhanced to get actual player names
      return action.playerId;
    });

    // Calculate bonus multiplier based on participant count
    const bonusMultiplier = this.calculateCoordinationBonus(participantCount);

    return {
      isActive: true,
      participantCount,
      participantNames,
      bonusMultiplier,
      abilityType: actionType
    };
  }

  /**
   * Calculate coordination bonus multiplier
   */
  calculateCoordinationBonus(playerCount: number): number {
    if (playerCount < this.coordinationThreshold) {
      return 0;
    }

    // Base formula: each additional player beyond threshold adds baseCoordinationBonus
    const extraPlayers = playerCount - this.coordinationThreshold;
    const bonus = this.baseCoordinationBonus + (extraPlayers * this.baseCoordinationBonus * 0.5);
    
    // Cap at maximum bonus
    return Math.min(bonus, this.maxCoordinationBonus);
  }

  /**
   * Check if actions can coordinate
   */
  canActionsCoordinate(action1: PlayerAction, action2: PlayerAction): boolean {
    // Both must be ability actions
    const abilityId1 = action1.actionData?.['abilityId'];
    const abilityId2 = action2.actionData?.['abilityId'];
    
    if (!abilityId1 || !abilityId2) {
      return false;
    }

    // Note: getAbilityConfig not available in current config
    // Using simplified logic for now
    const ability1Config = { category: 'unknown', effect: 'unknown' };
    const ability2Config = { category: 'unknown', effect: 'unknown' };

    if (!ability1Config || !ability2Config) {
      return false;
    }

    // Check if abilities are in the same category
    if (ability1Config.category === ability2Config.category) {
      return true;
    }

    // Check if abilities have the same effect type
    if (ability1Config.effect === ability2Config.effect) {
      return true;
    }

    // Special coordination rules can be added here
    return this.checkSpecialCoordinationRules(ability1Config, ability2Config);
  }

  /**
   * Check special coordination rules
   */
  private checkSpecialCoordinationRules(ability1: any, ability2: any): boolean {
    // Attack + Attack coordination
    if (this.isAttackAbility(ability1) && this.isAttackAbility(ability2)) {
      return true;
    }

    // Heal + Heal coordination
    if (this.isHealAbility(ability1) && this.isHealAbility(ability2)) {
      return true;
    }

    // Buff + Buff coordination
    if (this.isBuffAbility(ability1) && this.isBuffAbility(ability2)) {
      return true;
    }

    return false;
  }

  /**
   * Check if ability is an attack type
   */
  private isAttackAbility(ability: any): boolean {
    return ability.category === 'Attack' || 
           ability.damage > 0 || 
           ['physical', 'magical', 'ranged'].includes(ability.damageType);
  }

  /**
   * Check if ability is a heal type
   */
  private isHealAbility(ability: any): boolean {
    return ability.category === 'Heal' || 
           ability.healing > 0 || 
           ability.effect === 'heal';
  }

  /**
   * Check if ability is a buff type
   */
  private isBuffAbility(ability: any): boolean {
    return ability.category === 'Buff' || 
           ability.effect === 'buff' || 
           ability.statusEffect === 'positive';
  }

  /**
   * Get coordination threshold
   */
  getCoordinationThreshold(): number {
    return this.coordinationThreshold;
  }

  /**
   * Get max coordination bonus
   */
  getMaxCoordinationBonus(): number {
    return this.maxCoordinationBonus;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: {
    coordinationThreshold?: number;
    maxCoordinationBonus?: number;
    baseCoordinationBonus?: number;
  }): void {
    if (newConfig.coordinationThreshold !== undefined) {
      this.coordinationThreshold = newConfig.coordinationThreshold;
    }
    if (newConfig.maxCoordinationBonus !== undefined) {
      this.maxCoordinationBonus = newConfig.maxCoordinationBonus;
    }
    if (newConfig.baseCoordinationBonus !== undefined) {
      this.baseCoordinationBonus = newConfig.baseCoordinationBonus;
    }
  }
}