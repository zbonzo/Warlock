/**
 * @fileoverview Tests for useGameEvents hook
 * Tests game socket event handling
 */

import { renderHook, act } from '@testing-library/react';
import { useGameEvents } from '@client/pages/GamePage/hooks/useGameEvents';
import { Player, Ability, GameEvent } from '@client/types/game';

// Mock Socket.IO
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
};

// Mock console.log to avoid noise in tests
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

// Mock data
const mockPlayer: Player = {
  id: 'player1',
  name: 'TestPlayer',
  submissionStatus: {
    hasSubmitted: false,
    isValid: false,
    validationState: 'pending'
  }
} as any;

const mockAbilities: Ability[] = [
  { type: 'attack', name: 'Attack', category: 'Attack' },
  { type: 'heal', name: 'Heal', category: 'Heal' }
];

const mockGameEvents: GameEvent[] = [
  { type: 'attack', message: 'Player attacked monster', playerId: 'player1' } as any
];

describe('useGameEvents hook', () => {
  const mockParams = {
    showBattleResultsModal: jest.fn(),
    updateBattleResultsData: jest.fn(),
    resetActionState: jest.fn(),
    resetMobileWizard: jest.fn(),
    showAdaptabilityModalWithAbilities: jest.fn(),
    setPhase: jest.fn(),
    setReadyClicked: jest.fn(),
    isMobile: false,
    showMobileActionWizard: false,
    me: mockPlayer
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return refs for validation and intervals', () => {
      const { result } = renderHook(() =>
        useGameEvents(mockSocket as any, mockParams)
      );

      expect(result.current.lastValidActionRef).toBeDefined();
      expect(result.current.submissionCheckInterval).toBeDefined();
      expect(result.current.lastValidActionRef.current).toBeNull();
      expect(result.current.submissionCheckInterval.current).toBeNull();
    });

    it('should not register events when socket is null', () => {
      renderHook(() => useGameEvents(null, mockParams));

      expect(mockSocket.on).not.toHaveBeenCalled();
    });
  });

  describe('player disconnection events', () => {
    it('should register playerDisconnected event listener', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      expect(mockSocket.on).toHaveBeenCalledWith(
        'playerDisconnected',
        expect.any(Function)
      );
    });

    it('should handle playerDisconnected event', () => {
      const { unmount } = renderHook(() =>
        useGameEvents(mockSocket as any, mockParams)
      );

      // Get the event handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'playerDisconnected'
      )?.[1];

      expect(disconnectHandler).toBeDefined();

      // Simulate player disconnection
      const disconnectData = {
        playerName: 'TestPlayer',
        message: 'Connection lost'
      };

      act(() => {
        disconnectHandler(disconnectData);
      });

      expect(consoleLogSpy).toHaveBeenCalledWith('Player disconnected:', disconnectData);
      expect(consoleLogSpy).toHaveBeenCalledWith('TestPlayer has left the game: Connection lost');

      unmount();
      expect(mockSocket.off).toHaveBeenCalledWith('playerDisconnected', disconnectHandler);
    });
  });

  describe('submission state management', () => {
    it('should handle invalid submission state', () => {
      const playerWithInvalidSubmission = {
        ...mockPlayer,
        submissionStatus: {
          hasSubmitted: true,
          isValid: false,
          validationState: 'invalid'
        }
      };

      const params = { ...mockParams, me: playerWithInvalidSubmission };

      renderHook(() => useGameEvents(mockSocket as any, params));

      expect(mockParams.resetActionState).toHaveBeenCalled();
      expect(mockParams.setPhase).toHaveBeenCalledWith('action');
    });

    it('should handle submission that becomes invalid', () => {
      const playerWithBecameInvalid = {
        ...mockPlayer,
        submissionStatus: {
          hasSubmitted: true,
          isValid: false,
          validationState: 'invalid'
        }
      };

      const params = { ...mockParams, me: playerWithBecameInvalid };

      renderHook(() => useGameEvents(mockSocket as any, params));

      expect(mockParams.resetActionState).toHaveBeenCalled();
      expect(mockParams.setPhase).toHaveBeenCalledWith('action');
    });

    it('should not reset when submission is valid', () => {
      const playerWithValidSubmission = {
        ...mockPlayer,
        submissionStatus: {
          hasSubmitted: true,
          isValid: true,
          validationState: 'valid'
        }
      };

      const params = { ...mockParams, me: playerWithValidSubmission };

      renderHook(() => useGameEvents(mockSocket as any, params));

      expect(mockParams.resetActionState).not.toHaveBeenCalled();
    });
  });

  describe('round result events', () => {
    it('should register roundResult event listener', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      expect(mockSocket.on).toHaveBeenCalledWith('roundResult', expect.any(Function));
    });

    it('should handle roundResult event', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const roundResultHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'roundResult'
      )?.[1];

      const roundData = {
        eventsLog: mockGameEvents,
        turn: 3,
        levelUp: { level: 2, abilities: ['newAbility'] },
        winner: null,
        players: [mockPlayer]
      };

      act(() => {
        roundResultHandler(roundData);
      });

      expect(mockParams.showBattleResultsModal).toHaveBeenCalledWith({
        events: mockGameEvents,
        round: 3,
        levelUp: { level: 2, abilities: ['newAbility'] },
        winner: null,
        players: [mockPlayer]
      });

      expect(mockParams.resetActionState).toHaveBeenCalled();
      expect(mockParams.setReadyClicked).toHaveBeenCalledWith(false);
    });

    it('should handle roundResult with winner (game end)', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const roundResultHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'roundResult'
      )?.[1];

      const roundData = {
        eventsLog: mockGameEvents,
        turn: 5,
        winner: 'TestPlayer',
        players: [mockPlayer]
      };

      act(() => {
        roundResultHandler(roundData);
      });

      expect(mockParams.showBattleResultsModal).toHaveBeenCalledWith({
        events: mockGameEvents,
        round: 5,
        levelUp: null,
        winner: 'TestPlayer',
        players: [mockPlayer]
      });

      // Should not reset for game end
      expect(mockParams.resetActionState).not.toHaveBeenCalled();
    });

    it('should reset mobile wizard on mobile devices', () => {
      const mobileParams = {
        ...mockParams,
        isMobile: true,
        showMobileActionWizard: true
      };

      renderHook(() => useGameEvents(mockSocket as any, mobileParams));

      const roundResultHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'roundResult'
      )?.[1];

      const roundData = { eventsLog: [], turn: 1, winner: null, players: [] };

      act(() => {
        roundResultHandler(roundData);
      });

      expect(mockParams.resetMobileWizard).toHaveBeenCalled();
    });
  });

  describe('trophy award events', () => {
    it('should register trophyAwarded event listener', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      expect(mockSocket.on).toHaveBeenCalledWith('trophyAwarded', expect.any(Function));
    });

    it('should handle trophyAwarded event', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const trophyHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'trophyAwarded'
      )?.[1];

      const trophyData = {
        playerName: 'TestPlayer',
        trophyName: 'First Strike',
        trophyDescription: 'Deal the first damage in combat'
      };

      act(() => {
        trophyHandler(trophyData);
      });

      expect(mockParams.updateBattleResultsData).toHaveBeenCalledWith({
        trophyAward: trophyData
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🏆 CLIENT RECEIVED trophyAwarded event:',
        trophyData
      );
    });
  });

  describe('game resume and state update events', () => {
    it('should register resumeGame and gameStateUpdate listeners', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      expect(mockSocket.on).toHaveBeenCalledWith('resumeGame', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('gameStateUpdate', expect.any(Function));
    });

    it('should handle resumeGame event', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const resumeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'resumeGame'
      )?.[1];

      act(() => {
        resumeHandler();
      });

      expect(mockParams.setPhase).toHaveBeenCalledWith('action');
      expect(mockParams.resetActionState).toHaveBeenCalled();
      expect(mockParams.setReadyClicked).toHaveBeenCalledWith(false);
    });

    it('should handle gameStateUpdate event', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const stateUpdateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'gameStateUpdate'
      )?.[1];

      const updateData = { phase: 'results' };

      act(() => {
        stateUpdateHandler(updateData);
      });

      expect(mockParams.setPhase).toHaveBeenCalledWith('results');
    });

    it('should reset state when phase changes to action', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const stateUpdateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'gameStateUpdate'
      )?.[1];

      const updateData = { phase: 'action' };

      act(() => {
        stateUpdateHandler(updateData);
      });

      expect(mockParams.setPhase).toHaveBeenCalledWith('action');
      expect(mockParams.resetActionState).toHaveBeenCalled();
      expect(mockParams.setReadyClicked).toHaveBeenCalledWith(false);
    });

    it('should reset mobile wizard on resume/state update for mobile', () => {
      const mobileParams = {
        ...mockParams,
        isMobile: true,
        showMobileActionWizard: true
      };

      renderHook(() => useGameEvents(mockSocket as any, mobileParams));

      const resumeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'resumeGame'
      )?.[1];

      act(() => {
        resumeHandler();
      });

      expect(mockParams.resetMobileWizard).toHaveBeenCalled();
    });
  });

  describe('adaptability modal events', () => {
    it('should register adaptabilityChooseAbility listener', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      expect(mockSocket.on).toHaveBeenCalledWith(
        'adaptabilityChooseAbility',
        expect.any(Function)
      );
    });

    it('should handle adaptabilityChooseAbility with array format', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const adaptabilityHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'adaptabilityChooseAbility'
      )?.[1];

      const adaptabilityData = {
        abilities: mockAbilities
      };

      act(() => {
        adaptabilityHandler(adaptabilityData);
      });

      expect(mockParams.showAdaptabilityModalWithAbilities).toHaveBeenCalledWith(
        mockAbilities
      );
    });

    it('should handle adaptabilityChooseAbility with object format', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const adaptabilityHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'adaptabilityChooseAbility'
      )?.[1];

      const adaptabilityData = {
        abilities: {
          '1': [mockAbilities[0]],
          '2': [mockAbilities[1]]
        }
      };

      act(() => {
        adaptabilityHandler(adaptabilityData);
      });

      expect(mockParams.showAdaptabilityModalWithAbilities).toHaveBeenCalledWith(
        mockAbilities
      );
    });

    it('should use fallback abilities when no abilities found', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const adaptabilityHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'adaptabilityChooseAbility'
      )?.[1];

      const adaptabilityData = { abilities: [] };

      act(() => {
        adaptabilityHandler(adaptabilityData);
      });

      // Should call with fallback abilities
      expect(mockParams.showAdaptabilityModalWithAbilities).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'strike', name: 'Strike' }),
          expect.objectContaining({ type: 'fireball', name: 'Fireball' }),
          expect.objectContaining({ type: 'heal', name: 'Heal' }),
          expect.objectContaining({ type: 'shield', name: 'Shield' })
        ])
      );
    });

    it('should handle missing abilities data', () => {
      renderHook(() => useGameEvents(mockSocket as any, mockParams));

      const adaptabilityHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'adaptabilityChooseAbility'
      )?.[1];

      const adaptabilityData = {};

      act(() => {
        adaptabilityHandler(adaptabilityData);
      });

      // Should not call showAdaptabilityModalWithAbilities when no abilities
      expect(mockParams.showAdaptabilityModalWithAbilities).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove all event listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        useGameEvents(mockSocket as any, mockParams)
      );

      // Track the handlers that were registered
      const registeredHandlers = mockSocket.on.mock.calls.map(call => ({
        event: call[0],
        handler: call[1]
      }));

      unmount();

      // Verify all handlers were removed
      registeredHandlers.forEach(({ event, handler }) => {
        expect(mockSocket.off).toHaveBeenCalledWith(event, handler);
      });
    });

    it('should not attempt cleanup when socket is null', () => {
      const { rerender, unmount } = renderHook(
        ({ socket }) => useGameEvents(socket, mockParams),
        { initialProps: { socket: mockSocket as any } }
      );

      // Change to null socket
      rerender({ socket: null });

      unmount();

      // Should still clean up from when socket was not null
      expect(mockSocket.off).toHaveBeenCalled();
    });
  });

  describe('dependency updates', () => {
    it('should re-register handlers when socket changes', () => {
      const newMockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      };

      const { rerender } = renderHook(
        ({ socket }) => useGameEvents(socket, mockParams),
        { initialProps: { socket: mockSocket as any } }
      );

      const initialCallCount = mockSocket.on.mock.calls.length;

      // Change socket
      rerender({ socket: newMockSocket as any });

      // Old socket should be cleaned up
      expect(mockSocket.off).toHaveBeenCalled();

      // New socket should have handlers registered
      expect(newMockSocket.on).toHaveBeenCalled();
    });

    it('should update handlers when callback dependencies change', () => {
      const newShowBattleResultsModal = jest.fn();
      const newParams = {
        ...mockParams,
        showBattleResultsModal: newShowBattleResultsModal
      };

      const { rerender } = renderHook(
        ({ params }) => useGameEvents(mockSocket as any, params),
        { initialProps: { params: mockParams } }
      );

      // Change the callback
      rerender({ params: newParams });

      // Should re-register with new callback
      const roundResultHandler = mockSocket.on.mock.calls
        .filter(call => call[0] === 'roundResult')
        .pop()?.[1];

      const roundData = { eventsLog: [], turn: 1, winner: null, players: [] };

      act(() => {
        roundResultHandler(roundData);
      });

      expect(newShowBattleResultsModal).toHaveBeenCalled();
      expect(mockParams.showBattleResultsModal).not.toHaveBeenCalled();
    });
  });
});