/**
 * @fileoverview PlayerEffects domain model - TypeScript migration
 * Handles all player status effects, class effects, and temporary modifiers
 * Part of Phase 3: Core Domain Models Migration
 */

import { z } from 'zod';
import logger from '../../utils/logger.js';
import messages from '../../config/messages/index.js';
import config from '../../config/index.js';
import type { StatusEffect, PlayerClass } from '../../types/generated.js';

// Status effect schemas
const VulnerabilityEffectSchema = z.object({
  damageIncrease: z.number().min(0).max(200),
  turns: z.number().int().min(0),
});

const ShieldedEffectSchema = z.object({
  armor: z.number().int().min(0),
  turns: z.number().int().min(0),
});

const WeakenedEffectSchema = z.object({
  damageReduction: z.number().min(0).max(1),
  turns: z.number().int().min(0),
});

const StoneArmorSchema = z.object({
  intact: z.boolean(),
  value: z.number().int().min(0),
});

const ClassEffectSchema = z.object({
  active: z.boolean(),
  turnsLeft: z.number().int().min(0).optional(),
  currentLevel: z.number().int().min(1).optional(),
}).passthrough(); // Allow additional properties

const RacialEffectSchema = z.object({
  active: z.boolean(),
}).passthrough(); // Allow additional properties

// Type definitions
export type VulnerabilityEffect = z.infer<typeof VulnerabilityEffectSchema>;
export type ShieldedEffect = z.infer<typeof ShieldedEffectSchema>;
export type WeakenedEffect = z.infer<typeof WeakenedEffectSchema>;
export type StoneArmorData = z.infer<typeof StoneArmorSchema>;
export type ClassEffect = z.infer<typeof ClassEffectSchema>;
export type RacialEffect = z.infer<typeof RacialEffectSchema>;

export interface StatusEffects {
  vulnerable?: VulnerabilityEffect;
  shielded?: ShieldedEffect;
  weakened?: WeakenedEffect;
  poison?: any;
  invisible?: any;
  stunned?: any;
  [key: string]: any;
}

export interface ClassEffects {
  relentlessFury?: ClassEffect & {
    currentLevel?: number;
    vulnerabilityPerLevel?: number;
    damagePerLevel?: number;
  };
  thirstyBlade?: ClassEffect & {
    lifeSteal?: number;
    maxDuration?: number;
  };
  sweepingStrike?: ClassEffect & {
    bonusTargets?: number;
    stunChance?: number;
    stunDuration?: number;
  };
  bloodFrenzy?: ClassEffect & {
    damageIncreasePerHpMissing?: number;
  };
  unstoppableRage?: ClassEffect & {
    damageBoost?: number;
    damageResistance?: number;
    selfDamagePercent?: number;
  };
  spiritGuard?: ClassEffect;
  sanctuaryOfTruth?: ClassEffect;
  [key: string]: any;
}

export interface RacialEffects {
  bloodRage?: boolean;
  bloodRageMultiplier?: number;
  resurrect?: {
    resurrectedHp: number;
    active: boolean;
  };
  [key: string]: any;
}

export interface ArmorDegradationResult {
  degraded: boolean;
  oldValue?: number;
  newArmorValue: number;
  destroyed?: boolean;
}

export interface LifeStealResult {
  healed: number;
  newHp: number;
}

export interface SweepingStrikeParams {
  bonusTargets: number;
  stunChance: number;
  stunDuration: number;
}

export interface EffectProcessingResult {
  type: string;
  damage?: number;
  message: string;
}

/**
 * PlayerEffects class manages all status effects and temporary modifiers for a player
 * Separated from Player class for better organization and testability
 */
export class PlayerEffects {
  private playerId: string;
  private playerName: string;
  
  // Status effects
  private statusEffects: StatusEffects = {};
  private _isVulnerable: boolean = false;
  private _vulnerabilityIncrease: number = 0;
  
  // Stone Armor tracking (Rockhewn racial)
  private stoneArmorIntact: boolean = false;
  private stoneArmorValue: number = 0;
  
  // Class effects tracking
  private classEffects: ClassEffects = {};
  
  // Racial effects
  private racialEffects: RacialEffects = {};

  /**
   * Create new player effects manager
   * @param playerId - Player ID for logging
   * @param playerName - Player name for logging
   */
  constructor(playerId: string, playerName: string) {
    this.playerId = playerId;
    this.playerName = playerName;
  }

  /**
   * Check if player has a status effect
   * @param effectName - Name of the effect to check
   * @returns Whether the player has the effect
   */
  hasStatusEffect(effectName: string): boolean {
    return this.statusEffects && this.statusEffects[effectName] !== undefined;
  }

