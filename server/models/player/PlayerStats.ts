/**
 * @fileoverview PlayerStats domain model - TypeScript migration
 * Handles all player statistics tracking and calculations
 * Part of Phase 3: Core Domain Models Migration
 */

import { z } from 'zod';
import logger from '@utils/logger';

// Player statistics schema for runtime validation
const PlayerStatsDataSchema = z.object({
  totalDamageDealt: z.number().int().min(0).default(0),
  totalHealingDone: z.number().int().min(0).default(0),
  damageTaken: z.number().int().min(0).default(0),
  corruptionsPerformed: z.number().int().min(0).default(0),
  abilitiesUsed: z.number().int().min(0).default(0),
  monsterKills: z.number().int().min(0).default(0),
  timesDied: z.number().int().min(0).default(0),
  selfHeals: z.number().int().min(0).default(0),
  highestSingleHit: z.number().int().min(0).default(0),
});

export type PlayerStatsData = z.infer<typeof PlayerStatsDataSchema>;

// Summary statistics interface
export interface PlayerStatsSummary {
  combatStats: {
    damageDealt: number;
    damageTaken: number;
    highestHit: number;
    monsterKills: number;
  };
  supportStats: {
    healingDone: number;
    selfHealing: number;
  };
  gameplayStats: {
    abilitiesUsed: number;
    deaths: number;
    corruptions: number;
  };
}

/**
 * PlayerStats class manages all statistical tracking for a player
 * Separated from Player class for better organization and testability
 */
export class PlayerStats {
  private stats: PlayerStatsData;
  private playerName: string;

  /**
   * Create new player stats
   * @param playerName - Player name for logging
   * @param initialStats - Optional initial stats values
   */
  constructor(playerName: string, initialStats: Partial<PlayerStatsData> = {}) {
    this.playerName = playerName;
    this.stats = PlayerStatsDataSchema.parse({
      totalDamageDealt: 0,
      totalHealingDone: 0,
      damageTaken: 0,
      corruptionsPerformed: 0,
      abilitiesUsed: 0,
      monsterKills: 0,
      timesDied: 0,
      selfHeals: 0,
      highestSingleHit: 0,
      ...initialStats
    });
  }

  /**
   * Add damage dealt and update highest single hit
   * @param damage - Damage amount to add
   */
  addDamageDealt(damage: number): void {
    if (damage > 0) {
      this.stats.totalDamageDealt += damage;
      if (damage > this.stats.highestSingleHit) {
        this.stats.highestSingleHit = damage;
      }
      logger.info(`${this.playerName} stats updated: +${damage} damage, total: ${this.stats.totalDamageDealt}, highest: ${this.stats.highestSingleHit}`);
    }
  }

  /**
   * Add damage taken
   * @param damage - Damage amount to add
   */
  addDamageTaken(damage: number): void {
    if (damage > 0) {
      this.stats.damageTaken += damage;
      logger.info(`${this.playerName} stats updated: +${damage} damage taken, total: ${this.stats.damageTaken}`);
    }
  }

  /**
   * Add healing done
   * @param healing - Healing amount to add
   */
  addHealingDone(healing: number): void {
    if (healing > 0) {
      this.stats.totalHealingDone += healing;
      logger.info(`${this.playerName} stats updated: +${healing} healing done, total: ${this.stats.totalHealingDone}`);
    }
  }

  /**
   * Increment corruption count
   */
  addCorruption(): void {
    this.stats.corruptionsPerformed += 1;
    logger.info(`${this.playerName} stats updated: corruption performed, total: ${this.stats.corruptionsPerformed}`);
  }

  /**
   * Increment ability use count
   */
  addAbilityUse(): void {
    this.stats.abilitiesUsed += 1;
    logger.info(`${this.playerName} stats updated: ability used, total: ${this.stats.abilitiesUsed}`);
  }

  /**
   * Increment death count
   */
  addDeath(): void {
    this.stats.timesDied += 1;
    logger.info(`${this.playerName} stats updated: death recorded, total: ${this.stats.timesDied}`);
  }

  /**
   * Increment monster kill count
   */
  addMonsterKill(): void {
    this.stats.monsterKills += 1;
    logger.info(`${this.playerName} stats updated: monster kill, total: ${this.stats.monsterKills}`);
  }

  /**
   * Add self-healing
   * @param healing - Self-healing amount to add
   */
  addSelfHeal(healing: number): void {
    if (healing > 0) {
      this.stats.selfHeals += healing;
      logger.info(`${this.playerName} stats updated: +${healing} self-heal, total: ${this.stats.selfHeals}`);
    }
  }

  /**
   * Get current stats (type-safe copy)
   * @returns Current stats object
   */
  getStats(): PlayerStatsData {
    return { ...this.stats };
  }

  /**
   * Reset all stats to zero
   */
  reset(): void {
    this.stats = PlayerStatsDataSchema.parse({
      totalDamageDealt: 0,
      totalHealingDone: 0,
      damageTaken: 0,
      corruptionsPerformed: 0,
      abilitiesUsed: 0,
      monsterKills: 0,
      timesDied: 0,
      selfHeals: 0,
      highestSingleHit: 0,
    });
  }

  /**
   * Get specific stat value
   * @param statName - Name of the stat to get
   * @returns Stat value
   */
  getStat(statName: keyof PlayerStatsData): number {
    return this.stats[statName] || 0;
  }

  /**
   * Set player name (for logging after reconnection)
   * @param newName - New player name
   */
  setPlayerName(newName: string): void {
    this.playerName = newName;
  }

  /**
   * Get summary statistics for display
   * @returns Summary stats
   */
  getSummary(): PlayerStatsSummary {
    return {
      combatStats: {
        damageDealt: this.stats.totalDamageDealt,
        damageTaken: this.stats.damageTaken,
        highestHit: this.stats.highestSingleHit,
        monsterKills: this.stats.monsterKills,
      },
      supportStats: {
        healingDone: this.stats.totalHealingDone,
        selfHealing: this.stats.selfHeals,
      },
      gameplayStats: {
        abilitiesUsed: this.stats.abilitiesUsed,
        deaths: this.stats.timesDied,
        corruptions: this.stats.corruptionsPerformed,
      },
    };
  }

  /**
   * Type-safe serialization
   * @returns Serializable stats data
   */
  toJSON(): PlayerStatsData {
    return { ...this.stats };
  }

  /**
   * Create PlayerStats from serialized data
   * @param playerName - Player name for logging
   * @param data - Serialized stats data
   * @returns New PlayerStats instance
   */
  static fromJSON(playerName: string, data: unknown): PlayerStats {
    const validatedData = PlayerStatsDataSchema.parse(data);
    return new PlayerStats(playerName, validatedData);
  }
}

export default PlayerStats;