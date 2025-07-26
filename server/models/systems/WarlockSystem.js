/**
 * @fileoverview Enhanced Warlock system with detection penalties and corruption restrictions
 * Centralizes warlock-specific logic with improved balance controls and detection consequences
 */
const config = require('@config');
const messages = require('@messages');
const logger = require('@utils/logger');

/**
 * Enhanced WarlockSystem with detection penalties and corruption restrictions
 * Handles warlock assignments, conversions, tracking, corruption limits, and detection consequences
 */
class WarlockSystem {
  /**
   * Create a new warlock system
   * @param {Map} players - Map of player objects
   * @param {GameStateUtils} gameStateUtils - Game state utility functions
   */
  constructor(players, gameStateUtils) {
    this.players = players;
    this.gameStateUtils = gameStateUtils;
    this.numWarlocks = 0;

    // Enhanced corruption tracking
    this.roundCorruptions = 0; // Track corruptions this round
    this.playerCorruptions = new Map(); // Track per-player corruptions this round
    this.corruptionCooldowns = new Map(); // Track corruption cooldowns by player
    this.totalCorruptionsThisGame = 0; // Track total corruptions for analytics

    // NEW: Detection tracking
    this.detectedWarlocks = new Set(); // Track warlocks detected this turn
    this.detectionPenalties = new Map(); // Track detection penalty durations
  }

  /**
   * Reset corruption tracking at start of each round
   */
  resetRoundTracking() {
    this.roundCorruptions = 0;
    this.playerCorruptions.clear();
    // Clear detection penalties that have expired
    this.processDetectionPenalties();
    logger.debug('WarlockRoundTrackingReset', {});
  }

  /**
   * NEW: Process detection penalties and corruption cooldowns
   */
  processDetectionPenalties() {
    const expiredDetections = [];

    for (const [
      playerId,
      turnsRemaining,
    ] of this.detectionPenalties.entries()) {
      if (turnsRemaining > 1) {
        this.detectionPenalties.set(playerId, turnsRemaining - 1);
      } else {
        this.detectionPenalties.delete(playerId);
        expiredDetections.push(playerId);

        // Clear detection flags on player
        const player = this.players.get(playerId);
        if (player) {
          player.recentlyDetected = false;
          delete player.detectionTurnsRemaining;
        }
      }
    }

    if (expiredDetections.length > 0) {
      logger.debug('WarlockDetectionPenaltiesExpired', {
        count: expiredDetections.length,
        playerIds: expiredDetections,
      });
    }
  }

  /**
   * Process corruption cooldowns at end of round
   */
  processCorruptionCooldowns() {
    const expiredCooldowns = [];

    for (const [playerId, cooldown] of this.corruptionCooldowns.entries()) {
      if (cooldown > 0) {
        this.corruptionCooldowns.set(playerId, cooldown - 1);
      } else {
        this.corruptionCooldowns.delete(playerId);
        expiredCooldowns.push(playerId);
      }
    }

    if (expiredCooldowns.length > 0) {
      logger.debug('WarlockCorruptionCooldownsExpired', {
        count: expiredCooldowns.length,
        playerIds: expiredCooldowns,
      });
    }
  }

  /**
   * NEW: Mark a warlock as detected and apply penalties
   * @param {string} warlockId - ID of the detected warlock
   * @param {Array} log - Event log for messages
   */
  markWarlockDetected(warlockId, log = []) {
    const warlock = this.players.get(warlockId);
    if (!warlock || !warlock.isWarlock) return;

    // Mark as recently detected
    warlock.recentlyDetected = true;
    warlock.detectionTurnsRemaining =
      config.gameBalance.warlock.corruption.detectionPenaltyDuration || 1;

    // Track in detection penalties map
    this.detectionPenalties.set(warlockId, warlock.detectionTurnsRemaining);
    this.detectedWarlocks.add(warlockId);

    logger.debug('WarlockDetected', {
      warlockName: warlock.name,
      penaltyTurns: warlock.detectionTurnsRemaining,
    });

    // Add private notification to the warlock about penalties
    const penaltyLog = {
      type: 'detection_penalty_applied',
      public: false,
      targetId: warlockId,
      message: '',
      privateMessage: messages.formatMessage(
        messages.warlock.private.privateDetectionPenalty,
        {
          penaltyPercent:
            config.gameBalance.warlock.corruption.detectionDamagePenalty,
        }
      ),
      attackerMessage: '',
    };
    log.push(penaltyLog);
  }

