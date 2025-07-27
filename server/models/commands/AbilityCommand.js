/**
 * @fileoverview Ability command implementation for player ability usage
 * Handles ability validation, cooldowns, targeting, and execution
 * Part of Phase 2 refactoring - Event-Driven Architecture
 */
const PlayerActionCommand = require('./PlayerActionCommand');
const { EventTypes } = require('../events/EventTypes');
const logger = require('@utils/logger');

/**
 * Command for executing player abilities
 * Handles ability-specific validation, cooldowns, and execution
 */
class AbilityCommand extends PlayerActionCommand {
  /**
   * Create a new ability command
   * @param {string} playerId - ID of the player using the ability
   * @param {string} abilityId - ID of the ability to use
   * @param {Object} options - Command options
   * @param {string} options.targetId - Target for the ability
   * @param {Object} options.metadata - Additional ability metadata
   */
  constructor(playerId, abilityId, options = {}) {
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
   * @param {Object} gameContext - Current game context
   * @returns {Promise<boolean>} True if ability can be used
   * @protected
   */
  async _validateAction(gameContext) {
    const { game } = gameContext;
    const player = game.getPlayerById(this.playerId);
    const ability = this._findAbility(player);

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

    // Check if player has already used an ability this turn
    if (game.gamePhase && game.gamePhase.hasPlayerSubmittedAction(this.playerId)) {
      this.validationErrors.push('Player has already submitted an action this turn');
      return;
    }

    // Validate target
    await this._validateTarget(gameContext, ability);

    // Validate ability-specific requirements
    await this._validateAbilityRequirements(gameContext, ability);

    // Check warlock restrictions
    if (player.isWarlock && !this._isWarlockAbility(ability)) {
      this.validationErrors.push('Warlocks can only use warlock abilities');
    }

    // Emit ability validation event
    await game.emitEvent(EventTypes.ABILITY.VALIDATED, {
      playerId: this.playerId,
      abilityId: this.abilityId,
      targetId: this.targetId,
      isValid: this.validationErrors.length === 0,
      errors: this.validationErrors,
      warnings: this.validationWarnings,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Execute the ability
   * @param {Object} gameContext - Current game context
   * @returns {Promise<Object>} Execution result
   * @protected
   */
  async _executeAction(gameContext) {
    const { game } = gameContext;
    const player = game.getPlayerById(this.playerId);
    const ability = this._findAbility(player);

    if (!ability) {
      throw new Error(`Ability ${this.abilityId} not found for player`);
    }

    try {
      // Add the action to game's pending actions
      // This is what the game's processPlayerActions expects
      if (game.gamePhase) {
        game.gamePhase.addPendingAction({
          actorId: this.playerId,
          actionType: this.abilityId, // The game expects the ability ID as actionType
          targetId: this.targetId,
          options: this.metadata
        });
      }

      // Mark player as having submitted (for backward compatibility)
      player.hasSubmittedAction = true;
      player.actionSubmissionTime = Date.now();

      // Don't set cooldown here - let the game handle it during execution
      // Don't execute ability here - let the game's processPlayerActions handle it

      // Emit ability validated event (not used, just validated)
      await game.emitEvent(EventTypes.ABILITY.VALIDATED, {
        playerId: this.playerId,
        abilityId: this.abilityId,
        targetId: this.targetId,
        isValid: true,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        abilityId: this.abilityId,
        targetId: this.targetId,
        actionQueued: true
      };

    } catch (error) {
      // Emit ability failed event
      await game.emitEvent(EventTypes.ABILITY.FAILED, {
        playerId: this.playerId,
        abilityId: this.abilityId,
        targetId: this.targetId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Find the ability in player's ability list
   * @param {Object} player - Player object
   * @returns {Object|null} Ability object or null
   * @private
   */
  _findAbility(player) {
    if (!player.abilities) return null;
    // Try to find by id first, then by type (for backward compatibility)
    return player.abilities.find(ability => 
      ability.id === this.abilityId || ability.type === this.abilityId
    );
  }

  /**
   * Check if ability is unlocked for the player
   * @param {Object} player - Player object
   * @param {Object} ability - Ability object
   * @returns {boolean} True if unlocked
   * @private
   */
  _isAbilityUnlocked(player, ability) {
    if (!player.unlocked) return false;
    // Check by both id and type for backward compatibility
    return player.unlocked.some(unlockedAbility => 
      unlockedAbility.id === this.abilityId || unlockedAbility.type === this.abilityId
    );
  }

  /**
   * Check if ability is on cooldown
   * @param {Object} player - Player object
   * @param {Object} ability - Ability object
   * @returns {boolean} True if on cooldown
   * @private
   */
  _isOnCooldown(player, ability) {
    if (!player.playerAbilities) return false;
    return player.playerAbilities.isOnCooldown(this.abilityId);
  }

  /**
   * Set ability on cooldown
   * @param {Object} player - Player object
   * @param {Object} ability - Ability object
   * @private
   */
  _setCooldown(player, ability) {
    if (player.playerAbilities && ability.cooldown > 0) {
      player.playerAbilities.setCooldown(this.abilityId, ability.cooldown);
    }
  }

  /**
   * Check if this is a warlock ability
   * @param {Object} ability - Ability object
   * @returns {boolean} True if warlock ability
   * @private
   */
  _isWarlockAbility(ability) {
    return ability.category === 'Warlock' || ability.isWarlockAbility;
  }

  /**
   * Validate ability target
   * @param {Object} gameContext - Game context
   * @param {Object} ability - Ability object
   * @private
   */
  async _validateTarget(gameContext, ability) {
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
        this.targetId = this.playerId; // Ensure target is self
        break;

      case 'Single':
        if (!this.targetId) {
          this.validationErrors.push('Single-target ability requires a target');
          return;
        }
        
        if (this.targetId === '__monster__' || this.targetId === 'monster') {
          if (!game.monster || game.monster.hp <= 0) {
            this.validationErrors.push('Cannot target dead or non-existent monster');
          }
          // Normalize to internal monster ID
          this.targetId = '__monster__';
        } else {
          const target = game.getPlayerById(this.targetId);
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
        if (!game.monster || game.monster.hp <= 0) {
          this.validationErrors.push('Cannot target dead or non-existent monster');
        }
        this.targetId = '__monster__';
        break;

      default:
        this.validationErrors.push(`Unknown target type: ${ability.target}`);
    }
  }

  /**
   * Validate ability-specific requirements
   * @param {Object} gameContext - Game context
   * @param {Object} ability - Ability object
   * @private
   */
  async _validateAbilityRequirements(gameContext, ability) {
    const { game } = gameContext;
    const player = game.getPlayerById(this.playerId);

    // Check health requirements
    if (ability.requiresHealth) {
      const requiredHealth = typeof ability.requiresHealth === 'number' 
        ? ability.requiresHealth 
        : Math.ceil(player.maxHp * ability.requiresHealth);
      
      if (player.hp < requiredHealth) {
        this.validationErrors.push(`Not enough health (requires ${requiredHealth}, have ${player.hp})`);
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
   * @param {Object} gameContext - Game context
   * @returns {Object|Array} Target object(s)
   * @private
   */
  _resolveTarget(gameContext) {
    const { game } = gameContext;

    if (this.targetId === '__monster__' || this.targetId === 'monster') {
      return game.monster;
    }

    if (this.targetId) {
      return game.getPlayerById(this.targetId);
    }

    // For AoE abilities, return all players
    return Array.from(game.players.values());
  }

  /**
   * Execute the ability through the game systems
   * @param {Object} gameContext - Game context
   * @param {Object} ability - Ability object
   * @param {Object} target - Target object
   * @returns {Promise<Object>} Ability execution result
   * @private
   */
  async _executeAbility(gameContext, ability, target) {
    const { game } = gameContext;
    const player = game.getPlayerById(this.playerId);

    if (!game.systems || !game.systems.abilityRegistry) {
      throw new Error('Game systems not initialized');
    }

    // Create log array for ability execution
    const log = [];

    // Execute ability through registry
    const result = await game.systems.abilityRegistry.executePlayerAbility(
      player,
      target,
      ability,
      log,
      game.systems,
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
   * @param {string} playerId - Player ID
   * @param {Object} actionData - Action data from client
   * @returns {AbilityCommand} Ability command instance
   */
  static fromActionData(playerId, actionData) {
    const { targetId, abilityId, metadata } = actionData;
    
    return new AbilityCommand(playerId, abilityId, {
      targetId,
      metadata
    });
  }
}

module.exports = AbilityCommand;