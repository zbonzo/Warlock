/**
 * @fileoverview EffectManager - handles all effect-related logic
 * Extracted from CombatSystem as part of Phase 1 refactoring
 * Part of Phase 2 refactoring - now emits events for effect operations
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');
const { EventTypes } = require('../events/EventTypes');

/**
 * EffectManager handles all effect-related operations
 * Includes immunity, counter-attacks, healing, and special effects
 */
class EffectManager {
  /**
   * Create an effect manager
   * @param {Map} players - Map of player objects
   * @param {StatusEffectManager} statusEffectManager - Status effect manager
   * @param {WarlockSystem} warlockSystem - Warlock system
   * @param {Function} getComebackStatus - Function to get comeback status
   * @param {Function} getCoordinationCount - Function to get coordination count
   * @param {GameEventBus} eventBus - Event bus for emitting effect events
   */
  constructor(players, statusEffectManager, warlockSystem, getComebackStatus, getCoordinationCount, eventBus = null) {
    this.players = players;
    this.statusEffectManager = statusEffectManager;
    this.warlockSystem = warlockSystem;
    this.getComebackStatus = getComebackStatus;
    this.getCoordinationCount = getCoordinationCount;
    this.eventBus = eventBus;
  }

  /**
   * Check for immunity effects that prevent damage
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the target is immune to damage
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
          targetName: target.name
        }),
        privateMessage: messages.formatMessage(
          messages.privateMessages.yourStoneResolveAbsorbed,
          {
            attackerName: attacker.name || 'The Monster'
          }
        ),
        attackerMessage: attacker.id
          ? messages.formatMessage(
              messages.player.combat.stoneResolveAbsorbedYourDamage,
              { targetName: target.name }
            )
          : ''
      };
      log.push(immunityLog);

      // Emit immunity event
      if (this.eventBus) {
        this.eventBus.emit(EventTypes.EFFECT.IMMUNITY_TRIGGERED, {
          targetId: target.id,
          attackerId: attacker.id || 'monster',
          effectType: 'stone_resolve',
          timestamp: new Date().toISOString()
        });
      }

      delete target.racialEffects.immuneNextDamage;
      return true;
    }

    return false;
  }

  /**
   * Handle counter-attacks from Oracle abilities
   * @param {Object} target - The player who was attacked
   * @param {Object} attacker - The player who attacked
   * @param {Array} log - Event log to append messages to
   */
  handleCounterAttacks(target, attacker, log) {
    // Handle Spirit Guard counter-attack
    if (
      target.classEffects &&
      target.classEffects.spiritGuard &&
      target.classEffects.spiritGuard.turnsLeft > 0
    ) {
      this.handleSpiritGuardCounter(target, attacker, log);
    }

    // Handle Sanctuary of Truth counter-attack
    if (
      target.classEffects &&
      target.classEffects.sanctuaryOfTruth &&
      target.classEffects.sanctuaryOfTruth.turnsLeft > 0
    ) {
      this.handleSanctuaryCounter(target, attacker, log);
    }
  }

