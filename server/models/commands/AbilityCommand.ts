/**
 * @fileoverview Ability command implementation for player ability usage with TypeScript
 * Handles ability validation, cooldowns, targeting, and execution
 * Part of Phase 4 refactoring - TypeScript Migration with strong typing for command processing
 * Enhanced with Zod validation for runtime data integrity
 */
import { PlayerActionCommand, CommandOptions, GameContext, CommandResult } from './PlayerActionCommand.js';
import { EventTypes } from '../events/EventTypes.js';
import { getCurrentTimestamp } from '../../utils/timestamp.js';

import { lenientValidator } from '../validation/ValidationMiddleware.js';
import logger from '../../utils/logger.js';

/**
 * Ability-specific command options
 */
export interface AbilityCommandOptions extends CommandOptions {
  coordinationInfo?: Record<string, unknown> | null;
}

/**
 * Player ability interface (basic typing for now)
 */
interface Ability {
  id: string;
  type?: string;
  target: 'Self' | 'Single' | 'All' | 'AllPlayers' | 'Monster';
  cooldown?: number;
  category?: string;
  isWarlockAbility?: boolean;
  canTargetDead?: boolean;
  requiresHealth?: number;
  requiresEffect?: string;
  prohibitedEffects?: string[];
  requiredClass?: string;
  requiredRace?: string;
}

/**
 * Player interface (basic typing for now)
 */
interface Player {
  id: string;
  isAlive: boolean;
  abilities?: Ability[];
  unlocked?: Array<{ id: string; type: string }>;
  playerAbilities?: {
    isAbilityOnCooldown(_abilityId: string): boolean;
    setCooldown(_abilityId: string, _cooldown: number): void;
  };
  playerEffects?: {
    hasEffect(_effectType: string): boolean;
  };
  hasSubmittedAction?: boolean;
  actionSubmissionTime?: number;
  hp?: number;
  maxHp?: number;
  class?: string;
  race?: string;
}

/**
 * Game interface (basic typing for now)
 */
interface Game {
  getPlayerById(_playerId: string): Player | undefined;
  monster?: {
    hp: number;
  };
  gamePhase?: {
    addPendingAction(_action: {
      actorId: string;
      actionType: string;
      targetId: string | null;
      options?: Record<string, unknown>;
    }): void;
  };
  emitEvent(_eventType: string, _data: Record<string, unknown>): Promise<void>;
  players?: Map<string, Player>;
  systems?: {
    abilityRegistry?: {
      executePlayerAbility(
        _player: Player,
        _target: Player | Player[] | any,
        _ability: Ability,
        _log: string[],
        _systems: any,
        _coordinationInfo?: Record<string, unknown> | null
      ): Promise<any>;
    };
  };
}

/**
 * Command for executing player abilities
 * Handles ability-specific validation, cooldowns, and execution
 */
export class AbilityCommand extends PlayerActionCommand {
  public readonly coordinationInfo: Record<string, unknown> | null;
  private readonly originalTargetId: string | null;

  /**
   * Create a new ability command
   * @param playerId - ID of the player using the ability
   * @param abilityId - ID of the ability to use
   * @param options - Command options
   */
  constructor(playerId: string, abilityId: string, options: AbilityCommandOptions = {}) {
    super(playerId, 'ability', {
      ...options,
      abilityId,
      canUndo: false // Abilities typically cannot be undone
    });

    this.coordinationInfo = options.coordinationInfo || null;
    this.originalTargetId = this.targetId; // Store original target for validation
  }

