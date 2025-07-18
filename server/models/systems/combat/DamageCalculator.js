/**
 * @fileoverview Damage calculation system for combat
 * Handles armor reduction, damage modifiers, and various damage types
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * DamageCalculator handles all damage-related calculations
 */
class DamageCalculator {
  constructor() {
    this.damageTypes = {
      physical: 'physical',
      magical: 'magical',
      poison: 'poison',
      fire: 'fire',
      holy: 'holy',
      dark: 'dark',
      recoil: 'recoil'
    };
  }

  /**
   * Calculate armor reduction for damage
   * @param {number} damage - Incoming damage
   * @param {number} totalArmor - Total armor value
   * @returns {Object} Damage calculation result
   */
  calculateArmorReduction(damage, totalArmor) {
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
   * @param {Object} attacker - Attacking entity
   * @param {Object} target - Target entity
   * @param {number} baseDamage - Base damage amount
   * @param {string} damageType - Type of damage
   * @param {Object} options - Additional calculation options
   * @returns {Object} Complete damage calculation
   */
  calculateDamage(attacker, target, baseDamage, damageType = 'physical', options = {}) {
    let finalDamage = baseDamage;
    const modifiers = {
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
    if (target && target.statusEffects && target.statusEffects.vulnerable) {
      const vulnerabilityMultiplier = 1 + (target.statusEffects.vulnerable.damageIncrease || 0);
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
    let armorResult = { finalDamage: finalDamage, armorReduction: 0 };
    if (this.shouldApplyArmor(damageType) && target) {
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
   * @param {Object} target - Target entity
   * @returns {number} Total armor value
   */
  calculateTotalArmor(target) {
    let totalArmor = target.armor || 0;

    // Add armor from status effects
    if (target.statusEffects && target.statusEffects.shielded) {
      totalArmor += target.statusEffects.shielded.armor || 0;
    }

    // Add armor from racial effects
    if (target.racialEffects && target.racialEffects.stoneArmor) {
      totalArmor += target.racialEffects.stoneArmor.armor || 0;
    }

    return totalArmor;
  }

  /**
   * Check if armor should be applied for this damage type
   * @param {string} damageType - Type of damage
   * @returns {boolean} True if armor should be applied
   */
  shouldApplyArmor(damageType) {
    const armorBypassTypes = ['poison', 'fire', 'recoil', 'holy'];
    return !armorBypassTypes.includes(damageType);
  }

  /**
   * Calculate healing amount with modifiers
   * @param {Object} healer - Healing entity
   * @param {Object} target - Target entity
   * @param {number} baseAmount - Base healing amount
   * @param {Object} options - Additional calculation options
   * @returns {Object} Complete healing calculation
   */
  calculateHealing(healer, target, baseAmount, options = {}) {
    let finalAmount = baseAmount;
    const modifiers = {
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
   * @param {Object} source - Source of poison
   * @param {Object} target - Target entity
   * @param {number} baseDamage - Base poison damage
   * @returns {Object} Poison damage calculation
   */
  calculatePoisonDamage(source, target, baseDamage) {
    // Poison damage uses attacker's damage modifier but bypasses armor
    return this.calculateDamage(source, target, baseDamage, 'poison', {
      bypassArmor: true
    });
  }

  /**
   * Calculate critical hit damage
   * @param {Object} attacker - Attacking entity
   * @param {Object} target - Target entity
   * @param {number} baseDamage - Base damage amount
   * @param {number} critMultiplier - Critical hit multiplier
   * @returns {Object} Critical hit damage calculation
   */
  calculateCriticalHit(attacker, target, baseDamage, critMultiplier = 2.0) {
    const critDamage = Math.floor(baseDamage * critMultiplier);
    return this.calculateDamage(attacker, target, critDamage, 'physical');
  }

  /**
   * Get damage type effectiveness
   * @param {string} damageType - Type of damage
   * @param {Object} target - Target entity
   * @returns {number} Effectiveness multiplier
   */
  getDamageTypeEffectiveness(damageType, target) {
    // Could be expanded for elemental resistances/weaknesses
    return 1.0;
  }
}

module.exports = DamageCalculator;