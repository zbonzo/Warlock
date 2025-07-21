/**
 * @fileoverview Enhanced Status Effect Manager with healing detection for warlock anti-detection
 * Manages all temporary effects on players with detection chances during healing over time
 */
const config = require('@config');
const messages = require('@messages');
const logger = require('@utils/logger');

/**
 * Enhanced StatusEffectManager with healing detection capabilities
 * Manages poison, shields, invisibility, stunning, vulnerability, and healing over time
 */
class StatusEffectManager {
  /**
   * Create a status effect manager
   * @param {Map} players - Map of player objects
   * @param {WarlockSystem} warlockSystem - Warlock system for detection
   */
  constructor(players, warlockSystem = null) {
    this.players = players;
    this.warlockSystem = warlockSystem; // NEW: For warlock detection during healing
  }

  /**
   * Apply a status effect to a player
   * @param {string} playerId - Player ID
   * @param {string} effectName - Name of the effect
   * @param {Object} params - Effect parameters
   * @param {Array} log - Event log to append messages to
   * @returns {boolean} Whether the effect was applied successfully
   */
  applyEffect(playerId, effectName, params, log = []) {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return false;

    // Get effect defaults from config
    const effectDefaults = config.getStatusEffectDefaults(effectName);
    if (!effectDefaults) {
      logger.warn(`Unknown effect: ${effectName}`);
      return false;
    }

    // Merge params with defaults
    const effectData = { ...effectDefaults, ...params };

    // Check if effect is stackable or refreshable
    const isStackable = config.isEffectStackable(effectName);
    const isRefreshable = config.isEffectRefreshable(effectName);

    if (player.hasStatusEffect(effectName)) {
      if (isRefreshable && !isStackable) {
        // Refresh the effect duration
        player.statusEffects[effectName] = effectData;
        this.logEffectMessage(effectName, 'refreshed', player, log, effectData);
      } else if (isStackable) {
        // Stack the effect (for poison)
        this.stackEffect(player, effectName, effectData, log);
      }
      // If neither stackable nor refreshable, do nothing
    } else {
      // Apply new effect
      player.statusEffects[effectName] = effectData;
      this.logEffectMessage(effectName, 'applied', player, log, effectData);

      // Special handling for different effects
      this.handleSpecialEffectApplication(player, effectName, effectData, log);
    }

    return true;
  }

  /**
   * Handle special logic when applying effects
   * @param {Object} player - Player object
   * @param {string} effectName - Effect name
   * @param {Object} effectData - Effect data
   * @param {Array} log - Event log
   * @private
   */
  handleSpecialEffectApplication(player, effectName, effectData, log) {
    switch (effectName) {
      case 'vulnerable':
        // Set vulnerability flags for easier damage calculation
        player.isVulnerable = true;
        player.vulnerabilityIncrease = effectData.damageIncrease || 25;
        break;

      case 'shielded':
        // Protection effect is handled in player.getEffectiveArmor()
        break;

      case 'invisible':
        // Invisibility is handled in targeting logic
        break;

      case 'stunned':
        // Stun is checked in action validation
        break;

      case 'healingOverTime':
        // NEW: Store healer information for potential detection
        if (effectData.healerId && effectData.healerName) {
          player.statusEffects[effectName].healerId = effectData.healerId;
          player.statusEffects[effectName].healerName = effectData.healerName;
          player.statusEffects[effectName].isWarlock =
            effectData.isWarlock || false;
        }
        break;
    }
  }

  /**
   * Stack an effect (currently only used for poison)
   * @param {Object} player - Player object
   * @param {string} effectName - Effect name
   * @param {Object} effectData - New effect data
   * @param {Array} log - Event log
   * @private
   */
  stackEffect(player, effectName, effectData, log) {
    if (effectName === 'poison') {
      // For poison, add damage values and use longer duration
      const existing = player.statusEffects[effectName];
      const newDamage = (existing.damage || 0) + (effectData.damage || 0);
      const newTurns = Math.max(existing.turns || 0, effectData.turns || 0);

      player.statusEffects[effectName] = {
        ...existing,
        damage: newDamage,
        turns: newTurns,
      };

      this.logEffectMessage(effectName, 'stacked', player, log, {
        damage: newDamage,
        turns: newTurns,
      });
    }
  }

