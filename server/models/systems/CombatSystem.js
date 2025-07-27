/**
 * @fileoverview Enhanced Combat System with coordination bonuses and comeback mechanics
 * Refactored to use composition with extracted domain models
 * Part of Phase 1 refactoring - now uses DamageCalculator, EffectManager, and TurnResolver
 * Part of Phase 2 refactoring - now emits events for combat actions
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');
const DamageCalculator = require('./DamageCalculator');
const EffectManager = require('./EffectManager');
const TurnResolver = require('./TurnResolver');
const { EventTypes } = require('../events/EventTypes');

/**
 * Enhanced CombatSystem with coordination bonuses and comeback mechanics
 * Now uses composition with extracted domain models for better maintainability
 */
class CombatSystem {
  /**
   * Create a combat system
   * @param {Map} players - Map of player objects
   * @param {MonsterController} monsterController - Monster controller
   * @param {StatusEffectManager} statusEffectManager - Status effect manager
   * @param {RacialAbilitySystem} racialAbilitySystem - Racial ability system
   * @param {WarlockSystem} warlockSystem - Warlock system
   * @param {GameStateUtils} gameStateUtils - Game state utilities
   * @param {GameEventBus} eventBus - Event bus for emitting combat events
   */
  constructor(
    players,
    monsterController,
    statusEffectManager,
    racialAbilitySystem,
    warlockSystem,
    gameStateUtils,
    eventBus = null
  ) {
    this.players = players;
    this.monsterController = monsterController;
    this.statusEffectManager = statusEffectManager;
    this.racialAbilitySystem = racialAbilitySystem;
    this.warlockSystem = warlockSystem;
    this.gameStateUtils = gameStateUtils;
    this.eventBus = eventBus;

    // Initialize domain models
    this.turnResolver = new TurnResolver(players, monsterController, warlockSystem, gameStateUtils, eventBus);
    this.effectManager = new EffectManager(
      players,
      statusEffectManager,
      warlockSystem,
      () => this.turnResolver.getComebackStatus(),
      (targetId, excludeActorId) => this.turnResolver.getCoordinationCount(targetId, excludeActorId),
      eventBus
    );
    this.damageCalculator = new DamageCalculator(
      players,
      () => this.turnResolver.getComebackStatus(),
      (targetId, excludeActorId) => this.turnResolver.getCoordinationCount(targetId, excludeActorId)
    );
  }

  // Delegation methods for backward compatibility
  /**
   * Reset coordination tracking for new round
   */
  resetCoordinationTracking() {
    return this.turnResolver.resetCoordinationTracking();
  }

  /**
   * Update comeback mechanics status
   */
  updateComebackStatus() {
    return this.turnResolver.updateComebackStatus();
  }

  /**
   * Track coordination for damage/healing abilities
   * @param {string} actorId - ID of player performing action
   * @param {string} targetId - ID of target
   */
  trackCoordination(actorId, targetId) {
    this.turnResolver.trackCoordination(actorId, targetId);
  }

  /**
   * Get coordination count for a target
   * @param {string} targetId - Target ID
   * @param {string} excludeActorId - Actor to exclude from count
   * @returns {number} Number of other players coordinating on this target
   */
  getCoordinationCount(targetId, excludeActorId) {
    return this.turnResolver.getCoordinationCount(targetId, excludeActorId);
  }

  /**
   * Get comeback status
   * @returns {boolean} Whether comeback mechanics are active
   */
  getComebackStatus() {
    return this.turnResolver.getComebackStatus();
  }

