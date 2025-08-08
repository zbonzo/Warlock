/**
 * @fileoverview Tests for useActionState hook
 * Tests action selection state management for game page
 */

import { renderHook, act } from '@testing-library/react';
import { useActionState } from '@client/pages/GamePage/hooks/useActionState';
import { Player, Monster, Ability } from '@client/types/game';

// Mock data
const mockAbilities: Ability[] = [
  { type: 'attack', name: 'Attack', category: 'Attack' },
  { type: 'heal', name: 'Heal', category: 'Heal' },
  { type: 'fireball', name: 'Fireball', category: 'Attack' },
  { type: 'shield', name: 'Shield', category: 'Defense' }
];

const mockPlayer: Player = {
  id: 'player1',
  name: 'TestPlayer',
  race: 'Artisan',
  class: 'Warrior',
  level: 2,
  hp: 80,
  maxHp: 100,
  isAlive: true,
  abilityCooldowns: {},
  unlocked: mockAbilities
} as any;

const mockPlayers: Player[] = [
  mockPlayer,
  {
    id: 'player2',
    name: 'Player2',
    race: 'Lich',
    class: 'Wizard',
    level: 2,
    hp: 60,
    maxHp: 100,
    isAlive: true,
    abilityCooldowns: {},
    unlocked: mockAbilities
  } as any,
  {
    id: 'player3',
    name: 'DeadPlayer',
    race: 'Orc',
    class: 'Barbarian',
    level: 1,
    hp: 0,
    maxHp: 100,
    isAlive: false,
    abilityCooldowns: {},
    unlocked: []
  } as any
];

const mockMonster: Monster = {
  id: 'monster1',
  name: 'Test Monster',
  hp: 150,
  maxHp: 200,
  isAlive: true
} as any;