  /**
   * Apply a status effect to the player
   * @param effectName - Effect to apply
   * @param data - Effect data
   */
  applyStatusEffect(effectName: string, data: any): void {
    this.statusEffects[effectName] = data;
  }

  /**
   * Remove a status effect from the player
   * @param effectName - Effect to remove
   */
  removeStatusEffect(effectName: string): void {
    if (this.hasStatusEffect(effectName)) {
      delete this.statusEffects[effectName];
    }
  }

  /**
   * Process vulnerability at end of turn
   * @returns Whether vulnerability expired
   */
  processVulnerability(): boolean {
    if (!this._isVulnerable) return false;

    let expired = false;

    // Reduce duration
    if (this.statusEffects.vulnerable && this.statusEffects.vulnerable.turns > 0) {
      this.statusEffects.vulnerable.turns--;

      // Check if expired
      if (this.statusEffects.vulnerable.turns <= 0) {
        this._isVulnerable = false;
        this._vulnerabilityIncrease = 0;
        delete this.statusEffects.vulnerable;
        expired = true;
      }
    }

    return expired;
  }

  /**
   * Apply vulnerability status
   * @param damageIncrease - Percentage to increase damage by
   * @param turns - Duration in turns
   */
  applyVulnerability(damageIncrease: number, turns: number): void {
    // Set direct vulnerability state
    this._isVulnerable = true;
    this._vulnerabilityIncrease = damageIncrease;

    // Also store in status effects for consistent API
    this.statusEffects.vulnerable = VulnerabilityEffectSchema.parse({
      damageIncrease,
      turns,
    });
  }

  /**
   * Calculate effective armor including protection buffs and vulnerability debuffs
   * @param baseArmor - Base armor value
   * @returns Total armor value
   */
  getEffectiveArmor(baseArmor?: number): number {
    let totalArmor = baseArmor || 0;

    // Add stone armor for Rockhewn
    if (this.stoneArmorIntact) {
      totalArmor += this.stoneArmorValue;
    }

    // Add protection effect armor
    if (this.hasStatusEffect('shielded')) {
      totalArmor += this.statusEffects.shielded?.armor || 0;
    }

    return totalArmor;
  }

  /**
   * Process Stone Armor degradation when taking any damage
   * @param damage - Amount of damage being taken (before armor calculation)
   * @returns Information about armor degradation
   */
  processStoneArmorDegradation(damage: number): ArmorDegradationResult {
    if (!this.stoneArmorIntact || damage <= 0) {
      return { degraded: false, newArmorValue: this.stoneArmorValue };
    }

    // Degrade stone armor by 1 for each hit
    const oldValue = this.stoneArmorValue;
    this.stoneArmorValue -=
      config.gameBalance.stoneArmor.degradationPerHit || 1;

    logger.debug(
      messages.formatMessage(
        messages.serverLogMessages.debug.StoneArmorDegradation,
        { playerName: this.playerName, oldValue, newValue: this.stoneArmorValue }
      )
    );

    // Check if stone armor is completely destroyed
    if (this.stoneArmorValue <= config.gameBalance.stoneArmor.minimumValue) {
      // Cap negative armor at minimum
      this.stoneArmorValue = config.gameBalance.stoneArmor.minimumValue;
    }

    return {
      degraded: true,
      oldValue,
      newArmorValue: this.stoneArmorValue,
      destroyed: this.stoneArmorValue <= 0,
    };
  }

  /**
   * Initialize stone armor (Rockhewn racial)
   * @param initialValue - Initial stone armor value
   */
  initializeStoneArmor(initialValue?: number): void {
    this.stoneArmorIntact = true;
    this.stoneArmorValue = initialValue || config.gameBalance.stoneArmor.initialValue;
  }

