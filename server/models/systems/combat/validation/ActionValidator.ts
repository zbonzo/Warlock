/**
 * @fileoverview Action validation for combat system
 * Handles validation of player actions before processing
 */

import type { Player, PlayerAction, GameRoom } from '../../../../types/generated.js';
import type { ActionValidationResult } from '../interfaces.js';

import config from '../../../../config/index.js';
import logger from '../../../../utils/logger.js';

/**
 * Action validator class
 */
export class ActionValidator {
  private gameRoom: GameRoom;

  constructor(gameRoom: GameRoom) {
    this.gameRoom = gameRoom;
  }

  /**
   * Validate all submitted actions
   */
  async validateSubmittedActions(): Promise<ActionValidationResult[]> {
    const validationResults: ActionValidationResult[] = [];

    try {
      // Get all players with submitted actions
      const playersWithActions = Array.from(this.gameRoom.players.values())
        .filter(player => this.hasSubmittedAction(player));

      for (const player of playersWithActions) {
        const action = this.getPlayerAction(player);
        if (action) {
          const result = await this.validateSingleAction(player, action);
          validationResults.push(result);
        }
      }

      logger.info(`Validated ${validationResults.length} submitted actions`);
      return validationResults;

    } catch (error) {
      logger.error('Error validating submitted actions:', error as any);
      return [];
    }
  }

  /**
   * Validate a single player action
   */
  private async validateSingleAction(
    player: Player,
    action: PlayerAction
  ): Promise<ActionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation checks
    if (!this.isPlayerAlive(player)) {
      errors.push('Player is not alive');
    }

    if (!this.isPlayerInGame(player)) {
      errors.push('Player is not in the game');
    }

    if (!this.isValidActionType(action)) {
      errors.push('Invalid action type');
    }

    // Ability-specific validation
    const abilityId = (action.actionData as any)?.abilityId;
    if (abilityId) {
      const abilityValidation = await this.validateAbility(player, abilityId);
      errors.push(...abilityValidation.errors);
      warnings.push(...abilityValidation.warnings);
    }

    // Target validation
    if (action.targetId) {
      const targetValidation = this.validateTarget(player, action.targetId);
      errors.push(...targetValidation.errors);
      warnings.push(...targetValidation.warnings);
    }

    // Status effect validation
    const statusValidation = this.validatePlayerStatus(player);
    errors.push(...statusValidation.errors);
    warnings.push(...statusValidation.warnings);

    const isValid = errors.length === 0;

    return {
      isValid,
      playerId: player.id,
      action,
      errors,
      warnings
    };
  }

  /**
   * Check if player has submitted an action
   */
  private hasSubmittedAction(player: Player): boolean {
    // Implementation would check the player's action submission status
    return (player as any).hasSubmittedAction || false;
  }

  /**
   * Get the player's submitted action
   */
  private getPlayerAction(player: Player): PlayerAction | null {
    // Implementation would retrieve the player's submitted action
    return (player as any).submittedAction || null;
  }

  /**
   * Check if player is alive
   */
  private isPlayerAlive(player: Player): boolean {
    return (player as any).isAlive !== false && (player as any).hp > 0;
  }

  /**
   * Check if player is in the game
   */
  private isPlayerInGame(player: Player): boolean {
    return this.gameRoom.players.has(player.id);
  }

  /**
   * Validate action type
   */
  private isValidActionType(action: PlayerAction): boolean {
    const validTypes = ['ability', 'skip', 'surrender'];
    return validTypes.includes(action.actionType || '');
  }

  /**
   * Validate ability usage
   */
  private async validateAbility(player: Player, abilityId: string): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if player has the ability
      const playerAbilities = (player as any).abilities || [];
      const hasAbility = playerAbilities.some((ability: any) =>
        ability.id === abilityId || ability.name === abilityId
      );

      if (!hasAbility) {
        errors.push(`Player does not have ability: ${abilityId}`);
        return { errors, warnings };
      }

      // Check cooldown
      const ability = playerAbilities.find((a: any) =>
        a.id === abilityId || a.name === abilityId
      );

      if (ability && ability.currentCooldown && ability.currentCooldown > 0) {
        errors.push(`Ability is on cooldown: ${ability.currentCooldown} turns remaining`);
      }

      // Check if ability is unlocked
      if (ability && ability.unlocked === false) {
        errors.push(`Ability is not unlocked: ${abilityId}`);
      }

      // Check resource costs (mana, stamina, etc.)
      const resourceValidation = this.validateAbilityResources(player, ability);
      errors.push(...resourceValidation.errors);
      warnings.push(...resourceValidation.warnings);

    } catch (error) {
      errors.push(`Error validating ability: ${abilityId}`);
      logger.error('Ability validation error:', error as any);
    }

    return { errors, warnings };
  }

  /**
   * Validate ability resource requirements
   */
  private validateAbilityResources(player: Player, ability: any): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ability) return { errors, warnings };

    // Check mana cost
    if (ability.manaCost && (player as any).mana < ability.manaCost) {
      errors.push(`Insufficient mana: ${ability.manaCost} required, ${(player as any).mana || 0} available`);
    }

    // Check stamina cost
    if (ability.staminaCost && (player as any).stamina < ability.staminaCost) {
      errors.push(`Insufficient stamina: ${ability.staminaCost} required, ${(player as any).stamina || 0} available`);
    }

    // Check health cost (for abilities that cost HP)
    if (ability.healthCost && (player as any).hp <= ability.healthCost) {
      errors.push(`Insufficient health: ${ability.healthCost} required, ${(player as any).hp || 0} available`);
    }

    return { errors, warnings };
  }

  /**
   * Validate action target
   */
  private validateTarget(player: Player, targetId: string): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if target exists
    const targetPlayer = this.gameRoom.players.get(targetId);
    const targetMonster = this.gameRoom.monster;

    if (!targetPlayer && (!targetMonster || targetMonster.id !== targetId)) {
      errors.push(`Invalid target: ${targetId}`);
      return { errors, warnings };
    }

    // Check if player is targeting themselves inappropriately
    if (targetId === player.id) {
      // This might be valid for some abilities (self-heal, self-buff)
      warnings.push('Player is targeting themselves');
    }

    // Check if target is alive
    if (targetPlayer && !this.isPlayerAlive(targetPlayer)) {
      errors.push(`Target is not alive: ${targetId}`);
    }

    if (targetMonster && targetMonster.id === targetId && !(targetMonster as any).isAlive) {
      errors.push(`Monster target is not alive: ${targetId}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate player status effects
   */
  private validatePlayerStatus(player: Player): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const statusEffects = (player as any).statusEffects || {};

    // Check for stunning effects
    if (statusEffects.stunned) {
      errors.push('Player is stunned and cannot act');
    }

    // Check for sleep effects
    if (statusEffects.sleeping) {
      errors.push('Player is sleeping and cannot act');
    }

    // Check for charm effects
    if (statusEffects.charmed) {
      warnings.push('Player is charmed - action may be redirected');
    }

    // Check for confusion effects
    if (statusEffects.confused) {
      warnings.push('Player is confused - action may target randomly');
    }

    return { errors, warnings };
  }

  /**
   * Update game room reference
   */
  updateGameRoom(gameRoom: GameRoom): void {
    this.gameRoom = gameRoom;
  }
}