describe('useActionState hook', () => {
  describe('initial state', () => {
    it('should initialize with empty/default values', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      expect(result.current.actionType).toBe('');
      expect(result.current.selectedTarget).toBe('');
      expect(result.current.submitted).toBe(false);
      expect(result.current.selectedAbility).toBeNull();
    });

    it('should derive unlocked abilities from player', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      expect(result.current.unlocked).toEqual(mockAbilities);
    });

    it('should filter alive players', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      expect(result.current.alivePlayers).toHaveLength(2);
      expect(result.current.alivePlayers.every(p => p.isAlive)).toBe(true);
      expect(result.current.alivePlayers.find(p => p.id === 'player3')).toBeUndefined();
    });

    it('should handle null player', () => {
      const { result } = renderHook(() =>
        useActionState(null, mockPlayers, mockMonster)
      );

      expect(result.current.unlocked).toEqual([]);
    });
  });

  describe('state setters', () => {
    it('should update actionType', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setActionType('attack');
      });

      expect(result.current.actionType).toBe('attack');
    });

    it('should update selectedTarget', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setSelectedTarget('player2');
      });

      expect(result.current.selectedTarget).toBe('player2');
    });

    it('should update submitted state', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setSubmitted(true);
      });

      expect(result.current.submitted).toBe(true);
    });

    it('should update selectedAbility', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      const ability = mockAbilities[0];

      act(() => {
        result.current.setSelectedAbility(ability);
      });

      expect(result.current.selectedAbility).toEqual(ability);
    });
  });

  describe('isCurrentSelectionValid', () => {
    it('should return false for empty selection', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should return false for missing actionType', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setSelectedTarget('player2');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should return false for missing selectedTarget', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setActionType('attack');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should return false for unknown ability', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setActionType('unknownAbility');
        result.current.setSelectedTarget('player2');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should return false for ability on cooldown', () => {
      const playerWithCooldown = {
        ...mockPlayer,
        abilityCooldowns: { attack: 2 }
      };

      const { result } = renderHook(() =>
        useActionState(playerWithCooldown, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setActionType('attack');
        result.current.setSelectedTarget('player2');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should return true for valid monster target', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setActionType('attack');
        result.current.setSelectedTarget('__monster__');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(true);
    });

    it('should return false for dead monster target', () => {
      const deadMonster = { ...mockMonster, hp: 0 };

      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, deadMonster)
      );

      act(() => {
        result.current.setActionType('attack');
        result.current.setSelectedTarget('__monster__');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should return true for valid alive player target', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setActionType('heal');
        result.current.setSelectedTarget('player2');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(true);
    });

    it('should return false for dead player target', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setActionType('heal');
        result.current.setSelectedTarget('player3'); // Dead player
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should return false for non-existent player target', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setActionType('heal');
        result.current.setSelectedTarget('nonexistent');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should handle no cooldowns defined', () => {
      const playerNoCooldowns = {
        ...mockPlayer,
        abilityCooldowns: undefined
      };

      const { result } = renderHook(() =>
        useActionState(playerNoCooldowns, mockPlayers, mockMonster)
      );

      act(() => {
        result.current.setActionType('attack');
        result.current.setSelectedTarget('player2');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(true);
    });
  });

  describe('resetActionState', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      // Set some state
      act(() => {
        result.current.setActionType('attack');
        result.current.setSelectedTarget('player2');
        result.current.setSubmitted(true);
        result.current.setSelectedAbility(mockAbilities[0]);
      });

      // Verify state is set
      expect(result.current.actionType).toBe('attack');
      expect(result.current.selectedTarget).toBe('player2');
      expect(result.current.submitted).toBe(true);
      expect(result.current.selectedAbility).toEqual(mockAbilities[0]);

      // Reset
      act(() => {
        result.current.resetActionState();
      });

      // Verify state is reset
      expect(result.current.actionType).toBe('');
      expect(result.current.selectedTarget).toBe('');
      expect(result.current.submitted).toBe(false);
      expect(result.current.selectedAbility).toBeNull();
    });

    it('should not affect derived values', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      const initialUnlocked = result.current.unlocked;
      const initialAlivePlayers = result.current.alivePlayers;

      act(() => {
        result.current.resetActionState();
      });

      expect(result.current.unlocked).toEqual(initialUnlocked);
      expect(result.current.alivePlayers).toEqual(initialAlivePlayers);
    });
  });

  describe('derived values', () => {
    it('should update alivePlayers when players prop changes', () => {
      const { result, rerender } = renderHook(
        ({ players }) => useActionState(mockPlayer, players, mockMonster),
        { initialProps: { players: mockPlayers } }
      );

      expect(result.current.alivePlayers).toHaveLength(2);

      // Add a new alive player
      const newPlayers = [...mockPlayers, {
        id: 'player4',
        name: 'NewPlayer',
        isAlive: true
      } as Player];

      rerender({ players: newPlayers });

      expect(result.current.alivePlayers).toHaveLength(3);
    });

    it('should update unlocked abilities when player changes', () => {
      const { result, rerender } = renderHook(
        ({ player }) => useActionState(player, mockPlayers, mockMonster),
        { initialProps: { player: mockPlayer } }
      );

      expect(result.current.unlocked).toEqual(mockAbilities);

      // Change player with different abilities
      const newAbilities = [mockAbilities[0], mockAbilities[1]];
      const newPlayer = { ...mockPlayer, unlocked: newAbilities };

      rerender({ player: newPlayer });

      expect(result.current.unlocked).toEqual(newAbilities);
    });
  });

  describe('validation edge cases', () => {
    it('should handle null monster', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, null as any)
      );

      act(() => {
        result.current.setActionType('attack');
        result.current.setSelectedTarget('__monster__');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should handle empty players array', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, [], mockMonster)
      );

      expect(result.current.alivePlayers).toEqual([]);

      act(() => {
        result.current.setActionType('heal');
        result.current.setSelectedTarget('player2');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should handle player with no unlocked abilities', () => {
      const playerNoAbilities = { ...mockPlayer, unlocked: [] };

      const { result } = renderHook(() =>
        useActionState(playerNoAbilities, mockPlayers, mockMonster)
      );

      expect(result.current.unlocked).toEqual([]);

      act(() => {
        result.current.setActionType('attack');
        result.current.setSelectedTarget('__monster__');
      });

      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });
  });

  describe('complex scenarios', () => {
    it('should handle complete action selection workflow', () => {
      const { result } = renderHook(() =>
        useActionState(mockPlayer, mockPlayers, mockMonster)
      );

      // Initial state - invalid
      expect(result.current.isCurrentSelectionValid()).toBe(false);

      // Select ability
      act(() => {
        result.current.setActionType('attack');
      });
      expect(result.current.isCurrentSelectionValid()).toBe(false);

      // Select target - now valid
      act(() => {
        result.current.setSelectedTarget('__monster__');
      });
      expect(result.current.isCurrentSelectionValid()).toBe(true);

      // Submit action
      act(() => {
        result.current.setSubmitted(true);
      });
      expect(result.current.submitted).toBe(true);
      expect(result.current.isCurrentSelectionValid()).toBe(true);

      // Reset for new round
      act(() => {
        result.current.resetActionState();
      });
      expect(result.current.isCurrentSelectionValid()).toBe(false);
      expect(result.current.submitted).toBe(false);
    });

    it('should handle target becoming invalid during selection', () => {
      const { result, rerender } = renderHook(
        ({ players }) => useActionState(mockPlayer, players, mockMonster),
        { initialProps: { players: mockPlayers } }
      );

      // Select a player target
      act(() => {
        result.current.setActionType('heal');
        result.current.setSelectedTarget('player2');
      });
      expect(result.current.isCurrentSelectionValid()).toBe(true);

      // Player dies (becomes unavailable)
      const updatedPlayers = mockPlayers.map(p =>
        p.id === 'player2' ? { ...p, isAlive: false } : p
      );

      rerender({ players: updatedPlayers });

      // Selection should now be invalid
      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });

    it('should handle ability going on cooldown during selection', () => {
      const { result, rerender } = renderHook(
        ({ player }) => useActionState(player, mockPlayers, mockMonster),
        { initialProps: { player: mockPlayer } }
      );

      // Select ability and target
      act(() => {
        result.current.setActionType('attack');
        result.current.setSelectedTarget('__monster__');
      });
      expect(result.current.isCurrentSelectionValid()).toBe(true);

      // Ability goes on cooldown
      const playerWithCooldown = {
        ...mockPlayer,
        abilityCooldowns: { attack: 3 }
      };

      rerender({ player: playerWithCooldown });

      // Selection should now be invalid
      expect(result.current.isCurrentSelectionValid()).toBe(false);
    });
  });
});
