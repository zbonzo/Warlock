/**
 * @fileoverview Enhanced Status Effect Manager with healing detection for warlock anti-detection
 * Manages all temporary effects on players with detection chances during healing over time
 */
import config from '../../config/index.js';
import messages from '../../config/messages/index.js';
import logger from '../../utils/logger.js';
import { secureRandomFloat } from '../../utils/secureRandom.js';

interface Player {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  isWarlock?: boolean;
  race?: string;
  isVulnerable?: boolean;
  vulnerabilityIncrease?: number;
  stoneArmorIntact?: boolean;
  pendingDeath?: boolean;
  deathAttacker?: string;
  hasSubmittedAction?: boolean;
  clearActionSubmission?: () => void;
  processStoneArmorDegradation?: (damage: number) => void;
  statusEffects: Record<string, any>;
  hasStatusEffect: (effectName: string) => boolean;
}

interface WarlockSystem {
  markWarlockDetected?: (playerId: string, log: any[]) => void;
}

interface EffectData {
  turns?: number;
  damage?: number;
  armor?: number;
  amount?: number;
  damageIncrease?: number;
  healerId?: string;
  healerName?: string;
  isWarlock?: boolean;
  [key: string]: any;
}

interface LogEntry {
  type: string;
  public: boolean;
  targetId?: string;
  attackerId?: string;
  message: string;
  privateMessage: string;
  attackerMessage: string;
}

interface GameBalance {
  player?: {
    healing?: {
      antiDetection?: {
        detectionChance?: number;
      };
    };
  };
}

/**
 * Enhanced StatusEffectManager with healing detection capabilities
 * Manages poison, shields, invisibility, stunning, vulnerability, and healing over time
 */
class StatusEffectManager {
  private players: Map<string, Player>;
  private warlockSystem: WarlockSystem | null;

  /**
   * Create a status effect manager
   * @param players - Map of player objects
   * @param warlockSystem - Warlock system for detection
   */
  constructor(players: Map<string, Player>, warlockSystem: WarlockSystem | null = null) {
    this.players = players;
    this.warlockSystem = warlockSystem; // For warlock detection during healing
  }

  /**
   * Apply a status effect to a player
   * @param playerId - Player ID
   * @param effectName - Name of the effect
   * @param params - Effect parameters
   * @param log - Event log to append messages to
   * @returns Whether the effect was applied successfully
   */
  applyEffect(playerId: string, effectName: string, params: EffectData, log: any[] = []): boolean {
    const player = this.players.get(playerId);
    if (!player || !player.isAlive) return false;

    // Get effect defaults from config
    const effectDefaults = config.getEffectDefaults(effectName);
    if (!effectDefaults) {
      logger.warn(`Unknown effect: ${effectName}`);
      return false;
    }

    // Merge params with defaults
    const effectData: EffectData = { ...effectDefaults, ...params };

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
   * @private
   */
  private handleSpecialEffectApplication(player: Player, effectName: string, effectData: EffectData, log: any[]): void {
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
        // Store healer information for potential detection
        if (effectData.healerId && effectData.healerName) {
          player.statusEffects[effectName].healerId = effectData.healerId;
          player.statusEffects[effectName].healerName = effectData.healerName;
          player.statusEffects[effectName].isWarlock = effectData.isWarlock || false;
        }
        break;
    }
  }

