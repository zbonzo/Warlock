/**
 * @fileoverview GamePhase domain model
 * Manages game phase transitions and action submission tracking
 */
const logger = require('@utils/logger');

/**
 * GamePhase class manages game phase state and transitions
 * Extracted from GameRoom to improve separation of concerns
 */
class GamePhase {
  /**
   * Create a new game phase manager
   * @param {string} gameCode - Game code for logging
   */
  constructor(gameCode) {
    this.gameCode = gameCode;
    this.phase = 'lobby'; // 'lobby', 'action', 'results'
    this.pendingActions = [];
    this.pendingRacialActions = [];
    this.nextReady = new Set();
    this.pendingDisconnectEvents = [];
    this.pendingPassiveActivations = [];
  }

  /**
   * Get current phase
   * @returns {string} Current phase
   */
  getCurrentPhase() {
    return this.phase;
  }

  /**
   * Set game phase
   * @param {string} newPhase - New phase ('lobby', 'action', 'results')
   */
  setPhase(newPhase) {
    const validPhases = ['lobby', 'action', 'results'];
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
  toLobby() {
    this.setPhase('lobby');
  }

  /**
   * Transition to action phase
   */
  toAction() {
    this.setPhase('action');
  }

  /**
   * Transition to results phase
   */
  toResults() {
    this.setPhase('results');
  }

  /**
   * Check if currently in lobby phase
   * @returns {boolean} Whether in lobby phase
   */
  isLobby() {
    return this.phase === 'lobby';
  }

  /**
   * Check if currently in action phase
   * @returns {boolean} Whether in action phase
   */
  isAction() {
    return this.phase === 'action';
  }

  /**
   * Check if currently in results phase
   * @returns {boolean} Whether in results phase
   */
  isResults() {
    return this.phase === 'results';
  }

  /**
   * Add a pending action
   * @param {Object} action - Action object
   */
  addPendingAction(action) {
    this.pendingActions.push(action);
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
   * @param {Object} racialAction - Racial action object
   */
  addPendingRacialAction(racialAction) {
    this.pendingRacialActions.push(racialAction);
    logger.debug('RacialActionAdded', {
      gameCode: this.gameCode,
      actorId: racialAction.actorId,
      racialType: racialAction.racialType,
      targetId: racialAction.targetId
    });
  }

  /**
   * Get all pending actions
   * @returns {Array} Array of pending actions
   */
  getPendingActions() {
    return [...this.pendingActions];
  }

  /**
   * Get all pending racial actions
   * @returns {Array} Array of pending racial actions
   */
  getPendingRacialActions() {
    return [...this.pendingRacialActions];
  }

  /**
   * Clear all pending actions
   */
  clearPendingActions() {
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
   * @param {string} playerId - Player ID
   */
  removePendingActionsForPlayer(playerId) {
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
   * @param {string} oldId - Old target ID
   * @param {string} newId - New target ID
   */
  updatePendingActionTargets(oldId, newId) {
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
   * @param {string} playerId - Player ID
   */
  setPlayerReady(playerId) {
    this.nextReady.add(playerId);
    logger.debug('PlayerSetReady', {
      gameCode: this.gameCode,
      playerId,
      readyCount: this.nextReady.size
    });
  }

  /**
   * Remove a player from ready set
   * @param {string} playerId - Player ID
   */
  setPlayerNotReady(playerId) {
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
   * @param {string} playerId - Player ID
   * @returns {boolean} Whether player is ready
   */
  isPlayerReady(playerId) {
    return this.nextReady.has(playerId);
  }

  /**
   * Get ready player count
   * @returns {number} Number of ready players
   */
  getReadyCount() {
    return this.nextReady.size;
  }

  /**
   * Clear ready status for all players
   */
  clearReady() {
    this.nextReady.clear();
    logger.debug('ReadyStatusCleared', { gameCode: this.gameCode });
  }

  /**
   * Add a pending disconnect event
   * @param {Object} event - Disconnect event
   */
  addPendingDisconnectEvent(event) {
    this.pendingDisconnectEvents.push(event);
  }

  /**
   * Get and clear pending disconnect events
   * @returns {Array} Array of disconnect events
   */
  getPendingDisconnectEvents() {
    const events = [...this.pendingDisconnectEvents];
    this.pendingDisconnectEvents = [];
    return events;
  }

  /**
   * Add a pending passive activation message
   * @param {Object} message - Passive activation message
   */
  addPendingPassiveActivation(message) {
    this.pendingPassiveActivations.push(message);
  }

  /**
   * Add multiple pending passive activation messages
   * @param {Array} messages - Array of passive activation messages
   */
  addPendingPassiveActivations(messages) {
    this.pendingPassiveActivations.push(...messages);
  }

  /**
   * Get and clear pending passive activation messages
   * @returns {Array} Array of passive activation messages
   */
  getPendingPassiveActivations() {
    const messages = [...this.pendingPassiveActivations];
    this.pendingPassiveActivations = [];
    return messages;
  }

  /**
   * Reset phase manager for new round
   */
  resetForNewRound() {
    this.clearPendingActions();
    this.clearReady();
    // Note: Don't clear disconnect events or passive activations here
    // They should be processed by the game logic
  }

  /**
   * Get phase manager state snapshot
   * @returns {Object} Phase manager state
   */
  getSnapshot() {
    return {
      phase: this.phase,
      pendingActionCount: this.pendingActions.length,
      pendingRacialActionCount: this.pendingRacialActions.length,
      readyCount: this.nextReady.size,
      pendingDisconnectEventCount: this.pendingDisconnectEvents.length,
      pendingPassiveActivationCount: this.pendingPassiveActivations.length,
    };
  }
}

module.exports = { GamePhase };