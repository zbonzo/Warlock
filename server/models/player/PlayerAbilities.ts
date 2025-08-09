/**
 * @fileoverview PlayerAbilities domain model - TypeScript migration
 * Handles all player ability management, cooldowns, and availability
 * Part of Phase 3: Core Domain Models Migration
 */

import { z } from 'zod';
import logger from '../../utils/logger.js';
import messages from '../../config/messages/index.js';
import config from '../../config/index.js';
import { getCurrentTimestamp } from '../../utils/timestamp.js';
import type { Ability } from '../../types/generated.js';

// Ability-related schemas
const ActionSubmissionSchema = z.object({
  actionType: z.string().min(1),
  targetId: z.string().min(1),
  isValid: z.boolean().default(true),
  submissionTime: z.number(),
  invalidationReason: z.string().optional(),
  invalidationTime: z.number().optional(),
});

const RacialAbilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  usageLimit: z.enum(['perGame', 'perRound', 'passive']),
  maxUses: z.number().int().min(0).optional(),
  cooldown: z.number().int().min(0).default(0),
  effects: z.record(z.any()).optional(),
});

const SubmissionStatusSchema = z.object({
  hasSubmitted: z.boolean(),
  isValid: z.boolean(),
  validationState: z.enum(['none', 'valid', 'invalid']),
  submissionTime: z.number().nullable(),
  action: z.object({
    type: z.string(),
    target: z.string(),
    isValid: z.boolean(),
    invalidationReason: z.string().optional(),
  }).nullable(),
});

// Type definitions
export type ActionSubmission = z.infer<typeof ActionSubmissionSchema>;
export type RacialAbility = z.infer<typeof RacialAbilitySchema>;
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;
export type ValidationState = 'none' | 'valid' | 'invalid';

export interface ActionSubmissionResult {
  success: boolean;
  reason: string | null;
  action: ActionSubmission | null;
}

export interface ActionValidationResult {
  isValid: boolean;
  reason: string | null;
}

export interface AbilityDamageDisplay {
  base: number;
  modified: number;
  modifier: number;
  showModified: boolean;
  displayText: string;
}

export interface Player {
  id: string;
  isAlive: boolean;
}

export interface Monster {
  hp: number;
}

/**
 * PlayerAbilities class manages all ability-related functionality for a player
 * Separated from Player class for better organization and testability
 */
export class PlayerAbilities {
  private playerId: string;
  private playerName: string;

  // Class abilities
  private abilities: Ability[] = [];
  private unlocked: Ability[] = [];
  private abilityCooldowns: Record<string, number> = {};

  // Racial ability tracking
  private racialAbility: RacialAbility | null = null;
  private racialUsesLeft: number = 0;
  private racialCooldown: number = 0;
  private racialEffects: Record<string, any> = {};

  // Action submission tracking
  private hasSubmittedAction: boolean = false;
  private submittedAction: ActionSubmission | null = null;
  private actionSubmissionTime: number | null = null;
  private lastValidAction: ActionSubmission | null = null;
  private actionValidationState: ValidationState = 'none';

  /**
   * Create new player abilities manager
   * @param playerId - Player ID for logging
   * @param playerName - Player name for logging
   */
  constructor(playerId: string, playerName: string) {
    this.playerId = playerId;
    this.playerName = playerName;
  }

