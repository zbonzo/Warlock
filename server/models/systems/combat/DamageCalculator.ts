/**
 * @fileoverview Damage calculation system for combat
 * Handles armor reduction, damage modifiers, and various damage types
 */

import config from '../../../config/index.js';
import logger from '../../../utils/logger.js';
import messages from '../../../config/messages/index.js';

type DamageType = 'physical' | 'magical' | 'poison' | 'fire' | 'holy' | 'dark' | 'recoil';

interface Entity {
  id?: string;
  hp: number;
  maxHp: number;
  armor?: number;
  damageMod?: number;
  statusEffects?: Record<string, any>;
  racialEffects?: Record<string, any>;
}

interface ArmorReductionResult {
  originalDamage: number;
  armorReduction: number;
  finalDamage: number;
  armorUsed: number;
}

interface DamageModifiers {
  attackerDamageMod: number;
  targetVulnerability: number;
  coordinationBonus: number;
  comebackBonus: number;
  armor: number;
}

interface DamageBreakdown {
  base: number;
  afterAttackerMod: number;
  afterVulnerability: number;
  afterCoordination: number;
  afterComeback: number;
  afterArmor: number;
}

interface DamageResult {
  baseDamage: number;
  finalDamage: number;
  modifiers: DamageModifiers;
  damageType: DamageType;
  armorReduction: number;
  breakdown: DamageBreakdown;
}

interface HealingModifiers {
  healerMod: number;
  comebackBonus: number;
  targetMaxHp: number;
}

interface HealingBreakdown {
  base: number;
  afterHealerMod: number;
  afterComeback: number;
  final: number;
}

interface HealingResult {
  baseAmount: number;
  finalAmount: number;
  modifiers: HealingModifiers;
  breakdown: HealingBreakdown;
}

interface DamageCalculationOptions {
  coordinationBonus?: number;
  comebackBonus?: number;
  bypassArmor?: boolean;
}

interface HealingCalculationOptions {
  comebackBonus?: number;
}

/**
 * DamageCalculator handles all damage-related calculations
 */
class DamageCalculator {
  private damageTypes: Record<string, DamageType> = {
    physical: 'physical',
    magical: 'magical',
    poison: 'poison',
    fire: 'fire',
    holy: 'holy',
    dark: 'dark',
    recoil: 'recoil'
  };

  /**
   * Calculate armor reduction for damage
   */
  calculateArmorReduction(damage: number, totalArmor: number): ArmorReductionResult {
    if (totalArmor <= 0) {
      return {
        originalDamage: damage,
        armorReduction: 0,
        finalDamage: damage,
        armorUsed: totalArmor
      };
    }

    // Armor reduces damage by flat amount, but can't reduce below 1
    const armorReduction = Math.min(damage - 1, totalArmor);
    const finalDamage = Math.max(1, damage - armorReduction);

    return {
      originalDamage: damage,
      armorReduction: armorReduction,
      finalDamage: finalDamage,
      armorUsed: totalArmor
    };
  }

  /**
   * Calculate damage with all modifiers applied
   */
  calculateDamage(
    attacker: Entity | null, 
    target: Entity | null, 
    baseDamage: number, 
    damageType: DamageType = 'physical', 
    options: DamageCalculationOptions = {}
  ): DamageResult {
    let finalDamage = baseDamage;
    const modifiers: DamageModifiers = {
      attackerDamageMod: 1.0,
      targetVulnerability: 1.0,
      coordinationBonus: 0,
      comebackBonus: 0,
      armor: 0
    };

    // Apply attacker damage modifier
    if (attacker && attacker.damageMod) {
      modifiers.attackerDamageMod = attacker.damageMod;
      finalDamage = Math.floor(finalDamage * attacker.damageMod);
    }

    // Apply target vulnerability
    if (target && target.statusEffects && target.statusEffects['vulnerable']) {
      const vulnerabilityMultiplier = 1 + (target.statusEffects['vulnerable'].damageIncrease || 0);
      modifiers.targetVulnerability = vulnerabilityMultiplier;
      finalDamage = Math.floor(finalDamage * vulnerabilityMultiplier);
    }

    // Apply coordination bonus
    if (options.coordinationBonus) {
      const coordBonus = Math.floor(baseDamage * options.coordinationBonus);
      modifiers.coordinationBonus = coordBonus;
      finalDamage += coordBonus;
    }

    // Apply comeback bonus
    if (options.comebackBonus) {
      const comebackBonus = Math.floor(baseDamage * options.comebackBonus);
      modifiers.comebackBonus = comebackBonus;
      finalDamage += comebackBonus;
    }

    // Apply armor reduction (only for physical damage types)
    let armorResult: ArmorReductionResult = { 
      originalDamage: finalDamage, 
      armorReduction: 0, 
      finalDamage: finalDamage, 
      armorUsed: 0 
    };
    
    if (this.shouldApplyArmor(damageType) && target && !options.bypassArmor) {
      const totalArmor = this.calculateTotalArmor(target);
      armorResult = this.calculateArmorReduction(finalDamage, totalArmor);
      modifiers.armor = totalArmor;
      finalDamage = armorResult.finalDamage;
    }

    // Ensure minimum damage
    finalDamage = Math.max(1, finalDamage);

    return {
      baseDamage,
      finalDamage,
      modifiers,
      damageType,
      armorReduction: armorResult.armorReduction || 0,
      breakdown: {
        base: baseDamage,
        afterAttackerMod: Math.floor(baseDamage * modifiers.attackerDamageMod),
        afterVulnerability: Math.floor(baseDamage * modifiers.attackerDamageMod * modifiers.targetVulnerability),
        afterCoordination: Math.floor(baseDamage * modifiers.attackerDamageMod * modifiers.targetVulnerability) + modifiers.coordinationBonus,
        afterComeback: Math.floor(baseDamage * modifiers.attackerDamageMod * modifiers.targetVulnerability) + modifiers.coordinationBonus + modifiers.comebackBonus,
        afterArmor: finalDamage
      }
    };
  }

