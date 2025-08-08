/**
 * @fileoverview Tests for useCharacterUtils hook
 */
import { renderHook } from '@testing-library/react';
import { useCharacterUtils } from '../../../../../client/src/pages/GamePage/hooks/useCharacterUtils';
import { Player } from '@client/types/game';

// Mock Math.random for consistent zalgo testing
const mockMathRandom = jest.spyOn(Math, 'random');

describe('useCharacterUtils', () => {
  let mockPlayer: Player;
  let mockPlayers: Player[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMathRandom.mockReturnValue(0.5); // Consistent random value

    mockPlayer = {
      id: 'player1',
      name: 'Alice',
      race: 'Human',
      class: 'Warrior',
      hp: 80,
      maxHp: 100,
      isAlive: true,
      isWarlock: false,
      level: 3,
      armor: 5,
      isReady: true
    } as Player;

    mockPlayers = [
      mockPlayer,
      {
        id: 'player2',
        name: 'Bob',
        race: 'Elf',
        class: 'Mage',
        hp: 60,
        maxHp: 90,
        isAlive: true,
        isWarlock: false,
        level: 2,
        armor: 2,
        isReady: false
      } as Player,
      {
        id: 'player3',
        name: 'Charlie',
        race: 'Dwarf',
        class: 'Cleric',
        hp: 0,
        maxHp: 110,
        isAlive: false,
        isWarlock: false,
        level: 4,
        armor: 8,
        isReady: false
      } as Player
    ];
  });

  afterEach(() => {
    mockMathRandom.mockRestore();
  });

  describe('toZalgo function', () => {
    it('should corrupt text with zalgo characters', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, mockPlayers)
      );

      const corruptedText = result.current.toZalgo('Hello');

      expect(corruptedText).not.toBe('Hello');
      expect(corruptedText.length).toBeGreaterThan(5); // Should be longer due to combining chars
      expect(corruptedText).toContain('H');
      expect(corruptedText).toContain('e');
      expect(corruptedText).toContain('l');
      expect(corruptedText).toContain('o');
    });

    it('should handle empty string', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, mockPlayers)
      );

      const corruptedText = result.current.toZalgo('');
      expect(corruptedText).toBe('');
    });

    it('should handle single character', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, mockPlayers)
      );

      const corruptedText = result.current.toZalgo('A');
      expect(corruptedText).toContain('A');
      expect(corruptedText.length).toBeGreaterThan(1);
    });

    it('should add combining characters from both above and below arrays', () => {
      // Mock different random values to test both character arrays
      mockMathRandom
        .mockReturnValueOnce(0.1) // numAbove = 1
        .mockReturnValueOnce(0.1) // numBelow = 1
        .mockReturnValueOnce(0.0) // charType = 0 (above)
        .mockReturnValueOnce(0.5) // array index
        .mockReturnValueOnce(0.1) // charType = 0 (above again)
        .mockReturnValueOnce(0.5); // array index

      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, mockPlayers)
      );

      const corruptedText = result.current.toZalgo('X');
      expect(corruptedText).toContain('X');
      expect(corruptedText.length).toBeGreaterThan(1);
    });
  });

  describe('getCharacterTitle function', () => {
    it('should return formatted character title for normal players', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, mockPlayers)
      );

      const title = result.current.getCharacterTitle();
      expect(title).toBe('Alice - Human Warrior');
    });

    it('should return zalgo-corrupted title for warlocks', () => {
      const warlockPlayer = { ...mockPlayer, isWarlock: true };
      const { result } = renderHook(() =>
        useCharacterUtils(warlockPlayer, mockPlayers)
      );

      const title = result.current.getCharacterTitle();
      expect(title).not.toBe('Alice - Human Warrior');
      expect(title).toContain('Alice');
      expect(title).toContain('Human');
      expect(title).toContain('Warrior');
      expect(title.length).toBeGreaterThan('Alice - Human Warrior'.length);
    });

    it('should handle missing race/class information', () => {
      const incompletePlayer = {
        ...mockPlayer,
        race: null,
        class: null
      } as Player;

      const { result } = renderHook(() =>
        useCharacterUtils(incompletePlayer, mockPlayers)
      );

      const title = result.current.getCharacterTitle();
      expect(title).toBe('Alice - Unknown Unknown');
    });

    it('should handle null player', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(null, mockPlayers)
      );

      const title = result.current.getCharacterTitle();
      expect(title).toBe('Unknown Character');
    });

    it('should handle undefined race or class', () => {
      const partialPlayer = {
        ...mockPlayer,
        race: undefined,
        class: 'Warrior'
      } as any;

      const { result } = renderHook(() =>
        useCharacterUtils(partialPlayer, mockPlayers)
      );

      const title = result.current.getCharacterTitle();
      expect(title).toBe('Alice - Unknown Warrior');
    });
  });

  describe('healthPercent calculation', () => {
    it('should calculate correct health percentage', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, mockPlayers)
      );

      expect(result.current.healthPercent).toBe(80); // 80/100 * 100
    });

    it('should handle full health', () => {
      const fullHealthPlayer = { ...mockPlayer, hp: 100 };
      const { result } = renderHook(() =>
        useCharacterUtils(fullHealthPlayer, mockPlayers)
      );

      expect(result.current.healthPercent).toBe(100);
    });

    it('should handle zero health', () => {
      const deadPlayer = { ...mockPlayer, hp: 0 };
      const { result } = renderHook(() =>
        useCharacterUtils(deadPlayer, mockPlayers)
      );

      expect(result.current.healthPercent).toBe(0);
    });

    it('should handle null hp values', () => {
      const nullHpPlayer = { ...mockPlayer, hp: null, maxHp: null } as any;
      const { result } = renderHook(() =>
        useCharacterUtils(nullHpPlayer, mockPlayers)
      );

      expect(result.current.healthPercent).toBe(0);
    });

    it('should handle zero maxHp', () => {
      const zeroMaxHpPlayer = { ...mockPlayer, maxHp: 0 };
      const { result } = renderHook(() =>
        useCharacterUtils(zeroMaxHpPlayer, mockPlayers)
      );

      expect(result.current.healthPercent).toBe(0);
    });

    it('should handle null player', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(null, mockPlayers)
      );

      expect(result.current.healthPercent).toBe(0);
    });
  });

  describe('alivePlayers calculation', () => {
    it('should filter alive players correctly', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, mockPlayers)
      );

      expect(result.current.alivePlayers).toHaveLength(2);
      expect(result.current.alivePlayers[0].id).toBe('player1');
      expect(result.current.alivePlayers[1].id).toBe('player2');
    });

    it('should handle all players dead', () => {
      const allDeadPlayers = mockPlayers.map(p => ({ ...p, isAlive: false }));
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, allDeadPlayers)
      );

      expect(result.current.alivePlayers).toHaveLength(0);
    });

    it('should handle empty players array', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, [])
      );

      expect(result.current.alivePlayers).toHaveLength(0);
    });

    it('should handle all players alive', () => {
      const allAlivePlayers = mockPlayers.map(p => ({ ...p, isAlive: true }));
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, allAlivePlayers)
      );

      expect(result.current.alivePlayers).toHaveLength(3);
    });
  });

  describe('readyProgress calculation', () => {
    it('should calculate ready progress correctly', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, mockPlayers)
      );

      expect(result.current.readyProgress).toEqual({
        total: 2, // 2 alive players
        ready: 1, // 1 ready player (Alice)
        percentage: 50 // 1/2 * 100
      });
    });

    it('should handle all players ready', () => {
      const allReadyPlayers = mockPlayers.map(p => ({
        ...p,
        isReady: true
      } as any));

      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, allReadyPlayers)
      );

      expect(result.current.readyProgress).toEqual({
        total: 2, // Still 2 alive (Charlie is dead)
        ready: 2,
        percentage: 100
      });
    });

    it('should handle no players ready', () => {
      const noReadyPlayers = mockPlayers.map(p => ({
        ...p,
        isReady: false
      } as any));

      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, noReadyPlayers)
      );

      expect(result.current.readyProgress).toEqual({
        total: 2,
        ready: 0,
        percentage: 0
      });
    });

    it('should handle no alive players', () => {
      const allDeadPlayers = mockPlayers.map(p => ({ ...p, isAlive: false }));
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, allDeadPlayers)
      );

      expect(result.current.readyProgress).toEqual({
        total: 0,
        ready: 0,
        percentage: 0
      });
    });

    it('should handle empty players array', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(mockPlayer, [])
      );

      expect(result.current.readyProgress).toEqual({
        total: 0,
        ready: 0,
        percentage: 0
      });
    });
  });

  describe('memoization and performance', () => {
    it('should memoize computed values when dependencies unchanged', () => {
      const { result, rerender } = renderHook(
        ({ me, players }) => useCharacterUtils(me, players),
        { initialProps: { me: mockPlayer, players: mockPlayers } }
      );

      const firstResult = result.current;

      // Rerender with same props
      rerender({ me: mockPlayer, players: mockPlayers });

      const secondResult = result.current;

      // Should be the same references due to memoization
      expect(firstResult.alivePlayers).toBe(secondResult.alivePlayers);
      expect(firstResult.readyProgress).toBe(secondResult.readyProgress);
    });

    it('should recalculate when player health changes', () => {
      const { result, rerender } = renderHook(
        ({ me, players }) => useCharacterUtils(me, players),
        { initialProps: { me: mockPlayer, players: mockPlayers } }
      );

      const initialHealth = result.current.healthPercent;
      expect(initialHealth).toBe(80);

      // Update player health
      const updatedPlayer = { ...mockPlayer, hp: 50 };
      rerender({ me: updatedPlayer, players: mockPlayers });

      expect(result.current.healthPercent).toBe(50);
    });

    it('should recalculate when players array changes', () => {
      const { result, rerender } = renderHook(
        ({ me, players }) => useCharacterUtils(me, players),
        { initialProps: { me: mockPlayer, players: mockPlayers } }
      );

      expect(result.current.alivePlayers).toHaveLength(2);

      // Add new alive player
      const newPlayer = {
        id: 'player4',
        name: 'David',
        isAlive: true,
        isReady: true
      } as Player;

      const updatedPlayers = [...mockPlayers, newPlayer];
      rerender({ me: mockPlayer, players: updatedPlayers });

      expect(result.current.alivePlayers).toHaveLength(3);
      expect(result.current.readyProgress.total).toBe(3);
      expect(result.current.readyProgress.ready).toBe(2);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined/null values gracefully', () => {
      const { result } = renderHook(() =>
        useCharacterUtils(undefined as any, undefined as any)
      );

      expect(result.current.healthPercent).toBe(0);
      expect(result.current.alivePlayers).toEqual([]);
      expect(result.current.readyProgress).toEqual({
        total: 0,
        ready: 0,
        percentage: 0
      });
      expect(result.current.getCharacterTitle()).toBe('Unknown Character');
    });

    it('should handle malformed player objects', () => {
      const malformedPlayer = { name: 'Test' } as Player;
      const malformedPlayers = [{ isAlive: true }] as Player[];

      const { result } = renderHook(() =>
        useCharacterUtils(malformedPlayer, malformedPlayers)
      );

      expect(result.current.healthPercent).toBe(0);
      expect(result.current.alivePlayers).toHaveLength(1);
      expect(typeof result.current.getCharacterTitle()).toBe('string');
    });
  });

  describe('function stability', () => {
    it('should maintain function references across rerenders', () => {
      const { result, rerender } = renderHook(
        ({ me, players }) => useCharacterUtils(me, players),
        { initialProps: { me: mockPlayer, players: mockPlayers } }
      );

      const firstToZalgo = result.current.toZalgo;
      const firstGetCharacterTitle = result.current.getCharacterTitle;

      rerender({ me: mockPlayer, players: mockPlayers });

      expect(result.current.toZalgo).toBe(firstToZalgo);
      expect(result.current.getCharacterTitle).toBe(firstGetCharacterTitle);
    });
  });
});
