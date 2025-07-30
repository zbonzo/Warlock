/**
 * @fileoverview Game state management utilities for GameRoom - TypeScript version
 * Handles level progression, monster state, and round processing
 * Phase 9: TypeScript Migration - Converted from GameStateManager.js
 */

import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import messages from '../../config/messages/index.js';
import type { GameRoom } from '../GameRoom.js';
import type { Player } from '../Player.js';
import type { Ability } from '../../types/generated.js';
import type { ActionProcessor } from './ActionProcessor.js';

/**
 * Passive ability activation record
 */
interface PassiveActivation {
  player: string;
  ability: string;
  log: string[];
}

/**
 * Action results from processing
 */
interface ActionResults {
  results: any[];
  coordination: any;
}

/**
 * GameStateManager handles game progression and state management
 */
export class GameStateManager {
  private gameRoom: GameRoom;

  constructor(gameRoom: GameRoom) {
    this.gameRoom = gameRoom;
  }

  /**
   * Process a complete round of the game
   */
  processRound(): string[] {
    const log: string[] = [];
    
    // Process round start
    this.handleRoundStart(log);
    
    // Process racial abilities first
    (this.gameRoom as any).actionProcessor.processRacialAbilities(log);
    
    // Process player actions
    const actionResults = (this.gameRoom as any).actionProcessor.processPlayerActions(log);
    
    // Process monster actions
    this.processMonsterTurn(log);
    
    // Handle level progression
    const oldLevel = this.gameRoom.gamePhase.level;
    this.updateGameLevel();
    
    if (this.gameRoom.gamePhase.level > oldLevel) {
      this.handleLevelUp(oldLevel, log);
    }
    
    // Process end of round effects
    this.handleRoundEnd(log);
    
    // Clear actions for next round
    (this.gameRoom as any).actionProcessor.clearPendingActions();
    this.clearPlayerActionStates();
    
    return log;
  }

  /**
   * Handle start of round effects
   */
  private handleRoundStart(log: string[]): void {
    // Reset player action states
    for (const player of this.gameRoom.gameState.players.values()) {
      player.resetForNewRound();
    }
    
    // Process any start-of-round effects
    this.processStatusEffectTicks(log, 'start');
    
    // Update comeback mechanics
    this.gameRoom.systems.combatSystem.updateComebackStatus();
  }

  /**
   * Process monster's turn
   */
  private processMonsterTurn(log: string[]): void {
    const monster = this.gameRoom.gameState.monster;
    if (!monster || monster.hp <= 0) {
      return; // Monster is dead
    }
    
    // Process monster abilities and effects
    const alivePlayers = this.getAlivePlayers();
    
    // Apply any monster-specific logic here
    for (const player of alivePlayers) {
      if (player.race === 'Kinfolk' && player.isAlive) {
        // Special Kinfolk end-of-round processing
        this.processKinfolkEndOfRound(player, log);
      }
    }
    
    // Process class-specific end-of-round effects
    for (const player of alivePlayers) {
      if (player.isAlive) {
        const classEffectResult = this.processClassEndOfRoundEffects(player, log);
        if (classEffectResult && classEffectResult.length > 0) {
          log.push(...classEffectResult);
        }
      }
      
      // Handle players who died during round processing
      if (player.isAlive && player.hp <= 0) {
        this.handlePlayerDeath(player, log);
      }
    }
  }

  /**
   * Update the game level based on current state
   */
  private updateGameLevel(): void {
    const alivePlayers = this.getAlivePlayers();
    const aliveCount = alivePlayers.length;
    const totalPlayers = this.gameRoom.gameState.players.size;
    const monster = this.gameRoom.gameState.monster;
    
    if (!monster) return;
    
    // Calculate level based on game progression rules
    const newLevel = this.calculateGameLevel(aliveCount, totalPlayers, monster.hp);
    
    if (newLevel !== this.gameRoom.gamePhase.level) {
      this.gameRoom.gamePhase.level = newLevel;
      logger.debug(`Game level updated to ${newLevel}`);
    }
  }

  /**
   * Handle level up events
   */
  private handleLevelUp(oldLevel: number, log: string[]): void {
    log.push(`🎉 Level Up! The party has reached level ${this.gameRoom.gamePhase.level}!`);
    
    // Unlock new abilities for all players
    this.updateUnlockedAbilities(log);
    
    // Apply level up bonuses
    for (const player of this.gameRoom.gameState.players.values()) {
      if (player.isAlive) {
        this.applyLevelUpBonuses(player, oldLevel, log);
      }
    }
    
    // Enhance monster if needed
    this.enhanceMonsterForLevel(this.gameRoom.gamePhase.level, log);
  }

  /**
   * Handle end of round effects
   */
  private handleRoundEnd(log: string[]): void {
    // Process status effects that tick at end of round
    this.processStatusEffectTicks(log, 'end');
    
    // Process pending deaths
    this.gameRoom.systems.combatSystem.processPendingDeaths(log);
    
    // Update game statistics
    this.updateGameStatistics();
    
    // Check for game end conditions
    this.checkGameEndConditions(log);
  }