  /**
   * Submit an action for this player with comprehensive validation
   * @param actionType - Type of action being submitted
   * @param targetId - Target of the action
   * @param additionalData - Additional action data
   * @returns Submission result with success status and details
   */
  submitAction(
    actionType: string,
    targetId: string,
    additionalData: Record<string, any> = {}
  ): ActionSubmissionResult {
    const result: ActionSubmissionResult = {
      success: false,
      reason: null,
      action: null,
    };

    // Check if already submitted an action this round
    if (this.hasSubmittedAction) {
      result.reason = messages.getError('playerActionAlreadySubmittedThisRound');
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.MultipleActionsAttempt,
          { playerName: this.playerName }
        )
      );
      return result;
    }

    // Validate action type exists in unlocked abilities
    const selectedAbility = this.unlocked.find(
      (ability) => ability.id === actionType
    );
    if (!selectedAbility) {
      result.reason = messages.formatMessage(
        messages.getError('playerAbilityNotAvailable'),
        { abilityName: actionType }
      );
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.UnavailableAbilityAttempt,
          { playerName: this.playerName, abilityType: actionType }
        )
      );
      return result;
    }

    // Check if ability is on cooldown
    const cooldown = this.getAbilityCooldown(actionType);
    if (cooldown > 0) {
      result.reason = messages.formatMessage(
        messages.getError('playerAbilityOnCooldownDetailed'),
        { abilityName: selectedAbility.name, turns: cooldown }
      );
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.AbilityOnCooldownAttempt,
          { playerName: this.playerName, actionType, cooldown }
        )
      );
      return result;
    }

    // Validate target (basic validation - more detailed validation happens during processing)
    if (!targetId) {
      result.reason = messages.getError('playerNoTargetSpecified');
      return result;
    }

    // Store the submitted action
    const action: ActionSubmission = ActionSubmissionSchema.parse({
      actionType,
      targetId,
      ...additionalData,
      isValid: true,
      submissionTime: getCurrentTimestamp(),
    });

    this.submittedAction = action;
    this.hasSubmittedAction = true;
    this.actionSubmissionTime = getCurrentTimestamp();
    this.lastValidAction = { ...action };
    this.actionValidationState = 'valid';

    result.success = true;
    result.action = action;

    logger.debug(
      messages.formatMessage(
        messages.serverLogMessages.debug.PlayerActionSubmittedSuccessfully,
        { playerName: this.playerName, actionType, targetId }
      )
    );
    return result;
  }

  /**
   * Validate current submitted action against current game state
   * @param alivePlayers - List of currently alive players
   * @param monster - Monster object
   * @returns Validation result with success status and reason
   */
  validateSubmittedAction(alivePlayers: Player[], monster: Monster | null): ActionValidationResult {
    const result: ActionValidationResult = {
      isValid: false,
      reason: null,
    };

    if (!this.hasSubmittedAction || !this.submittedAction) {
      result.reason = messages.getError('playerNoActionSubmittedForValidation');
      this.actionValidationState = 'none';
      return result;
    }

    const { actionType, targetId } = this.submittedAction;

    // Re-check ability availability (in case abilities changed)
    const selectedAbility = this.unlocked.find(
      (ability) => ability.id === actionType
    );
    if (!selectedAbility) {
      result.reason = messages.formatMessage(
        messages.getError('playerAbilityNoLongerAvailable'),
        { abilityName: actionType }
      );
      this.invalidateAction(result.reason!);
      return result;
    }

    // Re-check cooldown status
    const cooldown = this.getAbilityCooldown(actionType);
    if (cooldown > 0) {
      result.reason = messages.formatMessage(
        messages.getError('playerAbilityNowOnCooldown'),
        { abilityName: selectedAbility.name, turns: cooldown }
      );
      this.invalidateAction(result.reason!);
      return result;
    }

    // Validate target still exists and is valid
    if (targetId === config.MONSTER_ID) {
      if (!monster || monster.hp <= 0) {
        result.reason = messages.getError('playerMonsterInvalidTarget');
        this.invalidateAction(result.reason!);
        return result;
      }
    } else {
      const targetPlayer = alivePlayers.find((p) => p.id === targetId);
      if (!targetPlayer || !targetPlayer.isAlive) {
        result.reason = messages.getError('playerTargetInvalidOrDead');
        this.invalidateAction(result.reason!);
        return result;
      }
    }

    result.isValid = true;
    this.actionValidationState = 'valid';
    return result;
  }

  /**
   * Invalidate the current action submission
   * @param reason - Reason for invalidation
   */
  invalidateAction(reason: string): void {
    logger.debug(
      messages.formatMessage(
        messages.serverLogMessages.debug.PlayerActionInvalidated,
        { playerName: this.playerName, reason }
      )
    );

    if (this.submittedAction) {
      this.submittedAction.isValid = false;
      this.submittedAction.invalidationReason = reason;
      this.submittedAction.invalidationTime = getCurrentTimestamp();
    }

    this.hasSubmittedAction = false;
    this.actionValidationState = 'invalid';
  }

  /**
   * Clear action submission (typically at start of new round)
   */
  clearActionSubmission(): void {
    this.hasSubmittedAction = false;
    this.submittedAction = null;
    this.actionSubmissionTime = null;
    this.actionValidationState = 'none';

    logger.debug(
      messages.formatMessage(
        messages.serverLogMessages.debug.PlayerActionSubmissionCleared,
        { playerName: this.playerName }
      )
    );
  }

  /**
   * Check if an ability is on cooldown
   * @param abilityType - Type of ability to check
   * @returns Whether the ability is on cooldown
   */
  isAbilityOnCooldown(abilityType: string): boolean {
    return (
      Object.prototype.hasOwnProperty.call(this.abilityCooldowns, abilityType) &&
      // eslint-disable-next-line security/detect-object-injection -- abilityType is from game config, not user input
      this.abilityCooldowns[abilityType] !== undefined &&
      // eslint-disable-next-line security/detect-object-injection -- abilityType is from game config, not user input
      this.abilityCooldowns[abilityType] > 0
    );
  }

  /**
   * Get remaining cooldown for an ability
   * @param abilityType - Type of ability to check
   * @returns Turns remaining on cooldown (0 if not on cooldown)
   */
  getAbilityCooldown(abilityType: string): number {
    // eslint-disable-next-line security/detect-object-injection -- abilityType is from game config, not user input
    return Object.prototype.hasOwnProperty.call(this.abilityCooldowns, abilityType) ? (this.abilityCooldowns[abilityType] || 0) : 0;
  }

  /**
   * Put an ability on cooldown
   * @param abilityType - Type of ability
   * @param cooldownTurns - Number of turns for cooldown
   */
  putAbilityOnCooldown(abilityType: string, cooldownTurns: number): void {
    if (cooldownTurns > 0) {
      // Add 1 to the cooldown to account for the immediate countdown at end of turn
      // eslint-disable-next-line security/detect-object-injection -- abilityType is from game config, not user input
      this.abilityCooldowns[abilityType] = cooldownTurns + 1;

      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.PlayerAbilityOnCooldown,
          {
            playerName: this.playerName,
            abilityType,
            // eslint-disable-next-line security/detect-object-injection -- abilityType is from game config, not user input
            turnsRemaining: this.abilityCooldowns[abilityType],
          }
        )
      );
    }
  }

  /**
   * Check if an ability can be used (not on cooldown and unlocked)
   * @param abilityType - Type of ability to check
   * @returns Whether the ability can be used
   */
  canUseAbility(abilityType: string): boolean {
    // Check if ability is unlocked
    const hasAbility = this.unlocked.some((a) => a.id === abilityType);
    if (!hasAbility) return false;

    // Check if ability is on cooldown
    if (this.isAbilityOnCooldown(abilityType)) return false;

    return true;
  }

  /**
   * Process ability cooldowns at the end of a round
   * Decrements all active cooldowns by 1
   */
  processAbilityCooldowns(): void {
    const expiredCooldowns: string[] = [];

    for (const abilityType in this.abilityCooldowns) {
      if (Object.prototype.hasOwnProperty.call(this.abilityCooldowns, abilityType) &&
          // eslint-disable-next-line security/detect-object-injection -- abilityType from internal iteration
          this.abilityCooldowns[abilityType] != null && this.abilityCooldowns[abilityType] > 0) {
        // eslint-disable-next-line security/detect-object-injection -- abilityType from internal iteration
        this.abilityCooldowns[abilityType]!--;

        // Remove cooldown if it reaches 0
        // eslint-disable-next-line security/detect-object-injection -- abilityType from internal iteration
        if (this.abilityCooldowns[abilityType]! <= 0) {
          expiredCooldowns.push(abilityType);
          // eslint-disable-next-line security/detect-object-injection -- abilityType from internal iteration
          delete this.abilityCooldowns[abilityType];
        }
      }
    }

    if (expiredCooldowns.length > 0) {
      logger.debug(
        messages.formatMessage(
          messages.serverLogMessages.debug.PlayerCooldownsExpired,
          { playerName: this.playerName, abilityNames: expiredCooldowns.join(', ') }
        )
      );
    }
  }

  /**
   * Get list of abilities that are ready to use (not on cooldown)
   * @returns Array of available ability objects
   */
  getAvailableAbilities(): Ability[] {
    return this.unlocked.filter((ability) => this.canUseAbility(ability.id));
  }

  /**
   * Check if racial ability can be used
   * @returns Whether the racial ability is available
   */
  canUseRacialAbility(): boolean {
    if (!this.racialAbility) return false;
    if (this.racialUsesLeft <= 0) return false;
    if (this.racialCooldown > 0) return false;
    return true;
  }

  /**
   * Use racial ability
   * @returns Whether the ability was successfully used
   */
  useRacialAbility(): boolean {
    if (!this.canUseRacialAbility()) return false;

    // Decrement uses left
    this.racialUsesLeft--;

    // Apply cooldown if present
    if (this.racialAbility!.cooldown > 0) {
      this.racialCooldown = this.racialAbility!.cooldown;
    }

    return true;
  }

  /**
   * Process racial ability cooldowns at end of round
   * @returns Effect results if any
   */
  processRacialCooldowns(): Record<string, any> | null {
    if (this.racialCooldown > 0) {
      this.racialCooldown--;
    }
    return null;
  }

  /**
   * Set racial ability for player
   * @param abilityData - Racial ability definition
   */
  setRacialAbility(abilityData: RacialAbility): void {
    this.racialAbility = RacialAbilitySchema.parse(abilityData);

    // Set initial usage limits
    if (abilityData.usageLimit === 'perGame') {
      this.racialUsesLeft = abilityData.maxUses || 1;
    } else if (abilityData.usageLimit === 'perRound') {
      this.racialUsesLeft = abilityData.maxUses || 1;
    } else if (abilityData.usageLimit === 'passive') {
      this.racialUsesLeft = 0; // Passive abilities don't have uses
    }

    this.racialCooldown = 0; // Start with no cooldown

    // Initialize racial effects
    this.racialEffects = {};
  }

  /**
   * Reset per-round racial ability uses
   */
  resetRacialPerRoundUses(): void {
    if (this.racialAbility && this.racialAbility.usageLimit === 'perRound') {
      this.racialUsesLeft = this.racialAbility.maxUses || 1;
    }
  }

  /**
   * Get submission status for client transmission
   * @returns Submission status object
   */
  getSubmissionStatus(): SubmissionStatus {
    return SubmissionStatusSchema.parse({
      hasSubmitted: this.hasSubmittedAction,
      isValid: this.hasSubmittedAction && this.submittedAction?.isValid,
      validationState: this.actionValidationState,
      submissionTime: this.actionSubmissionTime,
      action: this.hasSubmittedAction
        ? {
            type: this.submittedAction!.actionType,
            target: this.submittedAction!.targetId,
            isValid: this.submittedAction!.isValid,
            invalidationReason: this.submittedAction!.invalidationReason,
          }
        : null,
    });
  }

  /**
   * Set player name (for logging after reconnection)
   * @param newName - New player name
   */
  setPlayerName(newName: string): void {
    this.playerName = newName;
  }

  /**
   * Get ability damage display for UI
   * @param ability - Ability object
   * @param damageMod - Player damage modifier
   * @returns Damage display information
   */
  getAbilityDamageDisplay(ability: Ability, damageMod?: number): AbilityDamageDisplay | null {
    // Type guard for ability params
    if (!ability.requirements || typeof ability.requirements !== 'object') {
      return null;
    }

    // Check if damage exists in ability requirements (adapting to Zod schema structure)
    const damage = (ability.requirements as any).damage;
    if (!damage) return null;

    const baseDamage = damage;
    const modifier = damageMod || 1.0;
    const modifiedDamage = Math.floor(baseDamage * modifier);

    return {
      base: baseDamage,
      modified: modifiedDamage,
      modifier,
      showModified: baseDamage !== modifiedDamage,
      displayText:
        baseDamage === modifiedDamage
          ? `${baseDamage} damage`
          : `${modifiedDamage} damage (${baseDamage} × ${modifier.toFixed(1)})`,
    };
  }

  /**
   * Set abilities list
   * @param abilities - List of all abilities
   */
  setAbilities(abilities: Ability[]): void {
    this.abilities = abilities;
  }

  /**
   * Set unlocked abilities
   * @param unlocked - List of unlocked abilities
   */
  setUnlockedAbilities(unlocked: Ability[]): void {
    this.unlocked = unlocked;
  }

  /**
   * Get all abilities
   * @returns List of all abilities
   */
  getAbilities(): Ability[] {
    return [...this.abilities];
  }

  /**
   * Get unlocked abilities
   * @returns List of unlocked abilities
   */
  getUnlockedAbilities(): Ability[] {
    return [...this.unlocked];
  }

  /**
   * Type-safe serialization
   * @returns Serializable abilities data
   */
  toJSON(): Record<string, any> {
    return {
      playerId: this.playerId,
      playerName: this.playerName,
      abilities: this.abilities,
      unlocked: this.unlocked,
      abilityCooldowns: { ...this.abilityCooldowns },
      racialAbility: this.racialAbility,
      racialUsesLeft: this.racialUsesLeft,
      racialCooldown: this.racialCooldown,
      racialEffects: { ...this.racialEffects },
      hasSubmittedAction: this.hasSubmittedAction,
      submittedAction: this.submittedAction,
      actionSubmissionTime: this.actionSubmissionTime,
      lastValidAction: this.lastValidAction,
      actionValidationState: this.actionValidationState,
    };
  }

  /**
   * Create PlayerAbilities from serialized data
   * @param data - Serialized abilities data
   * @returns New PlayerAbilities instance
   */
  static fromJSON(data: any): PlayerAbilities {
    const abilities = new PlayerAbilities(data.playerId, data.playerName);

    if (data.abilities) abilities.setAbilities(data.abilities);
    if (data.unlocked) abilities.setUnlockedAbilities(data.unlocked);
    if (data.abilityCooldowns) abilities.abilityCooldowns = data.abilityCooldowns;
    if (data.racialAbility) abilities.setRacialAbility(data.racialAbility);

    abilities.racialUsesLeft = data.racialUsesLeft || 0;
    abilities.racialCooldown = data.racialCooldown || 0;
    abilities.racialEffects = data.racialEffects || {};
    abilities.hasSubmittedAction = data.hasSubmittedAction || false;
    abilities.submittedAction = data.submittedAction || null;
    abilities.actionSubmissionTime = data.actionSubmissionTime || null;
    abilities.lastValidAction = data.lastValidAction || null;
    abilities.actionValidationState = data.actionValidationState || 'none';

    return abilities;
  }

  /**
   * Get whether player has submitted an action
   */
  getHasSubmittedAction(): boolean {
    return this.hasSubmittedAction;
  }

  /**
   * Get the submitted action
   */
  getSubmittedAction(): ActionSubmission | null {
    return this.submittedAction;
  }
}

export default PlayerAbilities;
