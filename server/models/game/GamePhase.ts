/**
 * @fileoverview GamePhase domain model - TypeScript migration
 * Manages game phase transitions and action submission tracking
 * Part of Phase 3: Core Domain Models Migration
 */

import { z } from 'zod';
import logger from '../../utils/logger.js';
import type { GameCode } from '../../types/generated.js';

// Action schemas
const PendingActionSchema = z.object({
  actorId: z.string(),
  actionType: z.string(),
  targetId: z.string().optional(),
  data: z.any().optional(),
});

const PendingRacialActionSchema = z.object({
  actorId: z.string(),
  racialType: z.string(),
  targetId: z.string().optional(),
  data: z.any().optional(),
});

const DisconnectEventSchema = z.object({
  playerId: z.string(),
  reason: z.string(),
  timestamp: z.number(),
});

const PassiveActivationSchema = z.object({
  type: z.string(),
  message: z.string(),
  playerId: z.string().optional(),
  data: z.any().optional(),
});

const PhaseSnapshotSchema = z.object({
  phase: z.enum(['lobby', 'action', 'results']),
  pendingActionCount: z.number().int().min(0),
  pendingRacialActionCount: z.number().int().min(0),
  readyCount: z.number().int().min(0),
  pendingDisconnectEventCount: z.number().int().min(0),
  pendingPassiveActivationCount: z.number().int().min(0),
});

// Type definitions
export type GamePhaseType = 'lobby' | 'action' | 'results';
export type PendingAction = z.infer<typeof PendingActionSchema>;
export type PendingRacialAction = z.infer<typeof PendingRacialActionSchema>;
export type DisconnectEvent = z.infer<typeof DisconnectEventSchema>;
export type PassiveActivation = z.infer<typeof PassiveActivationSchema>;
export type PhaseSnapshot = z.infer<typeof PhaseSnapshotSchema>;

/**
 * GamePhase class manages game phase state and transitions
 * Extracted from GameRoom to improve separation of concerns
 */
export class GamePhase {
  private gameCode: GameCode;
  private phase: GamePhaseType = 'lobby';
  private pendingActions: PendingAction[] = [];
  private pendingRacialActions: PendingRacialAction[] = [];
  private nextReady: Set<string> = new Set();
  private pendingDisconnectEvents: DisconnectEvent[] = [];
  private pendingPassiveActivations: PassiveActivation[] = [];

  /**
   * Create a new game phase manager
   * @param gameCode - Game code for logging
   */
  constructor(gameCode: GameCode) {
    this.gameCode = gameCode;
  }

  /**
   * Get current phase
   * @returns Current phase
   */
  getCurrentPhase(): GamePhaseType {
    return this.phase;
  }

  /**
   * Get current phase (alias for getCurrentPhase)
   * @returns Current phase
   */
  getPhase(): GamePhaseType {
    return this.getCurrentPhase();
  }

  /**
   * Set game phase
   * @param newPhase - New phase ('lobby', 'action', 'results')
   */
  setPhase(newPhase: GamePhaseType): void {
    const validPhases: GamePhaseType[] = ['lobby', 'action', 'results'];
    if (!validPhases.includes(newPhase)) {
      logger.warn('InvalidPhaseTransition', {
        gameCode: this.gameCode,
        currentPhase: this.phase,
        requestedPhase: newPhase
      });
      return;
    }

    const oldPhase = this.phase;
    this.phase = newPhase;

    logger.debug('PhaseTransition', {
      gameCode: this.gameCode,
      oldPhase,
      newPhase: this.phase
    });
  }

  /**
   * Transition to lobby phase
   */
  toLobby(): void {
    this.setPhase('lobby');
  }

  /**
   * Transition to action phase
   */
  toAction(): void {
    this.setPhase('action');
  }

  /**
   * Transition to results phase
   */
  toResults(): void {
    this.setPhase('results');
  }

  /**
   * Check if currently in lobby phase
   * @returns Whether in lobby phase
   */
  isLobby(): boolean {
    return this.phase === 'lobby';
  }

  /**
   * Check if currently in action phase
   * @returns Whether in action phase
   */
  isAction(): boolean {
    return this.phase === 'action';
  }

  /**
   * Check if currently in results phase
   * @returns Whether in results phase
   */
  isResults(): boolean {
    return this.phase === 'results';
  }