  /**
   * Update unlocked abilities for all players
   */
  private updateUnlockedAbilities(log: string[]): void {
    for (const player of this.gameRoom.gameState.players.values()) {
      const newlyUnlocked: Ability[] = [];
      
      for (const ability of player.abilities) {
        const alreadyUnlocked = player.unlockedAbilities.some(
          (a: Ability) => a.type === ability.type
        );
        
        if (ability.unlockAt <= this.gameRoom.gamePhase.level && !alreadyUnlocked) {
          player.unlockedAbilities.push(ability);
          newlyUnlocked.push(ability);
          
          // Activate passive abilities immediately
          if (ability.effect === 'passive') {
            this.activatePassiveAbility(player, ability, log);
          }
        }
      }
      
      if (newlyUnlocked.length > 0) {
        const abilityNames = newlyUnlocked.map(a => a.name).join(', ');
        log.push(`⚡ ${player.name} unlocked: ${abilityNames}`);
      }
      
      // Handle class-specific level up effects
      if (player.class === 'Barbarian' && (player as any).classEffects?.relentlessFury) {
        // Special Barbarian logic
        this.processBarbarianLevelUp(player, log);
      }
    }
  }

  /**
   * Activate a passive ability for a player
   */
  private activatePassiveAbility(player: Player, ability: Ability, log: string[]): void {
    const systems = this.gameRoom.systems;
    const success = systems.abilityRegistry.executeClassAbility(
      ability.type,
      player,
      player,
      ability,
      log,
      systems
    );
    
    if (success && log.length > 0) {
      // Store passive activation for later processing
      if (!(this.gameRoom as any).pendingPassiveActivations) {
        (this.gameRoom as any).pendingPassiveActivations = [];
      }
      (this.gameRoom as any).pendingPassiveActivations.push({
        player: player.id,
        ability: ability.type,
        log: [...log]
      } as PassiveActivation);
    }
  }

  /**
   * Get all alive players
   */
  getAlivePlayers(): Player[] {
    return Array.from(this.gameRoom.gameState.players.values()).filter(p => p.isAlive);
  }

  /**
   * Check if all actions have been submitted
   */
  allActionsSubmitted(): boolean {
    const alivePlayers = this.getAlivePlayers();
    
    // Count players who haven't submitted actions
    let playersWhoCanAct = 0;
    const playersWithRecentSubmissions: string[] = [];
    
    for (const player of alivePlayers) {
      if (!player.isAlive) {
        continue;
      }
      
      // Players who submitted actions this round
      if (player.hasSubmittedAction) {
        playersWithRecentSubmissions.push(player.id);
      }
      
      // Players who can potentially act
      if (player.hasSubmittedAction) {
        // Player has acted
      } else if (this.canPlayerAct(player)) {
        playersWhoCanAct++;
      }
    }
    
    // Check if we can proceed
    const activePlayerCount = alivePlayers.length;
    
    if (activePlayerCount === 0) {
      return true; // No players alive, can proceed
    }
    
    // All players who can act have acted
    if (playersWhoCanAct === 0) {
      return true;
    }
    
    // Check for timeout or other conditions
    const playersWhoCanActCount = playersWhoCanAct;
    if (playersWhoCanActCount > 0 && playersWithRecentSubmissions.length < playersWhoCanActCount) {
      return false; // Still waiting for actions
    }
    
    return true;
  }

  /**
   * Check if a player can act this round
   */
  private canPlayerAct(player: Player): boolean {
    if (!player.isAlive) return false;
    if (player.hasSubmittedAction) return false;
    
    // Check for status effects that prevent action
    if (player.hasStatusEffect('stunned')) return false;
    if (player.hasStatusEffect('paralyzed')) return false;
    
    return true;
  }

  /**
   * Calculate game level based on current state
   */
  private calculateGameLevel(aliveCount: number, totalPlayers: number, monsterHp: number): number {
    // Implement level calculation logic
    const baseLevel = Math.max(1, totalPlayers - aliveCount + 1);
    const monster = this.gameRoom.gameState.monster;
    
    if (!monster) return baseLevel;
    
    // Adjust based on monster health
    const monsterHealthFactor = Math.floor((1 - monsterHp / monster.maxHp) * 2);
    
    return Math.min(baseLevel + monsterHealthFactor, config.maxLevel || 10);
  }

  /**
   * Apply level up bonuses to a player
   */
  private applyLevelUpBonuses(player: Player, oldLevel: number, log: string[]): void {
    // Implement level up bonus logic
    const healthBonus = 5;
    player.maxHp += healthBonus;
    player.hp = Math.min(player.hp + healthBonus, player.maxHp);
    
    log.push(`❤️ ${player.name} gains ${healthBonus} max HP from leveling up!`);
  }

  /**
   * Enhance monster for new level
   */
  private enhanceMonsterForLevel(level: number, log: string[]): void {
    const monster = this.gameRoom.gameState.monster;
    if (!monster) return;
    
    // Implement monster enhancement logic
    const healthBonus = level * 10;
    monster.maxHp += healthBonus;
    monster.hp += healthBonus;
    
    log.push(`👹 The monster grows stronger with the party's experience!`);
  }

