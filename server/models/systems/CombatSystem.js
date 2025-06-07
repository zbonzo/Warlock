/**
 * @fileoverview Enhanced Combat System with coordination bonuses and comeback mechanics
 * Includes fixed Undying timing, coordination tracking, and comeback mechanics for good team
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * Enhanced CombatSystem with coordination bonuses and comeback mechanics
 * Handles all combat-related operations with new team balance features
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
   */
  constructor(
    players,
    monsterController,
    statusEffectManager,
    racialAbilitySystem,
    warlockSystem,
    gameStateUtils
  ) {
    this.players = players;
    this.monsterController = monsterController;
    this.statusEffectManager = statusEffectManager;
    this.racialAbilitySystem = racialAbilitySystem;
    this.warlockSystem = warlockSystem;
    this.gameStateUtils = gameStateUtils;

    // NEW: Track coordination for this round
    this.coordinationTracker = new Map(); // targetId -> [playerId1, playerId2, ...]
    this.comebackActive = false;
  }

  /**
   * NEW: Reset coordination tracking for new round
   */
  resetCoordinationTracking() {
    this.coordinationTracker.clear();
    this.updateComebackStatus();
  }

  /**
   * NEW: Update comeback mechanics status
   */
  updateComebackStatus() {
    const alivePlayers = this.gameStateUtils.getAlivePlayers();
    const goodPlayers = alivePlayers.filter((p) => !p.isWarlock);

    this.comebackActive = config.gameBalance.shouldActiveComebackMechanics(
      goodPlayers.length,
      alivePlayers.length
    );
  }

  /**
   * NEW: Track coordination for damage/healing abilities
   * @param {string} actorId - ID of player performing action
   * @param {string} targetId - ID of target
   */
  trackCoordination(actorId, targetId) {
    if (!targetId || targetId === actorId) return;

    if (!this.coordinationTracker.has(targetId)) {
      this.coordinationTracker.set(targetId, []);
    }

    const coordinators = this.coordinationTracker.get(targetId);
    if (!coordinators.includes(actorId)) {
      coordinators.push(actorId);
    }
  }

  /**
   * NEW: Get coordination count for a target
   * @param {string} targetId - Target ID
   * @param {string} excludeActorId - Actor to exclude from count
   * @returns {number} Number of other players coordinating on this target
   */
  getCoordinationCount(targetId, excludeActorId) {
    if (!this.coordinationTracker.has(targetId)) return 0;

    const coordinators = this.coordinationTracker.get(targetId);
    return coordinators.filter((id) => id !== excludeActorId).length;
  }

  /**
   * ENHANCED: Apply damage to a player with coordination bonuses and comeback mechanics
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

    // Apply crit multiplier if present
    const critMultiplier =
      attacker?.tempCritMultiplier || options.critMultiplier || 1;
    if (critMultiplier !== 1) {
      damageAmount = Math.floor(damageAmount * critMultiplier);
    }

    // Check for immunity effects first
    if (this.checkImmunityEffects(target, attacker, log)) {
      return false;
    }

    // Apply detection penalty for recently detected warlocks
    let detectionPenaltyDamage = damageAmount;
    if (target.isWarlock && target.recentlyDetected) {
      const penalty =
        config.gameBalance.warlock.corruption.detectionDamagePenalty / 100;
      detectionPenaltyDamage = Math.floor(damageAmount * (1 + penalty));
    }

    // Apply coordination bonus if applicable
    let coordinatedDamage = detectionPenaltyDamage;
    if (attacker.id && target !== config.MONSTER_ID) {
      this.trackCoordination(attacker.id, target.id);
      const coordinationCount = this.getCoordinationCount(
        target.id,
        attacker.id
      );
      if (coordinationCount > 0) {
        coordinatedDamage = config.gameBalance.calculateCoordinationBonus(
          detectionPenaltyDamage,
          coordinationCount,
          'damage'
        );
      }
    }

    // Process Stone Armor degradation for Rockhewn
    let armorDegradationInfo = null;
    if (target.race === 'Rockhewn' && target.stoneArmorIntact) {
      armorDegradationInfo =
        target.processStoneArmorDegradation(coordinatedDamage);
    }

    // Apply vulnerability BEFORE armor calculation
    let modifiedDamage = coordinatedDamage;
    if (target.isVulnerable && target.vulnerabilityIncrease > 0) {
      const vulnerabilityMultiplier = 1 + target.vulnerabilityIncrease / 100;
      modifiedDamage = Math.floor(modifiedDamage * vulnerabilityMultiplier);
    }

    // NEW: Apply Relentless Fury vulnerability for Barbarian targets
    if (target.class === 'Barbarian') {
      const relentlessFuryDamage =
        target.getRelentlessFuryVulnerability(modifiedDamage);
      if (relentlessFuryDamage > 0) {
        modifiedDamage += relentlessFuryDamage;

        const relentlessFuryLog = {
          type: 'relentless_fury_vulnerability',
          public: false,
          targetId: target.id,
          message: '',
          privateMessage: `Your Relentless Fury causes you to take ${relentlessFuryDamage} additional damage!`,
          attackerMessage: '',
        };
        log.push(relentlessFuryLog);
      }
    }

    // Apply Unstoppable Rage damage resistance if active
    if (
      target.classEffects &&
      target.classEffects.unstoppableRage &&
      target.classEffects.unstoppableRage.turnsLeft > 0
    ) {
      const damageResistance =
        target.classEffects.unstoppableRage.damageResistance || 0.3;
      const beforeRage = modifiedDamage;
      modifiedDamage = Math.floor(modifiedDamage * (1 - damageResistance));
    }

    // Apply armor reduction
    let effectiveArmor = target.getEffectiveArmor();
    if (this.comebackActive && !target.isWarlock) {
      const armorBonus = config.gameBalance.comebackMechanics.armorIncrease;
      effectiveArmor += armorBonus;
    }

    const finalDamage = this.calculateArmorReduction(
      modifiedDamage,
      effectiveArmor
    );

    // Apply the final damage to HP
    const oldHp = target.hp;
    target.hp = Math.max(0, target.hp - finalDamage);
    const actualDamage = oldHp - target.hp;

    // Check if died
    if (target.hp <= 0) {
      target.isAlive = false;
    }

    // NEW: Process Thirsty Blade life steal for Barbarian attackers
    if (attacker.id && attacker.class === 'Barbarian' && actualDamage > 0) {
      const healAmount = attacker.processThirstyBladeLifeSteal(actualDamage);
      if (healAmount > 0) {
        const thirstyBladeLog = {
          type: 'thirsty_blade_heal',
          public: false,
          attackerId: attacker.id,
          message: `${attacker.name} is healed for ${healAmount} HP by their Thirsty Blade!`,
          privateMessage: '',
          attackerMessage: `Your Thirsty Blade heals you for ${healAmount} HP!`,
        };
        log.push(thirstyBladeLog);
      }
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
        armor: effectiveArmor,
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
      this.handleCounterAttacks(target, attacker, log);
    }

    // Handle Crestfallen Moonbeam detection
    if (
      target.race === 'Crestfallen' &&
      target.isMoonbeamActive() &&
      attacker.id
    ) {
      const revealMessage = attacker.isWarlock
        ? messages.formatMessage(messages.events.moonbeamRevealsCorrupted, {
            targetName: target.name,
            attackerName: attacker.name,
          })
        : messages.formatMessage(messages.events.moonbeamRevealsPure, {
            targetName: target.name,
            attackerName: attacker.name,
          });

      const moonbeamLog = {
        type: 'moonbeam_detection',
        public: false,
        targetId: target.id,
        attackerId: attacker.id,
        message: revealMessage,
        privateMessage: attacker.isWarlock
          ? messages.formatMessage(
              messages.privateMessages.moonbeamDetectedWarlock,
              { attackerName: attacker.name }
            )
          : messages.formatMessage(
              messages.privateMessages.moonbeamConfirmedPure,
              { attackerName: attacker.name }
            ),
        attackerMessage: attacker.isWarlock
          ? messages.formatMessage(
              messages.player.combat.moonbeamExposedCorruption,
              { targetName: target.name }
            )
          : messages.formatMessage(
              messages.player.combat.moonbeamConfirmedPurityAttacker,
              { targetName: target.name }
            ),
      };
      log.push(moonbeamLog);

      // NEW: Mark attacker as recently detected if they're a Warlock
      if (attacker.isWarlock) {
        attacker.recentlyDetected = true;
        attacker.detectionTurnsRemaining =
          config.gameBalance.warlock.corruption.detectionPenaltyDuration || 1;
      }
    }

    // Process potential death
    if (target.hp === 0) {
      this.handlePotentialDeath(target, attacker, log);
      // Sweeping Strike should still trigger even if the target died
    }

    // Check for warlock conversion opportunities
    this.checkWarlockConversion(target, attacker, log);

    // FIXED: Check for Sweeping Strike AFTER damage is applied
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
   * FIXED: Process Sweeping Strike with RAW damage (no ability re-execution)
   * @param {Object} attacker - Barbarian attacker
   * @param {Object} primaryTarget - Original target
   * @param {number} damage - Damage dealt to primary target
   * @param {Array} log - Event log
   */
  processSweepingStrike(attacker, primaryTarget, damage, log) {
    const sweepingParams = attacker.getSweepingStrikeParams();
    if (!sweepingParams) {
      console.log(`No sweeping params for ${attacker.name}`);
      return;
    }

    console.log(
      `Processing sweeping strike for ${attacker.name}, primary target: ${primaryTarget.name || 'Monster'}`
    );

    // Build list of potential secondary targets (including self for comedy!)
    const potentialTargets = [];

    // FIXED: Get monster state properly
    const monsterState = this.monsterController.getState();

    // Add monster if alive and not the primary target
    if (monsterState.hp > 0 && primaryTarget !== config.MONSTER_ID) {
      potentialTargets.push({ type: 'monster', target: 'monster' });
    }

    // Add other alive players (including attacker for hilarious self-harm!)
    for (const player of this.players.values()) {
      if (
        player.isAlive &&
        player !== primaryTarget // Only exclude primary target
      ) {
        potentialTargets.push({ type: 'player', target: player });
      }
    }

    console.log(`Found ${potentialTargets.length} potential secondary targets`);

    if (potentialTargets.length === 0) {
      console.log('No valid secondary targets for sweeping strike');
      return;
    }

    // Select random secondary targets
    const targetsToHit = Math.min(
      sweepingParams.bonusTargets,
      potentialTargets.length
    );
    const selectedTargets = [];

    // Shuffle and select
    const shuffled = [...potentialTargets];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let i = 0; i < targetsToHit; i++) {
      selectedTargets.push(shuffled[i]);
    }

    console.log(
      `Selected ${selectedTargets.length} targets for sweeping strike`
    );

    // CRITICAL: Apply RAW damage to secondary targets (NO ability re-execution)
    for (const targetInfo of selectedTargets) {
      const isTargetingSelf =
        targetInfo.type === 'player' && targetInfo.target.id === attacker.id;

      console.log(
        `Sweeping strike hitting ${targetInfo.type}: ${targetInfo.target.name || 'Monster'}`
      );

      if (targetInfo.type === 'monster') {
        // Apply raw damage to monster (no ability system involved)
        const success = this.monsterController.takeDamage(damage, attacker, []);

        if (success) {
          const monsterDamageLog = {
            type: 'sweeping_strike_monster',
            public: true,
            attackerId: attacker.id,
            message: `${attacker.name}'s Sweeping Strike hits the Monster for ${damage} damage!`,
            privateMessage: '',
            attackerMessage: '',
          };
          log.push(monsterDamageLog);
        }
      } else {
        // Apply raw damage to player target (NO ability system involved)
        const target = targetInfo.target;

        // CRITICAL: Use skipSweepingStrike to prevent infinite loops
        this.applyDamageToPlayer(
          target,
          damage,
          attacker,
          log,
          false,
          { skipSweepingStrike: true } // PREVENT INFINITE LOOPS
        );

        const playerDamageLog = {
          type: 'sweeping_strike_damage',
          public: true,
          attackerId: attacker.id,
          targetId: target.id,
          message: isTargetingSelf
            ? `${attacker.name}'s wild swing is so reckless they hit themselves for ${damage} damage!`
            : `${attacker.name}'s Sweeping Strike hits ${target.name} for ${damage} damage!`,
          privateMessage: isTargetingSelf
            ? `Your reckless swing hits you for ${damage} damage!`
            : '',
          attackerMessage: isTargetingSelf
            ? 'Your reckless swing hits even you!'
            : '',
        };
        log.push(playerDamageLog);
      }

      // Apply stun chance to player targets (including self!)
      if (
        targetInfo.type === 'player' &&
        Math.random() < sweepingParams.stunChance
      ) {
        // Apply stun directly using status effect manager
        if (this.statusEffectManager && this.statusEffectManager.applyEffect) {
          this.statusEffectManager.applyEffect(
            targetInfo.target.id,
            'stunned',
            { turns: sweepingParams.stunDuration },
            log
          );
        } else {
          // Fallback: apply stun directly to player
          if (!targetInfo.target.statusEffects) {
            targetInfo.target.statusEffects = {};
          }
          targetInfo.target.statusEffects.stunned = {
            turns: sweepingParams.stunDuration,
          };
        }

        const stunMessage = isTargetingSelf
          ? `${attacker.name} is so shocked by their own recklessness that they stun themselves!`
          : `${targetInfo.target.name} is stunned by ${attacker.name}'s Sweeping Strike!`;

        const stunLog = {
          type: 'sweeping_strike_stun',
          public: true,
          attackerId: attacker.id,
          targetId: targetInfo.target.id,
          message: stunMessage,
          privateMessage: '',
          attackerMessage: isTargetingSelf
            ? 'You stun yourself with your own recklessness!'
            : '',
        };
        log.push(stunLog);
      }
    }

    // Log the sweeping strike summary
    const sweepingLog = {
      type: 'sweeping_strike',
      public: true,
      attackerId: attacker.id,
      message: `${attacker.name}'s Sweeping Strike hits ${selectedTargets.length} additional target(s)!`,
      privateMessage: '',
      attackerMessage: '',
    };
    log.push(sweepingLog);
  }

  /**
   * NEW: Apply healing with coordination bonuses and comeback mechanics
   * @param {Object} healer - Player doing the healing
   * @param {Object} target - Target being healed
   * @param {number} baseAmount - Base healing amount
   * @param {Array} log - Event log
   * @returns {number} Actual amount healed
   */
  applyHealing(healer, target, baseAmount, log = [], options = {}) {
    const critMultiplier =
      healer?.tempCritMultiplier || options.critMultiplier || 1;
    if (critMultiplier !== 1) {
      baseAmount = Math.floor(baseAmount * critMultiplier);
    }

    // Check if healing is blocked (e.g., Warlocks can't be healed by others)
    if (
      target.isWarlock &&
      healer.id !== target.id &&
      config.gameBalance.player.healing.rejectWarlockHealing
    ) {
      const blockedLog = {
        type: 'healing_blocked',
        public: false,
        targetId: target.id,
        attackerId: healer.id,
        message: '',
        privateMessage: '',
        attackerMessage: messages.formatMessage(
          messages.player.combat.healingBlockedTarget,
          { targetName: target.name }
        ),
      };
      log.push(blockedLog);
      return 0;
    }

    // Apply healer's healing modifier
    const healingMod = healer.getHealingModifier
      ? healer.getHealingModifier()
      : 1.0;
    let modifiedAmount = Math.floor(baseAmount * healingMod);

    // NEW: Apply comeback mechanics bonus for good players
    if (this.comebackActive && !healer.isWarlock) {
      const beforeComeback = modifiedAmount;
      modifiedAmount = config.gameBalance.applyComebackBonus(
        modifiedAmount,
        'healing',
        true,
        true
      );

      if (modifiedAmount > beforeComeback) {
        const comebackHealingLog = {
          type: 'comeback_healing',
          public: false,
          attackerId: healer.id,
          message: '',
          privateMessage: messages.formatMessage(
            messages.privateMessages.comebackHealingBonus,
            {
              bonusPercent: Math.round(
                (modifiedAmount / beforeComeback - 1) * 100
              ),
            }
          ),
          attackerMessage: '',
        };
        log.push(comebackHealingLog);
      }
    }

    // NEW: Track coordination for healing
    if (healer.id !== target.id) {
      this.trackCoordination(healer.id, target.id);

      // Calculate coordination bonus
      const coordinationCount = this.getCoordinationCount(target.id, healer.id);
      if (coordinationCount > 0) {
        const coordinatedAmount = config.gameBalance.calculateCoordinationBonus(
          modifiedAmount,
          coordinationCount,
          'healing'
        );

        if (coordinatedAmount > modifiedAmount) {
          const coordinationLog = {
            type: 'healing_coordination',
            public: true,
            targetId: target.id,
            attackerId: healer.id,
            message: messages.formatMessage(
              messages.events.coordinatedHealing,
              {
                playerCount: coordinationCount + 1,
                targetName: target.name,
                bonusPercent: Math.round(
                  (coordinatedAmount / modifiedAmount - 1) * 100
                ),
              }
            ),
            privateMessage: '',
            attackerMessage: '',
          };
          log.push(coordinationLog);
        }

        modifiedAmount = coordinatedAmount;
      }
    }

    // Apply the healing
    const actualHeal = Math.min(modifiedAmount, target.maxHp - target.hp);
    target.hp += actualHeal;

    if (actualHeal > 0) {
      const healLog = {
        type: 'healing',
        public: false,
        targetId: target.id,
        attackerId: healer.id,
        message: messages.formatMessage(messages.events.playerHealed, {
          targetName: target.name,
          amount: actualHeal,
        }),
        privateMessage: messages.formatMessage(
          messages.privateMessages.healedByPlayer,
          {
            actualHeal,
            healerName: healer.name,
          }
        ),
        attackerMessage: messages.formatMessage(
          messages.player.combat.healedTarget,
          {
            targetName: target.name,
            actualHeal,
          }
        ),
      };
      log.push(healLog);
    }

    return actualHeal;
  }

  /**
   * ENHANCED: Check for warlock conversion with detection penalties
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @private
   */
  checkWarlockConversion(target, attacker, log) {
    // Only player attackers can cause conversions
    if (!attacker.id || attacker === target) return;

    // Check if attacker is a warlock
    if (attacker.isWarlock) {
      // NEW: Check if attacker was recently detected
      const recentlyDetected = attacker.recentlyDetected || false;

      // Apply comeback mechanics corruption resistance for good players
      let resistanceBonus = 0;
      if (this.comebackActive && !target.isWarlock) {
        resistanceBonus =
          config.gameBalance.comebackMechanics.corruptionResistance / 100;

        if (resistanceBonus > 0) {
          const resistanceLog = {
            type: 'comeback_resistance',
            public: false,
            targetId: target.id,
            message: '',
            privateMessage: messages.formatMessage(
              messages.privateMessages.comebackCorruptionResistance,
              {
                resistancePercent: Math.round(resistanceBonus * 100),
              }
            ),
            attackerMessage: '',
          };
          log.push(resistanceLog);
        }
      }

      // Attempt conversion with resistance modifier
      const resistanceModifier = 1 - resistanceBonus;
      this.warlockSystem.attemptConversion(
        attacker,
        target,
        log,
        resistanceModifier,
        recentlyDetected
      );
    }
  }

  /**
   * Process detection penalty duration for all players
   * @param {Array} log - Event log
   */
  processDetectionPenalties(log = []) {
    for (const player of this.players.values()) {
      if (player.recentlyDetected && player.detectionTurnsRemaining > 0) {
        player.detectionTurnsRemaining--;

        if (player.detectionTurnsRemaining <= 0) {
          player.recentlyDetected = false;
          delete player.detectionTurnsRemaining;

          const recoveryLog = {
            type: 'detection_penalty_end',
            public: false,
            targetId: player.id,
            message: '',
            privateMessage: messages.privateMessages.detectionPenaltyEnded,
            attackerMessage: '',
          };
          log.push(recoveryLog);
        }
      }
    }
  }

  /**
   * FIXED: Calculate armor damage reduction
   * @param {number} damage - Raw damage amount
   * @param {number} totalArmor - Total armor value
   * @returns {number} Final damage after armor reduction
   * @private
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
   * Handle counter-attacks from Oracle abilities
   * @param {Object} target - The player who was attacked
   * @param {Object} attacker - The player who attacked
   * @param {Array} log - Event log to append messages to
   * @private
   */
  handleCounterAttacks(target, attacker, log) {
    // Handle Spirit Guard counter-attack
    if (
      target.classEffects &&
      target.classEffects.spiritGuard &&
      target.classEffects.spiritGuard.turnsLeft > 0
    ) {
      const counterDamage = target.classEffects.spiritGuard.counterDamage || 15;

      // Apply counter-damage to attacker
      const oldAttackerHp = attacker.hp;
      attacker.hp = Math.max(1, attacker.hp - counterDamage);
      const actualCounterDamage = oldAttackerHp - attacker.hp;

      if (actualCounterDamage > 0) {
        log.push(
          messages.formatMessage(messages.events.spiritGuardCounter, {
            targetName: target.name,
            attackerName: attacker.name,
            damage: actualCounterDamage,
          })
        );

        // Private message to attacker
        const counterLog = {
          type: 'spirit_counter',
          public: false,
          targetId: attacker.id,
          message: '',
          privateMessage: messages.formatMessage(
            messages.privateMessages.spiritGuardStrikesYou,
            {
              targetName: target.name,
              damage: actualCounterDamage,
            }
          ),
          attackerMessage: '',
        };
        log.push(counterLog);
      }

      // Reveal if attacker is a warlock
      if (
        target.classEffects.spiritGuard.revealsWarlocks &&
        attacker.isWarlock
      ) {
        log.push(
          messages.formatMessage(messages.events.spiritsRevealWarlock, {
            attackerName: attacker.name,
          })
        );

        // Private message to Oracle
        const revelationLog = {
          type: 'spirit_revelation',
          public: false,
          targetId: target.id,
          message: '',
          privateMessage: messages.formatMessage(
            messages.privateMessages.yourSpiritsRevealWarlock,
            { attackerName: attacker.name }
          ),
          attackerMessage: '',
        };
        log.push(revelationLog);

        // NEW: Mark attacker as recently detected
        attacker.recentlyDetected = true;
        attacker.detectionTurnsRemaining =
          config.gameBalance.warlock.corruption.detectionPenaltyDuration || 1;
      }
    }

    // Handle Sanctuary of Truth counter-attack
    if (
      target.classEffects &&
      target.classEffects.sanctuaryOfTruth &&
      target.classEffects.sanctuaryOfTruth.turnsLeft > 0
    ) {
      const counterDamage =
        target.classEffects.sanctuaryOfTruth.counterDamage || 10;

      // Auto-detect if attacker is a warlock
      if (target.classEffects.sanctuaryOfTruth.autoDetect) {
        if (attacker.isWarlock) {
          // Apply counter-damage to warlock attacker
          const oldAttackerHp = attacker.hp;
          attacker.hp = Math.max(1, attacker.hp - counterDamage);
          const actualCounterDamage = oldAttackerHp - attacker.hp;

          log.push(
            messages.formatMessage(messages.events.sanctuaryPunishesWarlock, {
              targetName: target.name,
              attackerName: attacker.name,
              damage: actualCounterDamage,
            })
          );

          // Private messages
          const sanctuaryCounterLog = {
            type: 'sanctuary_counter',
            public: false,
            targetId: attacker.id,
            message: '',
            privateMessage: messages.formatMessage(
              messages.combat.counterAttack.sanctuaryCounterPrivate,
              {
                targetName: target.name,
                damage: actualCounterDamage,
              }
            ),
            attackerMessage: '',
          };
          log.push(sanctuaryCounterLog);

          const sanctuaryRevelationLog = {
            type: 'sanctuary_revelation',
            public: false,
            targetId: target.id,
            message: '',
            privateMessage: messages.formatMessage(
              messages.combat.counterAttack.sanctuaryReveal,
              { attackerName: attacker.name }
            ),
            attackerMessage: '',
          };
          log.push(sanctuaryRevelationLog);

          // NEW: Mark attacker as recently detected
          attacker.recentlyDetected = true;
          attacker.detectionTurnsRemaining =
            config.gameBalance.warlock.corruption.detectionPenaltyDuration || 1;
        } else {
          log.push(
            messages.formatMessage(
              messages.combat.counterAttack.sanctuaryNoWarlock,
              {
                targetName: target.name,
                attackerName: attacker.name,
              }
            )
          );

          // Private message to Oracle
          const sanctuaryNoWarlockLog = {
            type: 'sanctuary_no_warlock',
            public: false,
            targetId: target.id,
            message: '',
            privateMessage: messages.formatMessage(
              messages.combat.counterAttack.sanctuaryNoWarlockPrivate,
              { attackerName: attacker.name }
            ),
            attackerMessage: '',
          };
          log.push(sanctuaryNoWarlockLog);
        }
      }
    }
  }

  /**
   * Check for immunity effects that prevent damage
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the target is immune to damage
   * @private
   */
  checkImmunityEffects(target, attacker, log) {
    // Check for Stone Resolve immunity (Rockhewn racial)
    if (target.racialEffects && target.racialEffects.immuneNextDamage) {
      // Create an anonymous immunity message
      const immunityLog = {
        type: 'immunity',
        public: false,
        targetId: target.id,
        attackerId: attacker.id || 'monster',
        message: messages.formatMessage(messages.events.stoneResolveAbsorbed, {
          targetName: target.name,
        }),
        privateMessage: messages.formatMessage(
          messages.privateMessages.yourStoneResolveAbsorbed,
          {
            attackerName: attacker.name || 'The Monster',
          }
        ),
        attackerMessage: attacker.id
          ? messages.formatMessage(
              messages.player.combat.stoneResolveAbsorbedYourDamage,
              { targetName: target.name }
            )
          : '',
      };
      log.push(immunityLog);

      delete target.racialEffects.immuneNextDamage;
      return true;
    }

    return false;
  }

  /**
   * FIXED: Handle potential death when HP reaches 0 - NO IMMEDIATE RESURRECTION
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @private
   */
  handlePotentialDeath(target, attacker, log) {
    logger.debug('PlayerDeathCheck', {
      playerName: target.name,
      race: target.race,
      hp: target.hp,
    });

    // FIXED: Don't resurrect immediately - just mark for pending death
    // Undying will be checked during processPendingDeaths() AFTER monster attacks
    target.pendingDeath = true;
    target.deathAttacker = attacker.name || 'The Monster';
    target.deathAttackerId = attacker.id || 'monster';

    const deathLog = {
      type: 'death',
      public: true,
      targetId: target.id,
      attackerId: attacker.id || 'monster',
      message: messages.formatMessage(messages.events.playerDies, {
        playerName: target.name,
      }),
      privateMessage: messages.formatMessage(
        messages.privateMessages.killedBy,
        {
          attackerName: attacker.name || 'The Monster',
        }
      ),
      attackerMessage: messages.formatMessage(
        messages.player.combat.youKilledTarget,
        { targetName: target.name }
      ),
    };
    log.push(deathLog);

    // Reset Thirsty Blade duration on kill for Barbarian attackers
    if (attacker.id && attacker.class === 'Barbarian') {
      const refreshed = attacker.refreshThirstyBladeOnKill();
      if (refreshed) {
        const refreshLog = {
          type: 'thirsty_blade_refresh',
          public: false,
          attackerId: attacker.id,
          message: '',
          privateMessage: '',
          attackerMessage: `Your Thirsty Blade thirsts for more! Duration refreshed.`,
        };
        log.push(refreshLog);
      }
    }
  }

  /**
   * Apply damage to the monster with coordination bonuses
   * @param {number} amount - Amount of damage
   * @param {Object} attacker - Attacking player
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the attack was successful
   */
  applyDamageToMonster(amount, attacker, log = [], options = {}) {
    const critMultiplier =
      attacker?.tempCritMultiplier || options.critMultiplier || 1;
    if (critMultiplier !== 1) {
      amount = Math.floor(amount * critMultiplier);
    }
    // NEW: Apply comeback mechanics damage bonus for good players
    let modifiedAmount = amount;
    if (this.comebackActive && !attacker.isWarlock) {
      const beforeComeback = amount;
      modifiedAmount = config.gameBalance.applyComebackBonus(
        amount,
        'damage',
        true,
        true
      );

      if (modifiedAmount > beforeComeback) {
        const comebackLog = {
          type: 'comeback_damage',
          public: false,
          attackerId: attacker.id,
          message: '',
          privateMessage: messages.formatMessage(
            messages.privateMessages.comebackDamageBonus,
            {
              bonusPercent: Math.round(
                (modifiedAmount / beforeComeback - 1) * 100
              ),
            }
          ),
          attackerMessage: '',
        };
        log.push(comebackLog);
      }
    }

    // NEW: Check for coordination bonuses when attacking monster
    if (config.gameBalance.coordinationBonus.appliesToMonster) {
      this.trackCoordination(attacker.id, '__monster__');

      const coordinationCount = this.getCoordinationCount(
        '__monster__',
        attacker.id
      );
      if (coordinationCount > 0) {
        const coordinatedAmount = config.gameBalance.calculateCoordinationBonus(
          modifiedAmount,
          coordinationCount,
          'damage'
        );

        if (coordinatedAmount > modifiedAmount) {
          const coordinationLog = {
            type: 'monster_coordination',
            public: true,
            attackerId: attacker.id,
            message: messages.formatMessage(
              messages.events.coordinatedMonsterAssault,
              {
                playerCount: coordinationCount + 1,
                bonusPercent: Math.round(
                  (coordinatedAmount / modifiedAmount - 1) * 100
                ),
              }
            ),
            privateMessage: '',
            attackerMessage: '',
          };
          log.push(coordinationLog);
        }

        modifiedAmount = coordinatedAmount;
      }
    }

    const result = this.monsterController.takeDamage(
      modifiedAmount,
      attacker,
      log
    );

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

    // FIXED: Check for Sweeping Strike when attacking monster
    if (
      attacker.class === 'Barbarian' &&
      attacker.classEffects &&
      attacker.classEffects.sweepingStrike &&
      !options.skipSweepingStrike &&
      modifiedAmount > 0
    ) {
      this.processSweepingStrike(
        attacker,
        config.MONSTER_ID,
        modifiedAmount,
        log
      );
    }

    return result;
  }

  /**
   * FIXED: Process all pending deaths - this is where Undying actually triggers
   * AND where Thirsty Blade gets refreshed for all Barbarians on ANY death
   * @param {Array} log - Event log to append messages to
   */
  processPendingDeaths(log = []) {
    const playersWhoDied = [];

    for (const player of this.players.values()) {
      if (player.pendingDeath) {
        logger.debug('ProcessingPendingDeath', {
          playerName: player.name,
          race: player.race,
          hasRacialEffects: !!player.racialEffects,
        });

        // FIXED: Check if player has Undying effect - THIS IS WHERE RESURRECTION HAPPENS
        if (
          player.race === 'Lich' &&
          player.racialEffects &&
          player.racialEffects.resurrect &&
          player.racialEffects.resurrect.active
        ) {
          logger.debug('UndyingTriggered', {
            playerName: player.name,
          });

          // Resurrect the player
          const resurrectedHp =
            player.racialEffects.resurrect.resurrectedHp || 1;
          player.hp = resurrectedHp;
          player.isAlive = true;

          // Create a resurrection message that overwrites the death message
          const resurrectLog = {
            type: 'resurrect',
            public: true,
            targetId: player.id,
            message: messages.formatMessage(messages.events.undyingActivated, {
              playerName: player.name,
            }),
            privateMessage: messages.privateMessages.undyingSavedYou,
            attackerMessage: messages.formatMessage(
              messages.player.combat.targetAvoidedDeathUndying,
              { playerName: player.name }
            ),
          };
          log.push(resurrectLog);

          // Consume the effect (one-time use)
          player.racialEffects.resurrect.active = false;
          player.racialUsesLeft = 0;

          // Clear pending death
          delete player.pendingDeath;
          delete player.deathAttacker;
          delete player.deathAttackerId;

          logger.debug('UndyingSuccess', {
            playerName: player.name,
            resurrectedHp,
          });
        } else {
          // Player actually dies permanently
          player.isAlive = false;
          if (player.isWarlock) this.warlockSystem.decrementWarlockCount();

          // Track who died for Thirsty Blade refresh
          playersWhoDied.push({
            name: player.name,
            id: player.id,
            attacker: player.deathAttacker,
            attackerId: player.deathAttackerId,
          });

          delete player.pendingDeath;
          delete player.deathAttacker;
          delete player.deathAttackerId;

          logger.debug('PlayerDeathFinal', {
            playerName: player.name,
          });
        }
      }
    }

    // NEW: Refresh Thirsty Blade for all living Barbarians when ANY player dies
    if (playersWhoDied.length > 0) {
      for (const player of this.players.values()) {
        if (
          player.isAlive &&
          player.class === 'Barbarian' &&
          player.classEffects &&
          player.classEffects.thirstyBlade
        ) {
          const refreshed = player.refreshThirstyBladeOnKill();
          if (refreshed) {
            // Create one message per death
            for (const deadPlayer of playersWhoDied) {
              const refreshLog = {
                type: 'thirsty_blade_refresh_any_death',
                public: false,
                targetId: player.id,
                message: '',
                privateMessage: '',
                attackerMessage: `The death of ${deadPlayer.name} invigorates your Thirsty Blade! Duration refreshed.`,
              };
              log.push(refreshLog);
            }
            break; // Only need to refresh once per barbarian
          }
        }
      }
    }

    // Update comeback status after deaths are processed
    this.updateComebackStatus();
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

    // Get warlock conversion modifier from config
    const warlockConversionChance =
      config.gameBalance.warlock.conversion.aoeModifier;

    const affectedTargets = [];

    // Modify damage based on source's modifier
    let modifiedDamage = source.modifyDamage
      ? source.modifyDamage(baseDamage)
      : baseDamage;

    // NEW: Apply comeback mechanics damage bonus for good players
    if (this.comebackActive && !source.isWarlock) {
      modifiedDamage = config.gameBalance.applyComebackBonus(
        modifiedDamage,
        'damage',
        true,
        true
      );
    }

    // Filter targets
    const validTargets = targets.filter((target) => {
      if (!target || !target.isAlive) return false;
      if (excludeSelf && target.id === source.id) return false;
      return true;
    });

    // Apply damage to each target
    for (const target of validTargets) {
      this.applyDamageToPlayer(target, modifiedDamage, source, log);

      // Check for warlock conversion with reduced chance
      if (source.isWarlock && target.isAlive && !target.isWarlock) {
        // Apply comeback mechanics corruption resistance
        let resistanceModifier = 1.0;
        if (this.comebackActive) {
          resistanceModifier =
            1 - config.gameBalance.comebackMechanics.corruptionResistance / 100;
        }

        const finalConversionChance =
          warlockConversionChance * resistanceModifier;
        this.warlockSystem.attemptConversion(
          source,
          target,
          log,
          finalConversionChance
        );
      }

      affectedTargets.push(target);
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
    // Use config for healing options
    const excludeSelf = options.excludeSelf ?? false;
    const excludeWarlocks =
      options.excludeWarlocks ??
      config.gameBalance.player.healing.rejectWarlockHealing ??
      true;

    const affectedTargets = [];

    // Filter targets
    const validTargets = targets.filter((target) => {
      if (!target || !target.isAlive) return false;
      if (excludeSelf && target.id === source.id) return false;
      if (excludeWarlocks && target.isWarlock) return false;
      return true;
    });

    // Apply healing to each target using the enhanced healing method
    for (const target of validTargets) {
      const actualHeal = this.applyHealing(source, target, baseAmount, log, {});
      if (actualHeal > 0) {
        affectedTargets.push(target);
      }
    }

    return affectedTargets;
  }

  /**
   * Check and setup Undying racial ability if needed
   * @param {Object} player - Player to check
   * @returns {boolean} Whether setup was needed
   */
  checkAndSetupUndyingIfNeeded(player) {
    if (
      player &&
      player.race === 'Lich' &&
      (!player.racialEffects || !player.racialEffects.resurrect)
    ) {
      logger.debug('UndyingSetupNeeded', {
        playerName: player.name,
      });
      player.racialEffects = player.racialEffects || {};
      player.racialEffects.resurrect = {
        resurrectedHp: 1, // Default value if params not available
        active: true,
      };
      logger.debug('UndyingSetupComplete', {
        playerName: player.name,
        racialEffects: player.racialEffects,
      });
      return true;
    }
    return false;
  }

  /**
   * NEW: Get coordination statistics for debugging/analytics
   * @returns {Object} Coordination statistics
   */
  getCoordinationStats() {
    const stats = {};
    for (const [targetId, coordinators] of this.coordinationTracker.entries()) {
      stats[targetId] = {
        coordinators: coordinators.length,
        playerIds: coordinators,
      };
    }
    return {
      coordinationTracker: stats,
      comebackActive: this.comebackActive,
      totalCoordinatedTargets: this.coordinationTracker.size,
    };
  }
}

module.exports = CombatSystem;