  /**
   * Calculate total armor for a target
   */
  calculateTotalArmor(target: Entity): number {
    let totalArmor = target.armor || 0;

    // Add armor from status effects
    if (target.statusEffects && target.statusEffects['shielded']) {
      totalArmor += target.statusEffects['shielded'].armor || 0;
    }

    // Add armor from racial effects
    if (target.racialEffects && target.racialEffects['stoneArmor']) {
      totalArmor += target.racialEffects['stoneArmor'].armor || 0;
    }

    return totalArmor;
  }

  /**
   * Check if armor should be applied for this damage type
   */
  shouldApplyArmor(damageType: DamageType): boolean {
    const armorBypassTypes: DamageType[] = ['poison', 'fire', 'recoil', 'holy'];
    return !armorBypassTypes.includes(damageType);
  }

  /**
   * Calculate healing amount with modifiers
   */
  calculateHealing(
    healer: Entity | null, 
    target: Entity | null, 
    baseAmount: number, 
    options: HealingCalculationOptions = {}
  ): HealingResult {
    let finalAmount = baseAmount;
    const modifiers: HealingModifiers = {
      healerMod: 1.0,
      comebackBonus: 0,
      targetMaxHp: target ? target.maxHp : 100
    };

    // Apply healer modifier (inverse of damage mod)
    if (healer && healer.damageMod) {
      const healingMod = Math.max(0.1, 2.0 - healer.damageMod);
      modifiers.healerMod = healingMod;
      finalAmount = Math.floor(finalAmount * healingMod);
    }

    // Apply comeback bonus
    if (options.comebackBonus) {
      const comebackBonus = Math.floor(baseAmount * options.comebackBonus);
      modifiers.comebackBonus = comebackBonus;
      finalAmount += comebackBonus;
    }

    // Ensure minimum healing
    finalAmount = Math.max(1, finalAmount);

    return {
      baseAmount,
      finalAmount,
      modifiers,
      breakdown: {
        base: baseAmount,
        afterHealerMod: Math.floor(baseAmount * modifiers.healerMod),
        afterComeback: Math.floor(baseAmount * modifiers.healerMod) + modifiers.comebackBonus,
        final: finalAmount
      }
    };
  }

  /**
   * Calculate poison damage
   */
  calculatePoisonDamage(source: Entity | null, target: Entity | null, baseDamage: number): DamageResult {
    // Poison damage uses attacker's damage modifier but bypasses armor
    return this.calculateDamage(source, target, baseDamage, 'poison', {
      bypassArmor: true
    });
  }

  /**
   * Calculate critical hit damage
   */
  calculateCriticalHit(
    attacker: Entity | null, 
    target: Entity | null, 
    baseDamage: number, 
    critMultiplier: number = 2.0
  ): DamageResult {
    const critDamage = Math.floor(baseDamage * critMultiplier);
    return this.calculateDamage(attacker, target, critDamage, 'physical');
  }

  /**
   * Get damage type effectiveness
   */
  getDamageTypeEffectiveness(damageType: DamageType, target: Entity): number {
    // Could be expanded for elemental resistances/weaknesses
    return 1.0;
  }
}

export default DamageCalculator;