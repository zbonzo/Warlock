/**
 * @fileoverview Game State Updater Module
 * Handles game state updates after combat rounds
 * Extracted from CombatSystem.ts for better modularity
 */

import type { Player } from '../../../../types/generated.js';
import type { CombatLogEntry, RoundSummary } from '../interfaces.js';
import config from '../../../../config/index.js';
import logger from '../../../../utils/logger.js';

export interface GameStateUpdaterDependencies {
  players: Map<string, Player>;
  gameStateUtils: any;
  monsterController: any;
  statusEffectManager: any;
}

/**
 * Game State Updater - Handles post-combat game state updates
 */
export class GameStateUpdater {
  private readonly players: Map<string, Player>;
  private readonly gameStateUtils: any;
  private readonly monsterController: any;
  private readonly statusEffectManager: any;

  constructor(dependencies: GameStateUpdaterDependencies) {
    this.players = dependencies.players;
    this.gameStateUtils = dependencies.gameStateUtils;
    this.monsterController = dependencies.monsterController;
    this.statusEffectManager = dependencies.statusEffectManager;
  }

  /**
   * Update game state after a combat round
   */
  async updateGameState(gameRoom: any, summary: RoundSummary): Promise<void> {
    try {
      // Update monster state based on damage taken
      await this.updateMonsterState(gameRoom, summary);

      // Update player states and cooldowns
      await this.updatePlayerStates(gameRoom, summary);

      // Check for game ending conditions
      await this.checkGameEndingConditions(gameRoom, summary);

      // Update game statistics
      await this.updateGameStatistics(gameRoom, summary);

      // Clean up temporary round data
      await this.cleanupRoundData(gameRoom);

    } catch (error) {
      logger.error('Error updating game state:', error as any);
    }
  }

  /**
   * Update monster state after damage and effects
   */
  private async updateMonsterState(gameRoom: any, summary: RoundSummary): Promise<void> {
    const monster = gameRoom.monster;
    if (!monster) return;

    // Apply damage to monster
    if (summary.totalDamageToMonster > 0) {
      monster.hp = Math.max(0, monster.hp - summary.totalDamageToMonster);

      // Update monster threat levels based on player actions
      if (this.monsterController?.updateThreatLevels) {
        await this.monsterController.updateThreatLevels(summary);
      }
    }

    // Check if monster is defeated
    if (monster.hp <= 0) {
      monster.isAlive = false;
      gameRoom.gamePhase.phase = 'victory';

      // Award victory bonuses
      await this.awardVictoryBonuses(gameRoom, summary);
    }

    // Update monster age/level if still alive
    if (monster.isAlive) {
      monster.age = (monster.age || 0) + 1;

      // Scale monster stats based on age
      await this.scaleMonsterStats(monster);
    }
  }

  /**
   * Update player states, cooldowns, and temporary effects
   */
  private async updatePlayerStates(gameRoom: any, summary: RoundSummary): Promise<void> {
    for (const [playerId, player] of this.players.entries()) {
      // Reset player's submitted action state
      player.hasSubmittedAction = false;
      player.currentAction = null;

      // Update cooldowns
      await this.updatePlayerCooldowns(player);

      // Apply any end-of-round player effects
      await this.applyPlayerEndOfRoundEffects(player, summary);

      // Reset temporary round-specific data
      this.resetPlayerRoundData(player);
    }
  }

  /**
   * Check for game ending conditions (victory, defeat, time limit)
   */
  private async checkGameEndingConditions(gameRoom: any, summary: RoundSummary): Promise<void> {
    // Check for player defeat (all players dead)
    const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive);
    if (alivePlayers.length === 0) {
      gameRoom.gamePhase.phase = 'defeat';
      gameRoom.gamePhase.endReason = 'all_players_dead';
      return;
    }

