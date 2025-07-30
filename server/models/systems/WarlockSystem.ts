/**
 * @fileoverview Enhanced Warlock system with detection penalties and corruption restrictions
 * Centralizes warlock-specific logic with improved balance controls and detection consequences
 */

import config from '../../config/index.js';
import messages from '../../config/messages/index.js';
import logger from '../../utils/logger.js';
import type { Player } from '../../types/generated';

interface GameStateUtils {
  getAlivePlayers(): Player[];
  getAlivePlayersExcept(excludeIds: string[]): Player[];
  // Add other methods as needed
}

interface CorruptionResult {
  success: boolean;
  reason?: string;
  resistanceBonus?: number;
  cooldownApplied?: boolean;
}

interface WarlockAssignmentResult {
  playerId: string;
  playerName: string;
  wasPreferred: boolean;
}

/**
 * Enhanced WarlockSystem with detection penalties and corruption restrictions
 * Handles warlock assignments, conversions, tracking, corruption limits, and detection consequences
 */
class WarlockSystem {
  private players: Map<string, Player>;
  private gameStateUtils: GameStateUtils;
  public numWarlocks: number;

  // Enhanced corruption tracking
  private roundCorruptions: number;
  private playerCorruptions: Map<string, number>;
  private corruptionCooldowns: Map<string, number>;
  private totalCorruptionsThisGame: number;

  // Detection tracking
  private detectedWarlocks: Set<string>;
  private detectionPenalties: Map<string, number>;

  /**
   * Create a new warlock system
   */
  constructor(players: Map<string, Player>, gameStateUtils: GameStateUtils) {
    this.players = players;
    this.gameStateUtils = gameStateUtils;
    this.numWarlocks = 0;

    // Enhanced corruption tracking
    this.roundCorruptions = 0;
    this.playerCorruptions = new Map();
    this.corruptionCooldowns = new Map();
    this.totalCorruptionsThisGame = 0;

    // Detection tracking
    this.detectedWarlocks = new Set();
    this.detectionPenalties = new Map();
  }

  /**
   * Reset corruption tracking at start of each round
   */
  resetRoundTracking(): void {
    this.roundCorruptions = 0;
    this.playerCorruptions.clear();
    // Clear detection penalties that have expired
    this.processDetectionPenalties();
    logger.debug('WarlockRoundTrackingReset', {});
  }

  /**
   * Process detection penalties and corruption cooldowns
   */
  processDetectionPenalties(): void {
    const expiredDetections: string[] = [];
    
    // Process detection penalties
    for (const [playerId, duration] of this.detectionPenalties) {
      if (duration <= 1) {
        expiredDetections.push(playerId);
      } else {
        this.detectionPenalties.set(playerId, duration - 1);
      }
    }
    
    // Remove expired detection penalties
    expiredDetections.forEach(playerId => {
      this.detectionPenalties.delete(playerId);
      logger.debug('DetectionPenaltyExpired', { playerId });
    });

    // Process corruption cooldowns
    const expiredCooldowns: string[] = [];
    for (const [playerId, cooldown] of this.corruptionCooldowns) {
      if (cooldown <= 1) {
        expiredCooldowns.push(playerId);
      } else {
        this.corruptionCooldowns.set(playerId, cooldown - 1);
      }
    }
    
    // Remove expired cooldowns
    expiredCooldowns.forEach(playerId => {
      this.corruptionCooldowns.delete(playerId);
      logger.debug('CorruptionCooldownExpired', { playerId });
    });

    // Clear detected warlocks from previous turn
    this.detectedWarlocks.clear();
  }

  /**
   * Mark a warlock as detected this turn
   */
  markWarlockDetected(playerId: string): void {
    this.detectedWarlocks.add(playerId);
    
    // Apply detection penalty
    const penaltyDuration = config.gameBalance.warlockSystem.detectionPenaltyDuration;
    this.detectionPenalties.set(playerId, penaltyDuration);
    
    logger.info('WarlockDetected', { 
      playerId,
      penaltyDuration 
    });
  }

