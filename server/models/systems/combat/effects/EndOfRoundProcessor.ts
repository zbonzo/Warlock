/**
 * @fileoverview End of Round Effects Processor
 * Handles status effects, level progression, and end-of-round cleanup
 * Extracted from CombatSystem.ts for better modularity
 */

import type { Player } from '../../../../types/generated.js';
import type { CombatLogEntry, RoundSummary } from '../interfaces.js';
import config from '../../../../config/index.js';
import logger from '../../../../utils/logger.js';

export interface EndOfRoundProcessorDependencies {
  players: Map<string, Player>;
  statusEffectManager: any;
  racialAbilitySystem: any;
  warlockSystem: any;
  gameStateUtils: any;
}

/**
 * End of Round Processor - Handles all end-of-round effects and progression
 */
export class EndOfRoundProcessor {
  private readonly players: Map<string, Player>;
  private readonly statusEffectManager: any;
  private readonly racialAbilitySystem: any;
  private readonly warlockSystem: any;
  private readonly gameStateUtils: any;

  constructor(dependencies: EndOfRoundProcessorDependencies) {
    this.players = dependencies.players;
    this.statusEffectManager = dependencies.statusEffectManager;
    this.racialAbilitySystem = dependencies.racialAbilitySystem;
    this.warlockSystem = dependencies.warlockSystem;
    this.gameStateUtils = dependencies.gameStateUtils;
  }

  /**
   * Process all end-of-round effects
   */
  async processEndOfRoundEffects(log: CombatLogEntry[], summary: RoundSummary): Promise<void> {
    // Process status effects (DoT, HoT, buffs, debuffs)
    await this.processStatusEffects(log, summary);

    // Process racial abilities end-of-round effects
    await this.processRacialEndOfRoundEffects(log, summary);

    // Process warlock corruption effects
    await this.processWarlockEffects(log, summary);

    // Clean up expired effects
    await this.cleanupExpiredEffects(log);

    // Update effect durations
    await this.updateEffectDurations(log);
  }

  /**
   * Check and apply level progression
   */
  async checkLevelProgression(gameRoom: any): Promise<void> {
    const currentLevel = gameRoom.gamePhase?.level || 1;
    const damageDealt = this.getTotalDamageDealtThisGame(gameRoom);

    // Calculate required damage for next level
    const requiredDamage = this.calculateRequiredDamageForLevel(currentLevel + 1);

    if (damageDealt >= requiredDamage) {
      const newLevel = this.calculateLevelFromDamage(damageDealt);

      if (newLevel > currentLevel) {
        await this.levelUpPlayers(gameRoom, newLevel);
      }
    }
  }

  /**
   * Process status effects (DoT, HoT, etc.)
   */
  private async processStatusEffects(log: CombatLogEntry[], summary: RoundSummary): Promise<void> {
    for (const [playerId, player] of this.players.entries()) {
      if (!player.isAlive) continue;

      // Process damage over time effects
      const dotEffects = await this.statusEffectManager.getEffectsByType(playerId, 'damage_over_time');
      for (const effect of dotEffects) {
        const damage = this.calculateDotDamage(effect);
        await this.applyDotDamage(player, damage, effect, log, summary);
      }

      // Process healing over time effects
      const hotEffects = await this.statusEffectManager.getEffectsByType(playerId, 'heal_over_time');
      for (const effect of hotEffects) {
        const healing = this.calculateHotHealing(effect);
        await this.applyHotHealing(player, healing, effect, log, summary);
      }

      // Process other timed effects
      await this.processTimedEffects(player, log);
    }
  }

  /**
   * Process racial ability end-of-round effects
   */
  private async processRacialEndOfRoundEffects(log: CombatLogEntry[], summary: RoundSummary): Promise<void> {
    for (const [playerId, player] of this.players.entries()) {
      if (!player.isAlive) continue;

      // Get player race
      const race = player.race;
      if (!race) continue;

      // Process race-specific end-of-round effects
      switch (race.toLowerCase()) {
        case 'lich':
          await this.processLichEndOfRoundEffects(player, log, summary);
          break;
        case 'orc':
          await this.processOrcEndOfRoundEffects(player, log, summary);
          break;
        case 'kinfolk':
          await this.processKinfolkEndOfRoundEffects(player, log, summary);
          break;
        // Add other races as needed
      }
    }
  }

  /**
   * Process warlock corruption effects
   */
  private async processWarlockEffects(log: CombatLogEntry[], summary: RoundSummary): Promise<void> {
    if (!this.warlockSystem) return;

    // Get current warlock count
    const warlockCount = await this.warlockSystem.getWarlockCount();
    if (warlockCount === 0) return;

    // Apply corruption effects based on warlock count
    const corruptionLevel = this.calculateCorruptionLevel(warlockCount);

    for (const [playerId, player] of this.players.entries()) {
      if (!player.isAlive || await this.warlockSystem.isWarlock(playerId)) continue;

      // Apply corruption damage or effects
      if (corruptionLevel > 0) {
        const corruptionDamage = Math.floor(corruptionLevel * 2);
        await this.applyCorruptionDamage(player, corruptionDamage, log, summary);
      }
    }
  }

