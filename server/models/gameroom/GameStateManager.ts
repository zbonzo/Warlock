/**
 * @fileoverview Game state management utilities for GameRoom - TypeScript version
 * Handles level progression, monster state, and round processing
 * Phase 9: TypeScript Migration - Converted from GameStateManager.js
 */

import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import { createSystemLog, createLogEntry } from '../../utils/logEntry.js';
// Messages are now accessed through the config system
import type { GameRoom } from '../GameRoom.js';
import type { Ability } from '../../types/generated.js';
import type { LogEntry } from '../../types/utilities.js';

/**
 * Passive ability activation record
 */
interface PassiveActivation {
  player: string;
  ability: string;
  log: LogEntry[];
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
  processRound(): LogEntry[] {
    const log: LogEntry[] = [];

    // Process round start
    this.handleRoundStart(log);

    // Process racial abilities first
    (this.gameRoom as any)['actionProcessor']?.['processRacialAbilities']?.(log);

    // Process player actions
    (this.gameRoom as any)['actionProcessor']?.['processPlayerActions']?.(log);

    // Process monster actions
    this.processMonsterTurn(log);

    // Handle level progression
    const oldLevel = (this.gameRoom.gamePhase as any)['level'] || 1;
    this.updateGameLevel();

    if (((this.gameRoom.gamePhase as any)['level'] || 1) > oldLevel) {
      this.handleLevelUp(oldLevel, log);
    }

    // Process end of round effects
    this.handleRoundEnd(log);

    // Clear actions for next round
    (this.gameRoom as any)['actionProcessor']?.['clearPendingActions']?.();
    this.clearPlayerActionStates();

    return log;
  }

  /**
   * Handle start of round effects
   */
  private handleRoundStart(log: LogEntry[]): void {
    // Reset player action states
    for (const player of ((this.gameRoom.gameState as any)['players'] || new Map()).values()) {
      (player as any)['resetForNewRound']?.();
    }

    // Process any start-of-round effects
    this.processStatusEffectTicks(log, 'start');

    // Update comeback mechanics
    this.gameRoom.systems.combatSystem.updateComebackStatus();
  }

  /**
   * Process monster's turn
   */
  private processMonsterTurn(log: LogEntry[]): void {
    const monster = (this.gameRoom.gameState as any)['monster'];
    if (!monster || monster.hp <= 0) {
      return; // Monster is dead
    }

    // Process monster abilities and effects
    const alivePlayers = this.getAlivePlayers();

    // Apply any monster-specific logic here
    for (const player of alivePlayers) {
      if ((player as any)['race'] === 'Kinfolk' && (player as any)['isAlive']) {
        // Special Kinfolk end-of-round processing
        this.processKinfolkEndOfRound(player as any, log);
      }
    }

    // Process class-specific end-of-round effects
    for (const player of alivePlayers) {
      if ((player as any)['isAlive']) {
        const classEffectResult = this.processClassEndOfRoundEffects(player as any, log);
        if (classEffectResult && classEffectResult.length > 0) {
          log.push(...classEffectResult);
        }
      }

      // Handle players who died during round processing
      if ((player as any)['isAlive'] && (player as any)['hp'] <= 0) {
        this.handlePlayerDeath(player as any, log);
      }
    }
  }

  /**
   * Update the game level based on current state
   */
  private updateGameLevel(): void {
    const alivePlayers = this.getAlivePlayers();
    const aliveCount = alivePlayers.length;
    const totalPlayers = ((this.gameRoom.gameState as any)['players'] || new Map()).size;
    const monster = (this.gameRoom.gameState as any)['monster'];

    if (!monster) return;

    // Calculate level based on game progression rules
    const newLevel = this.calculateGameLevel(aliveCount, totalPlayers, monster?.hp || 0);

    if (newLevel !== ((this.gameRoom.gamePhase as any)['level'] || 1)) {
      (this.gameRoom.gamePhase as any)['level'] = newLevel;
      logger.debug('game.level.updated', { level: newLevel });
    }
  }

  /**
   * Handle level up events
   */
  private handleLevelUp(oldLevel: number, log: LogEntry[]): void {
    const levelUpEntry: LogEntry = createSystemLog(
      `🎉 Level Up! The party has reached level ${(this.gameRoom.gamePhase as any)['level'] || 1}!`,
      { eventType: 'level_up' },
      {
        source: 'game',
        isPublic: true,
        priority: 'high' as const
      }
    ) as LogEntry;
    log.push(levelUpEntry);

    // Unlock new abilities for all players
    this.updateUnlockedAbilities(log);

    // Apply level up bonuses
    for (const player of ((this.gameRoom.gameState as any)['players'] || new Map()).values()) {
      if ((player as any)['isAlive']) {
        this.applyLevelUpBonuses(player as any, oldLevel, log);
      }
    }

    // Enhance monster if needed
    this.enhanceMonsterForLevel(((this.gameRoom.gamePhase as any)['level'] || 1), log);
  }

