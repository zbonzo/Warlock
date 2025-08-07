/**
 * @fileoverview Action Processing Module
 * Handles player action validation, processing, and execution
 * Extracted from CombatSystem.ts for better modularity
 */

import type { Player, Monster } from '../../../../types/generated.js';
import type { CombatLogEntry, RoundSummary } from '../interfaces.js';
import config from '../../../../config/index.js';
import logger from '../../../../utils/logger.js';

export interface ActionProcessorDependencies {
  players: Map<string, Player>;
  monsterController: any;
  statusEffectManager: any;
  racialAbilitySystem: any;
  warlockSystem: any;
  gameStateUtils: any;
}

/**
 * Action Processor - Handles validation and processing of player actions
 */
export class ActionProcessor {
  private readonly players: Map<string, Player>;
  private readonly monsterController: any;
  private readonly statusEffectManager: any;
  private readonly racialAbilitySystem: any;
  private readonly warlockSystem: any;
  private readonly gameStateUtils: any;

  constructor(dependencies: ActionProcessorDependencies) {
    this.players = dependencies.players;
    this.monsterController = dependencies.monsterController;
    this.statusEffectManager = dependencies.statusEffectManager;
    this.racialAbilitySystem = dependencies.racialAbilitySystem;
    this.warlockSystem = dependencies.warlockSystem;
    this.gameStateUtils = dependencies.gameStateUtils;
  }

  /**
   * Validate all submitted actions for the round
   */
  async validateSubmittedActions(): Promise<any[]> {
    const validationResults: any[] = [];

    for (const [playerId, player] of this.players.entries()) {
      try {
        // Skip if player is not alive or has no submitted action
        if (!player.isAlive || !player.hasSubmittedAction) {
          logger.info(`Skipping validation for ${playerId} - not alive or no action`);
          continue;
        }

        const action = player.currentAction;
        if (!action) {
          logger.warn(`Player ${playerId} marked as having action but action is null`);
          continue;
        }

        // Validate the action
        const validation = await this.validatePlayerAction(player, action);
        
        if (validation.valid) {
          validationResults.push({
            playerId,
            player,
            action,
            valid: true,
            errors: []
          });
        } else {
          logger.warn(`Invalid action from ${playerId}:`, validation.errors);
          validationResults.push({
            playerId,
            player,
            action,
            valid: false,
            errors: validation.errors
          });
        }
      } catch (error) {
        logger.error(`Error validating action for ${playerId}:`, error as any);
        validationResults.push({
          playerId,
          player,
          action: null,
          valid: false,
          errors: ['Action validation failed']
        });
      }
    }

    return validationResults;
  }

  /**
   * Process player actions based on validation results
   */
  async processPlayerActions(
    validationResults: any[],
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<Map<string, any>> {
    const playerActions = new Map<string, any>();
    const allValidActions = await this.collectAllValidActions(validationResults);
    
    if (allValidActions.length === 0) {
      log.push({
        type: 'system',
        message: 'No valid actions this round',
        isPublic: true,
        timestamp: Date.now(),
        priority: 'low' as const
      });
      return playerActions;
    }

    // Sort actions by priority
    const sortedActions = this.sortActionsByPriority(allValidActions);
    
    // Process each action
    for (const actionData of sortedActions) {
      try {
        const result = await this.processActionWithContext(actionData, log, summary);
        playerActions.set(actionData.playerId, result);
      } catch (error) {
        logger.error(`Error processing action for ${actionData.playerId}:`, error as any);
        log.push({
          type: 'error',
          message: `Failed to process action for ${actionData.player?.name || actionData.playerId}`,
          isPublic: false,
          timestamp: Date.now(),
          priority: 'medium' as const
        });
      }
    }

    return playerActions;
  }

  /**
   * Collect all valid actions from validation results
   */
  private async collectAllValidActions(validationResults: any[]): Promise<any[]> {
    const validActions: any[] = [];

    for (const result of validationResults) {
      if (result.valid && result.action) {
        validActions.push({
          playerId: result.playerId,
          player: result.player,
          action: result.action,
          priority: this.getActionPriority(result.action)
        });
      }
    }

    return validActions;
  }

  /**
   * Sort actions by priority (healing first, then attacks, then others)
   */
  private sortActionsByPriority(allActions: any[]): any[] {
    return allActions.sort((a, b) => {
      return (b.priority || 0) - (a.priority || 0);
    });
  }

  /**
   * Process a single action with full context
   */
  private async processActionWithContext(
    actionData: any,
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<any> {
    const { player, action } = actionData;
    
    try {
      // Get ability definition
      const ability = this.getAbilityDefinition(action.abilityId);
      if (!ability) {
        throw new Error(`Unknown ability: ${action.abilityId}`);
      }

      // Execute the action through the appropriate system
      const result = await this.executeAction(player, action, ability, log);
      
      // Update summary
      if (result.damage) {
        summary.totalDamageToMonster += result.damage;
      }
      if (result.healing) {
        summary.totalHealing += result.healing;
      }
      
      summary.abilitiesUsed++;
      
      return result;
    } catch (error) {
      logger.error(`Failed to process action for ${player.name}:`, error as any);
      log.push({
        type: 'error',
        message: `${player.name}'s action failed to execute`,
        isPublic: true,
        timestamp: Date.now(),
        priority: 'high' as const
      });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Validate a single player action
   */
  private async validatePlayerAction(player: Player, action: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation
    if (!action.abilityId) {
      errors.push('No ability specified');
    }

    if (!player.isAlive) {
      errors.push('Player is dead');
    }

    // Check if player has the ability
    const hasAbility = player.abilities?.includes(action.abilityId) || false;
    if (!hasAbility) {
      errors.push(`Player does not have ability: ${action.abilityId}`);
    }

    // Check cooldowns
    const onCooldown = await this.statusEffectManager.hasEffect(player.id, 'cooldown');
    if (onCooldown) {
      errors.push('Ability is on cooldown');
    }

    return {
      valid: errors.length === 0,
      errors
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
   * Get action priority for sorting
   */
  private getActionPriority(action: any): number {
    const ability = this.getAbilityDefinition(action.abilityId);
    if (!ability) return 0;

    // Healing abilities get highest priority
    if (ability.category === 'Heal') return 3;
    
    // Defense abilities get medium priority
    if (ability.category === 'Defense') return 2;
    
    // Attack abilities get lower priority
    if (ability.category === 'Attack') return 1;
    
    // Everything else gets default priority
    return 0;
  }

  /**
   * Execute the actual action
   */
  private async executeAction(player: Player, action: any, ability: any, log: CombatLogEntry[]): Promise<any> {
    // This would delegate to the appropriate ability handler
    // For now, return a basic structure
    return {
      success: true,
      playerId: player.id,
      abilityId: action.abilityId,
      damage: 0,
      healing: 0,
      effects: []
    };
  }
}