  /**
   * Enhanced corruption limit checking with detection penalties
   * @param {string} actorId - ID of the player attempting corruption
   * @returns {Object} Corruption check result
   */
  checkCorruptionLimits(actorId) {
    const conversionConfig = config.gameBalance.warlock.conversion;

    const result = {
      allowed: true,
      reason: null,
      roundLimitReached: false,
      playerLimitReached: false,
      playerOnCooldown: false,
      recentlyDetected: false,
    };

    // NEW: Check if player was recently detected
    const player = this.players.get(actorId);
    if (
      player &&
      player.recentlyDetected &&
      !conversionConfig.canCorruptWhenDetected
    ) {
      result.allowed = false;
      result.reason = messages.errors.warlockDetectionBlocked;
      result.recentlyDetected = true;
      return result;
    }

    // Check round limit
    const maxPerRound = conversionConfig.maxCorruptionsPerRound || 999;
    if (this.roundCorruptions >= maxPerRound) {
      result.allowed = false;
      result.reason = messages.formatMessage(
        messages.errors.warlockRoundLimitReached,
        { maxPerRound }
      );
      result.roundLimitReached = true;
      return result;
    }

    // Check player limit for this round
    const maxPerPlayer = conversionConfig.maxCorruptionsPerPlayer || 999;
    const playerCorruptions = this.playerCorruptions.get(actorId) || 0;
    if (playerCorruptions >= maxPerPlayer) {
      result.allowed = false;
      result.reason = messages.formatMessage(
        messages.errors.warlockPlayerLimitReached,
        { maxPerPlayer }
      );
      result.playerLimitReached = true;
      return result;
    }

    // Check cooldown
    if (this.corruptionCooldowns.has(actorId)) {
      const remainingCooldown = this.corruptionCooldowns.get(actorId);
      result.allowed = false;
      result.reason = messages.formatMessage(
        messages.errors.warlockCorruptionCooldown,
        { remainingCooldown }
      );
      result.playerOnCooldown = true;
      return result;
    }

    return result;
  }

  /**
   * Record a successful corruption
   * @param {string} actorId - ID of the player who caused the corruption
   */
  recordCorruption(actorId) {
    // Increment round counters
    this.roundCorruptions++;
    const playerCorruptions = this.playerCorruptions.get(actorId) || 0;
    this.playerCorruptions.set(actorId, playerCorruptions + 1);

    // Increment total game counter
    this.totalCorruptionsThisGame++;

    // Apply cooldown
    const cooldown =
      config.gameBalance.warlock.conversion.corruptionCooldown || 2;
    this.corruptionCooldowns.set(actorId, cooldown);

    logger.debug('WarlockCorruptionRecorded', {
      actorId,
      roundCount: this.roundCorruptions,
      playerCount: playerCorruptions + 1,
      cooldownTurns: cooldown,
    });
  }

  /**
   * Assign initial warlocks based on player count scaling
   * @param {Array} preferredPlayerIds - Optional array of preferred player IDs
   * @returns {Array} Array of assigned warlock players
   */
  assignInitialWarlocks(preferredPlayerIds = []) {
    const playerIds = Array.from(this.players.keys());
    const alivePlayerCount = this.gameStateUtils.getAlivePlayers().length;

    if (playerIds.length === 0) return [];

    // Calculate how many warlocks we need based on player count
    const requiredWarlocks =
      config.gameBalance.calculateWarlockCount(alivePlayerCount);

    logger.info('WarlockAssignmentStart', {
      requiredWarlocks,
      alivePlayerCount,
    });

    const assignedWarlocks = [];
    const availablePlayerIds = [...playerIds];

    // First, try to assign preferred players as warlocks
    for (const preferredId of preferredPlayerIds) {
      if (assignedWarlocks.length >= requiredWarlocks) break;

      if (availablePlayerIds.includes(preferredId)) {
        const warlock = this.players.get(preferredId);
        if (warlock && warlock.isAlive) {
          warlock.isWarlock = true;
          assignedWarlocks.push(warlock);

          // Remove from available list
          const index = availablePlayerIds.indexOf(preferredId);
          availablePlayerIds.splice(index, 1);

          logger.info('WarlockAssignedPreferred', {
            warlockName: warlock.name,
            warlockId: preferredId,
          });
        }
      }
    }

    // Then, randomly assign remaining warlocks
    while (
      assignedWarlocks.length < requiredWarlocks &&
      availablePlayerIds.length > 0
    ) {
      const randomIndex = Math.floor(Math.random() * availablePlayerIds.length);
      const chosenId = availablePlayerIds[randomIndex];
      const warlock = this.players.get(chosenId);

      if (warlock && warlock.isAlive) {
        warlock.isWarlock = true;
        assignedWarlocks.push(warlock);

        logger.info('WarlockAssignedRandom', {
          warlockName: warlock.name,
          warlockId: chosenId,
        });
      }

      // Remove from available list
      availablePlayerIds.splice(randomIndex, 1);
    }

    // Update warlock count
    this.numWarlocks = assignedWarlocks.length;

    logger.info('WarlockAssignmentComplete', {
      assignedCount: this.numWarlocks,
    });
    return assignedWarlocks;
  }

