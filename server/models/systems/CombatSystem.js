/**
 * @fileoverview Fixed Combat System with proper armor damage reduction
 * Ensures armor is correctly applied in all damage calculations
 */
const config = require('@config');
const logger = require('@utils/logger');

/**
 * CombatSystem handles all combat-related operations with FIXED armor calculation
 * Ensures consistent damage calculation and death processing
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
  }

  /**
   * FIXED: Apply damage to a player with proper armor calculation
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

    // Initialize armor degradation info
    let armorDegradationInfo = null;

    // Process Stone Armor degradation for Dwarves (before damage calculation)
    if (target.race === 'Dwarf' && target.stoneArmorIntact) {
      armorDegradationInfo = target.processStoneArmorDegradation(damageAmount);
    }

    // STEP 1: Apply vulnerability BEFORE armor calculation
    let modifiedDamage = damageAmount;
    if (target.isVulnerable && target.vulnerabilityIncrease > 0) {
      const vulnerabilityMultiplier = 1 + target.vulnerabilityIncrease / 100;
      modifiedDamage = Math.floor(modifiedDamage * vulnerabilityMultiplier);

      // Log vulnerability effect
      log.push(
        `${target.name} is VULNERABLE and takes ${target.vulnerabilityIncrease}% more damage! (${damageAmount} → ${modifiedDamage})`
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
    const totalArmor = target.getEffectiveArmor();
    const beforeArmor = modifiedDamage;
    const finalDamage = this.calculateArmorReduction(
      modifiedDamage,
      totalArmor
    );

    // Calculate reduction percentage for logs
    const reductionPercent =
      totalArmor > 0
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
      public: true,
      targetId: target.id,
      targetName: target.name,
      attackerId: attacker.id || 'monster',
      attackerName: attacker.name || 'The Monster',
      damage: {
        initial: damageAmount,
        afterVulnerability: modifiedDamage,
        final: actualDamage,
        reduction: reductionPercent,
        armor: totalArmor,
        isVulnerable: target.isVulnerable,
      },
      message:
        totalArmor > 0
          ? `${target.name} was attacked for ${actualDamage} damage (${damageAmount} reduced by ${reductionPercent}% armor).`
          : `${target.name} was attacked and lost ${actualDamage} health.`,
      privateMessage:
        totalArmor > 0
          ? `${attacker.name || 'The Monster'} attacked you for ${actualDamage} damage (${damageAmount} base, reduced by ${reductionPercent}% from your ${totalArmor} armor).`
          : `${attacker.name || 'The Monster'} attacked you for ${actualDamage} damage.`,
      attackerMessage: isMonsterAttacker
        ? ''
        : totalArmor > 0
          ? `You attacked ${target.name} for ${actualDamage} damage (${damageAmount} base, reduced by ${reductionPercent}% from their ${totalArmor} armor).`
          : `You attacked ${target.name} for ${actualDamage} damage.`,
    };

    log.push(logEvent);

    // Add Stone Armor degradation message if applicable
    if (armorDegradationInfo && armorDegradationInfo.degraded) {
      const armorLogEvent = {
        type: 'stone_armor_degradation',
        public: true,
        targetId: target.id,
        message: config.messages.getEvent('dwarfStoneArmor', {
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
        armorLogEvent.message = config.messages.getEvent(
          'stoneArmorDestroyed',
          {
            playerName: target.name,
          }
        );
        armorLogEvent.privateMessage = `Your Stone Armor is destroyed! You now take ${Math.abs(armorDegradationInfo.newArmorValue) * 10}% more damage!`;
      }

      log.push(armorLogEvent);
    }

    // === Handle counter-attacks from Oracle abilities ===
    if (attacker.id && actualDamage > 0) {
      // Only for player attackers who dealt damage
      this.handleCounterAttacks(target, attacker, log);
    }

    // Handle Keen Senses racial ability for Elves
    if (isKeenSensesAttack) {
      this.handleKeenSensesAttack(target, attacker, log);
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
    // Check for Stone Resolve immunity (Dwarf racial)
    if (target.racialEffects && target.racialEffects.immuneNextDamage) {
      // Create an anonymous immunity message
      const immunityLog = {
        type: 'immunity',
        public: true,
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
   * Handle Keen Senses racial ability attack
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player)
   * @param {Array} log - Event log to append messages to
   * @private
   */
  handleKeenSensesAttack(target, attacker, log) {
    // Use config for warlock revelation messages
    const revealMessage = target.isWarlock
      ? config.messages.getEvent('warlockRevealed', { playerName: target.name })
      : config.messages.getEvent('notWarlock', { playerName: target.name });

    log.push(revealMessage);
  }

  /**
   * Handle potential death when HP reaches 0
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @private
   */
  handlePotentialDeath(target, attacker, log) {
    // Add extensive logging for debugging
    logger.debug(`Checking potential death for ${target.name}`);
    logger.debug(
      `Race: ${target.race}, Has racial ability:`,
      Boolean(target.racialAbility)
    );
    if (target.racialAbility) {
      logger.debug(`Racial ability type: ${target.racialAbility.type}`);
    }
    logger.debug(`Racial effects:`, JSON.stringify(target.racialEffects));

    // Check for Undying racial ability (Skeleton)
    if (
      target.race === 'Skeleton' &&
      target.racialEffects &&
      target.racialEffects.resurrect
    ) {
      // Resurrect the player
      target.hp = target.racialEffects.resurrect.resurrectedHp || 1;

      const resurrectLog = {
        type: 'resurrect',
        public: true,
        targetId: target.id,
        message: config.messages.getEvent('playerResurrected', {
          playerName: target.name,
          abilityName: 'Undying',
        }),
        privateMessage: 'You were resurrected by Undying.',
        attackerMessage: `${target.name} avoided death through Undying.`,
      };
      log.push(resurrectLog);

      delete target.racialEffects.resurrect;
    } else {
      // Mark for pending death
      target.pendingDeath = true;
      target.deathAttacker = attacker.name || 'The Monster';

      const deathLog = {
        type: 'death',
        public: true,
        targetId: target.id,
        attackerId: attacker.id || 'monster',
        message: config.messages.getEvent('playerDies', {
          playerName: target.name,
        }),
        privateMessage: `You were killed by ${attacker.name || 'The Monster'}.`,
        attackerMessage: `You killed ${target.name}.`,
      };
      log.push(deathLog);
    }
  }

  /**
   * Check if a warlock conversion should occur
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
      this.warlockSystem.attemptConversion(attacker, target, log);
    }
  }

  /**
   * Apply damage to the monster
   * @param {number} amount - Amount of damage
   * @param {Object} attacker - Attacking player
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the attack was successful
   */
  applyDamageToMonster(amount, attacker, log = []) {
    const result = this.monsterController.takeDamage(amount, attacker, log);

    // Monster attacks don't need enhanced logs, just return result
    return result;
  }

  /**
   * Process all pending deaths
   * @param {Array} log - Event log to append messages to
   */
  processPendingDeaths(log = []) {
    for (const player of this.players.values()) {
      if (player.pendingDeath) {
        logger.debug(`Processing pending death for ${player.name}`);
        logger.debug(
          `Race: ${player.race}, Has racial ability:`,
          Boolean(player.racialAbility)
        );
        if (player.racialAbility) {
          logger.debug(`Racial ability type: ${player.racialAbility.type}`);
        }
        logger.debug(`Racial effects:`, JSON.stringify(player.racialEffects));

        // Check if player has Undying effect
        if (
          player.race === 'Skeleton' &&
          player.racialEffects &&
          player.racialEffects.resurrect
        ) {
          // Resurrect the player
          player.hp = player.racialEffects.resurrect.resurrectedHp || 1;

          log.push(
            config.messages.getEvent('playerResurrected', {
              playerName: player.name,
              abilityName: 'Undying',
            })
          );

          delete player.racialEffects.resurrect;
          delete player.pendingDeath;
          delete player.deathAttacker;
        } else {
          // Player dies
          player.isAlive = false;
          if (player.isWarlock) this.warlockSystem.decrementWarlockCount();

          log.push(
            config.messages.getEvent('playerDies', {
              playerName: player.name,
            })
          );

          delete player.pendingDeath;
          delete player.deathAttacker;
        }
      }
    }
  }

  /**
   * Handle area-of-effect (AoE) damage to multiple targets
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
    const modifiedDamage = source.modifyDamage
      ? source.modifyDamage(baseDamage)
      : baseDamage;

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
        this.warlockSystem.attemptConversion(
          source,
          target,
          log,
          warlockConversionChance
        );
      }

      affectedTargets.push(target);
    }

    return affectedTargets;
  }

  /**
   * Handle multi-target healing
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

    // Modify healing based on source's modifier
    const healingMod = source.getHealingModifier
      ? source.getHealingModifier()
      : 1.0;
    const modifiedAmount = Math.floor(baseAmount * healingMod);

    // Filter targets
    const validTargets = targets.filter((target) => {
      if (!target || !target.isAlive) return false;
      if (excludeSelf && target.id === source.id) return false;
      if (excludeWarlocks && target.isWarlock) return false;
      return true;
    });

    // Apply healing to each target
    for (const target of validTargets) {
      const actualHeal = Math.min(modifiedAmount, target.maxHp - target.hp);
      target.hp += actualHeal;

      if (actualHeal > 0) {
        log.push(
          config.messages.getEvent('playerHealed', {
            playerName: target.name,
            amount: actualHeal,
          })
        );
      }

      affectedTargets.push(target);
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
      player.race === 'Skeleton' &&
      (!player.racialEffects || !player.racialEffects.resurrect)
    ) {
      logger.debug(
        `Undying not properly set for ${player.name}, setting it up now`
      );
      player.racialEffects = player.racialEffects || {};
      player.racialEffects.resurrect = {
        resurrectedHp: 1, // Default value if params not available
      };
      logger.debug(`Fixed Undying effect:`, player.racialEffects);
      return true;
    }
    return false;
  }
}

module.exports = CombatSystem;
