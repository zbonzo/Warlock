/**
 * @fileoverview Status effect management for Player class
 * Handles status effects, buffs, debuffs, and their durations
 */

import config from '@config';
import logger from '@utils/logger';
import type { 
  StatusEffect, 
  PlayerRace,
  PlayerClass 
} from '../../types/generated.js';

interface Player {
  id: string;
  name: string;
  baseArmor?: number;
  takeDamage: (damage: number, source?: string) => void;
  heal: (amount: number) => void;
}

interface StatusEffectData {
  duration?: number;
  stacks?: number;
  maxStacks?: number;
  damage?: number;
  healing?: number;
  armor?: number;
  damageIncrease?: number;
  damageReduction?: number;
  damageBonus?: number;
  description?: string;
  timing?: 'start' | 'end';
  appliedAt?: number;
  updatedAt?: number;
  effectTypes?: string[];
}

interface RacialEffects {
  stoneArmor?: { armor: number; intact: boolean };
  undeadNature?: { 
    immuneToPoisonDamage: boolean;
    immuneToCharisma: boolean; 
  };
  packHunting?: { bonusPerAlly: number };
}

interface ClassEffects {
  className?: PlayerClass;
  immunities?: string[];
  armorBonus?: number;
  damageMod?: number;
}

interface EffectProcessResult {
  log: string[];
  remove: boolean;
}

interface StatusEffectsSummary {
  [effectType: string]: {
    duration?: number;
    stacks?: number;
    description: string;
  };
}

interface SerializedStatusEffectState {
  statusEffects: Record<string, StatusEffectData>;
  racialEffects: RacialEffects;
  classEffects: ClassEffects;
}

/**
 * StatusEffectManager handles all status effect operations for a player
 */
class StatusEffectManager {
  private player: Player;
  private statusEffects: Record<string, StatusEffectData> = {};
  private racialEffects: RacialEffects = {};
  private classEffects: ClassEffects = {};

  constructor(player: Player) {
    this.player = player;
  }

  /**
   * Initialize class effects
   */
  initializeClassEffects(className: PlayerClass, effects: Partial<ClassEffects> = {}): void {
    this.classEffects = {
      ...effects,
      className
    };
  }

  /**
   * Initialize racial effects
   */
  initializeRacialEffects(race: PlayerRace): void {
    switch (race) {
      case 'Rockhewn':
        this.racialEffects = {
          stoneArmor: { armor: 3, intact: true }
        };
        break;
      case 'Lich':
        this.racialEffects = {
          undeadNature: { 
            immuneToPoisonDamage: true,
            immuneToCharisma: true 
          }
        };
        if (!this.classEffects.immunities) {
          this.classEffects.immunities = [];
        }
        this.classEffects.immunities.push('poison', 'charm');
        break;
      case 'Kinfolk':
        this.racialEffects = {
          packHunting: { bonusPerAlly: 0.1 }
        };
        break;
      default:
        this.racialEffects = {};
    }
  }

  /**
   * Apply a status effect
   */
  applyStatusEffect(effectType: string, effectData: StatusEffectData): boolean {
    // Check for immunity
    if (this.isImmuneToEffect(effectType)) {
      logger.debug(`Player ${this.player.id} is immune to ${effectType}`);
      return false;
    }

    // Apply or update the effect
    if (this.statusEffects[effectType]) {
      // Update existing effect
      this.updateStatusEffect(effectType, effectData);
    } else {
      // Apply new effect
      this.statusEffects[effectType] = {
        ...effectData,
        appliedAt: Date.now()
      };
    }

    logger.debug(`Applied ${effectType} to player ${this.player.id}`);
    return true;
  }

  /**
   * Update an existing status effect
   */
  private updateStatusEffect(effectType: string, effectData: StatusEffectData): void {
    const existing = this.statusEffects[effectType];
    
    // Handle stacking effects
    if (effectData.stacks && existing.stacks) {
      effectData.stacks = Math.min(
        existing.stacks + effectData.stacks,
        effectData.maxStacks || 10
      );
    }

    // Handle duration refresh
    if (effectData.duration) {
      effectData.duration = Math.max(existing.duration || 0, effectData.duration);
    }

    // Merge the data
    this.statusEffects[effectType] = {
      ...existing,
      ...effectData,
      updatedAt: Date.now()
    };
  }

  /**
   * Remove a status effect
   */
  removeStatusEffect(effectType: string): boolean {
    if (this.statusEffects[effectType]) {
      delete this.statusEffects[effectType];
      logger.debug(`Removed ${effectType} from player ${this.player.id}`);
      return true;
    }
    return false;
  }

  /**
   * Check if player has a specific status effect
   */
  hasStatusEffect(effectType: string): boolean {
    return !!this.statusEffects[effectType];
  }

  /**
   * Get a specific status effect
   */
  getStatusEffect(effectType: string): StatusEffectData | null {
    return this.statusEffects[effectType] || null;
  }