  /**
   * Get warlock scaling information for current player count (for debugging/stats)
   * @returns {Object} Scaling information
   */
  getWarlockScalingInfo() {
    const alivePlayerCount = this.gameStateUtils.getAlivePlayers().length;
    const currentWarlockCount = this.countAliveWarlocks();
    const initialRequiredCount =
      config.gameBalance.calculateWarlockCount(alivePlayerCount);

    return {
      currentPlayerCount: alivePlayerCount,
      currentWarlockCount: currentWarlockCount,
      initialRequiredCount: initialRequiredCount,
      scalingEnabled: config.gameBalance.warlock.scaling.enabled,
      playersPerWarlock: config.gameBalance.warlock.scaling.playersPerWarlock,
    };
  }

  /**
   * Get the current number of warlocks
   * @returns {number} Count of warlocks
   */
  getWarlockCount() {
    return this.numWarlocks;
  }

  /**
   * Increment the warlock count
   */
  incrementWarlockCount() {
    this.numWarlocks++;
    logger.debug('WarlockCountIncreased', {
      count: this.numWarlocks,
    });
  }

  /**
   * Decrement the warlock count
   * @returns {number} New warlock count
   */
  decrementWarlockCount() {
    if (this.numWarlocks > 0) {
      this.numWarlocks--;
      logger.debug('WarlockCountDecreased', {
        count: this.numWarlocks,
      });
    }
    return this.numWarlocks;
  }

