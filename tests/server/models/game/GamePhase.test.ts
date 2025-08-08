/**
 * @fileoverview Tests for GamePhase domain model
 * Tests game phase transitions and action submission tracking
 */

import {
  GamePhase,
  GamePhaseType,
  PendingAction,
  PendingRacialAction,
  DisconnectEvent,
  PassiveActivation
} from '@server/models/game/GamePhase';

// Mock logger to avoid console output during tests
jest.mock('@utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('GamePhase', () => {
  let gamePhase: GamePhase;

  beforeEach(() => {
    gamePhase = new GamePhase('TEST123');
  });

  describe('constructor', () => {
    it('should create GamePhase with game code and default lobby phase', () => {
      expect(gamePhase).toBeInstanceOf(GamePhase);
      expect(gamePhase.getCurrentPhase()).toBe('lobby');
    });

    it('should initialize with empty state', () => {
      expect(gamePhase.getPendingActions()).toEqual([]);
      expect(gamePhase.getPendingRacialActions()).toEqual([]);
      expect(gamePhase.getReadyCount()).toBe(0);
    });
  });

  describe('phase management', () => {
    describe('getCurrentPhase', () => {
      it('should return current phase', () => {
        expect(gamePhase.getCurrentPhase()).toBe('lobby');
      });
    });

    describe('setPhase', () => {
      it('should set valid phases', () => {
        gamePhase.setPhase('action');
        expect(gamePhase.getCurrentPhase()).toBe('action');

        gamePhase.setPhase('results');
        expect(gamePhase.getCurrentPhase()).toBe('results');

        gamePhase.setPhase('lobby');
        expect(gamePhase.getCurrentPhase()).toBe('lobby');
      });

      it('should reject invalid phases', () => {
        const invalidPhase = 'invalid' as GamePhaseType;
        gamePhase.setPhase(invalidPhase);

        // Should remain in lobby phase
        expect(gamePhase.getCurrentPhase()).toBe('lobby');
      });
    });

    describe('phase transition methods', () => {
      it('should transition to lobby', () => {
        gamePhase.setPhase('action');
        gamePhase.toLobby();
        expect(gamePhase.getCurrentPhase()).toBe('lobby');
      });

      it('should transition to action', () => {
        gamePhase.toAction();
        expect(gamePhase.getCurrentPhase()).toBe('action');
      });

      it('should transition to results', () => {
        gamePhase.toResults();
        expect(gamePhase.getCurrentPhase()).toBe('results');
      });
    });

    describe('phase checking methods', () => {
      it('should check if in lobby phase', () => {
        expect(gamePhase.isLobby()).toBe(true);
        expect(gamePhase.isAction()).toBe(false);
        expect(gamePhase.isResults()).toBe(false);
      });

      it('should check if in action phase', () => {
        gamePhase.toAction();
        expect(gamePhase.isLobby()).toBe(false);
        expect(gamePhase.isAction()).toBe(true);
        expect(gamePhase.isResults()).toBe(false);
      });

      it('should check if in results phase', () => {
        gamePhase.toResults();
        expect(gamePhase.isLobby()).toBe(false);
        expect(gamePhase.isAction()).toBe(false);
        expect(gamePhase.isResults()).toBe(true);
      });
    });
  });

  describe('pending actions management', () => {
    const mockAction: PendingAction = {
      actorId: 'player1',
      actionType: 'attack',
      targetId: 'monster1',
      data: { damage: 10 }
    };

    const mockRacialAction: PendingRacialAction = {
      actorId: 'player1',
      racialType: 'bloodRage',
      targetId: 'self',
      data: { boost: 2 }
    };

    describe('addPendingAction', () => {
      it('should add valid pending action', () => {
        gamePhase.addPendingAction(mockAction);

        const actions = gamePhase.getPendingActions();
        expect(actions).toHaveLength(1);
        expect(actions[0]).toEqual(mockAction);
      });

      it('should validate action schema', () => {
        // Missing required fields should still work due to Zod parsing
        const incompleteAction = {
          actorId: 'player1',
          actionType: 'heal'
          // missing targetId (optional)
        } as PendingAction;

        expect(() => {
          gamePhase.addPendingAction(incompleteAction);
        }).not.toThrow();
      });

      it('should maintain action order', () => {
        const action1 = { ...mockAction, actorId: 'player1' };
        const action2 = { ...mockAction, actorId: 'player2' };
        const action3 = { ...mockAction, actorId: 'player3' };

        gamePhase.addPendingAction(action1);
        gamePhase.addPendingAction(action2);
        gamePhase.addPendingAction(action3);

        const actions = gamePhase.getPendingActions();
        expect(actions[0].actorId).toBe('player1');
        expect(actions[1].actorId).toBe('player2');
        expect(actions[2].actorId).toBe('player3');
      });
    });

    describe('addPendingRacialAction', () => {
      it('should add valid pending racial action', () => {
        gamePhase.addPendingRacialAction(mockRacialAction);

        const actions = gamePhase.getPendingRacialActions();
        expect(actions).toHaveLength(1);
        expect(actions[0]).toEqual(mockRacialAction);
      });

      it('should handle multiple racial actions', () => {
        const racial1 = { ...mockRacialAction, actorId: 'player1' };
        const racial2 = { ...mockRacialAction, actorId: 'player2', racialType: 'stoneArmor' };

        gamePhase.addPendingRacialAction(racial1);
        gamePhase.addPendingRacialAction(racial2);

        const actions = gamePhase.getPendingRacialActions();
        expect(actions).toHaveLength(2);
        expect(actions[0].racialType).toBe('bloodRage');
        expect(actions[1].racialType).toBe('stoneArmor');
      });
    });

    describe('getPendingActions', () => {
      it('should return copy of pending actions', () => {
        gamePhase.addPendingAction(mockAction);

        const actions1 = gamePhase.getPendingActions();
        const actions2 = gamePhase.getPendingActions();

        expect(actions1).toEqual(actions2);
        expect(actions1).not.toBe(actions2); // Different arrays

        // Modifying returned array shouldn't affect internal state
        actions1.push({ ...mockAction, actorId: 'player2' });
        expect(gamePhase.getPendingActions()).toHaveLength(1);
      });
    });

    describe('clearPendingActions', () => {
      it('should clear all pending actions', () => {
        gamePhase.addPendingAction(mockAction);
        gamePhase.addPendingRacialAction(mockRacialAction);

        expect(gamePhase.getPendingActions()).toHaveLength(1);
        expect(gamePhase.getPendingRacialActions()).toHaveLength(1);

        gamePhase.clearPendingActions();

        expect(gamePhase.getPendingActions()).toHaveLength(0);
        expect(gamePhase.getPendingRacialActions()).toHaveLength(0);
      });
    });

    describe('removePendingActionsForPlayer', () => {
      it('should remove actions for specific player', () => {
        const action1 = { ...mockAction, actorId: 'player1' };
        const action2 = { ...mockAction, actorId: 'player2' };
        const racial1 = { ...mockRacialAction, actorId: 'player1' };
        const racial2 = { ...mockRacialAction, actorId: 'player2' };

        gamePhase.addPendingAction(action1);
        gamePhase.addPendingAction(action2);
        gamePhase.addPendingRacialAction(racial1);
        gamePhase.addPendingRacialAction(racial2);

        gamePhase.removePendingActionsForPlayer('player1');

        const remainingActions = gamePhase.getPendingActions();
        const remainingRacial = gamePhase.getPendingRacialActions();

        expect(remainingActions).toHaveLength(1);
        expect(remainingActions[0].actorId).toBe('player2');
        expect(remainingRacial).toHaveLength(1);
        expect(remainingRacial[0].actorId).toBe('player2');
      });

      it('should handle non-existent player gracefully', () => {
        gamePhase.addPendingAction(mockAction);

        expect(() => {
          gamePhase.removePendingActionsForPlayer('nonexistent');
        }).not.toThrow();

        expect(gamePhase.getPendingActions()).toHaveLength(1);
      });
    });

    describe('updatePendingActionTargets', () => {
      it('should update actor IDs', () => {
        const action = { ...mockAction, actorId: 'oldId' };
        gamePhase.addPendingAction(action);

        gamePhase.updatePendingActionTargets('oldId', 'newId');

        const actions = gamePhase.getPendingActions();
        expect(actions[0].actorId).toBe('newId');
      });

      it('should update target IDs', () => {
        const action = { ...mockAction, targetId: 'oldTarget' };
        gamePhase.addPendingAction(action);

        gamePhase.updatePendingActionTargets('oldTarget', 'newTarget');

        const actions = gamePhase.getPendingActions();
        expect(actions[0].targetId).toBe('newTarget');
      });

      it('should update both actions and racial actions', () => {
        const action = { ...mockAction, actorId: 'oldId', targetId: 'oldTarget' };
        const racial = { ...mockRacialAction, actorId: 'oldId', targetId: 'oldTarget' };

        gamePhase.addPendingAction(action);
        gamePhase.addPendingRacialAction(racial);

        gamePhase.updatePendingActionTargets('oldId', 'newId');
        gamePhase.updatePendingActionTargets('oldTarget', 'newTarget');

        const actions = gamePhase.getPendingActions();
        const racialActions = gamePhase.getPendingRacialActions();

        expect(actions[0].actorId).toBe('newId');
        expect(actions[0].targetId).toBe('newTarget');
        expect(racialActions[0].actorId).toBe('newId');
        expect(racialActions[0].targetId).toBe('newTarget');
      });
    });
  });

  describe('ready status management', () => {
    describe('setPlayerReady', () => {
      it('should mark player as ready', () => {
        gamePhase.setPlayerReady('player1');

        expect(gamePhase.isPlayerReady('player1')).toBe(true);
        expect(gamePhase.getReadyCount()).toBe(1);
      });

      it('should handle duplicate ready calls', () => {
        gamePhase.setPlayerReady('player1');
        gamePhase.setPlayerReady('player1');

        expect(gamePhase.getReadyCount()).toBe(1);
      });

      it('should track multiple ready players', () => {
        gamePhase.setPlayerReady('player1');
        gamePhase.setPlayerReady('player2');
        gamePhase.setPlayerReady('player3');

        expect(gamePhase.getReadyCount()).toBe(3);
        expect(gamePhase.isPlayerReady('player1')).toBe(true);
        expect(gamePhase.isPlayerReady('player2')).toBe(true);
        expect(gamePhase.isPlayerReady('player3')).toBe(true);
      });
    });

    describe('setPlayerNotReady', () => {
      it('should unmark player as ready', () => {
        gamePhase.setPlayerReady('player1');
        expect(gamePhase.isPlayerReady('player1')).toBe(true);

        gamePhase.setPlayerNotReady('player1');
        expect(gamePhase.isPlayerReady('player1')).toBe(false);
        expect(gamePhase.getReadyCount()).toBe(0);
      });

      it('should handle unready calls for non-ready players', () => {
        expect(() => {
          gamePhase.setPlayerNotReady('player1');
        }).not.toThrow();

        expect(gamePhase.getReadyCount()).toBe(0);
      });
    });

    describe('clearReady', () => {
      it('should clear all ready status', () => {
        gamePhase.setPlayerReady('player1');
        gamePhase.setPlayerReady('player2');
        gamePhase.setPlayerReady('player3');

        expect(gamePhase.getReadyCount()).toBe(3);

        gamePhase.clearReady();

        expect(gamePhase.getReadyCount()).toBe(0);
        expect(gamePhase.isPlayerReady('player1')).toBe(false);
        expect(gamePhase.isPlayerReady('player2')).toBe(false);
        expect(gamePhase.isPlayerReady('player3')).toBe(false);
      });
    });
  });

  describe('disconnect events management', () => {
    const mockDisconnectEvent: DisconnectEvent = {
      playerId: 'player1',
      reason: 'Connection lost',
      timestamp: Date.now()
    };

    it('should add pending disconnect event', () => {
      gamePhase.addPendingDisconnectEvent(mockDisconnectEvent);

      // Events are cleared when retrieved
      const events = gamePhase.getPendingDisconnectEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(mockDisconnectEvent);
    });

    it('should clear events after retrieval', () => {
      gamePhase.addPendingDisconnectEvent(mockDisconnectEvent);

      const events1 = gamePhase.getPendingDisconnectEvents();
      const events2 = gamePhase.getPendingDisconnectEvents();

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(0);
    });

    it('should handle multiple disconnect events', () => {
      const event1 = { ...mockDisconnectEvent, playerId: 'player1' };
      const event2 = { ...mockDisconnectEvent, playerId: 'player2' };

      gamePhase.addPendingDisconnectEvent(event1);
      gamePhase.addPendingDisconnectEvent(event2);

      const events = gamePhase.getPendingDisconnectEvents();
      expect(events).toHaveLength(2);
      expect(events[0].playerId).toBe('player1');
      expect(events[1].playerId).toBe('player2');
    });
  });

  describe('passive activations management', () => {
    const mockPassiveActivation: PassiveActivation = {
      type: 'regeneration',
      message: 'Player regenerated 5 HP',
      playerId: 'player1',
      data: { amount: 5 }
    };

    it('should add pending passive activation', () => {
      gamePhase.addPendingPassiveActivation(mockPassiveActivation);

      const activations = gamePhase.getPendingPassiveActivations();
      expect(activations).toHaveLength(1);
      expect(activations[0]).toEqual(mockPassiveActivation);
    });

    it('should add multiple passive activations', () => {
      const activation1 = { ...mockPassiveActivation, playerId: 'player1' };
      const activation2 = { ...mockPassiveActivation, playerId: 'player2', type: 'poison' };

      gamePhase.addPendingPassiveActivations([activation1, activation2]);

      const activations = gamePhase.getPendingPassiveActivations();
      expect(activations).toHaveLength(2);
      expect(activations[0].playerId).toBe('player1');
      expect(activations[1].type).toBe('poison');
    });

    it('should clear activations after retrieval', () => {
      gamePhase.addPendingPassiveActivation(mockPassiveActivation);

      const activations1 = gamePhase.getPendingPassiveActivations();
      const activations2 = gamePhase.getPendingPassiveActivations();

      expect(activations1).toHaveLength(1);
      expect(activations2).toHaveLength(0);
    });
  });

  describe('reset and state management', () => {
    describe('resetForNewRound', () => {
      it('should reset actions and ready status but preserve events', () => {
        // Setup state
        gamePhase.addPendingAction(mockAction);
        gamePhase.addPendingRacialAction({
          actorId: 'player1',
          racialType: 'bloodRage'
        } as PendingRacialAction);
        gamePhase.setPlayerReady('player1');
        gamePhase.addPendingDisconnectEvent({
          playerId: 'player1',
          reason: 'test',
          timestamp: Date.now()
        });

        gamePhase.resetForNewRound();

        // Actions and ready should be cleared
        expect(gamePhase.getPendingActions()).toHaveLength(0);
        expect(gamePhase.getPendingRacialActions()).toHaveLength(0);
        expect(gamePhase.getReadyCount()).toBe(0);

        // Events should be preserved
        expect(gamePhase.getPendingDisconnectEvents()).toHaveLength(1);
      });
    });

    describe('getSnapshot', () => {
      it('should return current state snapshot', () => {
        gamePhase.toAction();
        gamePhase.addPendingAction(mockAction);
        gamePhase.addPendingRacialAction({
          actorId: 'player1',
          racialType: 'bloodRage'
        } as PendingRacialAction);
        gamePhase.setPlayerReady('player1');
        gamePhase.setPlayerReady('player2');

        const snapshot = gamePhase.getSnapshot();

        expect(snapshot.phase).toBe('action');
        expect(snapshot.pendingActionCount).toBe(1);
        expect(snapshot.pendingRacialActionCount).toBe(1);
        expect(snapshot.readyCount).toBe(2);
        expect(snapshot.pendingDisconnectEventCount).toBe(0);
        expect(snapshot.pendingPassiveActivationCount).toBe(0);
      });
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      gamePhase.toAction();
      gamePhase.addPendingAction(mockAction);
      gamePhase.setPlayerReady('player1');

      const json = gamePhase.toJSON();

      expect(json.gameCode).toBe('TEST123');
      expect(json.phase).toBe('action');
      expect(json.pendingActions).toHaveLength(1);
      expect(json.nextReady).toContain('player1');
    });

    it('should deserialize from JSON', () => {
      const json = {
        gameCode: 'RESTORED',
        phase: 'results',
        pendingActions: [mockAction],
        pendingRacialActions: [],
        nextReady: ['player1', 'player2'],
        pendingDisconnectEvents: [],
        pendingPassiveActivations: []
      };

      const restored = GamePhase.fromJSON(json);

      expect(restored.getCurrentPhase()).toBe('results');
      expect(restored.getPendingActions()).toHaveLength(1);
      expect(restored.getReadyCount()).toBe(2);
      expect(restored.isPlayerReady('player1')).toBe(true);
      expect(restored.isPlayerReady('player2')).toBe(true);
    });

    it('should handle partial JSON data with defaults', () => {
      const partialJson = {
        gameCode: 'PARTIAL'
        // Missing other fields
      };

      const restored = GamePhase.fromJSON(partialJson);

      expect(restored.getCurrentPhase()).toBe('lobby');
      expect(restored.getPendingActions()).toHaveLength(0);
      expect(restored.getReadyCount()).toBe(0);
    });

    it('should maintain functionality after serialization roundtrip', () => {
      gamePhase.toAction();
      gamePhase.addPendingAction(mockAction);
      gamePhase.setPlayerReady('player1');

      const json = gamePhase.toJSON();
      const restored = GamePhase.fromJSON(json);

      // Should maintain all state
      expect(restored.getCurrentPhase()).toBe('action');
      expect(restored.getPendingActions()).toHaveLength(1);
      expect(restored.isPlayerReady('player1')).toBe(true);

      // Should maintain functionality
      restored.setPlayerReady('player2');
      expect(restored.getReadyCount()).toBe(2);

      restored.toResults();
      expect(restored.isResults()).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete round workflow', () => {
      // Start in lobby
      expect(gamePhase.isLobby()).toBe(true);

      // Transition to action phase
      gamePhase.toAction();
      expect(gamePhase.isAction()).toBe(true);

      // Players submit actions
      gamePhase.addPendingAction({ ...mockAction, actorId: 'player1' });
      gamePhase.addPendingAction({ ...mockAction, actorId: 'player2' });
      expect(gamePhase.getPendingActions()).toHaveLength(2);

      // Move to results phase
      gamePhase.toResults();
      expect(gamePhase.isResults()).toBe(true);

      // Players ready for next round
      gamePhase.setPlayerReady('player1');
      gamePhase.setPlayerReady('player2');
      expect(gamePhase.getReadyCount()).toBe(2);

      // Reset for new round
      gamePhase.resetForNewRound();
      gamePhase.toAction();

      expect(gamePhase.isAction()).toBe(true);
      expect(gamePhase.getPendingActions()).toHaveLength(0);
      expect(gamePhase.getReadyCount()).toBe(0);
    });

    it('should handle player disconnection during action phase', () => {
      gamePhase.toAction();

      // Player submits action
      gamePhase.addPendingAction({ ...mockAction, actorId: 'player1' });
      gamePhase.setPlayerReady('player1');

      // Player disconnects
      gamePhase.addPendingDisconnectEvent({
        playerId: 'player1',
        reason: 'Connection lost',
        timestamp: Date.now()
      });

      // Remove their pending actions
      gamePhase.removePendingActionsForPlayer('player1');

      expect(gamePhase.getPendingActions()).toHaveLength(0);
      expect(gamePhase.isPlayerReady('player1')).toBe(true); // Ready status preserved
      expect(gamePhase.getPendingDisconnectEvents()).toHaveLength(1);
    });

    it('should handle complex action coordination', () => {
      gamePhase.toAction();

      // Multiple players with different action types
      const actions = [
        { actorId: 'player1', actionType: 'attack', targetId: 'monster' },
        { actorId: 'player2', actionType: 'heal', targetId: 'player1' },
        { actorId: 'player3', actionType: 'defend', targetId: 'self' }
      ] as PendingAction[];

      const racialActions = [
        { actorId: 'player1', racialType: 'bloodRage', targetId: 'self' },
        { actorId: 'player2', racialType: 'stoneArmor', targetId: 'self' }
      ] as PendingRacialAction[];

      actions.forEach(action => gamePhase.addPendingAction(action));
      racialActions.forEach(racial => gamePhase.addPendingRacialAction(racial));

      expect(gamePhase.getPendingActions()).toHaveLength(3);
      expect(gamePhase.getPendingRacialActions()).toHaveLength(2);

      // Simulate ID changes (reconnection)
      gamePhase.updatePendingActionTargets('player1', 'newPlayer1');

      const updatedActions = gamePhase.getPendingActions();
      const updatedRacial = gamePhase.getPendingRacialActions();

      expect(updatedActions[0].actorId).toBe('newPlayer1');
      expect(updatedActions[1].targetId).toBe('newPlayer1'); // heal target updated
      expect(updatedRacial[0].actorId).toBe('newPlayer1');
    });
  });
});
