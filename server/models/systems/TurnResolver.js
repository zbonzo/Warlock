/**
 * @fileoverview TurnResolver - handles turn-based combat resolution
 * Extracted from CombatSystem as part of Phase 1 refactoring
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');

/**
 * TurnResolver handles turn-based combat resolution
 * Includes coordination tracking, death processing, and turn management
 */
class TurnResolver {
  /**
   * Create a turn resolver
   * @param {Map} players - Map of player objects
   * @param {MonsterController} monsterController - Monster controller
   * @param {WarlockSystem} warlockSystem - Warlock system
   * @param {GameStateUtils} gameStateUtils - Game state utilities
   */
  constructor(players, monsterController, warlockSystem, gameStateUtils) {
    this.players = players;
    this.monsterController = monsterController;
    this.warlockSystem = warlockSystem;
    this.gameStateUtils = gameStateUtils;

    // Track coordination for this round
    this.coordinationTracker = new Map(); // targetId -> [playerId1, playerId2, ...]
    this.comebackActive = false;
  }

  /**
   * Reset coordination tracking for new round
   */
  resetCoordinationTracking() {
    this.coordinationTracker.clear();
    this.updateComebackStatus();
  }

  /**
   * Update comeback mechanics status
   */
  updateComebackStatus() {
    const alivePlayers = this.gameStateUtils.getAlivePlayers();
    const goodPlayers = alivePlayers.filter(p => !p.isWarlock);

    this.comebackActive = config.gameBalance.shouldActiveComebackMechanics(
      goodPlayers.length,
      alivePlayers.length
    );
  }

  /**
   * Track coordination for damage/healing abilities
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
   * Get coordination count for a target
   * @param {string} targetId - Target ID
   * @param {string} excludeActorId - Actor to exclude from count
   * @returns {number} Number of other players coordinating on this target
   */
  getCoordinationCount(targetId, excludeActorId) {
    if (!this.coordinationTracker.has(targetId)) return 0;

    const coordinators = this.coordinationTracker.get(targetId);
    return coordinators.filter(id => id !== excludeActorId).length;
  }

  /**
   * Get comeback status
   * @returns {boolean} Whether comeback mechanics are active
   */
  getComebackStatus() {
    return this.comebackActive;
  }