  /**
   * Check if a player is a warlock
   * @param {string} playerId - Player ID to check
   * @returns {boolean} Whether the player is a warlock
   */
  isPlayerWarlock(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      return false; // Explicitly return false
    }
    return player && player.isWarlock;
  }

  /**
   * Count alive warlocks
   * @returns {number} Number of alive warlocks
   */
  countAliveWarlocks() {
    return this.gameStateUtils
      .getAlivePlayers()
      .filter((player) => player.isWarlock).length;
  }

  /**
   * Get all warlock players
   * @param {boolean} aliveOnly - Whether to only include alive warlocks
   * @returns {Array} Array of warlock player objects
   */
  getWarlocks(aliveOnly = false) {
    const playerArray = Array.from(this.players.values());
    return playerArray.filter(
      (player) => player.isWarlock && (!aliveOnly || player.isAlive)
    );
  }

  /**
   * Enhanced conversion attempt with detection penalties and corruption controls
   * @param {Object} actor - The Warlock attempting the conversion
   * @param {Object} target - The potential convert (can be null for random targeting)
   * @param {Array} log - The log array to append messages to
   * @param {number} rateModifier - Optional modifier to conversion chance (default: 1.0)
   * @param {boolean} actorRecentlyDetected - Whether the actor was recently detected (optional override)
   * @returns {boolean} Whether the conversion was successful
   */
  attemptConversion(
    actor,
    target,
    log,
    rateModifier = 1.0,
    actorRecentlyDetected = null
  ) {
    // Validate actor is a warlock
    if (!actor || !actor.isWarlock) return false;

    // Trophy system: Track corruption attempts
    if (actor.addCorruption) {
      actor.addCorruption();
    }

    // Check corruption limits (includes detection penalty check)
    const limitCheck = this.checkCorruptionLimits(actor.id);
    if (!limitCheck.allowed) {
      if (limitCheck.recentlyDetected) {
        // Special message for detection-blocked corruption
        const blockedLog = {
          type: 'corruption_blocked_detection',
          public: false,
          attackerId: actor.id,
          message: '',
          privateMessage: messages.warlock.private.privateCorruptionBlocked,
          attackerMessage: '',
        };
        log.push(blockedLog);
      }

      logger.debug('WarlockCorruptionBlocked', {
        actorName: actor.name,
        reason: limitCheck.reason,
      });
      return false;
    }

    // Handle null target (for abilities that generate "threat" without a specific target)
    if (!target) {
      // For "untargeted" actions, attempt to convert a random non-warlock
      return this.attemptRandomConversion(actor, log, rateModifier);
    }

    // Skip if target is invalid, dead, or already a warlock
    if (!target.isAlive || target.isWarlock) return false;

    // Get conversion settings from config
    const conversionSettings = config.gameBalance.warlock.conversion;

    // Calculate conversion chance based on config
    const alivePlayersCount = this.gameStateUtils.getAlivePlayers().length;
    const baseChance = Math.min(
      conversionSettings.maxChance,
      conversionSettings.baseChance +
        (this.numWarlocks / alivePlayersCount) *
          conversionSettings.scalingFactor
    );

    // Apply rate modifier
    let finalChance = baseChance * rateModifier;

    // NEW: Check for comeback mechanics corruption resistance
    const goodPlayers = this.gameStateUtils
      .getAlivePlayers()
      .filter((p) => !p.isWarlock);
    const comebackActive = config.gameBalance.shouldActiveComebackMechanics(
      goodPlayers.length,
      alivePlayersCount
    );

    if (comebackActive && !target.isWarlock) {
      const resistanceReduction =
        config.gameBalance.comebackMechanics.corruptionResistance / 100;
      finalChance *= 1 - resistanceReduction;

      if (resistanceReduction > 0) {
        const resistanceLog = {
          type: 'comeback_corruption_resistance',
          public: false,
          targetId: target.id,
          message: '',
          privateMessage: messages.formatMessage(
            messages.warlock.resistance.comebackResistance,
            {
              resistancePercent: Math.round(resistanceReduction * 100),
            }
          ),
          attackerMessage: '',
        };
        log.push(resistanceLog);
      }
    }

    // Check for level-up corruption prevention
    if (conversionSettings.preventLevelUpCorruption && rateModifier === 0) {
      logger.debug('WarlockLevelUpCorruptionPrevented', {});
      return false;
    }

    // Attempt conversion
    if (Math.random() < finalChance) {
      target.isWarlock = true;
      this.incrementWarlockCount();
      this.recordCorruption(actor.id);

      // Enhanced log entry using messages from config
      const isPublic = config.gameBalance.warlock.corruption.corruptionIsPublic;

      const conversionLog = {
        type: 'corruption',
        public: isPublic,
        message: isPublic
          ? messages.getAbilityMessage('warlock', 'corruption.playerCorrupted')
          : '',
        targetId: target.id,
        attackerId: actor.id,
        privateMessage: messages.getAbilityMessage(
          'warlock',
          'private.youWereCorrupted'
        ),
        attackerMessage: messages.formatMessage(
          messages.getAbilityMessage('warlock', 'private.youCorrupted'),
          { targetName: target.name }
        ),
        moveToEnd: true, // Move to end of log for clarity
      };
      log.push(conversionLog);

      logger.info('WarlockCorruptionSuccess', {
        actorName: actor.name,
        targetName: target.name,
        finalChance: Math.round(finalChance * 100),
      });
      return true;
    }

    logger.debug('WarlockCorruptionAttemptDetails', {
      actorName: actor.name,
      targetName: target.name,
      baseChance: Math.round(baseChance * 100),
      modifier: rateModifier,
      finalChance: Math.round(finalChance * 100),
    });
    return false;
  }

  /**
   * Attempt to convert a random non-warlock player
   * Used for untargeted warlock actions that generate "threat"
   * @param {Object} actor - The Warlock generating the threat
   * @param {Array} log - The log array to append messages to
   * @param {number} rateModifier - Modifier to conversion chance
   * @returns {boolean} Whether a conversion was successful
   * @private
   */
  attemptRandomConversion(actor, log, rateModifier = 0.5) {
    // Get all eligible players (alive, not warlocks, not the actor)
    const eligiblePlayers = this.gameStateUtils
      .getAlivePlayers()
      .filter((p) => !p.isWarlock && p.id !== actor.id);

    if (eligiblePlayers.length === 0) return false;

    // Choose a random eligible player
    const randomIdx = Math.floor(Math.random() * eligiblePlayers.length);
    const target = eligiblePlayers[randomIdx];

    // Get untargeted conversion modifier from config
    const randomModifier =
      config.gameBalance.warlock.conversion.randomModifier || 0.5;

    // Apply combined modifier
    const totalModifier = rateModifier * randomModifier;

    // Attempt conversion with modified chance
    return this.attemptConversion(actor, target, log, totalModifier);
  }

  /**
   * Convert specified player to a warlock without chance calculation
   * Used for special events or admin actions
   * @param {string} playerId - ID of player to convert
   * @param {Array} log - The log array to append messages to
   * @param {string} reason - Reason for forced conversion
   * @returns {boolean} Whether the conversion was successful
   */
  forceConvertPlayer(playerId, log, reason = 'unknown') {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive || player.isWarlock) return false;

    player.isWarlock = true;
    this.incrementWarlockCount();
    this.totalCorruptionsThisGame++;

    const forceConvertMessage = messages.getAbilityMessage(
      'warlock',
      'corruption.playerConverted'
    );
    log.push(
      messages.formatMessage(forceConvertMessage, {
        playerName: player.name,
        reason: reason,
      })
    );
    return true;
  }

  /**
   * Check if warlocks are winning
   * @returns {boolean} Whether warlocks are currently winning
   */
  areWarlocksWinning() {
    const aliveCount = this.gameStateUtils.getAlivePlayers().length;
    const aliveWarlockCount = this.countAliveWarlocks();

    // Get majority threshold from config
    const majorityThreshold =
      config.gameBalance.warlock.winConditions.majorityThreshold;

    // Warlocks are winning if they exceed the threshold
    return aliveWarlockCount > aliveCount * majorityThreshold;
  }

  /**
   * NEW: Get detection statistics for debugging/analytics
   * @returns {Object} Detection statistics
   */
  getDetectionStats() {
    return {
      detectedWarlocks: Array.from(this.detectedWarlocks),
      detectionPenalties: Object.fromEntries(this.detectionPenalties),
      detectedThisTurn: this.detectedWarlocks.size,
    };
  }

  /**
   * Enhanced corruption statistics including detection info
   * @returns {Object} Corruption statistics
   */
  getCorruptionStats() {
    return {
      totalGameCorruptions: this.totalCorruptionsThisGame,
      roundCorruptions: this.roundCorruptions,
      playerCorruptions: Object.fromEntries(this.playerCorruptions),
      activeCooldowns: Object.fromEntries(this.corruptionCooldowns),
      currentWarlocks: this.numWarlocks,
      aliveWarlocks: this.countAliveWarlocks(),
      detectionStats: this.getDetectionStats(),
    };
  }

  /**
   * NEW: Clear detection flags for new turn
   */
  clearDetectionFlags() {
    this.detectedWarlocks.clear();
  }

  /**
   * NEW: Check if a warlock can corrupt based on detection status
   * @param {string} warlockId - ID of the warlock
   * @returns {boolean} Whether the warlock can attempt corruption
   */
  canWarlockCorrupt(warlockId) {
    const limitCheck = this.checkCorruptionLimits(warlockId);
    return limitCheck.allowed;
  }

  /**
   * NEW: Get remaining detection penalty for a player
   * @param {string} playerId - Player ID
   * @returns {number} Turns remaining on detection penalty (0 if none)
   */
  getDetectionPenaltyRemaining(playerId) {
    return this.detectionPenalties.get(playerId) || 0;
  }

  /**
   * NEW: Apply detection penalty manually (for ability handlers)
   * @param {string} warlockId - ID of the warlock to penalize
   * @param {Array} log - Event log
   * @param {string} detectionSource - Source of the detection (for logging)
   */
  applyDetectionPenalty(warlockId, log, detectionSource = 'unknown') {
    const warlock = this.players.get(warlockId);
    if (!warlock || !warlock.isWarlock) return;

    // Use the detection marking method
    this.markWarlockDetected(warlockId, log);

    logger.debug('WarlockDetectionPenaltyApplied', {
      warlockName: warlock.name,
      detectionSource,
    });
  }

  /**
   * NEW: Check if comeback mechanics should reduce corruption chances
   * @returns {number} Corruption resistance modifier (0.0 to 1.0)
   */
  getComebackCorruptionResistance() {
    const alivePlayers = this.gameStateUtils.getAlivePlayers();
    const goodPlayers = alivePlayers.filter((p) => !p.isWarlock);

    const comebackActive = config.gameBalance.shouldActiveComebackMechanics(
      goodPlayers.length,
      alivePlayers.length
    );

    if (comebackActive) {
      return config.gameBalance.comebackMechanics.corruptionResistance / 100;
    }

    return 0;
  }

  /**
   * DEPRECATED: Use assignInitialWarlocks instead
   * Kept for backward compatibility
   */
  assignInitialWarlock(preferredPlayerId = null) {
    const preferredIds = preferredPlayerId ? [preferredPlayerId] : [];
    const warlocks = this.assignInitialWarlocks(preferredIds);
    return warlocks.length > 0 ? warlocks[0] : null;
  }
}

module.exports = WarlockSystem;