  /**
   * Validate ability usage
   * @param gameContext - Current game context
   * @returns True if ability can be used
   * @protected
   */
  protected async _validateAction(gameContext: GameContext): Promise<void> {
    const { game } = gameContext;
    const player = (game as Game).getPlayerById(this.playerId);
    const ability = this._findAbility(player);

    // Zod validation for ability action structure
    try {
      const validationResult = lenientValidator.validateAbilityAction({
        playerId: this.playerId,
        actionType: this.actionType,
        abilityId: this.abilityId,
        targetId: this.targetId,
        timestamp: this.timestamp
      });

      if (!validationResult.success) {
        this.validationErrors.push(...validationResult.errors);
      }
    } catch (zodError: any) {
      // If Zod validation fails, log but continue with basic validation
      logger.warn('Zod validation error in AbilityCommand', {
        error: zodError.message,
        playerId: this.playerId,
        abilityId: this.abilityId
      });
      // Fall back to basic validation only
    }

    if (!ability) {
      this.validationErrors.push(`Ability ${this.abilityId} not found for player`);
      return;
    }

    // Check if ability is unlocked
    if (!this._isAbilityUnlocked(player, ability)) {
      this.validationErrors.push(`Ability ${this.abilityId} is not unlocked`);
      return;
    }

    // Check cooldown
    if (this._isOnCooldown(player, ability)) {
      this.validationErrors.push(`Ability ${this.abilityId} is on cooldown`);
      return;
    }

    // Validate target
    await this._validateTarget(gameContext, ability);

    // Validate ability-specific requirements
    await this._validateAbilityRequirements(gameContext, ability);

    // Emit ability validation event
    await (game as Game).emitEvent(EventTypes.ABILITY.VALIDATED, {
      playerId: this.playerId,
      abilityId: this.abilityId!,
      targetId: this.targetId,
      isValid: this.validationErrors.length === 0,
      errors: this.validationErrors,
      warnings: this.validationWarnings,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Execute the ability
   * @param gameContext - Current game context
   * @returns Execution result
   * @protected
   */
  protected async _executeAction(gameContext: GameContext): Promise<CommandResult> {
    const { game } = gameContext;
    const player = (game as Game).getPlayerById(this.playerId);
    const ability = this._findAbility(player);

    if (!ability) {
      throw new Error(`Ability ${this.abilityId} not found for player`);
    }

    try {
      // Add the action to game's pending actions
      // This is what the game's processPlayerActions expects
      if ((game as Game).gamePhase) {
        (game as Game).gamePhase!.addPendingAction({
          actorId: this.playerId,
          actionType: this.abilityId!, // The game expects the ability ID as actionType
          targetId: this.targetId,
          options: this.metadata
        });
      }

      // Mark player as having submitted (for backward compatibility)
      if (player) {
        player.hasSubmittedAction = true;
        // Track when player submitted their action
        player.actionSubmissionTime = getCurrentTimestamp();
      }

      // Emit ability validated event (not used, just validated)
      await (game as Game).emitEvent(EventTypes.ABILITY.VALIDATED, {
        playerId: this.playerId,
        abilityId: this.abilityId!,
        targetId: this.targetId,
        isValid: true,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        data: {
          abilityId: this.abilityId,
          targetId: this.targetId,
          actionQueued: true
        },
        message: 'Ability command queued successfully'
      };

    } catch (error: any) {
      // Emit ability failed event
      await (game as Game).emitEvent(EventTypes.ABILITY.FAILED, {
        playerId: this.playerId,
        abilityId: this.abilityId!,
        targetId: this.targetId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Find the ability in player's ability list
   * @param player - Player object
   * @returns Ability object or undefined
   * @private
   */
  private _findAbility(player: Player | undefined): Ability | undefined {
    if (!player?.abilities) return undefined;
    // Try to find by id first, then by type (for backward compatibility)
    return player.abilities.find(ability =>
      ability.id === this.abilityId || ability.type === this.abilityId
    );
  }

  /**
   * Check if ability is unlocked for the player
   * @param player - Player object
   * @param ability - Ability object
   * @returns True if unlocked
   * @private
   */
  private _isAbilityUnlocked(player: Player | undefined, _ability: Ability): boolean {
    if (!player?.unlocked) return false;
    // Check by both id and type for backward compatibility
    return player.unlocked.some(unlockedAbility =>
      unlockedAbility.id === this.abilityId || unlockedAbility.type === this.abilityId
    );
  }

  /**
   * Check if ability is on cooldown
   * @param player - Player object
   * @param ability - Ability object
   * @returns True if on cooldown
   * @private
   */
  private _isOnCooldown(player: Player | undefined, _ability: Ability): boolean {
    if (!player?.playerAbilities) return false;
    return player.playerAbilities.isAbilityOnCooldown(this.abilityId!);
  }

  /**
   * Set ability on cooldown
   * @param player - Player object
   * @param ability - Ability object
   * @private
   */
  private _setCooldown(player: Player | undefined, ability: Ability): void {
    if (player?.playerAbilities && ability.cooldown && ability.cooldown > 0) {
      player.playerAbilities.setCooldown(this.abilityId!, ability.cooldown);
    }
  }

  /**
   * Check if this is a warlock ability
   * @param ability - Ability object
   * @returns True if warlock ability
   * @private
   */
  private _isWarlockAbility(ability: Ability): boolean {
    return ability.category === 'Warlock' || ability.isWarlockAbility === true;
  }

  /**
   * Validate ability target
   * @param gameContext - Game context
   * @param ability - Ability object
   * @private
   */
  private async _validateTarget(gameContext: GameContext, ability: Ability): Promise<void> {
    const { game } = gameContext;

    if (!ability.target) {
      this.validationErrors.push(`Ability ${this.abilityId} has no target specification`);
      return;
    }

    switch (ability.target) {
      case 'Self':
        if (this.targetId && this.targetId !== this.playerId) {
          this.validationErrors.push('Self-target abilities cannot target other players');
        }
        // Ensure target is self by modifying the readonly property through Object.defineProperty
        Object.defineProperty(this, 'targetId', { value: this.playerId, configurable: true });
        break;

      case 'Single':
        if (!this.targetId) {
          this.validationErrors.push('Single-target ability requires a target');
          return;
        }

        if (this.targetId === '__monster__' || this.targetId === 'monster') {
          if (!(game as Game).monster || (game as Game).monster!.hp <= 0) {
            this.validationErrors.push('Cannot target dead or non-existent monster');
          }
          // Normalize to internal monster ID
          Object.defineProperty(this, 'targetId', { value: '__monster__', configurable: true });
        } else {
          const target = (game as Game).getPlayerById(this.targetId);
          if (!target) {
            this.validationErrors.push(`Target player ${this.targetId} not found`);
          } else if (!target.isAlive && !ability.canTargetDead) {
            this.validationErrors.push('Cannot target dead players with this ability');
          }
        }
        break;

      case 'All':
      case 'AllPlayers':
        // No target validation needed for AoE abilities
        break;

      case 'Monster':
        if (!(game as Game).monster || (game as Game).monster!.hp <= 0) {
          this.validationErrors.push('Cannot target dead or non-existent monster');
        }
        Object.defineProperty(this, 'targetId', { value: '__monster__', configurable: true });
        break;

      default:
        this.validationErrors.push(`Unknown target type: ${ability.target}`);
    }
  }

  /**
   * Validate ability-specific requirements
   * @param gameContext - Game context
   * @param ability - Ability object
   * @private
   */
  private async _validateAbilityRequirements(gameContext: GameContext, ability: Ability): Promise<void> {
    const { game } = gameContext;
    const player = (game as Game).getPlayerById(this.playerId);

    if (!player) return;

    // Check health requirements
    if (ability.requiresHealth) {
      const requiredHealth = typeof ability.requiresHealth === 'number'
        ? ability.requiresHealth
        : Math.ceil((player.maxHp || 100) * ability.requiresHealth);

      if ((player.hp || 0) < requiredHealth) {
        this.validationErrors.push(`Not enough health (requires ${requiredHealth}, have ${player.hp || 0})`);
      }
    }

    // Check status effect requirements
    if (ability.requiresEffect) {
      if (!player.playerEffects || !player.playerEffects.hasEffect(ability.requiresEffect)) {
        this.validationErrors.push(`Requires status effect: ${ability.requiresEffect}`);
      }
    }

    // Check prohibiting effects
    if (ability.prohibitedEffects) {
      for (const effectType of ability.prohibitedEffects) {
        if (player.playerEffects && player.playerEffects.hasEffect(effectType)) {
          this.validationErrors.push(`Cannot use while affected by: ${effectType}`);
        }
      }
    }

    // Check class-specific requirements
    if (ability.requiredClass && player.class !== ability.requiredClass) {
      this.validationErrors.push(`Ability requires class: ${ability.requiredClass}`);
    }

    // Check race-specific requirements
    if (ability.requiredRace && player.race !== ability.requiredRace) {
      this.validationErrors.push(`Ability requires race: ${ability.requiredRace}`);
    }
  }

  /**
   * Resolve the target for ability execution
   * @param gameContext - Game context
   * @returns Target object(s)
   * @private
   */
  private _resolveTarget(gameContext: GameContext): Player | Player[] | any {
    const { game } = gameContext;

    if (this.targetId === '__monster__' || this.targetId === 'monster') {
      return (game as Game).monster;
    }

    if (this.targetId) {
      return (game as Game).getPlayerById(this.targetId);
    }

    // For AoE abilities, return all players
    return Array.from((game as Game).players?.values() || []);
  }

  /**
   * Execute the ability through the game systems
   * @param gameContext - Game context
   * @param ability - Ability object
   * @param target - Target object
   * @returns Ability execution result
   * @private
   */
  private async _executeAbility(gameContext: GameContext, ability: Ability, target: Player | Player[] | any): Promise<any> {
    const { game } = gameContext;
    const player = (game as Game).getPlayerById(this.playerId);

    if (!(game as Game).systems || !(game as Game).systems!.abilityRegistry) {
      throw new Error('Game systems not initialized');
    }

    // Create log array for ability execution
    const log: string[] = [];

    // Execute ability through registry
    const result = await (game as Game).systems!.abilityRegistry!.executePlayerAbility(
      player!,
      target,
      ability,
      log,
      (game as Game).systems,
      this.coordinationInfo
    );

    return {
      abilityResult: result,
      log: log,
      coordinationApplied: this.coordinationInfo ? true : false
    };
  }

  /**
   * Create ability command from action data
   * @param playerId - Player ID
   * @param actionData - Action data from client
   * @returns Ability command instance
   */
  static fromActionData(playerId: string, actionData: Record<string, unknown>): AbilityCommand {
    const { targetId, abilityId, metadata } = actionData;

    return new AbilityCommand(playerId, abilityId as string, {
      targetId: targetId as string,
      metadata: metadata as Record<string, unknown>
    });
  }
}

// ES module export
export default AbilityCommand;