  /**
   * Check if player is immune to an effect type
   */
  isImmuneToEffect(effectType: string): boolean {
    // Check class immunities
    if (this.classEffects.immunities && 
        this.classEffects.immunities.includes(effectType)) {
      return true;
    }

    // Check racial immunities
    if (this.racialEffects.undeadNature) {
      if (effectType === 'poison' && this.racialEffects.undeadNature.immuneToPoisonDamage) {
        return true;
      }
      if (effectType === 'charm' && this.racialEffects.undeadNature.immuneToCharisma) {
        return true;
      }
    }

    // Check temporary immunities
    if (this.statusEffects.immune && 
        this.statusEffects.immune.effectTypes &&
        this.statusEffects.immune.effectTypes.includes(effectType)) {
      return true;
    }

    return false;
  }

  /**
   * Process status effects for timing (start/end of round)
   */
  processStatusEffects(timing: 'start' | 'end'): string[] {
    const log: string[] = [];
    const effectsToRemove: string[] = [];

    for (const [effectType, effectData] of Object.entries(this.statusEffects)) {
      // Process timing-specific effects
      if (effectData.timing === timing) {
        const result = this.processEffectTick(effectType, effectData);
        if (result.log) log.push(...result.log);
        if (result.remove) effectsToRemove.push(effectType);
      }

      // Reduce duration
      if (effectData.duration !== undefined && timing === 'end') {
        effectData.duration--;
        if (effectData.duration <= 0) {
          effectsToRemove.push(effectType);
          log.push(`${this.player.name}'s ${effectType} effect has worn off`);
        }
      }
    }

    // Remove expired effects
    for (const effectType of effectsToRemove) {
      this.removeStatusEffect(effectType);
    }

    return log;
  }

  /**
   * Process a single effect tick
   */
  private processEffectTick(effectType: string, effectData: StatusEffectData): EffectProcessResult {
    const result: EffectProcessResult = { log: [], remove: false };

    switch (effectType) {
      case 'poison':
        if (effectData.damage) {
          const damage = effectData.damage * (effectData.stacks || 1);
          this.player.takeDamage(damage, 'poison');
          result.log.push(`${this.player.name} takes ${damage} poison damage`);
        }
        break;

      case 'regeneration':
        if (effectData.healing) {
          const healing = effectData.healing;
          this.player.heal(healing);
          result.log.push(`${this.player.name} regenerates ${healing} HP`);
        }
        break;

      case 'burning':
        if (effectData.damage) {
          const damage = effectData.damage;
          this.player.takeDamage(damage, 'fire');
          result.log.push(`${this.player.name} takes ${damage} fire damage from burning`);
        }
        break;
    }

    return result;
  }

  /**
   * Get total armor including effects
   */
  getTotalArmor(): number {
    let totalArmor = this.player.baseArmor || 0;

    // Add racial armor
    if (this.racialEffects.stoneArmor && this.racialEffects.stoneArmor.intact) {
      totalArmor += this.racialEffects.stoneArmor.armor || 0;
    }

    // Add effect armor
    if (this.statusEffects.shielded) {
      totalArmor += this.statusEffects.shielded.armor || 0;
    }

    // Add class armor bonuses
    if (this.classEffects.armorBonus) {
      totalArmor += this.classEffects.armorBonus;
    }

    return totalArmor;
  }

  /**
   * Get damage modifier from effects
   */
  getDamageModifier(): number {
    let modifier = 1.0;

    // Apply vulnerability
    if (this.statusEffects.vulnerable) {
      modifier *= 1 + (this.statusEffects.vulnerable.damageIncrease || 0.5);
    }

    // Apply weakness
    if (this.statusEffects.weakened) {
      modifier *= 1 - (this.statusEffects.weakened.damageReduction || 0.3);
    }

    // Apply empowered
    if (this.statusEffects.empowered) {
      modifier *= 1 + (this.statusEffects.empowered.damageBonus || 0.3);
    }

    // Apply class modifiers
    if (this.classEffects.damageMod) {
      modifier *= this.classEffects.damageMod;
    }

    return modifier;
  }

  /**
   * Get status effects summary for client
   */
  getStatusEffectsSummary(): StatusEffectsSummary {
    const summary: StatusEffectsSummary = {};
    
    for (const [effectType, effectData] of Object.entries(this.statusEffects)) {
      summary[effectType] = {
        duration: effectData.duration,
        stacks: effectData.stacks,
        description: effectData.description || effectType
      };
    }

    return summary;
  }

  /**
   * Clear all status effects
   */
  clearAllStatusEffects(): void {
    this.statusEffects = {};
  }

  /**
   * Clear specific types of effects
   */
  clearEffectTypes(types: string[]): void {
    for (const type of types) {
      delete this.statusEffects[type];
    }
  }

  /**
   * Serialize status effect state
   */
  serialize(): SerializedStatusEffectState {
    return {
      statusEffects: this.statusEffects,
      racialEffects: this.racialEffects,
      classEffects: this.classEffects
    };
  }

  /**
   * Deserialize status effect state
   */
  deserialize(data: Partial<SerializedStatusEffectState>): void {
    if (data.statusEffects) this.statusEffects = data.statusEffects;
    if (data.racialEffects) this.racialEffects = data.racialEffects;
    if (data.classEffects) this.classEffects = data.classEffects;
  }
}

export default StatusEffectManager;