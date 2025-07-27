/**
 * @fileoverview DamageCalculator - handles all damage calculation logic
 * Extracted from CombatSystem as part of Phase 1 refactoring
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * DamageCalculator handles all damage-related calculations
 * Includes armor reduction, coordination bonuses, and comeback mechanics
 */
class DamageCalculator {
  /**
   * Create a damage calculator
   * @param {Map} players - Map of player objects
   * @param {Function} getComebackStatus - Function to get comeback status
   * @param {Function} getCoordinationCount - Function to get coordination count
   */
  constructor(players, getComebackStatus, getCoordinationCount) {
    this.players = players;
    this.getComebackStatus = getComebackStatus;
    this.getCoordinationCount = getCoordinationCount;
  }

  /**
   * Calculate final damage amount with all modifiers
   * @param {Object} params - Damage calculation parameters
   * @returns {Object} Damage calculation result
   */
  calculateDamage(params) {
    const {
      baseDamage,
      target,
      attacker,
      options = {},
      log = []
    } = params;

    let damage = baseDamage;

    // Apply crit multiplier if present
    const critMultiplier = attacker?.tempCritMultiplier || options.critMultiplier || 1;
    if (critMultiplier !== 1) {
      damage = Math.floor(damage * critMultiplier);
    }

    // Apply detection penalty for recently detected warlocks
    damage = this.applyDetectionPenalty(damage, target);

    // Apply coordination bonus if applicable
    damage = this.applyCoordinationBonus(damage, target, attacker, log);

    // Apply vulnerability modifiers
    damage = this.applyVulnerabilityModifiers(damage, target, log);

    // Apply damage resistance effects
    damage = this.applyDamageResistance(damage, target);

    // Apply armor reduction
    damage = this.applyArmorReduction(damage, target);

    // Apply comeback mechanics for good players
    damage = this.applyComebackMechanics(damage, attacker, log);

    return {
      finalDamage: Math.max(1, damage), // Always deal at least 1 damage
      modifiers: {
        critMultiplier,
        coordination: this.getCoordinationCount ? this.getCoordinationCount(target.id, attacker.id) : 0,
        comeback: this.getComebackStatus ? this.getComebackStatus() : false
      }
    };
  }

  /**
   * Apply detection penalty for recently detected warlocks
   * @param {number} damage - Current damage amount
   * @param {Object} target - Target player
   * @returns {number} Modified damage
   */
  applyDetectionPenalty(damage, target) {
    if (target.isWarlock && target.recentlyDetected) {
      const penalty = config.gameBalance.warlock.corruption.detectionDamagePenalty / 100;
      return Math.floor(damage * (1 + penalty));
    }
    return damage;
  }

  /**
   * Apply coordination bonus damage
   * @param {number} damage - Current damage amount
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacking player
   * @param {Array} log - Event log
   * @returns {number} Modified damage
   */
  applyCoordinationBonus(damage, target, attacker, log) {
    if (!attacker.id || target === config.MONSTER_ID || !this.getCoordinationCount) {
      return damage;
    }

    const coordinationCount = this.getCoordinationCount(target.id, attacker.id);
    if (coordinationCount > 0) {
      const coordinatedDamage = config.gameBalance.calculateCoordinationBonus(
        damage,
        coordinationCount,
        'damage'
      );

      if (coordinatedDamage > damage) {
        const coordinationLog = {
          type: 'damage_coordination',
          public: true,
          targetId: target.id,
          attackerId: attacker.id,
          message: messages.formatMessage(messages.events.coordinatedAttack, {
            playerCount: coordinationCount + 1,
            targetName: target.name,
            bonusPercent: Math.round((coordinatedDamage / damage - 1) * 100)
          }),
          privateMessage: '',
          attackerMessage: ''
        };
        log.push(coordinationLog);
      }

      return coordinatedDamage;
    }

    return damage;
  }

  /**
   * Apply vulnerability modifiers to damage
   * @param {number} damage - Current damage amount
   * @param {Object} target - Target player
   * @param {Array} log - Event log
   * @returns {number} Modified damage
   */
  applyVulnerabilityModifiers(damage, target, log) {
    let modifiedDamage = damage;

    // Apply general vulnerability
    if (target.isVulnerable && target.vulnerabilityIncrease > 0) {
      const vulnerabilityMultiplier = 1 + target.vulnerabilityIncrease / 100;
      modifiedDamage = Math.floor(modifiedDamage * vulnerabilityMultiplier);
    }

    // Apply Relentless Fury vulnerability for Barbarian targets
    if (target.class === 'Barbarian') {
      const relentlessFuryDamage = target.getRelentlessFuryVulnerability(modifiedDamage);
      if (relentlessFuryDamage > 0) {
        modifiedDamage += relentlessFuryDamage;

        const relentlessFuryLog = {
          type: 'relentless_fury_vulnerability',
          public: false,
          targetId: target.id,
          message: '',
          privateMessage: `Your Relentless Fury causes you to take ${relentlessFuryDamage} additional damage!`,
          attackerMessage: ''
        };
        log.push(relentlessFuryLog);
      }
    }

    return modifiedDamage;
  }