  /**
   * Process all timed effects at the end of a round
   * @param {Array} log - Event log to append messages to
   */
  processTimedEffects(log = []) {
    for (const player of this.players.values()) {
      if (!player.isAlive) continue;

      this.processPlayerEffects(player, log);
    }
  }

  /**
   * Process effects for a single player
   * @param {Object} player - Player to process
   * @param {Array} log - Event log
   * @private
   */
  processPlayerEffects(player, log) {
    const effectsToRemove = [];

    for (const [effectName, effectData] of Object.entries(
      player.statusEffects
    )) {
      let shouldRemove = false;

      switch (effectName) {
        case 'poison':
          shouldRemove = this.processPoisonEffect(player, effectData, log);
          break;

        case 'healingOverTime':
          shouldRemove = this.processHealingOverTimeEffect(
            player,
            effectData,
            log
          );
          break;

        case 'shielded':
        case 'invisible':
        case 'stunned':
        case 'vulnerable':
        case 'weakened':
        case 'enraged':
          shouldRemove = this.processTimedEffect(
            player,
            effectName,
            effectData,
            log
          );
          break;
      }

      if (shouldRemove) {
        effectsToRemove.push(effectName);
      }
    }

    // Remove expired effects
    for (const effectName of effectsToRemove) {
      this.removeEffect(player.id, effectName, log);
    }
  }

  /**
   * NEW: Process healing over time with warlock detection chance
   * @param {Object} player - Player receiving healing
   * @param {Object} effectData - Effect data
   * @param {Array} log - Event log
   * @returns {boolean} Whether effect should be removed
   * @private
   */
  processHealingOverTimeEffect(player, effectData, log) {
    const healAmount = effectData.amount || 0;

    // Calculate actual healing received
    const actualHeal = Math.min(healAmount, player.maxHp - player.hp);

    if (actualHeal > 0) {
      player.hp += actualHeal;

      // Log the healing
      const healMessage = messages.getAbilityMessage(
        'abilities.healing',
        'heal'
      );
      log.push(
        messages.formatMessage(healMessage, {
          playerName: player.name,
          amount: actualHeal,
        })
      );

      // NEW: Detection chance if target is warlock and actually received healing
      if (player.isWarlock && actualHeal > 0 && effectData.healerId) {
        const detectionChance =
          config.gameBalance?.player?.healing?.antiDetection?.detectionChance ||
          0.05;
        if (Math.random() < detectionChance) {
          // Mark warlock as detected
          if (this.warlockSystem && this.warlockSystem.markWarlockDetected) {
            this.warlockSystem.markWarlockDetected(player.id, log);
          }

          // Add detection message
          const detectionLog = {
            type: 'healing_over_time_detection',
            public: true,
            targetId: player.id,
            attackerId: effectData.healerId,
            message: `The healing over time on ${player.name} reveals they are a Warlock!`,
            privateMessage: `Your healing over time detected that ${player.name} is a Warlock!`,
            attackerMessage: `Your healing over time revealed that ${player.name} is corrupted!`,
          };
          log.push(detectionLog);
        }
      }

      // Private message to the healed player
      const privateHealLog = {
        type: 'heal_over_time',
        public: false,
        targetId: player.id,
        message: '',
        privateMessage: messages.formatMessage(
          messages.getAbilityMessage('abilities.healing', 'youRegenerateHP'),
          { amount: actualHeal }
        ),
        attackerMessage: '',
      };
      log.push(privateHealLog);
    }

    // Reduce duration
    effectData.turns--;

    // Check if effect expired
    if (effectData.turns <= 0) {
      this.logEffectMessage(
        'healingOverTime',
        'expired',
        player,
        log,
        effectData
      );
      return true; // Remove effect
    }

    return false; // Keep effect
  }