  /**
   * Handle end of round effects
   */
  private handleRoundEnd(log: LogEntry[]): void {
    // Process status effects that tick at end of round
    this.processStatusEffectTicks(log, 'end');

    // Process pending deaths
    (this.gameRoom.systems as any)['combatSystem']?.['processPendingDeaths']?.(log);

    // Update game statistics
    this.updateGameStatistics();

    // Check for game end conditions
    this.checkGameEndConditions(log);
  }

  /**
   * Update unlocked abilities for all players
   */
  private updateUnlockedAbilities(log: LogEntry[]): void {
    for (const player of ((this.gameRoom.gameState as any)['players'] || new Map()).values()) {
      const newlyUnlocked: Ability[] = [];

      for (const ability of ((player as any)['abilities'] || [])) {
        const alreadyUnlocked = ((player as any)['unlockedAbilities'] || []).some(
          (a: Ability) => a.type === ability.type
        );

        if (ability.unlockAt <= ((this.gameRoom.gamePhase as any)['level'] || 1) && !alreadyUnlocked) {
          ((player as any)['unlockedAbilities'] = (player as any)['unlockedAbilities'] || []).push(ability);
          newlyUnlocked.push(ability);

          // Activate passive abilities immediately
          if (ability.effect === 'passive') {
            this.activatePassiveAbility(player as any, ability, log);
          }
        }
      }

      if (newlyUnlocked.length > 0) {
        const abilityNames = newlyUnlocked.map(a => a.name).join(', ');
        const unlockedEntry: LogEntry = createSystemLog(
          `⚡ ${(player as any)['name']} unlocked: ${abilityNames}`,
          { eventType: 'ability_unlock' },
          {
            source: 'game',
            target: (player as any)['id'],
            isPublic: true,
            priority: 'high' as const
          }
        ) as LogEntry;
        log.push(unlockedEntry);
      }

      // Handle class-specific level up effects
      if ((player as any)['class'] && (player as any).classEffects?.relentlessFury) {
        // Special class logic
        this.processBarbarianLevelUp(player as any, log);
      }
    }
  }

  /**
   * Activate a passive ability for a player
   */
  private activatePassiveAbility(player: any, ability: Ability, log: LogEntry[]): void {
    const systems = this.gameRoom.systems;
    const tempLog: LogEntry[] = [];
    const success = (systems as any)['abilityRegistry']?.['executeClassAbility']?.(
      ability.type,
      player,
      player,
      ability,
      tempLog,
      systems
    );

    if (success && tempLog.length > 0) {
      log.push(...tempLog);
      // Store passive activation for later processing
      if (!(this.gameRoom as any)['pendingPassiveActivations']) {
        (this.gameRoom as any)['pendingPassiveActivations'] = [];
      }
      (this.gameRoom as any)['pendingPassiveActivations'].push({
        player: player.id,
        ability: ability.type,
        log: [...tempLog]
      } as PassiveActivation);
    }
  }