  /**
   * Level up players to new level
   */
  private async levelUpPlayers(gameRoom: any, newLevel: number): Promise<void> {
    const oldLevel = gameRoom.gamePhase?.level || 1;

    // Update game level
    if (gameRoom.gamePhase) {
      gameRoom.gamePhase.level = newLevel;
    }

    // Apply level bonuses to all alive players
    for (const [playerId, player] of this.players.entries()) {
      if (player.isAlive) {
        await this.applyLevelBonuses(player, newLevel);
      }
    }

    logger.info(`Party leveled up from ${oldLevel} to ${newLevel}`);
  }

  /**
   * Apply level bonuses to a player
   */
  private async applyLevelBonuses(player: Player, level: number): Promise<void> {
    const bonuses = this.calculateLevelBonuses(level);

    // Apply HP bonus
    if (bonuses.hpBonus > 0) {
      player.maxHp += bonuses.hpBonus;
      player.hp = Math.min(player.hp + bonuses.hpBonus, player.maxHp); // Also heal a bit
    }

    // Apply other bonuses
    if (bonuses.attackBonus > 0) {
      player.attackPower = (player.attackPower || 0) + bonuses.attackBonus;
    }

    if (bonuses.defenseBonus > 0) {
      player.defensePower = (player.defensePower || 0) + bonuses.defenseBonus;
    }
  }

  /**
   * Calculate level bonuses for a given level
   */
  private calculateLevelBonuses(level: number): { hpBonus: number; attackBonus: number; defenseBonus: number } {
    const baseHpBonus = 5; // Base HP per level
    const baseAttackBonus = 1; // Base attack per level
    const baseDefenseBonus = 1; // Base defense per level

    return {
      hpBonus: baseHpBonus * level,
      attackBonus: baseAttackBonus * level,
      defenseBonus: baseDefenseBonus * level
    };
  }

  /**
   * Calculate DoT damage from effect
   */
  private calculateDotDamage(effect: any): number {
    const baseDamage = effect.damagePerTurn || effect.damage || 3;
    const stacks = effect.stacks || 1;
    return baseDamage * stacks;
  }

  /**
   * Calculate HoT healing from effect
   */
  private calculateHotHealing(effect: any): number {
    const baseHealing = effect.healingPerTurn || effect.healing || 2;
    const stacks = effect.stacks || 1;
    return baseHealing * stacks;
  }