  /**
   * Add a pending action
   * @param action - Action object
   */
  addPendingAction(action: PendingAction): void {
    const validatedAction = PendingActionSchema.parse(action);
    this.pendingActions.push(validatedAction);

    logger.debug('ActionAdded', {
      gameCode: this.gameCode,
      actorId: action.actorId,
      actionType: action.actionType,
      targetId: action.targetId,
      pendingCount: this.pendingActions.length
    });
  }

  /**
   * Add a pending racial action
   * @param racialAction - Racial action object
   */
  addPendingRacialAction(racialAction: PendingRacialAction): void {
    const validatedAction = PendingRacialActionSchema.parse(racialAction);
    this.pendingRacialActions.push(validatedAction);

    logger.debug('RacialActionAdded', {
      gameCode: this.gameCode,
      actorId: racialAction.actorId,
      racialType: racialAction.racialType,
      targetId: racialAction.targetId
    });
  }

  /**
   * Get all pending actions
   * @returns Array of pending actions
   */
  getPendingActions(): PendingAction[] {
    return [...this.pendingActions];
  }

  /**
   * Get all pending racial actions
   * @returns Array of pending racial actions
   */
  getPendingRacialActions(): PendingRacialAction[] {
    return [...this.pendingRacialActions];
  }

  /**
   * Set pending actions
   * @param actions - Array of pending actions
   */
  setPendingActions(actions: PendingAction[] | Map<string, any>): void {
    if (actions instanceof Map) {
      // Convert Map to array format
      this.pendingActions = Array.from(actions.values());
    } else {
      this.pendingActions = [...actions];
    }
  }

  /**
   * Set pending racial actions
   * @param actions - Array of pending racial actions
   */
  setPendingRacialActions(actions: PendingRacialAction[] | Map<string, any>): void {
    if (actions instanceof Map) {
      // Convert Map to array format
      this.pendingRacialActions = Array.from(actions.values());
    } else {
      this.pendingRacialActions = [...actions];
    }
  }

  /**
   * Get next ready status as a boolean (for backward compatibility)
   * @returns True if any players are ready for next phase
   */
  getNextReady(): boolean {
    return this.nextReady.size > 0;
  }

  /**
   * Set next ready status (for backward compatibility)
   * @param ready - Ready status
   */
  setNextReady(ready: boolean): void {
    if (!ready) {
      this.nextReady.clear();
    }
    // If true, we keep the existing ready players
  }

  /**
   * Clear all pending actions
   */
  clearPendingActions(): void {
    const actionCount = this.pendingActions.length;
    const racialCount = this.pendingRacialActions.length;

    this.pendingActions = [];
    this.pendingRacialActions = [];

    logger.debug('PendingActionsCleared', {
      gameCode: this.gameCode,
      clearedActions: actionCount,
      clearedRacialActions: racialCount
    });
  }

  /**
   * Remove pending actions for a specific player
   * @param playerId - Player ID
   */
  removePendingActionsForPlayer(playerId: string): void {
    const beforeActions = this.pendingActions.length;
    const beforeRacial = this.pendingRacialActions.length;

    this.pendingActions = this.pendingActions.filter(action => action.actorId !== playerId);
    this.pendingRacialActions = this.pendingRacialActions.filter(action => action.actorId !== playerId);

    const removedActions = beforeActions - this.pendingActions.length;
    const removedRacial = beforeRacial - this.pendingRacialActions.length;

    if (removedActions > 0 || removedRacial > 0) {
      logger.debug('PlayerActionsRemoved', {
        gameCode: this.gameCode,
        playerId,
        removedActions,
        removedRacial
      });
    }
  }

  /**
   * Update pending action target IDs
   * @param oldId - Old target ID
   * @param newId - New target ID
   */
  updatePendingActionTargets(oldId: string, newId: string): void {
    let updatedCount = 0;

    this.pendingActions = this.pendingActions.map(action => {
      if (action.actorId === oldId) {
        action.actorId = newId;
        updatedCount++;
      }
      if (action.targetId === oldId) {
        action.targetId = newId;
        updatedCount++;
      }
      return action;
    });

    this.pendingRacialActions = this.pendingRacialActions.map(action => {
      if (action.actorId === oldId) {
        action.actorId = newId;
        updatedCount++;
      }
      if (action.targetId === oldId) {
        action.targetId = newId;
        updatedCount++;
      }
      return action;
    });

    if (updatedCount > 0) {
      logger.debug('PendingActionTargetsUpdated', {
        gameCode: this.gameCode,
        oldId,
        newId,
        updatedCount
      });
    }
  }