  /**
   * Handle Spirit Guard counter-attack
   * @param {Object} target - Target with Spirit Guard
   * @param {Object} attacker - Attacker
   * @param {Array} log - Event log
   */
  handleSpiritGuardCounter(target, attacker, log) {
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
          damage: actualCounterDamage
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
            damage: actualCounterDamage
          }
        ),
        attackerMessage: ''
      };
      log.push(counterLog);

      // Emit counter-attack event
      if (this.eventBus) {
        this.eventBus.emit(EventTypes.EFFECT.COUNTER_ATTACK, {
          defenderId: target.id,
          attackerId: attacker.id,
          effectType: 'spirit_guard',
          damage: actualCounterDamage,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Reveal if attacker is a warlock
    if (
      target.classEffects.spiritGuard.revealsWarlocks &&
      attacker.isWarlock
    ) {
      log.push(
        messages.formatMessage(messages.events.spiritsRevealWarlock, {
          attackerName: attacker.name
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
        attackerMessage: ''
      };
      log.push(revelationLog);

      // Mark attacker as recently detected
      this.markPlayerAsDetected(attacker);

      // Emit warlock detection event
      if (this.eventBus) {
        this.eventBus.emit(EventTypes.EFFECT.WARLOCK_DETECTED, {
          detectorId: target.id,
          warlockId: attacker.id,
          detectionMethod: 'spirit_guard',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Handle Sanctuary of Truth counter-attack
   * @param {Object} target - Target with Sanctuary
   * @param {Object} attacker - Attacker
   * @param {Array} log - Event log
   */
  handleSanctuaryCounter(target, attacker, log) {
    const counterDamage = target.classEffects.sanctuaryOfTruth.counterDamage || 10;

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
            damage: actualCounterDamage
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
              damage: actualCounterDamage
            }
          ),
          attackerMessage: ''
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
          attackerMessage: ''
        };
        log.push(sanctuaryRevelationLog);

        // Mark attacker as recently detected
        this.markPlayerAsDetected(attacker);

        // Emit sanctuary counter and detection events
        if (this.eventBus) {
          this.eventBus.emit(EventTypes.EFFECT.COUNTER_ATTACK, {
            defenderId: target.id,
            attackerId: attacker.id,
            effectType: 'sanctuary_of_truth',
            damage: actualCounterDamage,
            timestamp: new Date().toISOString()
          });

          this.eventBus.emit(EventTypes.EFFECT.WARLOCK_DETECTED, {
            detectorId: target.id,
            warlockId: attacker.id,
            detectionMethod: 'sanctuary_of_truth',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        log.push(
          messages.formatMessage(
            messages.combat.counterAttack.sanctuaryNoWarlock,
            {
              targetName: target.name,
              attackerName: attacker.name
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
          attackerMessage: ''
        };
        log.push(sanctuaryNoWarlockLog);
      }
    }
  }

  /**
   * Handle Crestfallen Moonbeam detection
   * @param {Object} target - Target with Moonbeam
   * @param {Object} attacker - Attacker
   * @param {Array} log - Event log
   */
  handleMoonbeamDetection(target, attacker, log) {
    if (
      target.race === 'Crestfallen' &&
      target.isMoonbeamActive() &&
      attacker.id
    ) {
      const revealMessage = attacker.isWarlock
        ? messages.formatMessage(messages.events.moonbeamRevealsCorrupted, {
            targetName: target.name,
            attackerName: attacker.name
          })
        : messages.formatMessage(messages.events.moonbeamRevealsPure, {
            targetName: target.name,
            attackerName: attacker.name
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
            )
      };
      log.push(moonbeamLog);

      // Mark attacker as recently detected if they're a Warlock
      if (attacker.isWarlock) {
        this.markPlayerAsDetected(attacker);

        // Emit warlock detection event
        if (this.eventBus) {
          this.eventBus.emit(EventTypes.EFFECT.WARLOCK_DETECTED, {
            detectorId: target.id,
            warlockId: attacker.id,
            detectionMethod: 'moonbeam',
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  }

  /**
   * Mark player as recently detected
   * @param {Object} player - Player to mark as detected
   */
  markPlayerAsDetected(player) {
    player.recentlyDetected = true;
    player.detectionTurnsRemaining =
      config.gameBalance.warlock.corruption.detectionPenaltyDuration || 1;
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
            attackerMessage: ''
          };
          log.push(recoveryLog);
        }
      }
    }
  }

  /**
   * Apply healing with coordination bonuses and comeback mechanics
   * @param {Object} healer - Player doing the healing
   * @param {Object} target - Target being healed
   * @param {number} baseAmount - Base healing amount
   * @param {Array} log - Event log
   * @param {Object} options - Additional options
   * @returns {number} Actual amount healed
   */
  applyHealing(healer, target, baseAmount, log = [], options = {}) {
    const critMultiplier = healer?.tempCritMultiplier || options.critMultiplier || 1;
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
        )
      };
      log.push(blockedLog);
      return 0;
    }

    // Apply healer's healing modifier
    const healingMod = healer.getHealingModifier ? healer.getHealingModifier() : 1.0;
    let modifiedAmount = Math.floor(baseAmount * healingMod);

    // Apply comeback mechanics bonus for good players
    if (this.getComebackStatus && this.getComebackStatus() && !healer.isWarlock) {
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
              bonusPercent: Math.round((modifiedAmount / beforeComeback - 1) * 100)
            }
          ),
          attackerMessage: ''
        };
        log.push(comebackHealingLog);
      }
    }

    // Track coordination for healing
    if (healer.id !== target.id && this.getCoordinationCount) {
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
                bonusPercent: Math.round((coordinatedAmount / modifiedAmount - 1) * 100)
              }
            ),
            privateMessage: '',
            attackerMessage: ''
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
          amount: actualHeal
        }),
        privateMessage: messages.formatMessage(
          messages.privateMessages.healedByPlayer,
          {
            actualHeal,
            healerName: healer.name
          }
        ),
        attackerMessage: messages.formatMessage(
          messages.player.combat.healedTarget,
          {
            targetName: target.name,
            actualHeal
          }
        )
      };
      log.push(healLog);

      // Emit healing event
      if (this.eventBus) {
        this.eventBus.emit(EventTypes.EFFECT.HEAL_APPLIED, {
          healerId: healer.id,
          targetId: target.id,
          amount: actualHeal,
          baseAmount: baseAmount,
          modifiedAmount: modifiedAmount,
          timestamp: new Date().toISOString()
        });
      }
    }

    return actualHeal;
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
    const excludeSelf = options.excludeSelf ?? false;
    const excludeWarlocks =
      options.excludeWarlocks ??
      config.gameBalance.player.healing.rejectWarlockHealing ??
      true;

    const affectedTargets = [];

    // Filter targets
    const validTargets = targets.filter(target => {
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
   * Check for warlock conversion with detection penalties
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   */
  checkWarlockConversion(target, attacker, log) {
    // Only player attackers can cause conversions
    if (!attacker.id || attacker === target) return;

    // Check if attacker is a warlock
    if (attacker.isWarlock) {
      // Check if attacker was recently detected
      const recentlyDetected = attacker.recentlyDetected || false;

      // Apply comeback mechanics corruption resistance for good players
      let resistanceBonus = 0;
      if (this.getComebackStatus && this.getComebackStatus() && !target.isWarlock) {
        resistanceBonus = config.gameBalance.comebackMechanics.corruptionResistance / 100;

        if (resistanceBonus > 0) {
          const resistanceLog = {
            type: 'comeback_resistance',
            public: false,
            targetId: target.id,
            message: '',
            privateMessage: messages.formatMessage(
              messages.privateMessages.comebackCorruptionResistance,
              {
                resistancePercent: Math.round(resistanceBonus * 100)
              }
            ),
            attackerMessage: ''
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
   * Process Thirsty Blade life steal for Barbarian attackers
   * @param {Object} attacker - Barbarian attacker
   * @param {number} damage - Damage dealt
   * @param {Array} log - Event log
   */
  processThirstyBladeLifeSteal(attacker, damage, log) {
    if (attacker.id && attacker.class === 'Barbarian' && damage > 0) {
      const healAmount = attacker.processThirstyBladeLifeSteal(damage);
      if (healAmount > 0) {
        const thirstyBladeLog = {
          type: 'thirsty_blade_heal',
          public: false,
          attackerId: attacker.id,
          message: `${attacker.name} is healed for ${healAmount} HP by their Thirsty Blade!`,
          privateMessage: '',
          attackerMessage: `Your Thirsty Blade heals you for ${healAmount} HP!`
        };
        log.push(thirstyBladeLog);
      }
    }
  }

  /**
   * Handle area-of-effect warlock conversion
   * @param {Object} source - Source of the AoE
   * @param {Array} targets - Array of target players
   * @param {Array} log - Event log
   */
  handleAreaWarlockConversion(source, targets, log) {
    const warlockConversionChance = config.gameBalance.warlock.conversion.aoeModifier;

    for (const target of targets) {
      if (source.isWarlock && target.isAlive && !target.isWarlock) {
        // Apply comeback mechanics corruption resistance
        let resistanceModifier = 1.0;
        if (this.getComebackStatus && this.getComebackStatus()) {
          resistanceModifier = 1 - config.gameBalance.comebackMechanics.corruptionResistance / 100;
        }

        const finalConversionChance = warlockConversionChance * resistanceModifier;
        this.warlockSystem.attemptConversion(
          source,
          target,
          log,
          finalConversionChance
        );
      }
    }
  }
}

module.exports = EffectManager;