  /**
   * Apply damage to a player with coordination bonuses and comeback mechanics
   * @param {Object} target - Target player
   * @param {number} damageAmount - Amount of damage
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @param {boolean} isKeenSensesAttack - Whether this is a Keen Senses attack
   * @returns {boolean} Whether the attack was successful
   */
  applyDamageToPlayer(
    target,
    damageAmount,
    attacker,
    log = [],
    isKeenSensesAttack = false,
    options = {}
  ) {
    if (!target || !target.isAlive) return false;

    // Check for immunity effects first
    if (this.effectManager.checkImmunityEffects(target, attacker, log)) {
      return false;
    }

    // Track coordination
    if (attacker.id && target !== config.MONSTER_ID) {
      this.trackCoordination(attacker.id, target.id);
    }

    // Calculate damage using DamageCalculator
    const damageResult = this.damageCalculator.calculateDamage({
      baseDamage: damageAmount,
      target,
      attacker,
      options,
      log
    });

    const finalDamage = damageResult.finalDamage;

    // Process Stone Armor degradation for Rockhewn
    if (target.race === 'Rockhewn' && target.stoneArmorIntact) {
      this.damageCalculator.processStoneArmorDegradation(target, finalDamage);
    }

    // Apply the final damage to HP
    const oldHp = target.hp;
    target.hp = Math.max(0, target.hp - finalDamage);
    const actualDamage = oldHp - target.hp;

    // Emit damage event
    if (this.eventBus && actualDamage > 0) {
      this.eventBus.emit(EventTypes.DAMAGE.APPLIED, {
        targetId: target.id,
        targetName: target.name,
        attackerId: attacker.id || 'monster',
        attackerName: attacker.name || 'The Monster',
        damageAmount: actualDamage,
        originalDamage: damageAmount,
        armor: target.getEffectiveArmor(),
        targetHpBefore: oldHp,
        targetHpAfter: target.hp,
        timestamp: new Date().toISOString()
      });
    }

    // Trophy system: Track damage dealt by attacker
    if (attacker && attacker.addDamageDealt && actualDamage > 0) {
      attacker.addDamageDealt(actualDamage);
    } else if (attacker) {
      logger.info(`STATS: No tracking for ${attacker.name} - no addDamageDealt method, actualDamage: ${actualDamage}`);
    }

    // Trophy system: Track damage taken by target
    if (target.addDamageTaken && actualDamage > 0) {
      target.addDamageTaken(actualDamage);
    }

    // Check if died
    if (target.hp <= 0) {
      target.isAlive = false;
      // Trophy system: Track death
      if (target.addDeath) {
        target.addDeath();
      }

      // Emit player death event
      if (this.eventBus) {
        this.eventBus.emit(EventTypes.PLAYER.DIED, {
          playerId: target.id,
          playerName: target.name,
          killerId: attacker.id || 'monster',
          killerName: attacker.name || 'The Monster',
          finalDamage: actualDamage,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Process Thirsty Blade life steal for Barbarian attackers
    if (attacker.id && attacker.class === 'Barbarian' && actualDamage > 0) {
      this.effectManager.processThirstyBladeLifeSteal(attacker, actualDamage, log);
    }

    // Create damage log entry
    const logEvent = {
      type: 'damage',
      public: false,
      targetId: target.id,
      targetName: target.name,
      attackerId: attacker.id || 'monster',
      attackerName: attacker.name || 'The Monster',
      damage: {
        initial: damageAmount,
        final: actualDamage,
        armor: target.getEffectiveArmor(),
      },
      message: `${target.name} takes ${actualDamage} damage!`,
      privateMessage: `You take ${actualDamage} damage from ${attacker.name || 'The Monster'}!`,
      attackerMessage: attacker.id
        ? `You deal ${actualDamage} damage to ${target.name}!`
        : '',
    };
    log.push(logEvent);

    // Handle counter-attacks from Oracle abilities
    if (attacker.id && actualDamage > 0) {
      this.effectManager.handleCounterAttacks(target, attacker, log);
    }

    // Handle Crestfallen Moonbeam detection
    if (
      target.race === 'Crestfallen' &&
      target.isMoonbeamActive() &&
      attacker.id
    ) {
      this.effectManager.handleMoonbeamDetection(target, attacker, log);
    }

    // Process potential death
    if (target.hp === 0) {
      this.turnResolver.handlePotentialDeath(target, attacker, log);
    }

    // Check for warlock conversion opportunities
    this.effectManager.checkWarlockConversion(target, attacker, log);

    // Check for Sweeping Strike AFTER damage is applied
    if (
      attacker.id &&
      attacker.class === 'Barbarian' &&
      !options.skipSweepingStrike &&
      actualDamage > 0
    ) {
      console.log(
        `Checking sweeping strike for ${attacker.name}, damage: ${actualDamage}`
      );
      const sweepingParams = attacker.getSweepingStrikeParams();
      if (sweepingParams) {
        console.log(`Triggering sweeping strike for ${attacker.name}`);
        this.processSweepingStrike(attacker, target, actualDamage, log);
      } else {
        console.log(`No sweeping strike params for ${attacker.name}`);
      }
    }

    return true;
  }

  /**
   * Process Sweeping Strike with RAW damage (no ability re-execution)
   * @param {Object} attacker - Barbarian attacker
   * @param {Object} primaryTarget - Original target
   * @param {number} damage - Damage dealt to primary target
   * @param {Array} log - Event log
   */
  processSweepingStrike(attacker, primaryTarget, damage, log) {
    this.turnResolver.processSweepingStrike(
      attacker,
      primaryTarget,
      damage,
      log,
      (target, dmg, atk, logArr, isKeen, opts) => this.applyDamageToPlayer(target, dmg, atk, logArr, isKeen, opts)
    );
  }

  /**
   * Apply healing with coordination bonuses and comeback mechanics
   * @param {Object} healer - Player doing the healing
   * @param {Object} target - Target being healed
   * @param {number} baseAmount - Base healing amount
   * @param {Array} log - Event log
   * @returns {number} Actual amount healed
   */
  applyHealing(healer, target, baseAmount, log = [], options = {}) {
    // Track coordination for healing
    if (healer.id !== target.id) {
      this.trackCoordination(healer.id, target.id);
    }

    const oldHp = target.hp;
    const actualHealing = this.effectManager.applyHealing(healer, target, baseAmount, log, options);

    // Emit healing event
    if (this.eventBus && actualHealing > 0) {
      this.eventBus.emit(EventTypes.HEAL.APPLIED, {
        healerId: healer.id,
        healerName: healer.name,
        targetId: target.id,
        targetName: target.name,
        healAmount: actualHealing,
        originalAmount: baseAmount,
        targetHpBefore: oldHp,
        targetHpAfter: target.hp,
        isSelfHeal: healer.id === target.id,
        timestamp: new Date().toISOString()
      });
    }

    return actualHealing;
  }

  /**
   * Check for warlock conversion with detection penalties
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   */
  checkWarlockConversion(target, attacker, log) {
    this.effectManager.checkWarlockConversion(target, attacker, log);
  }

  /**
   * Process detection penalty duration for all players
   * @param {Array} log - Event log
   */
  processDetectionPenalties(log = []) {
    this.effectManager.processDetectionPenalties(log);
  }

  /**
   * Calculate armor damage reduction
   * @param {number} damage - Raw damage amount
   * @param {number} totalArmor - Total armor value
   * @returns {number} Final damage after armor reduction
   */
  calculateArmorReduction(damage, totalArmor) {
    return this.damageCalculator.calculateArmorReduction(damage, totalArmor);
  }

  /**
   * Handle counter-attacks from Oracle abilities
   * @param {Object} target - The player who was attacked
   * @param {Object} attacker - The player who attacked
   * @param {Array} log - Event log to append messages to
   */
  handleCounterAttacks(target, attacker, log) {
    this.effectManager.handleCounterAttacks(target, attacker, log);
  }

  /**
   * Check for immunity effects that prevent damage
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the target is immune to damage
   */
  checkImmunityEffects(target, attacker, log) {
    return this.effectManager.checkImmunityEffects(target, attacker, log);
  }

  /**
   * Handle potential death when HP reaches 0 - NO IMMEDIATE RESURRECTION
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   */
  handlePotentialDeath(target, attacker, log) {
    this.turnResolver.handlePotentialDeath(target, attacker, log);
  }

  /**
   * Apply damage to the monster with coordination bonuses
   * @param {number} amount - Amount of damage
   * @param {Object} attacker - Attacking player
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the attack was successful
   */
  applyDamageToMonster(amount, attacker, log = [], options = {}) {
    // Apply crit multiplier
    const critMultiplier = attacker?.tempCritMultiplier || options.critMultiplier || 1;
    if (critMultiplier !== 1) {
      amount = Math.floor(amount * critMultiplier);
    }

    // Track coordination
    if (config.gameBalance.coordinationBonus.appliesToMonster) {
      this.trackCoordination(attacker.id, '__monster__');
    }

    // Calculate final damage with all modifiers
    let modifiedAmount = this.damageCalculator.applyComebackMechanics(amount, attacker, log);
    modifiedAmount = this.damageCalculator.calculateMonsterCoordinationBonus(
      modifiedAmount,
      attacker,
      log
    );

    const oldMonsterHp = this.monsterController.monster ? this.monsterController.monster.hp : 0;
    const result = this.monsterController.takeDamage(modifiedAmount, attacker, log);
    const newMonsterHp = this.monsterController.monster ? this.monsterController.monster.hp : 0;
    const actualDamage = oldMonsterHp - newMonsterHp;

    // Emit monster damage event
    if (this.eventBus && actualDamage > 0) {
      this.eventBus.emit(EventTypes.MONSTER.DAMAGED, {
        attackerId: attacker.id,
        attackerName: attacker.name,
        damageAmount: actualDamage,
        originalDamage: amount,
        modifiedDamage: modifiedAmount,
        monsterHpBefore: oldMonsterHp,
        monsterHpAfter: newMonsterHp,
        critMultiplier: options.critMultiplier || 1,
        timestamp: new Date().toISOString()
      });
    }

    // Check if monster was defeated
    if (this.eventBus && newMonsterHp <= 0 && oldMonsterHp > 0) {
      this.eventBus.emit(EventTypes.MONSTER.DEFEATED, {
        killerId: attacker.id,
        killerName: attacker.name,
        finalDamage: actualDamage,
        timestamp: new Date().toISOString()
      });
    }

    // Heal attacker via Thirsty Blade when damaging the monster
    if (
      attacker.class === 'Barbarian' &&
      attacker.classEffects &&
      attacker.classEffects.thirstyBlade &&
      attacker.classEffects.thirstyBlade.active
    ) {
      const lifeSteal = attacker.classEffects.thirstyBlade.lifeSteal || 0.25;
      const healAmount = Math.floor(modifiedAmount * lifeSteal);
      if (healAmount > 0) {
        attacker.heal(healAmount);
        log.push(
          messages.formatMessage(messages.getEvent('thirstyBladeHeal'), {
            playerName: attacker.name,
            amount: healAmount,
          })
        );
      }
    }

    // Check for Sweeping Strike when attacking monster
    if (
      attacker.class === 'Barbarian' &&
      attacker.classEffects &&
      attacker.classEffects.sweepingStrike &&
      !options.skipSweepingStrike &&
      modifiedAmount > 0
    ) {
      this.processSweepingStrike(attacker, config.MONSTER_ID, modifiedAmount, log);
    }

    return result;
  }

  /**
   * Process all pending deaths - this is where Undying actually triggers
   * AND where Thirsty Blade gets refreshed for all Barbarians on ANY death
   * @param {Array} log - Event log to append messages to
   */
  processPendingDeaths(log = []) {
    this.turnResolver.processPendingDeaths(log);
  }

  /**
   * Handle area-of-effect (AoE) damage to multiple targets with coordination bonuses
   * @param {Object} source - Source of the AoE damage
   * @param {number} baseDamage - Base damage amount
   * @param {Array} targets - Array of target players
   * @param {Array} log - Event log to append messages to
   * @param {Object} options - Additional options
   * @returns {Array} Array of affected targets
   */
  applyAreaDamage(source, baseDamage, targets, log = [], options = {}) {
    const { excludeSelf = true } = options;
    const affectedTargets = [];

    // Calculate area damage with bonuses
    const damageResult = this.damageCalculator.calculateAreaDamage({
      source,
      baseDamage,
      options
    });

    // Filter targets
    const validTargets = targets.filter(target => {
      if (!target || !target.isAlive) return false;
      if (excludeSelf && target.id === source.id) return false;
      return true;
    });

    // Apply damage to each target
    for (const target of validTargets) {
      this.applyDamageToPlayer(target, damageResult.finalDamage, source, log);
      affectedTargets.push(target);
    }

    // Handle warlock conversion for area effects
    this.effectManager.handleAreaWarlockConversion(source, validTargets, log);

    // Emit area damage event
    if (this.eventBus && affectedTargets.length > 0) {
      this.eventBus.emit(EventTypes.DAMAGE.APPLIED, {
        sourceId: source.id || 'monster',
        targetIds: affectedTargets.map(t => t.id),
        damage: damageResult.finalDamage,
        baseDamage: baseDamage,
        timestamp: new Date().toISOString()
      });
    }

    return affectedTargets;
  }

  /**
   * Handle multi-target healing with coordination bonuses
   * @param {Object} source - Source of the healing
   * @param {number} baseAmount - Base healing amount
   * @param {Array} targets - Array of target players
   * @param {Array} log - Event log to append messages to
   * @param {Object} options - Additional options
   * @returns {Array} Array of affected targets
   */
  applyAreaHealing(source, baseAmount, targets, log = [], options = {}) {
    return this.effectManager.applyAreaHealing(source, baseAmount, targets, log, options);
  }

  /**
   * Check and setup Undying racial ability if needed
   * @param {Object} player - Player to check
   * @returns {boolean} Whether setup was needed
   */
  checkAndSetupUndyingIfNeeded(player) {
    return this.turnResolver.checkAndSetupUndyingIfNeeded(player);
  }

  /**
   * Get coordination statistics for debugging/analytics
   * @returns {Object} Coordination statistics
   */
  getCoordinationStats() {
    return this.turnResolver.getCoordinationStats();
  }

  // Backward compatibility getters
  get coordinationTracker() {
    return this.turnResolver.coordinationTracker;
  }

  get comebackActive() {
    return this.turnResolver.comebackActive;
  }

  set comebackActive(value) {
    this.turnResolver.comebackActive = value;
  }
}

module.exports = CombatSystem;
