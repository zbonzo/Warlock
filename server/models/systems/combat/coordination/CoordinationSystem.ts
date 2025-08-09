/**
 * @fileoverview Coordination System Module
 * Handles coordination bonus calculations and group action processing
 * Extracted from CombatSystem.ts for better modularity
 */

import type { Player } from '../../../../types/generated.js';
import type { CombatLogEntry, RoundSummary } from '../interfaces.js';
import config from '../../../../config/index.js';
import logger from '../../../../utils/logger.js';
import { getCurrentTimestamp } from '../../../../utils/timestamp.js';

export interface CoordinationInfo {
  actionType: string;
  playerIds: string[];
  bonusMultiplier: number;
  coordinatedAt: number;
}

export interface CoordinationSystemDependencies {
  players: Map<string, Player>;
  gameStateUtils: any;
}

/**
 * Coordination System - Handles coordination bonuses and group actions
 */
export class CoordinationSystem {
  private readonly players: Map<string, Player>;
  private readonly gameStateUtils: any;

  constructor(dependencies: CoordinationSystemDependencies) {
    this.players = dependencies.players;
    this.gameStateUtils = dependencies.gameStateUtils;
  }

  /**
   * Analyze coordination bonuses for all actions
   */
  analyzeCoordinationBonuses(allActions: any[]): Map<string, CoordinationInfo> {
    const coordinationMap = new Map<string, CoordinationInfo>();

    // Group actions by type
    const actionGroups = this.groupActionsByType(allActions);

    // Analyze each group for coordination opportunities
    for (const [actionType, actions] of actionGroups.entries()) {
      if (actions.length >= 2) {
        const coordinationInfo: CoordinationInfo = {
          actionType,
          playerIds: actions.map(a => a.playerId),
          bonusMultiplier: this.calculateCoordinationBonus(actions.length),
          coordinatedAt: getCurrentTimestamp()
        };

        coordinationMap.set(actionType, coordinationInfo);
      }
    }

    return coordinationMap;
  }

  /**
   * Process coordinated actions with bonuses
   */
  async processCoordinatedActions(
    coordinationMap: Map<string, CoordinationInfo>,
    allActions: any[],
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    for (const [actionType, coordinationInfo] of coordinationMap.entries()) {
      const coordinatedActions = allActions.filter(action =>
        coordinationInfo.playerIds.includes(action.playerId) &&
        this.getActionType(action.action) === actionType
      );

      log.push({
        type: 'coordination',
        message: `${coordinatedActions.length} players coordinate their ${actionType} actions!`,
        isPublic: true,
        timestamp: getCurrentTimestamp(),
        priority: 'medium' as const
      });

      // Process each coordinated action with bonus
      for (const actionData of coordinatedActions) {
        const result = await this.processSingleAction(
          actionData,
          coordinationInfo,
          log,
          summary
        );
        results.set(actionData.playerId, result);
      }

      summary.coordinatedActions += coordinatedActions.length;
    }

    return results;
  }

  /**
   * Process a single action with coordination bonus
   */
  private async processSingleAction(
    actionData: any,
    coordinationInfo: CoordinationInfo,
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<any> {
    const { player, action } = actionData;

    try {
      // Apply coordination bonus to the action
      const enhancedAction = this.applyCoordinationBonus(action, coordinationInfo);

      // Execute the enhanced action
      const result = await this.executeCoordinatedAction(player, enhancedAction, log);

      // Update summary with coordination effects
      if (result.damage) {
        const bonusDamage = Math.floor(result.damage * (coordinationInfo.bonusMultiplier - 1));
        summary.totalDamageToMonster += bonusDamage;

        log.push({
          type: 'coordination_bonus',
          message: `${player.name} deals +${bonusDamage} bonus damage from coordination!`,
          isPublic: true,
          timestamp: getCurrentTimestamp(),
          priority: 'medium' as const
        });
      }

      return result;
    } catch (error) {
      logger.error(`Failed to process coordinated action for ${player.name}:`, error as any);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Group actions by their type for coordination analysis
   */
  private groupActionsByType(allActions: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const actionData of allActions) {
      const actionType = this.getActionType(actionData.action);

      if (!groups.has(actionType)) {
        groups.set(actionType, []);
      }

      groups.get(actionType)!.push(actionData);
    }

    return groups;
  }

  /**
   * Get the coordination category for an action
   */
  private getActionType(action: any): string {
    const abilityId = action.abilityId;

    // Look up ability definition to determine type
    const ability = this.getAbilityDefinition(abilityId);
    if (!ability) return 'unknown';

    // Map ability categories to coordination types
    switch (ability.category?.toLowerCase()) {
      case 'attack':
        return 'attack';
      case 'heal':
        return 'healing';
      case 'defense':
        return 'defense';
      case 'special':
        return 'special';
      default:
        return 'utility';
    }
  }

  /**
   * Calculate coordination bonus multiplier based on participant count
   */
  private calculateCoordinationBonus(playerCount: number): number {
    // Base bonus increases with more participants
    const baseBonus = Math.min(playerCount * 0.15, 0.5); // Max 50% bonus

    // Additional bonus for perfect coordination (all alive players)
    const alivePlayerCount = this.getAlivePlayers().length;
    const perfectCoordination = playerCount === alivePlayerCount;
    const perfectBonus = perfectCoordination ? 0.1 : 0;

    return 1 + baseBonus + perfectBonus;
  }

  /**
   * Apply coordination bonus to an action
   */
  private applyCoordinationBonus(action: any, coordinationInfo: CoordinationInfo): any {
    return {
      ...action,
      coordinationBonus: coordinationInfo.bonusMultiplier,
      coordinatedWith: coordinationInfo.playerIds.filter(id => id !== action.playerId),
      coordinationType: coordinationInfo.actionType
    };
  }

  /**
   * Execute a coordinated action with bonus effects
   */
  private async executeCoordinatedAction(player: Player, enhancedAction: any, _log: CombatLogEntry[]): Promise<any> {
    // This would delegate to the appropriate action handler
    // For now, return a basic structure with coordination bonus applied
    return {
      success: true,
      playerId: player.id,
      abilityId: enhancedAction.abilityId,
      damage: Math.floor((enhancedAction.baseDamage || 10) * (enhancedAction.coordinationBonus || 1)),
      healing: Math.floor((enhancedAction.baseHealing || 0) * (enhancedAction.coordinationBonus || 1)),
      coordinationBonus: enhancedAction.coordinationBonus,
      effects: []
    };
  }

  /**
   * Get ability definition from config
   */
  private getAbilityDefinition(abilityId: string): any {
    // Search through class abilities
    for (const classAbilities of Object.values(config.classAbilities || {})) {
      for (const ability of classAbilities as any[]) {
        if (ability.id === abilityId) {
          return ability;
        }
      }
    }
    return null;
  }

  /**
   * Get all alive players
   */
  private getAlivePlayers(): Player[] {
    return Array.from(this.players.values()).filter(player => player.isAlive);
  }

  /**
   * Calculate batch coordination bonus for multiple actions of the same type
   */
  calculateBatchCoordinationBonus(actionType: string, count: number): number {
    if (count < 2) return 1.0;

    // Different bonuses for different action types
    switch (actionType.toLowerCase()) {
      case 'attack':
        return 1 + ((count - 1) * 0.2); // 20% per additional attacker
      case 'heal':
        return 1 + ((count - 1) * 0.15); // 15% per additional healer
      case 'defense':
        return 1 + ((count - 1) * 0.25); // 25% per additional defender
      default:
        return 1 + ((count - 1) * 0.1); // 10% generic bonus
    }
  }
}