  /**
   * Stack an effect (currently only used for poison)
   * @private
   */
  private stackEffect(player: Player, effectName: string, effectData: EffectData, log: any[]): void {
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
   */
  processTimedEffects(log: any[] = []): void {
    for (const player of this.players.values()) {
      if (!player.isAlive) continue;

      this.processPlayerEffects(player, log);
    }
  }

  /**
   * Process effects for a single player
   * @private
   */
  private processPlayerEffects(player: Player, log: any[]): void {
    const effectsToRemove: string[] = [];

    for (const [effectName, effectData] of Object.entries(player.statusEffects)) {
      let shouldRemove = false;

      switch (effectName) {
        case 'poison':
          shouldRemove = this.processPoisonEffect(player, effectData, log);
          break;

        case 'healingOverTime':
          shouldRemove = this.processHealingOverTimeEffect(player, effectData, log);
          break;

        case 'shielded':
        case 'invisible':
        case 'stunned':
        case 'vulnerable':
        case 'weakened':
        case 'enraged':
          shouldRemove = this.processTimedEffect(player, effectName, effectData, log);
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
   * Process healing over time with warlock detection chance
   * @returns Whether effect should be removed
   * @private
   */
  private processHealingOverTimeEffect(player: Player, effectData: EffectData, log: any[]): boolean {
    const healAmount = effectData.amount || 0;

    // Calculate actual healing received
    const actualHeal = Math.min(healAmount, player.maxHp - player.hp);

    if (actualHeal > 0) {
      player.hp += actualHeal;

      // Log the healing
      const healMessage = messages.getAbilityMessage('abilities.healing', 'heal');
      log.push(
        messages.formatMessage(healMessage, {
          playerName: player.name,
          amount: actualHeal,
        })
      );

      // Detection chance if target is warlock and actually received healing
      if (player.isWarlock && actualHeal > 0 && effectData.healerId) {
        const gameBalance = config.gameBalance as GameBalance;
        const detectionChance = gameBalance?.player?.healing?.antiDetection?.detectionChance || 0.05;

        if (secureRandomFloat() < detectionChance) {
          // Mark warlock as detected
          if (this.warlockSystem && this.warlockSystem.markWarlockDetected) {
            this.warlockSystem.markWarlockDetected(player.id, log);
          }

          // Add detection message
          const detectionLog: LogEntry = {
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
      const privateHealLog: LogEntry = {
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
    effectData.turns = (effectData.turns || 0) - 1;

    // Check if effect expired
    if (effectData.turns <= 0) {
      this.logEffectMessage('healingOverTime', 'expired', player, log, effectData);
      return true; // Remove effect
    }

    return false; // Keep effect
  }

  /**
   * Process poison damage effect
   * @returns Whether effect should be removed
   * @private
   */
  private processPoisonEffect(player: Player, effectData: EffectData, log: any[]): boolean {
    const damage = effectData.damage || 0;

    if (damage > 0) {
      // Apply poison damage
      const oldHp = player.hp;
      player.hp = Math.max(0, player.hp - damage);
      const actualDamage = oldHp - player.hp;

      // Process stone armor degradation for Rockhewn
      if (player.race === 'Rockhewn' && player.stoneArmorIntact && player.processStoneArmorDegradation) {
        player.processStoneArmorDegradation(actualDamage);
      }

      // Log poison damage
      const poisonTemplate = messages.getEvent('poisonDamage');
      const poisonMessage = messages.formatMessage(poisonTemplate, {
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
    effectData.turns = (effectData.turns || 0) - 1;

    // Check if effect expired
    if (effectData.turns <= 0) {
      this.logEffectMessage('poison', 'expired', player, log, effectData);
      return true; // Remove effect
    }

    return false; // Keep effect
  }

  /**
   * Process generic timed effects
   * @returns Whether effect should be removed
   * @private
   */
  private processTimedEffect(player: Player, effectName: string, effectData: EffectData, log: any[]): boolean {
    // Reduce duration FIRST
    if (effectData.turns && effectData.turns > 0) {
      effectData.turns--;
    }

    // Handle vulnerability expiration
    if (effectName === 'vulnerable' && effectData.turns === 0) {
      player.isVulnerable = false;
      player.vulnerabilityIncrease = 0;
    }

    // SPECIAL HANDLING FOR STUN: Clear action submissions when stun expires
    if (effectName === 'stunned' && effectData.turns === 0) {
      // Clear any pending action submission when stun expires
      if (player.hasSubmittedAction && player.clearActionSubmission) {
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
    if (effectData.turns === 0) {
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
   * @returns Whether the effect was removed
   */
  removeEffect(playerId: string, effectName: string, log: any[] = []): boolean {
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
   */
  hasEffect(playerId: string, effectName: string): boolean {
    const player = this.players.get(playerId);
    return !!(player && player.hasStatusEffect(effectName));
  }

  /**
   * Check if a player is stunned
   */
  isPlayerStunned(playerId: string): boolean {
    return this.hasEffect(playerId, 'stunned');
  }

  /**
   * Check if a player is invisible
   */
  isPlayerInvisible(playerId: string): boolean {
    return this.hasEffect(playerId, 'invisible');
  }

  /**
   * Get all effects for a player
   */
  getPlayerEffects(playerId: string): Record<string, any> {
    const player = this.players.get(playerId);
    return player ? player.statusEffects : {};
  }

  /**
   * Log effect messages using the centralized message system
   * @private
   */
  private logEffectMessage(effectName: string, messageType: string, player: Player, log: any[], effectData: EffectData): void {
    const message = config.getEffectMessage(effectName, messageType, {
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
   */
  clearAllEffects(playerId: string): void {
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
   * @returns Number of effects successfully applied
   */
  applyMultipleEffects(playerId: string, effects: Record<string, EffectData>, log: any[] = []): number {
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
   * @returns Turns remaining (0 if no effect)
   */
  getEffectDuration(playerId: string, effectName: string): number {
    const player = this.players.get(playerId);
    if (!player || !player.hasStatusEffect(effectName)) return 0;

    return player.statusEffects[effectName].turns || 0;
  }

  /**
   * Modify effect duration
   * @returns Whether the effect duration was modified
   */
  modifyEffectDuration(playerId: string, effectName: string, turnChange: number): boolean {
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
   */
  getEffectStatistics(): {
    totalEffects: number;
    effectsByType: Record<string, number>;
    playersCounts: Record<string, number>;
  } {
    const stats = {
      totalEffects: 0,
      effectsByType: {} as Record<string, number>,
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
        stats.effectsByType[effectName] = (stats.effectsByType[effectName] || 0) + 1;

        if (effectName in stats.playersCounts) {
          stats.playersCounts[effectName as keyof typeof stats.playersCounts]++;
        }
      }
    }

    return stats;
  }

  /**
   * Debug method to get all active effects
   */
  getAllActiveEffects(): Record<string, { playerName: string; effects: Record<string, any> }> {
    const activeEffects: Record<string, { playerName: string; effects: Record<string, any> }> = {};

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

export default StatusEffectManager;
