/**
 * @fileoverview DamageCalculator - TypeScript migration
 * Handles all damage calculation logic with type safety
 * Part of Phase 3: Core Domain Models Migration
 */

import { z } from 'zod';
import config from '@config';
import logger from '@utils/logger';
import messages from '@messages';
import type { Player } from '../../types/generated';

// Damage calculation schemas
const DamageOptionsSchema = z.object({
  ignoreArmor: z.boolean().default(false),
  ignoreEffects: z.boolean().default(false),
  coordinated: z.boolean().default(false),
  comboMultiplier: z.number().min(1).default(1),
  source: z.string().optional(),
}).partial();

const DamageParametersSchema = z.object({
  baseDamage: z.number().min(0),
  target: z.any(), // Player object
  attacker: z.any().optional(), // Player object
  options: DamageOptionsSchema.default({}),
  log: z.array(z.string()).default([]),
});

const DamageResultSchema = z.object({
  finalDamage: z.number().min(0),
  blocked: z.number().min(0),
  actualDamage: z.number().min(0),
  critical: z.boolean().default(false),
  modifiers: z.array(z.string()).default([]),
  log: z.array(z.string()).default([]),
});

// Type definitions
export type DamageOptions = z.infer<typeof DamageOptionsSchema>;
export type DamageParameters = z.infer<typeof DamageParametersSchema>;
export type DamageResult = z.infer<typeof DamageResultSchema>;

export interface ComebackStatus {
  active: boolean;
  multiplier: number;
}

/**
 * DamageCalculator handles all damage-related calculations
 * Includes armor reduction, coordination bonuses, and comeback mechanics
 */
export class DamageCalculator {
  private players: Map<string, Player>;
  private getComebackStatus: () => ComebackStatus;
  private getCoordinationCount: () => number;

  /**
   * Create a damage calculator
   * @param players - Map of player objects
   * @param getComebackStatus - Function to get comeback status
   * @param getCoordinationCount - Function to get coordination count
   */
  constructor(
    players: Map<string, Player>,
    getComebackStatus: () => ComebackStatus,
    getCoordinationCount: () => number
  ) {
    this.players = players;
    this.getComebackStatus = getComebackStatus;
    this.getCoordinationCount = getCoordinationCount;
  }

  /**
   * Calculate final damage amount with all modifiers
   * @param params - Damage calculation parameters
   * @returns Damage calculation result
   */
  calculateDamage(params: DamageParameters): DamageResult {
    const validatedParams = DamageParametersSchema.parse(params);
    const { baseDamage, target, attacker, options, log } = validatedParams;

    let damage = baseDamage;
    const modifiers: string[] = [];
    const calculationLog = [...log];

    // Apply attacker damage modifiers
    if (attacker && !options.ignoreEffects) {
      const attackerEffects = attacker.statusEffects || {};
      
      // Apply damage boost effects
      if (attackerEffects.enraged) {
        damage *= 1.5;
        modifiers.push('Enraged (+50%)');
        calculationLog.push(`Enraged effect: ${damage}`);
      }

      // Apply damage reduction effects
      if (attackerEffects.weakened) {
        damage *= 0.75;
        modifiers.push('Weakened (-25%)');
        calculationLog.push(`Weakened effect: ${damage}`);
      }
    }

    // Apply coordination bonus
    if (options.coordinated) {
      const coordCount = this.getCoordinationCount();
      if (coordCount > 1) {
        const coordBonus = 1 + (coordCount - 1) * 0.1;
        damage *= coordBonus;
        modifiers.push(`Coordination (+${((coordBonus - 1) * 100).toFixed(0)}%)`);
        calculationLog.push(`Coordination bonus: ${damage}`);
      }
    }

    // Apply combo multiplier
    if (options.comboMultiplier > 1) {
      damage *= options.comboMultiplier;
      modifiers.push(`Combo (x${options.comboMultiplier})`);
      calculationLog.push(`Combo multiplier: ${damage}`);
    }

    // Apply comeback mechanics
    const comebackStatus = this.getComebackStatus();
    if (comebackStatus.active) {
      damage *= comebackStatus.multiplier;
      modifiers.push(`Comeback (x${comebackStatus.multiplier})`);
      calculationLog.push(`Comeback bonus: ${damage}`);
    }

    // Calculate armor reduction
    let blocked = 0;
    if (!options.ignoreArmor && target.stats?.defensePower) {
      const armor = target.stats.defensePower;
      blocked = Math.min(damage * 0.5, armor); // Max 50% damage reduction
      damage = Math.max(1, damage - blocked);
      modifiers.push(`Armor (-${blocked})`);
      calculationLog.push(`After armor: ${damage}, blocked: ${blocked}`);
    }

    // Apply target vulnerability
    if (!options.ignoreEffects && target.statusEffects?.vulnerable) {
      const vulnMultiplier = 1 + (target.statusEffects.vulnerable.damageIncrease / 100);
      damage *= vulnMultiplier;
      modifiers.push(`Vulnerable (+${target.statusEffects.vulnerable.damageIncrease}%)`);
      calculationLog.push(`Vulnerability: ${damage}`);
    }

    // Apply target resistance
    if (!options.ignoreEffects && target.statusEffects?.resistant) {
      damage *= 0.5;
      modifiers.push('Resistant (-50%)');
      calculationLog.push(`Resistance: ${damage}`);
    }

    // Critical hit calculation (if applicable)
    const critical = this.calculateCriticalHit(attacker, options);
    if (critical) {
      damage *= 2;
      modifiers.push('Critical Hit (x2)');
      calculationLog.push(`Critical hit: ${damage}`);
    }

    const finalDamage = Math.floor(damage);
    const actualDamage = Math.max(0, finalDamage);

    return DamageResultSchema.parse({
      finalDamage,
      blocked: Math.floor(blocked),
      actualDamage,
      critical,
      modifiers,
      log: calculationLog,
    });
  }