  /**
   * Process status effects that tick at specific times
   */
  private processStatusEffectTicks(log: string[], timing: 'start' | 'end'): void {
    for (const player of this.gameRoom.gameState.players.values()) {
      if (player.isAlive) {
        this.gameRoom.systems.statusEffectManager.processStatusEffects(
          player, 
          timing, 
          log
        );
      }
    }
  }

  /**
   * Handle player death
   */
  private handlePlayerDeath(player: Player, log: string[]): void {
    player.isAlive = false;
    this.gameRoom.gameState.aliveCount--;
    
    log.push(`💀 ${player.name} has fallen!`);
    
    // Process death-related effects
    this.gameRoom.systems.combatSystem.handlePotentialDeath(player, null, log);
  }

  /**
   * Process Kinfolk end-of-round effects
   */
  private processKinfolkEndOfRound(player: Player, log: string[]): void {
    // Implement Kinfolk-specific logic
    if ((player as any).racialEffects?.packHunting) {
      // Pack hunting effects
      const packBonus = this.calculatePackHuntingBonus(player);
      if (packBonus > 0) {
        log.push(`🐺 ${player.name} benefits from pack hunting instincts!`);
      }
    }
  }

  /**
   * Process class-specific end-of-round effects
   */
  private processClassEndOfRoundEffects(player: Player, log: string[]): string[] {
    const additionalLog: string[] = [];
    
    switch (player.class) {
      case 'Barbarian':
        this.processBarbarianEndOfRound(player, additionalLog);
        break;
      case 'Ranger':
        this.processRangerEndOfRound(player, additionalLog);
        break;
      // Add other classes as needed
    }
    
    return additionalLog;
  }

  /**
   * Process Barbarian-specific end-of-round effects
   */
  private processBarbarianEndOfRound(player: Player, log: string[]): void {
    if ((player as any).classEffects?.relentlessFury) {
      // Process relentless fury effects
      const furyBonus = this.calculateRelentlessFuryBonus(player);
      if (furyBonus > 0) {
        log.push(`⚡ ${player.name}'s relentless fury intensifies!`);
      }
    }
  }

  /**
   * Process Barbarian level up effects
   */
  private processBarbarianLevelUp(player: Player, log: string[]): void {
    // Barbarian-specific level up bonuses
    if ((player as any).classEffects?.relentlessFury) {
      const furyBonus = Math.floor(this.gameRoom.gamePhase.level / 2);
      (player as any).classEffects.relentlessFury.damage += furyBonus;
      log.push(`🔥 ${player.name}'s fury grows stronger! (+${furyBonus} fury damage)`);
    }
  }

  /**
   * Update game statistics
   */
  private updateGameStatistics(): void {
    // Update round counter
    this.gameRoom.gamePhase.round = (this.gameRoom.gamePhase.round || 0) + 1;
    
    // Update other statistics as needed
    (this.gameRoom as any).totalDamageDealt = ((this.gameRoom as any).totalDamageDealt || 0);
    (this.gameRoom as any).totalHealingDone = ((this.gameRoom as any).totalHealingDone || 0);
  }

  /**
   * Check for game end conditions
   */
  private checkGameEndConditions(log: string[]): boolean {
    const alivePlayers = this.getAlivePlayers();
    const monster = this.gameRoom.gameState.monster;
    
    // Check win conditions
    if (monster && monster.hp <= 0) {
      log.push('🎉 Victory! The monster has been defeated!');
      this.gameRoom.gamePhase.phase = 'ended';
      (this.gameRoom as any).victory = true;
      return true;
    }
    
    // Check loss conditions
    if (alivePlayers.length === 0) {
      log.push('💀 Defeat! All heroes have fallen...');
      this.gameRoom.gamePhase.phase = 'ended';
      (this.gameRoom as any).victory = false;
      return true;
    }
    
    return false;
  }

  /**
   * Clear player action states for new round
   */
  private clearPlayerActionStates(): void {
    for (const player of this.gameRoom.gameState.players.values()) {
      if (player.isAlive) {
        player.hasSubmittedAction = false;
        player.currentAction = null;
      }
    }
  }

  // Helper methods for calculating bonuses
  private calculatePackHuntingBonus(player: Player): number {
    // Implement pack hunting bonus calculation
    const nearbyAllies = this.getAlivePlayers().filter(p => 
      p.id !== player.id && p.race === 'Kinfolk'
    ).length;
    return nearbyAllies * 0.1; // 10% bonus per nearby Kinfolk ally
  }

  private calculateRelentlessFuryBonus(player: Player): number {
    // Implement relentless fury bonus calculation
    const missingHpRatio = 1 - (player.hp / player.maxHp);
    return missingHpRatio * 0.2; // 20% bonus when at low health
  }

  private processRangerEndOfRound(player: Player, log: string[]): void {
    // Implement Ranger-specific end-of-round effects
    if ((player as any).classEffects?.tracking) {
      log.push(`🏹 ${player.name} tracks enemy movements!`);
    }
  }
}

export default GameStateManager;