  /**
   * Get all alive players
   */
  getAlivePlayers(): any[] {
    return Array.from(((this.gameRoom.gameState as any)['players'] || new Map()).values()).filter((p: any) => (p as any)['isAlive']);
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
      if (!(player as any)['isAlive']) {
        continue;
      }

      // Players who submitted actions this round
      if ((player as any)['hasSubmittedAction']) {
        playersWithRecentSubmissions.push((player as any)['id']);
      }

      // Players who can potentially act
      if ((player as any)['hasSubmittedAction']) {
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
  private canPlayerAct(player: any): boolean {
    if (!(player as any)['isAlive']) return false;
    if ((player as any)['hasSubmittedAction']) return false;

    // Check for status effects that prevent action
    if ((player as any)['hasStatusEffect']?.('stunned')) return false;
    if ((player as any)['hasStatusEffect']?.('paralyzed')) return false;

    return true;
  }

  /**
   * Calculate game level based on current state
   */
  private calculateGameLevel(aliveCount: number, totalPlayers: number, monsterHp: number): number {
    // Implement level calculation logic
    const baseLevel = Math.max(1, totalPlayers - aliveCount + 1);
    const monster = (this.gameRoom.gameState as any)['monster'];

    if (!monster) return baseLevel;

    // Adjust based on monster health
    const monsterHealthFactor = Math.floor((1 - (monsterHp / (monster?.maxHp || 100))) * 2);

    return Math.min(baseLevel + monsterHealthFactor, (config as any)['maxLevel'] || 10);
  }

  /**
   * Apply level up bonuses to a player
   */
  private applyLevelUpBonuses(player: any, _oldLevel: number, log: LogEntry[]): void {
    // Implement level up bonus logic
    const healthBonus = 5;
    (player as any)['maxHp'] = ((player as any)['maxHp'] || 100) + healthBonus;
    (player as any)['hp'] = Math.min(((player as any)['hp'] || 100) + healthBonus, (player as any)['maxHp']);

    const levelUpBonusEntry: LogEntry = createSystemLog(
      `❤️ ${(player as any)['name']} gains ${healthBonus} max HP from leveling up!`,
      { eventType: 'level_up_bonus' },
      {
        source: 'game',
        target: (player as any)['id'],
        isPublic: true,
        priority: 'medium' as const
      }
    ) as LogEntry;
    log.push(levelUpBonusEntry);
  }

  /**
   * Enhance monster for new level
   */
  private enhanceMonsterForLevel(level: number, log: LogEntry[]): void {
    const monster = (this.gameRoom.gameState as any)['monster'];
    if (!monster) return;

    // Implement monster enhancement logic
    const healthBonus = level * 10;
    monster.maxHp = (monster.maxHp || 100) + healthBonus;
    monster.hp = (monster.hp || 100) + healthBonus;

    const monsterEnhanceEntry: LogEntry = createSystemLog(
      `👹 The monster grows stronger with the party's experience!`,
      { eventType: 'monster_enhancement' },
      {
        source: 'monster',
        isPublic: true,
        priority: 'high' as const
      }
    ) as LogEntry;
    log.push(monsterEnhanceEntry);
  }

  /**
   * Process status effects that tick at specific times
   */
  private processStatusEffectTicks(log: LogEntry[], timing: 'start' | 'end'): void {
    for (const player of ((this.gameRoom.gameState as any)['players'] || new Map()).values()) {
      if ((player as any)['isAlive']) {
        (this.gameRoom.systems as any)['statusEffectManager']?.['processStatusEffects']?.(
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
  private handlePlayerDeath(player: any, log: LogEntry[]): void {
    (player as any)['isAlive'] = false;
    (this.gameRoom.gameState as any)['aliveCount'] = ((this.gameRoom.gameState as any)['aliveCount'] || 0) - 1;

    const deathEntry: LogEntry = createLogEntry({
      type: 'status',
      source: 'game',
      target: (player as any)['id'],
      message: `💀 ${(player as any)['name']} has fallen!`,
      details: { eventType: 'player_death' },
      public: true,
      isPublic: true,
      priority: 'critical' as const
    }) as LogEntry;
    log.push(deathEntry);

    // Process death-related effects
    (this.gameRoom.systems as any)['combatSystem']?.['handlePotentialDeath']?.(player, null, log);
  }

  /**
   * Process Kinfolk end-of-round effects
   */
  private processKinfolkEndOfRound(player: any, log: LogEntry[]): void {
    // Implement Kinfolk-specific logic
    if ((player as any)['racialEffects']?.['packHunting']) {
      // Pack hunting effects
      const packBonus = this.calculatePackHuntingBonus(player);
      if (packBonus > 0) {
        const kinfolkEntry: LogEntry = createLogEntry({
          type: 'action',
          source: player.id,
          target: (player as any)['id'],
          message: `🐺 ${(player as any)['name']} benefits from pack hunting instincts!`,
          details: { eventType: 'kinfolk_pack_hunting' },
          public: true,
          isPublic: true,
          priority: 'high' as const
        }) as LogEntry;
        log.push(kinfolkEntry);
      }
    }
  }

  /**
   * Process class-specific end-of-round effects
   */
  private processClassEndOfRoundEffects(player: any, _log: LogEntry[]): LogEntry[] {
    const additionalLog: LogEntry[] = [];

    const playerClass = (player as any)['class'];
    switch (playerClass) {
      case 'Paladin':
      case 'Knight':
      case 'Archer':
      case 'Wizard':
        // Process standard class effects
        this.processStandardClassEndOfRound(player, additionalLog);
        break;
      // Add other classes as needed
    }

    return additionalLog;
  }

  /**
   * Process standard class end-of-round effects
   */
  private processStandardClassEndOfRound(player: any, log: LogEntry[]): void {
    if ((player as any)['classEffects']?.['relentlessFury']) {
      // Process class effects
      const bonus = this.calculateClassBonus(player);
      if (bonus > 0) {
        const classEntry: LogEntry = createSystemLog(
          `⚡ ${(player as any)['name']}'s class abilities intensify!`,
          { eventType: 'class_effect' },
          {
            source: 'game',
            target: (player as any)['id'],
            isPublic: true,
            priority: 'medium' as const
          }
        ) as LogEntry;
        log.push(classEntry);
      }
    }
  }

  /**
   * Process class level up effects
   */
  private processBarbarianLevelUp(player: any, log: LogEntry[]): void {
    // Class-specific level up bonuses
    if ((player as any)['classEffects']?.['relentlessFury']) {
      const furyBonus = Math.floor(((this.gameRoom.gamePhase as any)['level'] || 1) / 2);
      (player as any)['classEffects']['relentlessFury']['damage'] =
        ((player as any)['classEffects']['relentlessFury']['damage'] || 0) + furyBonus;

      const furyEntry: LogEntry = createSystemLog(
        `🔥 ${(player as any)['name']}'s abilities grow stronger! (+${furyBonus} bonus damage)`,
        { eventType: 'class_level_up' },
        {
          source: 'game',
          target: (player as any)['id'],
          isPublic: true,
          priority: 'high' as const
        }
      ) as LogEntry;
      log.push(furyEntry);
    }
  }

  /**
   * Update game statistics
   */
  private updateGameStatistics(): void {
    // Update round counter
    (this.gameRoom.gamePhase as any)['round'] = ((this.gameRoom.gamePhase as any)['round'] || 0) + 1;

    // Update other statistics as needed
    (this.gameRoom as any)['totalDamageDealt'] = ((this.gameRoom as any)['totalDamageDealt'] || 0);
    (this.gameRoom as any)['totalHealingDone'] = ((this.gameRoom as any)['totalHealingDone'] || 0);
  }

  /**
   * Check for game end conditions
   */
  private checkGameEndConditions(log: LogEntry[]): boolean {
    const alivePlayers = this.getAlivePlayers();
    const monster = (this.gameRoom.gameState as any)['monster'];

    // Check win conditions
    if (monster && monster.hp <= 0) {
      const victoryEntry: LogEntry = createLogEntry({
        type: 'phase',
        source: 'game',
        message: '🎉 Victory! The monster has been defeated!',
        details: { eventType: 'game_victory' },
        public: true,
        isPublic: true,
        priority: 'critical' as const
      }) as LogEntry;
      log.push(victoryEntry);
      (this.gameRoom.gamePhase as any)['phase'] = 'ended';
      (this.gameRoom as any)['victory'] = true;
      return true;
    }

    // Check loss conditions
    if (alivePlayers.length === 0) {
      const defeatEntry: LogEntry = createLogEntry({
        type: 'phase',
        source: 'game',
        message: '💀 Defeat! All heroes have fallen...',
        details: { eventType: 'game_defeat' },
        public: true,
        isPublic: true,
        priority: 'critical' as const
      }) as LogEntry;
      log.push(defeatEntry);
      (this.gameRoom.gamePhase as any)['phase'] = 'ended';
      (this.gameRoom as any)['victory'] = false;
      return true;
    }

    return false;
  }

  /**
   * Clear player action states for new round
   */
  private clearPlayerActionStates(): void {
    for (const player of ((this.gameRoom.gameState as any)['players'] || new Map()).values()) {
      if ((player as any)['isAlive']) {
        (player as any)['hasSubmittedAction'] = false;
        (player as any)['currentAction'] = null;
      }
    }
  }

  // Helper methods for calculating bonuses
  private calculatePackHuntingBonus(player: any): number {
    // Implement pack hunting bonus calculation
    const nearbyAllies = this.getAlivePlayers().filter((p: any) =>
      (p as any)['id'] !== (player as any)['id'] && (p as any)['race'] === 'Kinfolk'
    ).length;
    return nearbyAllies * 0.1; // 10% bonus per nearby Kinfolk ally
  }

  private calculateClassBonus(player: any): number {
    // Implement class bonus calculation
    const missingHpRatio = 1 - (((player as any)['hp'] || 100) / ((player as any)['maxHp'] || 100));
    return missingHpRatio * 0.2; // 20% bonus when at low health
  }

  // Removed unused processRangerEndOfRound method
}

export default GameStateManager;