  /**
   * Calculate critical hit chance
   * @param attacker - Attacking player
   * @param options - Damage options
   * @returns Whether attack is critical
   */
  private calculateCriticalHit(attacker?: any, options?: DamageOptions): boolean {
    if (!attacker || options?.ignoreEffects) return false;

    // Base critical chance
    let critChance = 0.05; // 5% base

    // Apply luck modifier
    if (attacker.stats?.luck) {
      critChance += attacker.stats.luck * 0.001; // 0.1% per luck point
    }

    // Apply status effects
    if (attacker.statusEffects?.blessed) {
      critChance *= 2;
    }

    return Math.random() < critChance;
  }

  /**
   * Calculate healing amount with modifiers
   * @param baseHealing - Base healing amount
   * @param healer - Player doing the healing
   * @param target - Player being healed
   * @returns Final healing amount
   */
  calculateHealing(baseHealing: number, healer?: Player, target?: Player): number {
    let healing = baseHealing;

    // Apply healer modifiers
    if (healer?.statusEffects?.blessed) {
      healing *= 1.5;
    }

    // Apply target modifiers
    if (target?.statusEffects?.cursed) {
      healing *= 0.5;
    }

    return Math.floor(healing);
  }

  /**
   * Calculate monster damage with level scaling
   * @param baseDamage - Base monster damage
   * @param level - Current game level
   * @param playerCount - Number of players
   * @returns Scaled monster damage
   */
  calculateMonsterDamage(baseDamage: number, level: number, playerCount: number): number {
    // Scale with level
    let damage = baseDamage * (1 + (level - 1) * 0.1);

    // Scale with player count (more players = stronger monster)
    const playerScaling = 1 + (playerCount - 3) * 0.05;
    damage *= playerScaling;

    return Math.floor(damage);
  }

  /**
   * Type-safe serialization
   * @returns Serializable calculator state
   */
  toJSON(): Record<string, any> {
    return {
      // Note: Functions and Maps don't serialize well
      // Store only essential state if needed
      playerCount: this.players.size,
    };
  }

  /**
   * Create DamageCalculator from serialized data
   * @param data - Serialized calculator data
   * @param players - Player map
   * @param getComebackStatus - Comeback status function
   * @param getCoordinationCount - Coordination count function
   * @returns New DamageCalculator instance
   */
  static fromJSON(
    data: any,
    players: Map<string, Player>,
    getComebackStatus: () => ComebackStatus,
    getCoordinationCount: () => number
  ): DamageCalculator {
    return new DamageCalculator(players, getComebackStatus, getCoordinationCount);
  }
}

export default DamageCalculator;