  /**
   * Handle potential death when HP reaches 0 - NO IMMEDIATE RESURRECTION
   * @param {Object} target - Target player
   * @param {Object} attacker - Attacker (player or monster)
   * @param {Array} log - Event log to append messages to
   */
  handlePotentialDeath(target, attacker, log) {
    logger.debug('PlayerDeathCheck', {
      playerName: target.name,
      race: target.race,
      hp: target.hp
    });

    // Don't resurrect immediately - just mark for pending death
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
        playerName: target.name
      }),
      privateMessage: messages.formatMessage(
        messages.privateMessages.killedBy,
        {
          attackerName: attacker.name || 'The Monster'
        }
      ),
      attackerMessage: messages.formatMessage(
        messages.player.combat.youKilledTarget,
        { targetName: target.name }
      )
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
          attackerMessage: `Your Thirsty Blade thirsts for more! Duration refreshed.`
        };
        log.push(refreshLog);
      }
    }
  }

  /**
   * Process all pending deaths - this is where Undying actually triggers
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
          hasRacialEffects: !!player.racialEffects
        });

        // Check if player has Undying effect - THIS IS WHERE RESURRECTION HAPPENS
        if (
          player.race === 'Lich' &&
          player.racialEffects &&
          player.racialEffects.resurrect &&
          player.racialEffects.resurrect.active
        ) {
          this.processUndyingResurrection(player, log);
        } else {
          // Player actually dies permanently
          this.processPlayerDeath(player, playersWhoDied);
        }
      }
    }

    // Refresh Thirsty Blade for all living Barbarians when ANY player dies
    if (playersWhoDied.length > 0) {
      this.processThirstyBladeRefresh(playersWhoDied, log);
    }

    // Update comeback status after deaths are processed
    this.updateComebackStatus();
  }

  /**
   * Process Undying resurrection for Lich players
   * @param {Object} player - Player to resurrect
   * @param {Array} log - Event log
   */
  processUndyingResurrection(player, log) {
    logger.debug('UndyingTriggered', {
      playerName: player.name
    });

    // Resurrect the player
    const resurrectedHp = player.racialEffects.resurrect.resurrectedHp || 1;
    player.hp = resurrectedHp;
    player.isAlive = true;

    // Create a resurrection message that overwrites the death message
    const resurrectLog = {
      type: 'resurrect',
      public: true,
      targetId: player.id,
      message: messages.formatMessage(messages.events.undyingActivated, {
        playerName: player.name
      }),
      privateMessage: messages.privateMessages.undyingSavedYou,
      attackerMessage: messages.formatMessage(
        messages.player.combat.targetAvoidedDeathUndying,
        { playerName: player.name }
      )
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
      resurrectedHp
    });
  }

  /**
   * Process permanent player death
   * @param {Object} player - Player who died
   * @param {Array} playersWhoDied - Array to track dead players
   */
  processPlayerDeath(player, playersWhoDied) {
    player.isAlive = false;
    if (player.isWarlock) this.warlockSystem.decrementWarlockCount();

    // Track who died for Thirsty Blade refresh
    playersWhoDied.push({
      name: player.name,
      id: player.id,
      attacker: player.deathAttacker,
      attackerId: player.deathAttackerId
    });

    delete player.pendingDeath;
    delete player.deathAttacker;
    delete player.deathAttackerId;

    logger.debug('PlayerDeathFinal', {
      playerName: player.name
    });
  }

  /**
   * Process Thirsty Blade refresh for all living Barbarians
   * @param {Array} playersWhoDied - Array of players who died
   * @param {Array} log - Event log
   */
  processThirstyBladeRefresh(playersWhoDied, log) {
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
              attackerMessage: `The death of ${deadPlayer.name} invigorates your Thirsty Blade! Duration refreshed.`
            };
            log.push(refreshLog);
          }
          break; // Only need to refresh once per barbarian
        }
      }
    }
  }

  /**
   * Process Sweeping Strike with RAW damage (no ability re-execution)
   * @param {Object} attacker - Barbarian attacker
   * @param {Object} primaryTarget - Original target
   * @param {number} damage - Damage dealt to primary target
   * @param {Array} log - Event log
   * @param {Function} applyDamageCallback - Callback to apply damage
   */
  processSweepingStrike(attacker, primaryTarget, damage, log, applyDamageCallback) {
    const sweepingParams = attacker.getSweepingStrikeParams();
    if (!sweepingParams) {
      console.log(`No sweeping params for ${attacker.name}`);
      return;
    }

    console.log(
      `Processing sweeping strike for ${attacker.name}, primary target: ${primaryTarget.name || 'Monster'}`
    );

    // Build list of potential secondary targets (including self for comedy!)
    const potentialTargets = this.buildSweepingTargets(primaryTarget);

    console.log(`Found ${potentialTargets.length} potential secondary targets`);

    if (potentialTargets.length === 0) {
      console.log('No valid secondary targets for sweeping strike');
      return;
    }

    // Select random secondary targets
    const selectedTargets = this.selectSweepingTargets(potentialTargets, sweepingParams.bonusTargets);

    console.log(`Selected ${selectedTargets.length} targets for sweeping strike`);

    // Apply RAW damage to secondary targets (NO ability re-execution)
    this.applySweepingDamage(attacker, selectedTargets, damage, log, applyDamageCallback);

    // Apply stun effects
    this.applySweepingStuns(attacker, selectedTargets, sweepingParams, log);

    // Log the sweeping strike summary
    const sweepingLog = {
      type: 'sweeping_strike',
      public: true,
      attackerId: attacker.id,
      message: `${attacker.name}'s Sweeping Strike hits ${selectedTargets.length} additional target(s)!`,
      privateMessage: '',
      attackerMessage: ''
    };
    log.push(sweepingLog);
  }

  /**
   * Build list of potential sweeping strike targets
   * @param {Object} primaryTarget - Primary target to exclude
   * @returns {Array} Array of potential targets
   */
  buildSweepingTargets(primaryTarget) {
    const potentialTargets = [];

    // Get monster state properly
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

    return potentialTargets;
  }

  /**
   * Select random targets for sweeping strike
   * @param {Array} potentialTargets - Array of potential targets
   * @param {number} bonusTargets - Number of bonus targets to select
   * @returns {Array} Selected targets
   */
  selectSweepingTargets(potentialTargets, bonusTargets) {
    const targetsToHit = Math.min(bonusTargets, potentialTargets.length);
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

    return selectedTargets;
  }

  /**
   * Apply sweeping strike damage to selected targets
   * @param {Object} attacker - Attacker
   * @param {Array} selectedTargets - Selected targets
   * @param {number} damage - Damage amount
   * @param {Array} log - Event log
   * @param {Function} applyDamageCallback - Callback to apply damage
   */
  applySweepingDamage(attacker, selectedTargets, damage, log, applyDamageCallback) {
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
            attackerMessage: ''
          };
          log.push(monsterDamageLog);
        }
      } else {
        // Apply raw damage to player target (NO ability system involved)
        const target = targetInfo.target;

        // Use callback to apply damage with skipSweepingStrike to prevent infinite loops
        if (applyDamageCallback) {
          applyDamageCallback(
            target,
            damage,
            attacker,
            log,
            false,
            { skipSweepingStrike: true }
          );
        }

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
            : ''
        };
        log.push(playerDamageLog);
      }
    }
  }

  /**
   * Apply sweeping strike stun effects
   * @param {Object} attacker - Attacker
   * @param {Array} selectedTargets - Selected targets
   * @param {Object} sweepingParams - Sweeping strike parameters
   * @param {Array} log - Event log
   */
  applySweepingStuns(attacker, selectedTargets, sweepingParams, log) {
    for (const targetInfo of selectedTargets) {
      const isTargetingSelf =
        targetInfo.type === 'player' && targetInfo.target.id === attacker.id;

      // Apply stun chance to player targets (including self!)
      if (
        targetInfo.type === 'player' &&
        Math.random() < sweepingParams.stunChance
      ) {
        // Apply stun directly to player
        if (!targetInfo.target.statusEffects) {
          targetInfo.target.statusEffects = {};
        }
        targetInfo.target.statusEffects.stunned = {
          turns: sweepingParams.stunDuration
        };

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
            : ''
        };
        log.push(stunLog);
      }
    }
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
        playerName: player.name
      });
      player.racialEffects = player.racialEffects || {};
      player.racialEffects.resurrect = {
        resurrectedHp: 1, // Default value if params not available
        active: true
      };
      logger.debug('UndyingSetupComplete', {
        playerName: player.name,
        racialEffects: player.racialEffects
      });
      return true;
    }
    return false;
  }

  /**
   * Get coordination statistics for debugging/analytics
   * @returns {Object} Coordination statistics
   */
  getCoordinationStats() {
    const stats = {};
    for (const [targetId, coordinators] of this.coordinationTracker.entries()) {
      stats[targetId] = {
        coordinators: coordinators.length,
        playerIds: coordinators
      };
    }
    return {
      coordinationTracker: stats,
      comebackActive: this.comebackActive,
      totalCoordinatedTargets: this.coordinationTracker.size
    };
  }
}

module.exports = TurnResolver;