  /**
   * Process poison damage effect
   * @param {Object} player - Player taking poison damage
   * @param {Object} effectData - Poison effect data
   * @param {Array} log - Event log
   * @returns {boolean} Whether effect should be removed
   * @private
   */
  processPoisonEffect(player, effectData, log) {
    const damage = effectData.damage || 0;

    if (damage > 0) {
      // Apply poison damage
      const oldHp = player.hp;
      player.hp = Math.max(0, player.hp - damage);
      const actualDamage = oldHp - player.hp;

      // Process stone armor degradation for Rockhewn
      if (player.race === 'Rockhewn' && player.stoneArmorIntact) {
        player.processStoneArmorDegradation(actualDamage);
      }

      // Log poison damage
      const poisonMessage = messages.getEvent('poisonDamage', {
        playerName: player.name,
        damage: actualDamage,
      });
      log.push(poisonMessage);

      // Check if poison killed the player
      if (player.hp <= 0) {
        player.isAlive = false;
        player.pendingDeath = true;
        player.deathAttacker = 'Poison';
      }
    }

    // Reduce duration
    effectData.turns--;

    // Check if effect expired
    if (effectData.turns <= 0) {
      this.logEffectMessage('poison', 'expired', player, log, effectData);
      return true; // Remove effect
    }

    return false; // Keep effect
  }

  /**
   * Process generic timed effects
   * @param {Object} player - Player object
   * @param {string} effectName - Effect name
   * @param {Object} effectData - Effect data
   * @param {Array} log - Event log
   * @returns {boolean} Whether effect should be removed
   * @private
   */
processTimedEffect(player, effectName, effectData, log) {
  // Reduce duration FIRST
  if (effectData.turns > 0) {
    effectData.turns--;
  }

  // Handle vulnerability expiration
  if (effectName === 'vulnerable' && effectData.turns <= 0) {
    player.isVulnerable = false;
    player.vulnerabilityIncrease = 0;
  }

  // SPECIAL HANDLING FOR STUN: Clear action submissions when stun expires
  if (effectName === 'stunned' && effectData.turns <= 0) {
    // Clear any pending action submission when stun expires
    if (player.hasSubmittedAction) {
      player.clearActionSubmission();
      logger.debug('ClearedSubmissionOnStunExpiry', { 
        playerName: player.name,
        hadSubmission: true 
      });
    }
    
    // Log stun expiration
    const stunExpiredMessage = `${player.name} is no longer stunned and can act again.`;
    log.push({
      type: 'stun_expired',
      public: true,
      targetId: player.id,
      message: stunExpiredMessage,
      privateMessage: 'You are no longer stunned and can act again!',
      attackerMessage: stunExpiredMessage,
    });
  }

  // Check if effect expired
  if (effectData.turns <= 0) {
    // Only log expiration for non-stun effects (stun already logged above)
    if (effectName !== 'stunned') {
      this.logEffectMessage(effectName, 'expired', player, log, effectData);
    }
    return true; // Remove effect
  }

  return false; // Keep effect
}

  /**
   * Remove a status effect from a player
   * @param {string} playerId - Player ID
   * @param {string} effectName - Effect name
   * @param {Array} log - Event log
   * @returns {boolean} Whether the effect was removed
   */
  removeEffect(playerId, effectName, log = []) {
    const player = this.players.get(playerId);
    if (!player || !player.hasStatusEffect(effectName)) return false;

    // Handle special cleanup for specific effects
    if (effectName === 'vulnerable') {
      player.isVulnerable = false;
      player.vulnerabilityIncrease = 0;
    }

    // Remove the effect
    delete player.statusEffects[effectName];

    return true;
  }

  /**
   * Check if a player has a specific status effect
   * @param {string} playerId - Player ID
   * @param {string} effectName - Effect name
   * @returns {boolean} Whether the player has the effect
   */
  hasEffect(playerId, effectName) {
    const player = this.players.get(playerId);
    return player && player.hasStatusEffect(effectName);
  }

  /**
   * Check if a player is stunned
   * @param {string} playerId - Player ID
   * @returns {boolean} Whether the player is stunned
   */
  isPlayerStunned(playerId) {
    return this.hasEffect(playerId, 'stunned');
  }

  /**
   * Check if a player is invisible
   * @param {string} playerId - Player ID
   * @returns {boolean} Whether the player is invisible
   */
  isPlayerInvisible(playerId) {
    return this.hasEffect(playerId, 'invisible');
  }