  /**
   * Add a player to ready set
   * @param playerId - Player ID
   */
  setPlayerReady(playerId: string): void {
    this.nextReady.add(playerId);
    logger.debug('PlayerSetReady', {
      gameCode: this.gameCode,
      playerId,
      readyCount: this.nextReady.size
    });
  }

  /**
   * Remove a player from ready set
   * @param playerId - Player ID
   */
  setPlayerNotReady(playerId: string): void {
    const wasReady = this.nextReady.has(playerId);
    this.nextReady.delete(playerId);

    if (wasReady) {
      logger.debug('PlayerSetNotReady', {
        gameCode: this.gameCode,
        playerId,
        readyCount: this.nextReady.size
      });
    }
  }

  /**
   * Check if a player is ready
   * @param playerId - Player ID
   * @returns Whether player is ready
   */
  isPlayerReady(playerId: string): boolean {
    return this.nextReady.has(playerId);
  }

  /**
   * Get ready player count
   * @returns Number of ready players
   */
  getReadyCount(): number {
    return this.nextReady.size;
  }

  /**
   * Clear ready status for all players
   */
  clearReady(): void {
    this.nextReady.clear();
    logger.debug('ReadyStatusCleared', { gameCode: this.gameCode });
  }

  /**
   * Add a pending disconnect event
   * @param event - Disconnect event
   */
  addPendingDisconnectEvent(event: DisconnectEvent): void {
    const validatedEvent = DisconnectEventSchema.parse(event);
    this.pendingDisconnectEvents.push(validatedEvent);
  }

  /**
   * Get and clear pending disconnect events
   * @returns Array of disconnect events
   */
  getPendingDisconnectEvents(): DisconnectEvent[] {
    const events = [...this.pendingDisconnectEvents];
    this.pendingDisconnectEvents = [];
    return events;
  }

  /**
   * Add a pending passive activation message
   * @param message - Passive activation message
   */
  addPendingPassiveActivation(message: PassiveActivation): void {
    const validatedMessage = PassiveActivationSchema.parse(message);
    this.pendingPassiveActivations.push(validatedMessage);
  }

  /**
   * Add multiple pending passive activation messages
   * @param messages - Array of passive activation messages
   */
  addPendingPassiveActivations(messages: PassiveActivation[]): void {
    const validatedMessages = messages.map(msg => PassiveActivationSchema.parse(msg));
    this.pendingPassiveActivations.push(...validatedMessages);
  }

  /**
   * Get and clear pending passive activation messages
   * @returns Array of passive activation messages
   */
  getPendingPassiveActivations(): PassiveActivation[] {
    const messages = [...this.pendingPassiveActivations];
    this.pendingPassiveActivations = [];
    return messages;
  }

  /**
   * Reset phase manager for new round
   */
  resetForNewRound(): void {
    this.clearPendingActions();
    this.clearReady();
    // Note: Don't clear disconnect events or passive activations here
    // They should be processed by the game logic
  }

  /**
   * Get phase manager state snapshot
   * @returns Phase manager state
   */
  getSnapshot(): PhaseSnapshot {
    return PhaseSnapshotSchema.parse({
      phase: this.phase,
      pendingActionCount: this.pendingActions.length,
      pendingRacialActionCount: this.pendingRacialActions.length,
      readyCount: this.nextReady.size,
      pendingDisconnectEventCount: this.pendingDisconnectEvents.length,
      pendingPassiveActivationCount: this.pendingPassiveActivations.length,
    });
  }

  /**
   * Type-safe serialization
   * @returns Serializable phase data
   */
  toJSON(): Record<string, any> {
    return {
      gameCode: this.gameCode,
      phase: this.phase,
      pendingActions: this.pendingActions,
      pendingRacialActions: this.pendingRacialActions,
      nextReady: Array.from(this.nextReady),
      pendingDisconnectEvents: this.pendingDisconnectEvents,
      pendingPassiveActivations: this.pendingPassiveActivations,
    };
  }

  /**
   * Create GamePhase from serialized data
   * @param data - Serialized phase data
   * @returns New GamePhase instance
   */
  static fromJSON(data: any): GamePhase {
    const gamePhase = new GamePhase(data.gameCode);

    gamePhase.phase = data.phase || 'lobby';
    gamePhase.pendingActions = data.pendingActions || [];
    gamePhase.pendingRacialActions = data.pendingRacialActions || [];
    gamePhase.nextReady = new Set(data.nextReady || []);
    gamePhase.pendingDisconnectEvents = data.pendingDisconnectEvents || [];
    gamePhase.pendingPassiveActivations = data.pendingPassiveActivations || [];

    return gamePhase;
  }
}

export default GamePhase;