  /**
   * Check if a warlock is currently under detection penalty
   */
  hasDetectionPenalty(playerId: string): boolean {
    return this.detectionPenalties.has(playerId);
  }

  /**
   * Get remaining detection penalty duration
   */
  getDetectionPenaltyDuration(playerId: string): number {
    return this.detectionPenalties.get(playerId) || 0;
  }

  /**
   * Assign initial warlocks with enhanced selection logic
   */
  assignInitialWarlocks(preferredPlayerIds: string[] = []): WarlockAssignmentResult[] {
    const alivePlayers = this.gameStateUtils.getAlivePlayers();
    const targetWarlocks = config.gameBalance.getWarlockCount(alivePlayers.length);
    
    if (targetWarlocks === 0) {
      logger.info('NoWarlocksAssigned', { playerCount: alivePlayers.length });
      return [];
    }

    const assignedWarlocks: WarlockAssignmentResult[] = [];
    const availablePlayers = [...alivePlayers];
    
    // First, try to assign preferred players
    for (const preferredId of preferredPlayerIds) {
      if (assignedWarlocks.length >= targetWarlocks) break;
      
      const preferredPlayer = availablePlayers.find(p => p.id === preferredId);
      if (preferredPlayer) {
        preferredPlayer.isWarlock = true;
        assignedWarlocks.push({
          playerId: preferredPlayer.id,
          playerName: preferredPlayer.name,
          wasPreferred: true
        });
        
        // Remove from available pool
        const index = availablePlayers.indexOf(preferredPlayer);
        availablePlayers.splice(index, 1);
      }
    }

    // Fill remaining slots randomly
    while (assignedWarlocks.length < targetWarlocks && availablePlayers.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePlayers.length);
      const selectedPlayer = availablePlayers[randomIndex];
      
      selectedPlayer.isWarlock = true;
      assignedWarlocks.push({
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        wasPreferred: false
      });
      
      availablePlayers.splice(randomIndex, 1);
    }

    this.numWarlocks = assignedWarlocks.length;
    
    logger.info('WarlocksAssigned', {
      totalWarlocks: assignedWarlocks.length,
      preferredAssigned: assignedWarlocks.filter(w => w.wasPreferred).length,
      randomAssigned: assignedWarlocks.filter(w => !w.wasPreferred).length
    });