  /**
   * Apply DoT damage to player
   */
  private async applyDotDamage(
    player: Player,
    damage: number,
    effect: any,
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<void> {
    player.hp = Math.max(0, player.hp - damage);

    log.push({
      type: 'damage_over_time',
      message: `${player.name} takes ${damage} damage from ${effect.name || effect.type}`,
      playerId: player.id,
      damage,
      isPublic: true,
      timestamp: Date.now(),
      priority: 'medium' as const
    });

    summary.totalDamageToPlayers += damage;

    // Check if player died from DoT
    if (player.hp <= 0) {
      player.isAlive = false;
      summary.playersKilled.push(player.id);

      log.push({
        type: 'player_death',
        message: `${player.name} dies from ${effect.name || effect.type}!`,
        playerId: player.id,
        isPublic: true,
        timestamp: Date.now(),
        priority: 'critical' as const
      });
    }
  }

  /**
   * Apply HoT healing to player
   */
  private async applyHotHealing(
    player: Player,
    healing: number,
    effect: any,
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<void> {
    const actualHealing = Math.min(healing, player.maxHp - player.hp);
    player.hp += actualHealing;

    if (actualHealing > 0) {
      log.push({
        type: 'heal_over_time',
        message: `${player.name} heals ${actualHealing} HP from ${effect.name || effect.type}`,
        playerId: player.id,
        healing: actualHealing,
        isPublic: true,
        timestamp: Date.now(),
        priority: 'low' as const
      });

      summary.totalHealing += actualHealing;
    }
  }

  /**
   * Process timed effects (buffs, debuffs)
   */
  private async processTimedEffects(player: Player, log: CombatLogEntry[]): Promise<void> {
    // Get all active effects
    const activeEffects = await this.statusEffectManager.getActiveEffects(player.id);

    for (const effect of activeEffects) {
      // Process effect based on type
      switch (effect.type) {
        case 'stunned':
          // Stun prevents actions - already handled in validation
          break;
        case 'poisoned':
          // Poison damage - already handled in DoT processing
          break;
        case 'regeneration':
          // Healing - already handled in HoT processing
          break;
        // Add other effect types as needed
      }
    }
  }

  /**
   * Clean up expired effects
   */
  private async cleanupExpiredEffects(log: CombatLogEntry[]): Promise<void> {
    for (const [playerId, player] of this.players.entries()) {
      await this.statusEffectManager.removeExpiredEffects(playerId);
    }
  }

  /**
   * Update effect durations
   */
  private async updateEffectDurations(log: CombatLogEntry[]): Promise<void> {
    for (const [playerId, player] of this.players.entries()) {
      await this.statusEffectManager.decrementEffectDurations(playerId);
    }
  }

  /**
   * Process Lich-specific end-of-round effects
   */
  private async processLichEndOfRoundEffects(
    player: Player,
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<void> {
    // Lich slowly regenerates HP
    const regenAmount = Math.floor(player.maxHp * 0.05); // 5% of max HP
    const actualHealing = Math.min(regenAmount, player.maxHp - player.hp);

    if (actualHealing > 0) {
      player.hp += actualHealing;
      log.push({
        type: 'racial_regeneration',
        message: `${player.name} regenerates ${actualHealing} HP (Lich passive)`,
        playerId: player.id,
        healing: actualHealing,
        isPublic: true,
        timestamp: Date.now(),
        priority: 'low' as const
      });
      summary.totalHealing += actualHealing;
    }
  }

  /**
   * Process Orc-specific end-of-round effects
   */
  private async processOrcEndOfRoundEffects(
    player: Player,
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<void> {
    // Orcs get rage stacks based on damage taken
    const damageTaken = this.getDamageTakenThisRound(player);
    if (damageTaken > 0) {
      const rageStacks = Math.floor(damageTaken / 10); // 1 stack per 10 damage
      await this.statusEffectManager.addEffect(player.id, 'rage', {
        stacks: rageStacks,
        duration: 3,
        damageBonus: rageStacks * 2
      });

      if (rageStacks > 0) {
        log.push({
          type: 'racial_effect',
          message: `${player.name} gains ${rageStacks} rage stacks from taking damage (Orc passive)`,
          playerId: player.id,
          isPublic: true,
          timestamp: Date.now(),
          priority: 'low' as const
        });
      }
    }
  }

  /**
   * Process Kinfolk-specific end-of-round effects
   */
  private async processKinfolkEndOfRoundEffects(
    player: Player,
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<void> {
    // Kinfolk get pack bonuses based on nearby allies
    const nearbyAllies = this.getNearbyAllies(player);
    if (nearbyAllies.length > 0) {
      const packBonus = nearbyAllies.length * 5; // 5% bonus per ally
      await this.statusEffectManager.addEffect(player.id, 'pack_bond', {
        duration: 2,
        attackBonus: packBonus,
        defenseBonus: packBonus
      });

      log.push({
        type: 'racial_effect',
        message: `${player.name} gains pack bond with ${nearbyAllies.length} allies (Kinfolk passive)`,
        playerId: player.id,
        isPublic: true,
        timestamp: Date.now(),
        priority: 'low' as const
      });
    }
  }

  /**
   * Helper method to get total damage dealt this game
   */
  private getTotalDamageDealtThisGame(gameRoom: any): number {
    return gameRoom.totalDamageDealt || 0;
  }

  /**
   * Calculate required damage for a level
   */
  private calculateRequiredDamageForLevel(level: number): number {
    return level * level * 100; // Exponential scaling
  }

  /**
   * Calculate level from total damage
   */
  private calculateLevelFromDamage(damage: number): number {
    return Math.floor(Math.sqrt(damage / 100));
  }

  /**
   * Calculate corruption level from warlock count
   */
  private calculateCorruptionLevel(warlockCount: number): number {
    return Math.min(warlockCount, 3); // Max corruption level of 3
  }

  /**
   * Apply corruption damage
   */
  private async applyCorruptionDamage(
    player: Player,
    damage: number,
    log: CombatLogEntry[],
    summary: RoundSummary
  ): Promise<void> {
    player.hp = Math.max(0, player.hp - damage);

    log.push({
      type: 'corruption',
      message: `${player.name} takes ${damage} corruption damage`,
      playerId: player.id,
      damage,
      isPublic: true,
      timestamp: Date.now(),
      priority: 'high' as const
    });

    summary.totalDamageToPlayers += damage;

    if (player.hp <= 0) {
      player.isAlive = false;
      summary.playersKilled.push(player.id);
    }
  }

  /**
   * Get damage taken by player this round
   */
  private getDamageTakenThisRound(player: Player): number {
    // This would track damage taken this round
    return (player as any).damageTakenThisRound || 0;
  }

  /**
   * Get nearby allies for pack bonuses
   */
  private getNearbyAllies(player: Player): Player[] {
    // For simplicity, consider all alive players as "nearby"
    return Array.from(this.players.values()).filter(p =>
      p.id !== player.id && p.isAlive
    );
  }
}