  /**
   * Apply damage resistance effects
   * @param {number} damage - Current damage amount
   * @param {Object} target - Target player
   * @returns {number} Modified damage
   */
  applyDamageResistance(damage, target) {
    // Apply Unstoppable Rage damage resistance if active
    if (
      target.classEffects &&
      target.classEffects.unstoppableRage &&
      target.classEffects.unstoppableRage.turnsLeft > 0
    ) {
      const damageResistance = target.classEffects.unstoppableRage.damageResistance || 0.3;
      return Math.floor(damage * (1 - damageResistance));
    }

    return damage;
  }

  /**
   * Apply armor reduction to damage
   * @param {number} damage - Current damage amount
   * @param {Object} target - Target player
   * @returns {number} Modified damage
   */
  applyArmorReduction(damage, target) {
    let effectiveArmor = target.getEffectiveArmor();

    // Apply comeback mechanics armor bonus for good players
    if (this.getComebackStatus && this.getComebackStatus() && !target.isWarlock) {
      const armorBonus = config.gameBalance.comebackMechanics.armorIncrease;
      effectiveArmor += armorBonus;
    }

    return this.calculateArmorReduction(damage, effectiveArmor);
  }

  /**
   * Apply comeback mechanics damage bonus
   * @param {number} damage - Current damage amount
   * @param {Object} attacker - Attacking player
   * @param {Array} log - Event log
   * @returns {number} Modified damage
   */
  applyComebackMechanics(damage, attacker, log) {
    if (!this.getComebackStatus || !this.getComebackStatus() || attacker.isWarlock) {
      return damage;
    }

    const modifiedDamage = config.gameBalance.applyComebackBonus(
      damage,
      'damage',
      true,
      true
    );

    if (modifiedDamage > damage) {
      const comebackLog = {
        type: 'comeback_damage',
        public: false,
        attackerId: attacker.id,
        message: '',
        privateMessage: messages.formatMessage(
          messages.privateMessages.comebackDamageBonus,
          {
            bonusPercent: Math.round((modifiedDamage / damage - 1) * 100)
          }
        ),
        attackerMessage: ''
      };
      log.push(comebackLog);
    }

    return modifiedDamage;
  }

  /**
   * Calculate armor damage reduction
   * @param {number} damage - Raw damage amount
   * @param {number} totalArmor - Total armor value
   * @returns {number} Final damage after armor reduction
   */
  calculateArmorReduction(damage, totalArmor) {
    const reductionRate = config.gameBalance.armor.reductionRate || 0.1;
    const maxReduction = config.gameBalance.armor.maxReduction || 0.9;

    let reductionPercent;
    if (totalArmor <= 0) {
      // Negative armor increases damage taken
      reductionPercent = Math.max(-2.0, totalArmor * reductionRate);
    } else {
      // Positive armor reduces damage
      reductionPercent = Math.min(maxReduction, totalArmor * reductionRate);
    }

    // Apply the reduction and return final damage
    const finalDamage = Math.floor(damage * (1 - reductionPercent));
    return Math.max(1, finalDamage); // Always deal at least 1 damage
  }

  /**
   * Process Stone Armor degradation for Rockhewn players
   * @param {Object} target - Target player
   * @param {number} damage - Damage amount
   * @returns {Object|null} Armor degradation info
   */
  processStoneArmorDegradation(target, damage) {
    if (target.race === 'Rockhewn' && target.stoneArmorIntact) {
      return target.processStoneArmorDegradation(damage);
    }
    return null;
  }

  /**
   * Calculate damage for area-of-effect attacks
   * @param {Object} params - AoE damage parameters
   * @returns {Object} AoE damage calculation result
   */
  calculateAreaDamage(params) {
    const { source, baseDamage, options = {} } = params;

    let modifiedDamage = source.modifyDamage
      ? source.modifyDamage(baseDamage)
      : baseDamage;

    // Apply comeback mechanics damage bonus for good players
    if (this.getComebackStatus && this.getComebackStatus() && !source.isWarlock) {
      modifiedDamage = config.gameBalance.applyComebackBonus(
        modifiedDamage,
        'damage',
        true,
        true
      );
    }

    return {
      finalDamage: modifiedDamage,
      modifiers: {
        comeback: this.getComebackStatus ? this.getComebackStatus() : false
      }
    };
  }

  /**
   * Calculate coordination bonus for monster attacks
   * @param {number} damage - Base damage amount
   * @param {Object} attacker - Attacking player
   * @param {Array} log - Event log
   * @returns {number} Modified damage
   */
  calculateMonsterCoordinationBonus(damage, attacker, log) {
    if (!config.gameBalance.coordinationBonus.appliesToMonster || !this.getCoordinationCount) {
      return damage;
    }

    const coordinationCount = this.getCoordinationCount('__monster__', attacker.id);
    if (coordinationCount > 0) {
      const coordinatedDamage = config.gameBalance.calculateCoordinationBonus(
        damage,
        coordinationCount,
        'damage'
      );

      if (coordinatedDamage > damage) {
        const coordinationLog = {
          type: 'monster_coordination',
          public: true,
          attackerId: attacker.id,
          message: messages.formatMessage(
            messages.events.coordinatedMonsterAssault,
            {
              playerCount: coordinationCount + 1,
              bonusPercent: Math.round((coordinatedDamage / damage - 1) * 100)
            }
          ),
          privateMessage: '',
          attackerMessage: ''
        };
        log.push(coordinationLog);
      }

      return coordinatedDamage;
    }

    return damage;
  }
}

module.exports = DamageCalculator;