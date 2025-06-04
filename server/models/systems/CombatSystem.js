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
    isKeenSensesAttack = false
  ) {
    if (!target || !target.isAlive) return false;

    // Check for immunity effects first
    if (this.checkImmunityEffects(target, attacker, log)) {
      return false; // No damage was dealt
    }

    // NEW: Check if target was recently detected as Warlock
    let detectionPenaltyDamage = damageAmount;
    if (target.isWarlock && target.recentlyDetected) {
      const penalty =
        config.gameBalance.warlock.corruption.detectionDamagePenalty / 100;
      detectionPenaltyDamage = Math.floor(damageAmount * (1 + penalty));

      if (detectionPenaltyDamage > damageAmount) {
        const detectionPenaltyLog = {
          type: 'detection_penalty',
          public: false,
          targetId: target.id,
          message: '',
          privateMessage: `Detection penalty increases damage by ${config.gameBalance.warlock.corruption.detectionDamagePenalty}%! (${damageAmount} → ${detectionPenaltyDamage})`,
          attackerMessage: `${target.name} takes +${config.gameBalance.warlock.corruption.detectionDamagePenalty}% damage from recent detection!`,
        };
        log.push(detectionPenaltyLog);
      }
    }

    // NEW: Apply coordination bonus if attacker is a player
    let coordinatedDamage = detectionPenaltyDamage;
    if (attacker.id && target !== config.MONSTER_ID) {
      // Track this coordination
      this.trackCoordination(attacker.id, target.id);

      // Calculate coordination bonus
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

        if (coordinatedDamage > detectionPenaltyDamage) {
          const coordinationLog = {
            type: 'coordination_bonus',
            public: true,
            targetId: target.id,
            attackerId: attacker.id,
            message: `Coordinated attack! ${coordinationCount + 1} players target ${target.name} for +${Math.round((coordinatedDamage / detectionPenaltyDamage - 1) * 100)}% damage!`,
            privateMessage: '',
            attackerMessage: '',
          };
          log.push(coordinationLog);
        }
      }
    }

    // Initialize armor degradation info
    let armorDegradationInfo = null;

    // Process Stone Armor degradation for Rockhewn (before damage calculation)
    if (target.race === 'Rockhewn' && target.stoneArmorIntact) {
      armorDegradationInfo =
        target.processStoneArmorDegradation(coordinatedDamage);
    }

    // STEP 1: Apply vulnerability BEFORE armor calculation
    let modifiedDamage = coordinatedDamage;
    if (target.isVulnerable && target.vulnerabilityIncrease > 0) {
      const vulnerabilityMultiplier = 1 + target.vulnerabilityIncrease / 100;
      modifiedDamage = Math.floor(modifiedDamage * vulnerabilityMultiplier);

      // Log vulnerability effect
      log.push(
        `${target.name} is VULNERABLE and takes ${target.vulnerabilityIncrease}% more damage! (${coordinatedDamage} → ${modifiedDamage})`
      );
    }

    // STEP 2: Apply Unstoppable Rage damage resistance if active
    if (
      target.classEffects &&
      target.classEffects.unstoppableRage &&
      target.classEffects.unstoppableRage.turnsLeft > 0
    ) {
      const damageResistance =
        target.classEffects.unstoppableRage.damageResistance || 0.3;
      const beforeRage = modifiedDamage;
      modifiedDamage = Math.floor(modifiedDamage * (1 - damageResistance));

      log.push(
        `${target.name}'s Unstoppable Rage reduces damage by ${Math.round(damageResistance * 100)}%! (${beforeRage} → ${modifiedDamage})`
      );
    }

    // STEP 3: Apply armor reduction using FIXED calculation
    let effectiveArmor = target.getEffectiveArmor();

    // NEW: Apply comeback mechanics armor bonus for good players
    if (this.comebackActive && !target.isWarlock) {
      const armorBonus = config.gameBalance.comebackMechanics.armorIncrease;
      effectiveArmor += armorBonus;

      const comebackArmorLog = {
        type: 'comeback_armor',
        public: false,
        targetId: target.id,
        message: '',
        privateMessage: `Comeback mechanics grant you +${armorBonus} armor!`,
        attackerMessage: '',
      };
      log.push(comebackArmorLog);
    }

    const beforeArmor = modifiedDamage;
    const finalDamage = this.calculateArmorReduction(
      modifiedDamage,
      effectiveArmor
    );

    // Calculate reduction percentage for logs
    const reductionPercent =
      effectiveArmor > 0
        ? Math.round(((beforeArmor - finalDamage) / beforeArmor) * 100)
        : 0;

    // STEP 4: Apply the final damage to HP
    const oldHp = target.hp;
    target.hp = Math.max(0, target.hp - finalDamage);
    const actualDamage = oldHp - target.hp;

    // Check if died
    if (target.hp <= 0) {
      target.isAlive = false;
    }

    // Create enhanced log entry with armor information
    const isMonsterAttacker = !attacker.id;

    const logEvent = {
      type: 'damage',
      public: false,
      targetId: target.id,
      targetName: target.name,
      attackerId: attacker.id || 'monster',
      attackerName: attacker.name || 'The Monster',
      damage: {
        initial: damageAmount,
        afterDetectionPenalty: detectionPenaltyDamage,
        afterCoordination: coordinatedDamage,
        afterVulnerability: modifiedDamage,
        final: actualDamage,
        reduction: reductionPercent,
        armor: effectiveArmor,
        isVulnerable: target.isVulnerable,
      },
      message:
        effectiveArmor > 0
          ? `${target.name} was attacked for ${actualDamage} damage (${damageAmount} reduced by ${reductionPercent}% armor).`
          : `${target.name} was attacked and lost ${actualDamage} health.`,
      privateMessage:
        effectiveArmor > 0
          ? `${attacker.name || 'The Monster'} attacked you for ${actualDamage} damage (${damageAmount} base, reduced by ${reductionPercent}% from your ${effectiveArmor} armor).`
          : `${attacker.name || 'The Monster'} attacked you for ${actualDamage} damage.`,
      attackerMessage: isMonsterAttacker
        ? ''
        : effectiveArmor > 0
          ? `You attacked ${target.name} for ${actualDamage} damage (${damageAmount} base, reduced by ${reductionPercent}% from their ${effectiveArmor} armor).`
          : `You attacked ${target.name} for ${actualDamage} damage.`,
    };

    log.push(logEvent);

    // Add Stone Armor degradation message if applicable
    if (armorDegradationInfo && armorDegradationInfo.degraded) {
      const armorLogEvent = {
        type: 'stone_armor_degradation',
        public: false,
        targetId: target.id,
        message: messages.getEvent('dwarfStoneArmor', {
          playerName: target.name,
          oldValue: armorDegradationInfo.oldValue,
          newValue: armorDegradationInfo.newArmorValue,
        }),
        privateMessage: `Your Stone Armor degrades from ${armorDegradationInfo.oldValue} to ${armorDegradationInfo.newArmorValue}!`,
        attackerMessage: `${target.name}'s Stone Armor weakens from your attack!`,
      };

      if (
        armorDegradationInfo.destroyed &&
        armorDegradationInfo.newArmorValue <= 0
      ) {
        armorLogEvent.message = messages.getEvent('stoneArmorDestroyed', {
          playerName: target.name,
        });
        armorLogEvent.privateMessage = `Your Stone Armor is destroyed! You now take ${Math.abs(armorDegradationInfo.newArmorValue) * 10}% more damage!`;
      }

      log.push(armorLogEvent);
    }

    // === Handle counter-attacks from Oracle abilities ===
    if (attacker.id && actualDamage > 0) {
      // Only for player attackers who dealt damage
      this.handleCounterAttacks(target, attacker, log);
    }

    // Handle Crestfallen Moonbeam detection
    if (
      target.race === 'Crestfallen' &&
      target.isMoonbeamActive() &&
      attacker.id
    ) {
      const revealMessage = attacker.isWarlock
        ? `${target.name}'s desperate Moonbeam reveals that ${attacker.name} IS corrupted!`
        : `${target.name}'s Moonbeam reveals that ${attacker.name} is pure.`;

      const moonbeamLog = {
        type: 'moonbeam_detection',
        public: false,
        targetId: target.id,
        attackerId: attacker.id,
        message: revealMessage,
        privateMessage: attacker.isWarlock
          ? `Your Moonbeam detected that ${attacker.name} is a Warlock!`
          : `Your Moonbeam confirmed that ${attacker.name} is not a Warlock.`,
        attackerMessage: attacker.isWarlock
          ? `${target.name}'s Moonbeam exposed your corruption!`
          : `${target.name}'s Moonbeam confirmed your purity.`,
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
      return true;
    }

    // Check for warlock conversion opportunities
    this.checkWarlockConversion(target, attacker, log);

    return true;
  }

  /**
   * NEW: Apply healing with coordination bonuses and comeback mechanics
   * @param {Object} healer - Player doing the healing
   * @param {Object} target - Target being healed
   * @param {number} baseAmount - Base healing amount
   * @param {Array} log - Event log
   * @returns {number} Actual amount healed
   */
  applyHealing(healer, target, baseAmount, log = []) {
    if (!target || !target.isAlive || target.hp >= target.maxHp) {
      return 0;
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
        attackerMessage: `Your healing has no effect on ${target.name}.`,
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
      modifiedAmount = config.gameBalance.applyComebackBonus(
        modifiedAmount,
        'healing',
        true,
        true
      );
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
            message: `Coordinated healing! ${coordinationCount + 1} players heal ${target.name} for +${Math.round((coordinatedAmount / modifiedAmount - 1) * 100)}% healing!`,
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
        message: `${target.name} is healed for ${actualHeal} HP.`,
        privateMessage: `You are healed for ${actualHeal} HP by ${healer.name}.`,
        attackerMessage: `You heal ${target.name} for ${actualHeal} HP.`,
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
            privateMessage: `Comeback mechanics grant you ${Math.round(resistanceBonus * 100)}% corruption resistance!`,
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
            privateMessage: 'Detection penalties have worn off.',
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
          `${target.name}'s vengeful spirits strike back at ${attacker.name} for ${actualCounterDamage} damage!`
        );

        // Private message to attacker
        const counterLog = {
          type: 'spirit_counter',
          public: false,
          targetId: attacker.id,
          message: '',
          privateMessage: `${target.name}'s Spirit Guard strikes you for ${actualCounterDamage} damage!`,
          attackerMessage: '',
        };
        log.push(counterLog);
      }

      // Reveal if attacker is a warlock
      if (
        target.classEffects.spiritGuard.revealsWarlocks &&
        attacker.isWarlock
      ) {
        log.push(`The spirits reveal that ${attacker.name} IS a Warlock!`);

        // Private message to Oracle
        const revelationLog = {
          type: 'spirit_revelation',
          public: false,
          targetId: target.id,
          message: '',
          privateMessage: `Your spirits reveal that ${attacker.name} is a Warlock!`,
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
            `${target.name}'s Sanctuary reveals and punishes the Warlock ${attacker.name} for ${actualCounterDamage} damage!`
          );

          // Private messages
          const sanctuaryCounterLog = {
            type: 'sanctuary_counter',
            public: false,
            targetId: attacker.id,
            message: '',
            privateMessage: `${target.name}'s Sanctuary detects your corruption and punishes you for ${actualCounterDamage} damage!`,
            attackerMessage: '',
          };
          log.push(sanctuaryCounterLog);

          const sanctuaryRevelationLog = {
            type: 'sanctuary_revelation',
            public: false,
            targetId: target.id,
            message: '',
            privateMessage: `Your Sanctuary detects that ${attacker.name} is a Warlock and punishes them!`,
            attackerMessage: '',
          };
          log.push(sanctuaryRevelationLog);

          // NEW: Mark attacker as recently detected
          attacker.recentlyDetected = true;
          attacker.detectionTurnsRemaining =
            config.gameBalance.warlock.corruption.detectionPenaltyDuration || 1;
        } else {
          log.push(
            `${target.name}'s Sanctuary detects that ${attacker.name} is NOT a Warlock.`
          );

          // Private message to Oracle
          const sanctuaryNoWarlockLog = {
            type: 'sanctuary_no_warlock',
            public: false,
            targetId: target.id,
            message: '',
            privateMessage: `Your Sanctuary confirms that ${attacker.name} is not a Warlock.`,
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
        message: `${target.name}'s Stone Resolve absorbed all damage from an attack!`,
        privateMessage: `Your Stone Resolve absorbed all damage from ${attacker.name || 'The Monster'}!`,
        attackerMessage: attacker.id
          ? `${target.name}'s Stone Resolve absorbed all your damage!`
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
    logger.debug(`=== DEATH CHECK for ${target.name} ===`);
    logger.debug(`Race: ${target.race}, HP: ${target.hp}`);

    // FIXED: Don't resurrect immediately - just mark for pending death
    // Undying will be checked during processPendingDeaths() AFTER monster attacks
    target.pendingDeath = true;
    target.deathAttacker = attacker.name || 'The Monster';

    const deathLog = {
      type: 'death',
      public: true,
      targetId: target.id,
      attackerId: attacker.id || 'monster',
      message: messages.getEvent('playerDies', {
        playerName: target.name,
      }),
      privateMessage: `You were killed by ${attacker.name || 'The Monster'}.`,
      attackerMessage: `You killed ${target.name}.`,
    };
    log.push(deathLog);
  }

  /**
   * Apply damage to the monster with coordination bonuses
   * @param {number} amount - Amount of damage
   * @param {Object} attacker - Attacking player
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the attack was successful
   */
  applyDamageToMonster(amount, attacker, log = []) {
    // NEW: Apply comeback mechanics damage bonus for good players
    let modifiedAmount = amount;
    if (this.comebackActive && !attacker.isWarlock) {
      modifiedAmount = config.gameBalance.applyComebackBonus(
        amount,
        'damage',
        true,
        true
      );

      if (modifiedAmount > amount) {
        const comebackLog = {
          type: 'comeback_damage',
          public: false,
          attackerId: attacker.id,
          message: '',
          privateMessage: `Comeback mechanics boost your damage by ${Math.round((modifiedAmount / amount - 1) * 100)}%!`,
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
            message: `Coordinated assault! ${coordinationCount + 1} players attack the Monster for +${Math.round((coordinatedAmount / modifiedAmount - 1) * 100)}% damage!`,
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
    return result;
  }

  /**
   * FIXED: Process all pending deaths - this is where Undying actually triggers
   * @param {Array} log - Event log to append messages to
   */
  processPendingDeaths(log = []) {
    for (const player of this.players.values()) {
      if (player.pendingDeath) {
        logger.debug(`=== PROCESSING PENDING DEATH for ${player.name} ===`);
        logger.debug(`Race: ${player.race}`);
        logger.debug(`Has racial effects:`, player.racialEffects);

        // FIXED: Check if player has Undying effect - THIS IS WHERE RESURRECTION HAPPENS
        if (
          player.race === 'Lich' &&
          player.racialEffects &&
          player.racialEffects.resurrect &&
          player.racialEffects.resurrect.active
        ) {
          logger.debug(
            `UNDYING TRIGGERED: Resurrecting ${player.name} AFTER all attacks!`
          );

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
            message: `${player.name} refuses to stay down! Undying ability activated.`,
            privateMessage: 'Your Undying ability saved you from death!',
            attackerMessage: `${player.name} avoided death through Undying.`,
          };
          log.push(resurrectLog);

          // Consume the effect (one-time use)
          player.racialEffects.resurrect.active = false;
          player.racialUsesLeft = 0;

          // Clear pending death
          delete player.pendingDeath;
          delete player.deathAttacker;

          logger.debug(
            `UNDYING SUCCESS: ${player.name} resurrected to ${resurrectedHp} HP AFTER monster attacks`
          );
        } else {
          // Player actually dies permanently
          player.isAlive = false;
          if (player.isWarlock) this.warlockSystem.decrementWarlockCount();

          // The death message was already logged in handlePotentialDeath
          // No need to log again

          delete player.pendingDeath;
          delete player.deathAttacker;

          logger.debug(`DEATH FINAL: ${player.name} has died permanently`);
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
      const actualHeal = this.applyHealing(source, target, baseAmount, log);

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
      logger.debug(
        `Undying not properly set for ${player.name}, setting it up now`
      );
      player.racialEffects = player.racialEffects || {};
      player.racialEffects.resurrect = {
        resurrectedHp: 1, // Default value if params not available
        active: true,
      };
      logger.debug(`Fixed Undying effect:`, player.racialEffects);
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