    return assignedWarlocks;
  }

  /**
   * Enhanced corruption attempt with multiple resistance factors
   */
  attemptCorruption(
    warlockId: string,
    targetId: string,
    baseChance: number = config.gameBalance.warlockSystem.corruptionChance
  ): CorruptionResult {
    const warlock = this.players.get(warlockId);
    const target = this.players.get(targetId);

    if (!warlock || !target) {
      return { success: false, reason: 'Invalid players' };
    }

    if (!warlock.isWarlock) {
      return { success: false, reason: 'Attacker is not a warlock' };
    }

    if (target.isWarlock) {
      return { success: false, reason: 'Target is already a warlock' };
    }

    if (target.status !== 'alive') {
      return { success: false, reason: 'Target is not alive' };
    }

    // Check corruption cooldown
    if (this.corruptionCooldowns.has(warlockId)) {
      return { 
        success: false, 
        reason: 'Warlock is on corruption cooldown',
        cooldownApplied: true
      };
    }

    // Check detection penalty
    if (this.hasDetectionPenalty(warlockId)) {
      const penaltyReduction = config.gameBalance.warlockSystem.detectionPenaltyReduction;
      baseChance *= (1 - penaltyReduction);
      logger.debug('CorruptionPenaltyApplied', { warlockId, reduction: penaltyReduction });
    }

    // Check round corruption limits
    const maxCorruptionsPerRound = config.gameBalance.warlockSystem.maxCorruptionsPerRound;
    if (this.roundCorruptions >= maxCorruptionsPerRound) {
      return { success: false, reason: 'Round corruption limit reached' };
    }

    // Check per-player corruption limits
    const playerCorruptions = this.playerCorruptions.get(warlockId) || 0;
    const maxPerPlayer = config.gameBalance.warlockSystem.maxCorruptionsPerPlayerPerRound;
    if (playerCorruptions >= maxPerPlayer) {
      return { success: false, reason: 'Player corruption limit reached' };
    }

    // Calculate resistance bonuses
    let totalResistance = 0;

    // Base race resistance
    const raceResistance = config.gameBalance.warlockSystem.corruptionResistance / 100;
    totalResistance += raceResistance;

    // Comeback mechanics resistance
    const comebackResistance = this.getComebackCorruptionResistance();
    totalResistance += comebackResistance;

    // Apply resistance to corruption chance
    const finalChance = baseChance * (1 - Math.min(totalResistance, 0.9)); // Cap at 90% resistance

    // Roll for corruption
    const roll = Math.random();
    const success = roll < finalChance;

    logger.debug('CorruptionAttempt', {
      warlockId,
      targetId,
      baseChance,
      raceResistance,
      comebackResistance,
      totalResistance,
      finalChance,
      roll,
      success
    });

    if (success) {
      // Execute corruption
      target.isWarlock = true;
      this.numWarlocks++;
      this.roundCorruptions++;
      this.playerCorruptions.set(warlockId, playerCorruptions + 1);
      this.totalCorruptionsThisGame++;

      // Apply corruption cooldown
      const cooldownDuration = config.gameBalance.warlockSystem.corruptionCooldown;
      this.corruptionCooldowns.set(warlockId, cooldownDuration);

      logger.info('CorruptionSuccessful', {
        warlockId,
        targetId,
        newWarlockCount: this.numWarlocks,
        roundCorruptions: this.roundCorruptions,
        totalCorruptions: this.totalCorruptionsThisGame
      });

      return { 
        success: true,
        resistanceBonus: totalResistance,
        cooldownApplied: true
      };
    } else {
      // Apply cooldown even on failure to prevent spam
      const cooldownDuration = config.gameBalance.warlockSystem.corruptionCooldown;
      this.corruptionCooldowns.set(warlockId, cooldownDuration);

      return { 
        success: false, 
        reason: 'Corruption resisted',
        resistanceBonus: totalResistance,
        cooldownApplied: true
      };
    }
  }

  /**
   * Get current warlock count
   */
  getWarlockCount(): number {
    return this.numWarlocks;
  }

  /**
   * Get all current warlocks
   */
  getWarlocks(): Player[] {
    return Array.from(this.players.values()).filter(player => player.isWarlock);
  }

  /**
   * Get all good (non-warlock) players
   */
  getGoodPlayers(): Player[] {
    return Array.from(this.players.values()).filter(player => !player.isWarlock);
  }

  /**
   * Check if player is a warlock
   */
  isWarlock(playerId: string): boolean {
    const player = this.players.get(playerId);
    return player?.isWarlock || false;
  }

  /**
   * Get corruption statistics
   */
  getCorruptionStats(): {
    roundCorruptions: number;
    totalCorruptions: number;
    playersOnCooldown: number;
    playersWithPenalty: number;
  } {
    return {
      roundCorruptions: this.roundCorruptions,
      totalCorruptions: this.totalCorruptionsThisGame,
      playersOnCooldown: this.corruptionCooldowns.size,
      playersWithPenalty: this.detectionPenalties.size,
    };
  }

  /**
   * Check if corruption is possible this round
   */
  canCorruptThisRound(): boolean {
    const maxCorruptionsPerRound = config.gameBalance.warlockSystem.maxCorruptionsPerRound;
    return this.roundCorruptions < maxCorruptionsPerRound;
  }

  /**
   * Get comeback corruption resistance modifier
   */
  getComebackCorruptionResistance(): number {
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
  assignInitialWarlock(preferredPlayerId: string | null = null): WarlockAssignmentResult | null {
    const preferredIds = preferredPlayerId ? [preferredPlayerId] : [];
    const warlocks = this.assignInitialWarlocks(preferredIds);
    return warlocks.length > 0 ? warlocks[0] : null;
  }
}

export default WarlockSystem;
export type { CorruptionResult, WarlockAssignmentResult, GameStateUtils };