  /**
   * Calculate additional damage taken from Relentless Fury
   * @param baseDamage - Base incoming damage
   * @param playerClass - Player's class
   * @returns Additional damage from vulnerability
   */
  getRelentlessFuryVulnerability(baseDamage: number, playerClass: PlayerClass): number {
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.relentlessFury &&
      this.classEffects.relentlessFury.active
    ) {
      const level = this.classEffects.relentlessFury.currentLevel || 1;
      const vulnerabilityPerLevel =
        this.classEffects.relentlessFury.vulnerabilityPerLevel || 0.03;
      const vulnerabilityBonus = level * vulnerabilityPerLevel;
      return Math.floor(baseDamage * vulnerabilityBonus);
    }
    return 0;
  }

  /**
   * Process Thirsty Blade life steal
   * @param damageDealt - Damage dealt to trigger life steal
   * @param playerClass - Player's class
   * @param currentHp - Current player HP
   * @param maxHp - Max player HP
   * @returns Life steal result
   */
  processThirstyBladeLifeSteal(
    damageDealt: number, 
    playerClass: PlayerClass, 
    currentHp: number, 
    maxHp: number
  ): LifeStealResult {
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.thirstyBlade &&
      this.classEffects.thirstyBlade.active &&
      this.classEffects.thirstyBlade.turnsLeft &&
      this.classEffects.thirstyBlade.turnsLeft > 0
    ) {
      const lifeSteal = this.classEffects.thirstyBlade.lifeSteal || 0.15;
      const healAmount = Math.floor(damageDealt * lifeSteal);

      if (healAmount > 0) {
        const actualHeal = Math.min(healAmount, maxHp - currentHp);
        return { healed: actualHeal, newHp: currentHp + actualHeal };
      }
    }
    return { healed: 0, newHp: currentHp };
  }

  /**
   * Refresh Thirsty Blade on any death (not just kills by this barbarian)
   * @param playerClass - Player's class
   * @returns Whether Thirsty Blade was refreshed
   */
  refreshThirstyBladeOnKill(playerClass: PlayerClass): boolean {
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.thirstyBlade
    ) {
      this.classEffects.thirstyBlade.turnsLeft =
        this.classEffects.thirstyBlade.maxDuration;
      this.classEffects.thirstyBlade.active = true;
      return true;
    }
    return false;
  }

  /**
   * Get Sweeping Strike parameters for combat system
   * @param playerClass - Player's class
   * @returns Sweeping strike parameters or null if not active
   */
  getSweepingStrikeParams(playerClass: PlayerClass): SweepingStrikeParams | null {
    const result =
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.sweepingStrike &&
      this.classEffects.sweepingStrike.active
        ? {
            bonusTargets: this.classEffects.sweepingStrike.bonusTargets || 1,
            stunChance: this.classEffects.sweepingStrike.stunChance || 0.25,
            stunDuration: this.classEffects.sweepingStrike.stunDuration || 1,
          }
        : null;

    console.log(`${this.playerName} getSweepingStrikeParams:`, result);
    return result;
  }

  /**
   * Apply damage modifier from effects
   * @param rawDamage - Base damage value
   * @param playerClass - Player's class
   * @param level - Player level
   * @param currentHp - Current HP
   * @param maxHp - Max HP
   * @returns Modified damage
   */
  applyDamageModifiers(
    rawDamage: number, 
    playerClass: PlayerClass, 
    level: number, 
    currentHp: number, 
    maxHp: number
  ): number {
    let modifiedDamage = rawDamage;

    // Apply Blood Rage effect if active (Orc racial)
    if (this.racialEffects && this.racialEffects.bloodRage) {
      modifiedDamage = modifiedDamage * 2;
      delete this.racialEffects.bloodRage;
    } else if (this.racialEffects && this.racialEffects.bloodRageMultiplier) {
      modifiedDamage = Math.floor(
        modifiedDamage * this.racialEffects.bloodRageMultiplier
      );
      delete this.racialEffects.bloodRageMultiplier;
    }

    // Apply Relentless Fury (Barbarian passive)
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.relentlessFury &&
      this.classEffects.relentlessFury.active
    ) {
      const currentLevel = this.classEffects.relentlessFury.currentLevel || level;
      const damagePerLevel =
        this.classEffects.relentlessFury.damagePerLevel || 0.03;
      const damageBonus = currentLevel * damagePerLevel;
      modifiedDamage = Math.floor(modifiedDamage * (1 + damageBonus));
    }

    // Apply Blood Frenzy passive effect
    if (
      this.classEffects &&
      this.classEffects.bloodFrenzy &&
      this.classEffects.bloodFrenzy.active
    ) {
      const hpPercent = currentHp / maxHp;
      const missingHpPercent = 1 - hpPercent;
      const damageIncreaseRate =
        this.classEffects.bloodFrenzy.damageIncreasePerHpMissing || 0.01;
      const damageIncrease = missingHpPercent * damageIncreaseRate;
      modifiedDamage = Math.floor(modifiedDamage * (1 + damageIncrease));
    }

    // Apply Unstoppable Rage effect if active
    if (
      this.classEffects &&
      this.classEffects.unstoppableRage &&
      this.classEffects.unstoppableRage.turnsLeft &&
      this.classEffects.unstoppableRage.turnsLeft > 0
    ) {
      const damageBoost = this.classEffects.unstoppableRage.damageBoost || 1.5;
      modifiedDamage = Math.floor(modifiedDamage * damageBoost);
    }

    // Apply weakened effect if active (reduces outgoing damage)
    if (this.statusEffects && this.statusEffects.weakened) {
      const damageReduction =
        this.statusEffects.weakened.damageReduction || 0.25;
      modifiedDamage = Math.floor(modifiedDamage * (1 - damageReduction));
    }

    return modifiedDamage;
  }

  /**
   * Apply damage resistance from effects
   * @param incomingDamage - Incoming damage amount
   * @param playerClass - Player's class
   * @returns Modified damage after resistance
   */
  applyDamageResistance(incomingDamage: number, playerClass: PlayerClass): number {
    let modifiedDamage = incomingDamage;

    // Apply vulnerability if present - BEFORE armor calculation
    if (this._isVulnerable && this._vulnerabilityIncrease > 0) {
      const vulnerabilityMultiplier = 1 + this._vulnerabilityIncrease / 100;
      modifiedDamage = Math.floor(modifiedDamage * vulnerabilityMultiplier);
    }

    // Apply Unstoppable Rage damage resistance if active
    if (
      this.classEffects &&
      this.classEffects.unstoppableRage &&
      this.classEffects.unstoppableRage.turnsLeft &&
      this.classEffects.unstoppableRage.turnsLeft > 0
    ) {
      const damageResistance =
        this.classEffects.unstoppableRage.damageResistance || 0.3;
      modifiedDamage = Math.floor(modifiedDamage * (1 - damageResistance));
    }

    return modifiedDamage;
  }

  /**
   * Process class effects at end of round
   * @param maxHp - Player's max HP
   * @returns Effect results if any
   */
  processClassEffects(maxHp: number): EffectProcessingResult | null {
    if (!this.classEffects) return null;

    // Process Thirsty Blade
    if (
      this.classEffects.thirstyBlade &&
      this.classEffects.thirstyBlade.active
    ) {
      console.log(
        `${this.playerName} Thirsty Blade: ${this.classEffects.thirstyBlade.turnsLeft} turns left`
      );

      if (this.classEffects.thirstyBlade.turnsLeft) {
        this.classEffects.thirstyBlade.turnsLeft--;

        if (this.classEffects.thirstyBlade.turnsLeft <= 0) {
          console.log(`${this.playerName} Thirsty Blade expiring`);
          this.classEffects.thirstyBlade.active = false;
          return {
            type: 'thirsty_blade_ended',
            message: messages.formatMessage(
              messages.getEvent('thirstyBladeFaded'),
              { playerName: this.playerName }
            ),
          };
        }
      }
    }

    // Process Unstoppable Rage
    if (this.classEffects.unstoppableRage && this.classEffects.unstoppableRage.turnsLeft) {
      this.classEffects.unstoppableRage.turnsLeft--;

      if (this.classEffects.unstoppableRage.turnsLeft <= 0) {
        const selfDamagePercent =
          this.classEffects.unstoppableRage.selfDamagePercent || 0.25;
        const selfDamage = Math.floor(maxHp * selfDamagePercent);

        delete this.classEffects.unstoppableRage;

        return {
          type: 'rage_ended',
          damage: selfDamage,
          message: messages.formatMessage(
            messages.getEvent('unstoppableRageEnded'),
            { playerName: this.playerName, actualDamage: selfDamage }
          ),
        };
      }
    }

    // Process Spirit Guard
    if (this.classEffects.spiritGuard && this.classEffects.spiritGuard.turnsLeft) {
      this.classEffects.spiritGuard.turnsLeft--;

      if (this.classEffects.spiritGuard.turnsLeft <= 0) {
        delete this.classEffects.spiritGuard;
        return {
          type: 'spirit_guard_ended',
          message: messages.formatMessage(
            messages.getEvent('spiritGuardFaded'),
            { playerName: this.playerName }
          ),
        };
      }
    }

    // Process Sanctuary of Truth
    if (this.classEffects.sanctuaryOfTruth && this.classEffects.sanctuaryOfTruth.turnsLeft) {
      this.classEffects.sanctuaryOfTruth.turnsLeft--;

      if (this.classEffects.sanctuaryOfTruth.turnsLeft <= 0) {
        delete this.classEffects.sanctuaryOfTruth;
        return {
          type: 'sanctuary_ended',
          message: messages.formatMessage(messages.getEvent('sanctuaryFaded'), {
            playerName: this.playerName,
          }),
        };
      }
    }

    return null;
  }

  /**
   * Update Relentless Fury scaling when player levels up
   * @param newLevel - New player level
   * @param playerClass - Player's class
   */
  updateRelentlessFuryLevel(newLevel: number, playerClass: PlayerClass): void {
    if (
      playerClass === 'Barbarian' &&
      this.classEffects &&
      this.classEffects.relentlessFury &&
      this.classEffects.relentlessFury.active
    ) {
      this.classEffects.relentlessFury.currentLevel = newLevel;
      console.log(`${this.playerName} Relentless Fury updated to level ${newLevel}`);
    }
  }

  /**
   * Set player name (for logging after reconnection)
   * @param newName - New player name
   */
  setPlayerName(newName: string): void {
    this.playerName = newName;
  }

  /**
   * Handle direct assignment to isVulnerable (for compatibility)
   * @param value - Vulnerability state
   */
  set isVulnerable(value: boolean) {
    this._isVulnerable = value;
  }

  get isVulnerable(): boolean {
    return this._isVulnerable || false;
  }

  /**
   * Handle direct assignment to vulnerabilityIncrease (for compatibility)
   * @param value - Vulnerability increase amount
   */
  set vulnerabilityIncrease(value: number) {
    this._vulnerabilityIncrease = value;
  }

  get vulnerabilityIncrease(): number {
    return this._vulnerabilityIncrease || 0;
  }

  /**
   * Calculate damage with vulnerability effects applied
   * @param baseDamage - Base damage amount
   * @returns Modified damage amount
   */
  calculateDamageWithVulnerability(baseDamage: number): number {
    // Start with the base damage
    let modifiedDamage = baseDamage;

    // Check for vulnerability by direct property examination
    if (this.statusEffects && this.statusEffects.vulnerable) {
      const vulnEffect = this.statusEffects.vulnerable;
      const damageIncrease = vulnEffect.damageIncrease;

      // Apply vulnerability multiplier
      modifiedDamage = Math.floor(baseDamage * (1 + damageIncrease / 100));
    }

    return modifiedDamage;
  }

  /**
   * Initialize Undying effect (Lich racial)
   * @param resurrectedHp - HP to resurrect with
   */
  initializeUndying(resurrectedHp?: number): void {
    this.racialEffects = this.racialEffects || {};
    this.racialEffects.resurrect = {
      resurrectedHp: resurrectedHp || 1,
      active: true,
    };

    logger.debug(
      messages.formatMessage(messages.serverLogMessages.debug.UndyingSetup, {
        playerName: this.playerName,
      }),
      this.racialEffects.resurrect
    );
  }

  /**
   * Get status effects
   * @returns Current status effects
   */
  getStatusEffects(): StatusEffects {
    return { ...this.statusEffects };
  }

  /**
   * Get class effects
   * @returns Current class effects
   */
  getClassEffects(): ClassEffects {
    return { ...this.classEffects };
  }

  /**
   * Get racial effects
   * @returns Current racial effects
   */
  getRacialEffects(): RacialEffects {
    return { ...this.racialEffects };
  }

  /**
   * Set class effects
   * @param effects - Class effects to set
   */
  setClassEffects(effects: ClassEffects): void {
    this.classEffects = effects;
  }

  /**
   * Set racial effects
   * @param effects - Racial effects to set
   */
  setRacialEffects(effects: RacialEffects): void {
    this.racialEffects = effects;
  }

  /**
   * Type-safe serialization
   * @returns Serializable effects data
   */
  toJSON(): Record<string, any> {
    return {
      playerId: this.playerId,
      playerName: this.playerName,
      statusEffects: { ...this.statusEffects },
      _isVulnerable: this._isVulnerable,
      _vulnerabilityIncrease: this._vulnerabilityIncrease,
      stoneArmorIntact: this.stoneArmorIntact,
      stoneArmorValue: this.stoneArmorValue,
      classEffects: { ...this.classEffects },
      racialEffects: { ...this.racialEffects },
    };
  }

  /**
   * Create PlayerEffects from serialized data
   * @param data - Serialized effects data
   * @returns New PlayerEffects instance
   */
  static fromJSON(data: any): PlayerEffects {
    const effects = new PlayerEffects(data.playerId, data.playerName);
    
    if (data.statusEffects) effects.statusEffects = data.statusEffects;
    effects._isVulnerable = data._isVulnerable || false;
    effects._vulnerabilityIncrease = data._vulnerabilityIncrease || 0;
    effects.stoneArmorIntact = data.stoneArmorIntact || false;
    effects.stoneArmorValue = data.stoneArmorValue || 0;
    if (data.classEffects) effects.classEffects = data.classEffects;
    if (data.racialEffects) effects.racialEffects = data.racialEffects;
    
    return effects;
  }
}

export default PlayerEffects;