    // Check for time limit (if configured)
    // Note: timeLimit not currently in config schema
    // const timeLimit = (config as any).gameBalance?.timeLimit;
    // if (timeLimit && gameRoom.startTime) {
    //   const elapsedTime = Date.now() - new Date(gameRoom.startTime).getTime();
    //   if (elapsedTime > timeLimit * 1000) {
    //     gameRoom.gamePhase.phase = 'defeat';
    //     gameRoom.gamePhase.endReason = 'time_limit_exceeded';
    //     return;
    //   }
    // }

    // Check for round limit (if configured)
    // Note: maxRounds not currently in config schema
    // const roundLimit = (config as any).gameBalance?.maxRounds;
    // if (roundLimit && gameRoom.currentRound >= roundLimit) {
    //   gameRoom.gamePhase.phase = 'defeat';
    //   gameRoom.gamePhase.endReason = 'round_limit_exceeded';
    //   return;
    // }

    // Check for monster victory condition (monster reached full power)
    const monster = gameRoom.monster;
    const maxAge = config.gameBalance?.monster?.damageScaling?.maxAge || 20;
    if (monster?.age && maxAge && monster.age > maxAge) {
      gameRoom.gamePhase.phase = 'defeat';
      gameRoom.gamePhase.endReason = 'monster_too_powerful';
      return;
    }
  }

  /**
   * Update game-wide statistics
   */
  private async updateGameStatistics(gameRoom: any, summary: RoundSummary): Promise<void> {
    if (!gameRoom.statistics) {
      gameRoom.statistics = {
        totalDamageDealt: 0,
        totalHealingDone: 0,
        totalAbilitiesUsed: 0,
        totalCoordinatedActions: 0,
        roundsPlayed: 0,
        playersKilled: 0
      };
    }

    // Update cumulative statistics
    gameRoom.statistics.totalDamageDealt += summary.totalDamageToMonster;
    gameRoom.statistics.totalHealingDone += summary.totalHealing;
    gameRoom.statistics.totalAbilitiesUsed += summary.abilitiesUsed;
    gameRoom.statistics.totalCoordinatedActions += summary.coordinatedActions;
    gameRoom.statistics.roundsPlayed += 1;
    gameRoom.statistics.playersKilled += summary.playersKilled.length;

    // Update individual player statistics
    for (const [playerId, player] of this.players.entries()) {
      if (!player.statistics) {
        player.statistics = {
          damageDealt: 0,
          healingDone: 0,
          abilitiesUsed: 0,
          coordinatedActions: 0,
          timesKilled: 0
        };
      }

      // Update player-specific stats based on their actions this round
      // This would typically be tracked during action processing
      if (summary.playersKilled.includes(playerId)) {
        player.statistics.timesKilled += 1;
      }
    }
  }

  /**
   * Clean up temporary round data
   */
  private async cleanupRoundData(gameRoom: any): Promise<void> {
    // Clear any temporary round-specific data
    if (gameRoom.currentRoundData) {
      delete gameRoom.currentRoundData;
    }

    // Clear action validation caches
    for (const [playerId, player] of this.players.entries()) {
      if ((player as any).actionValidationCache) {
        delete (player as any).actionValidationCache;
      }
    }

    // Increment round counter
    gameRoom.currentRound = (gameRoom.currentRound || 0) + 1;
  }

  /**
   * Award victory bonuses to players
   */
  private async awardVictoryBonuses(gameRoom: any, summary: RoundSummary): Promise<void> {
    const bonusMultiplier = this.calculateVictoryBonus(gameRoom, summary);

    for (const [playerId, player] of this.players.entries()) {
      if (!player.isAlive) continue;

      // Award experience bonus
      const expBonus = Math.floor(100 * bonusMultiplier);
      player.experience = (player.experience || 0) + expBonus;

      // Award HP bonus for surviving players
      const hpBonus = Math.floor(player.maxHp * 0.1);
      player.maxHp += hpBonus;
      player.hp = player.maxHp; // Full heal on victory

      logger.info(`Player ${player.name} receives victory bonus: ${expBonus} exp, +${hpBonus} max HP`);
    }
  }

  /**
   * Calculate victory bonus multiplier based on performance
   */
  private calculateVictoryBonus(gameRoom: any, summary: RoundSummary): number {
    let bonusMultiplier = 1.0;

    // Bonus for fast victory (fewer rounds)
    const roundsPlayed = gameRoom.currentRound || 1;
    if (roundsPlayed <= 5) {
      bonusMultiplier += 0.5;
    } else if (roundsPlayed <= 10) {
      bonusMultiplier += 0.25;
    }

    // Bonus for coordination
    if (summary.coordinatedActions > summary.abilitiesUsed * 0.5) {
      bonusMultiplier += 0.3;
    }

    // Bonus for no player deaths
    if (summary.playersKilled.length === 0) {
      bonusMultiplier += 0.2;
    }

    // Cap the bonus multiplier
    return Math.min(bonusMultiplier, 2.0);
  }

  /**
   * Scale monster stats based on age/level
   */
  private async scaleMonsterStats(monster: any): Promise<void> {
    if (!monster.age) return;

    // Increase monster power over time
    const scaleFactor = 1 + (monster.age * 0.05); // 5% increase per round

    monster.maxHp = Math.floor((monster.baseMaxHp || monster.maxHp) * scaleFactor);
    monster.attackPower = Math.floor((monster.baseAttackPower || monster.attackPower || 10) * scaleFactor);
    monster.defensePower = Math.floor((monster.baseDefensePower || monster.defensePower || 5) * scaleFactor);

    // Heal monster slightly each round (represents regeneration)
    const regenAmount = Math.floor(monster.maxHp * 0.02); // 2% regen per round
    monster.hp = Math.min(monster.maxHp, monster.hp + regenAmount);
  }

  /**
   * Update player cooldowns
   */
  private async updatePlayerCooldowns(player: Player): Promise<void> {
    // Decrement all cooldowns by 1
    if (this.statusEffectManager?.decrementCooldowns) {
      await this.statusEffectManager.decrementCooldowns(player.id);
    }

    // Update ability-specific cooldowns
    if (player.abilityCooldowns) {
      for (const [abilityId, cooldown] of Object.entries(player.abilityCooldowns)) {
        if (typeof cooldown === 'number' && cooldown > 0) {
          player.abilityCooldowns[abilityId] = Math.max(0, cooldown - 1);
        }
      }
    }
  }

  /**
   * Apply player-specific end-of-round effects
   */
  private async applyPlayerEndOfRoundEffects(player: Player, summary: RoundSummary): Promise<void> {
    // Apply racial passive effects
    switch (player.race?.toLowerCase()) {
      case 'lich':
        // Lich slow regeneration
        const regenAmount = Math.floor(player.maxHp * 0.03);
        player.hp = Math.min(player.maxHp, player.hp + regenAmount);
        break;

      case 'orc':
        // Orc rage building
        if (summary.totalDamageToPlayers > 0) {
          await this.statusEffectManager?.addEffect?.(player.id, 'building_rage', {
            duration: 2,
            stacks: 1
          });
        }
        break;
    }

    // Apply class passive effects
    switch (player.characterClass?.toLowerCase()) {
      case 'priest':
        // Priest passive healing
        const healAmount = Math.floor(player.maxHp * 0.02);
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        break;

      case 'barbarian':
        // Barbarian battle fury
        if (summary.abilitiesUsed > 0) {
          await this.statusEffectManager?.addEffect?.(player.id, 'battle_fury', {
            duration: 1,
            damageBonus: 5
          });
        }
        break;
    }
  }

  /**
   * Reset player round-specific data
   */
  private resetPlayerRoundData(player: Player): void {
    // Reset temporary round data
    (player as any).damageTakenThisRound = 0;
    (player as any).damageDealtThisRound = 0;
    (player as any).healingDoneThisRound = 0;
    (player as any).actionProcessed = false;
  }
}