  /**
   * Get all effects for a player
   * @param {string} playerId - Player ID
   * @returns {Object} Object containing all active effects
   */
  getPlayerEffects(playerId) {
    const player = this.players.get(playerId);
    return player ? player.statusEffects : {};
  }

  /**
   * Log effect messages using the centralized message system
   * @param {string} effectName - Effect name
   * @param {string} messageType - Message type (applied, expired, etc.)
   * @param {Object} player - Player object
   * @param {Array} log - Event log
   * @param {Object} effectData - Effect data for message formatting
   * @private
   */
  logEffectMessage(effectName, messageType, player, log, effectData) {
    const message = config.statusEffects.getEffectMessage(effectName, messageType, {
      playerName: player.name,
      damage: effectData.damage,
      armor: effectData.armor,
      turns: effectData.turns,
      amount: effectData.amount,
      damageIncrease: effectData.damageIncrease,
    });

    if (message) {
      log.push(message);
    }
  }

  /**
   * Clear all effects from a player (used on death/resurrection)
   * @param {string} playerId - Player ID
   */
  clearAllEffects(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Clear vulnerability flags
    player.isVulnerable = false;
    player.vulnerabilityIncrease = 0;

    // Clear all status effects
    player.statusEffects = {};
  }

  /**
   * Apply multiple effects to a player at once
   * @param {string} playerId - Player ID
   * @param {Object} effects - Object with effect names as keys and params as values
   * @param {Array} log - Event log
   * @returns {number} Number of effects successfully applied
   */
  applyMultipleEffects(playerId, effects, log = []) {
    let appliedCount = 0;

    for (const [effectName, params] of Object.entries(effects)) {
      if (this.applyEffect(playerId, effectName, params, log)) {
        appliedCount++;
      }
    }

    return appliedCount;
  }

  /**
   * Get effect duration remaining
   * @param {string} playerId - Player ID
   * @param {string} effectName - Effect name
   * @returns {number} Turns remaining (0 if no effect)
   */
  getEffectDuration(playerId, effectName) {
    const player = this.players.get(playerId);
    if (!player || !player.hasStatusEffect(effectName)) return 0;

    return player.statusEffects[effectName].turns || 0;
  }

  /**
   * Modify effect duration
   * @param {string} playerId - Player ID
   * @param {string} effectName - Effect name
   * @param {number} turnChange - Turns to add (positive) or subtract (negative)
   * @returns {boolean} Whether the effect duration was modified
   */
  modifyEffectDuration(playerId, effectName, turnChange) {
    const player = this.players.get(playerId);
    if (!player || !player.hasStatusEffect(effectName)) return false;

    const effect = player.statusEffects[effectName];
    effect.turns = Math.max(0, (effect.turns || 0) + turnChange);

    // Remove effect if duration reaches 0
    if (effect.turns <= 0) {
      this.removeEffect(playerId, effectName);
    }

    return true;
  }

  /**
   * Get statistics about active effects
   * @returns {Object} Statistics object
   */
  getEffectStatistics() {
    const stats = {
      totalEffects: 0,
      effectsByType: {},
      playersCounts: {
        poisoned: 0,
        shielded: 0,
        invisible: 0,
        stunned: 0,
        vulnerable: 0,
        healingOverTime: 0,
      },
    };

    for (const player of this.players.values()) {
      if (!player.isAlive) continue;

      for (const effectName of Object.keys(player.statusEffects)) {
        stats.totalEffects++;
        stats.effectsByType[effectName] =
          (stats.effectsByType[effectName] || 0) + 1;

        if (stats.playersCounts.hasOwnProperty(effectName)) {
          stats.playersCounts[effectName]++;
        }
      }
    }

    return stats;
  }

  /**
   * Debug method to get all active effects
   * @returns {Object} All active effects by player
   */
  getAllActiveEffects() {
    const activeEffects = {};

    for (const [playerId, player] of this.players.entries()) {
      if (Object.keys(player.statusEffects).length > 0) {
        activeEffects[playerId] = {
          playerName: player.name,
          effects: { ...player.statusEffects },
        };
      }
    }

    return activeEffects;
  }
}

module.exports = StatusEffectManager;
