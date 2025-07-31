/**
 * @fileoverview Tests for useModalState hook
 */
import { renderHook, act } from '@testing-library/react';
import { useModalState } from '../../../../../client/src/pages/GamePage/hooks/useModalState';
import { Ability, Player, GameEvent } from '@client/types/game';

// Mock console.log to avoid test output pollution
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

describe('useModalState', () => {
  let mockAbilities: Ability[];
  let mockBattleResultsData: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAbilities = [
      {
        id: 'fireball',
        name: 'Fireball',
        type: 'attack',
        params: { damage: 25 }
      },
      {
        id: 'heal',
        name: 'Heal',
        type: 'heal',
        params: { healing: 20 }
      }
    ] as Ability[];

    mockBattleResultsData = {
      events: [
        { id: 'event1', message: 'Player attacked' },
        { id: 'event2', message: 'Monster defended' }
      ] as GameEvent[],
      round: 3,
      levelUp: { newLevel: 4, newAbilities: [] },
      winner: null,
      players: [
        { id: 'player1', name: 'Alice', hp: 80 }
      ] as Player[],
      trophyAward: null
    };
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useModalState());

      expect(result.current.showAdaptabilityModal).toBe(false);
      expect(result.current.initialModalAbilities).toBeNull();
      expect(result.current.showBattleResults).toBe(false);
      expect(result.current.battleResultsData).toBeNull();
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useModalState());

      expect(typeof result.current.showAdaptabilityModalWithAbilities).toBe('function');
      expect(typeof result.current.closeAdaptabilityModal).toBe('function');
      expect(typeof result.current.showBattleResultsModal).toBe('function');
      expect(typeof result.current.updateBattleResultsData).toBe('function');
      expect(typeof result.current.closeBattleResultsModal).toBe('function');
    });
  });

  describe('adaptability modal management', () => {
    it('should show adaptability modal with abilities', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showAdaptabilityModalWithAbilities(mockAbilities);
      });

      expect(result.current.showAdaptabilityModal).toBe(true);
      expect(result.current.initialModalAbilities).toEqual(mockAbilities);
    });

    it('should close adaptability modal and clear abilities', () => {
      const { result } = renderHook(() => useModalState());

      // First open the modal
      act(() => {
        result.current.showAdaptabilityModalWithAbilities(mockAbilities);
      });

      expect(result.current.showAdaptabilityModal).toBe(true);
      expect(result.current.initialModalAbilities).toEqual(mockAbilities);

      // Then close it
      act(() => {
        result.current.closeAdaptabilityModal();
      });

      expect(result.current.showAdaptabilityModal).toBe(false);
      expect(result.current.initialModalAbilities).toBeNull();
    });

    it('should handle empty abilities array', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showAdaptabilityModalWithAbilities([]);
      });

      expect(result.current.showAdaptabilityModal).toBe(true);
      expect(result.current.initialModalAbilities).toEqual([]);
    });

    it('should overwrite previous abilities when opened again', () => {
      const { result } = renderHook(() => useModalState());

      const firstAbilities = [mockAbilities[0]];
      const secondAbilities = [mockAbilities[1]];

      // Open with first set
      act(() => {
        result.current.showAdaptabilityModalWithAbilities(firstAbilities);
      });

      expect(result.current.initialModalAbilities).toEqual(firstAbilities);

      // Open with second set (should overwrite)
      act(() => {
        result.current.showAdaptabilityModalWithAbilities(secondAbilities);
      });

      expect(result.current.initialModalAbilities).toEqual(secondAbilities);
      expect(result.current.showAdaptabilityModal).toBe(true);
    });
  });

  describe('battle results modal management', () => {
    it('should show battle results modal with data', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showBattleResultsModal(mockBattleResultsData);
      });

      expect(result.current.showBattleResults).toBe(true);
      expect(result.current.battleResultsData).toEqual(mockBattleResultsData);
    });

    it('should close battle results modal and clear data', () => {
      const { result } = renderHook(() => useModalState());

      // First open the modal
      act(() => {
        result.current.showBattleResultsModal(mockBattleResultsData);
      });

      expect(result.current.showBattleResults).toBe(true);
      expect(result.current.battleResultsData).toEqual(mockBattleResultsData);

      // Then close it
      act(() => {
        result.current.closeBattleResultsModal();
      });

      expect(result.current.showBattleResults).toBe(false);
      expect(result.current.battleResultsData).toBeNull();
    });

    it('should handle minimal battle results data', () => {
      const { result } = renderHook(() => useModalState());
      const minimalData = { round: 1 };

      act(() => {
        result.current.showBattleResultsModal(minimalData);
      });

      expect(result.current.showBattleResults).toBe(true);
      expect(result.current.battleResultsData).toEqual(minimalData);
    });

    it('should overwrite previous data when opened again', () => {
      const { result } = renderHook(() => useModalState());

      const firstData = { round: 1, winner: 'Alice' };
      const secondData = { round: 2, winner: 'Bob' };

      // Open with first data
      act(() => {
        result.current.showBattleResultsModal(firstData);
      });

      expect(result.current.battleResultsData).toEqual(firstData);

      // Open with second data (should overwrite)
      act(() => {
        result.current.showBattleResultsModal(secondData);
      });

      expect(result.current.battleResultsData).toEqual(secondData);
      expect(result.current.showBattleResults).toBe(true);
    });
  });

  describe('battle results data updates', () => {
    it('should update battle results data partially', () => {
      const { result } = renderHook(() => useModalState());

      // First set initial data
      act(() => {
        result.current.showBattleResultsModal(mockBattleResultsData);
      });

      // Then update with partial data
      const updateData = { 
        winner: 'Alice', 
        trophyAward: { name: 'Victory Trophy', description: 'Won the battle' } 
      };

      act(() => {
        result.current.updateBattleResultsData(updateData);
      });

      expect(result.current.battleResultsData).toEqual({
        ...mockBattleResultsData,
        ...updateData
      });
    });

    it('should log update information to console', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showBattleResultsModal(mockBattleResultsData);
      });

      const updateData = { trophyAward: { name: 'Test Trophy' } };

      act(() => {
        result.current.updateBattleResultsData(updateData);
      });

      expect(consoleSpy).toHaveBeenCalledWith('🏆 updateBattleResultsData called with:', updateData);
      expect(consoleSpy).toHaveBeenCalledWith('🏆 Previous battleResultsData:', mockBattleResultsData);
      expect(consoleSpy).toHaveBeenCalledWith('🏆 New battleResultsData:', expect.objectContaining(updateData));
      expect(consoleSpy).toHaveBeenCalledWith('🏆 Trophy in new data:', updateData.trophyAward);
    });

    it('should handle updating null data', () => {
      const { result } = renderHook(() => useModalState());

      const updateData = { winner: 'Alice' };

      act(() => {
        result.current.updateBattleResultsData(updateData);
      });

      expect(result.current.battleResultsData).toEqual(updateData);
      expect(consoleSpy).toHaveBeenCalledWith('🏆 Previous battleResultsData:', null);
    });

    it('should handle empty update data', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showBattleResultsModal(mockBattleResultsData);
      });

      act(() => {
        result.current.updateBattleResultsData({});
      });

      expect(result.current.battleResultsData).toEqual(mockBattleResultsData);
    });

    it('should handle multiple updates', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showBattleResultsModal(mockBattleResultsData);
      });

      act(() => {
        result.current.updateBattleResultsData({ winner: 'Alice' });
      });

      act(() => {
        result.current.updateBattleResultsData({ trophyAward: { name: 'Trophy' } });
      });

      expect(result.current.battleResultsData).toEqual({
        ...mockBattleResultsData,
        winner: 'Alice',
        trophyAward: { name: 'Trophy' }
      });
    });

    it('should overwrite existing properties with new values', () => {
      const { result } = renderHook(() => useModalState());

      const initialData = { round: 1, winner: 'Alice' };
      
      act(() => {
        result.current.showBattleResultsModal(initialData);
      });

      const updateData = { round: 2, winner: 'Bob' };

      act(() => {
        result.current.updateBattleResultsData(updateData);
      });

      expect(result.current.battleResultsData).toEqual(updateData);
    });
  });

  describe('function stability', () => {
    it('should maintain function references across rerenders', () => {
      const { result, rerender } = renderHook(() => useModalState());

      const firstShowAdaptability = result.current.showAdaptabilityModalWithAbilities;
      const firstCloseAdaptability = result.current.closeAdaptabilityModal;
      const firstShowBattleResults = result.current.showBattleResultsModal;
      const firstUpdateBattleResults = result.current.updateBattleResultsData;
      const firstCloseBattleResults = result.current.closeBattleResultsModal;

      rerender();

      expect(result.current.showAdaptabilityModalWithAbilities).toBe(firstShowAdaptability);
      expect(result.current.closeAdaptabilityModal).toBe(firstCloseAdaptability);
      expect(result.current.showBattleResultsModal).toBe(firstShowBattleResults);
      expect(result.current.updateBattleResultsData).toBe(firstUpdateBattleResults);
      expect(result.current.closeBattleResultsModal).toBe(firstCloseBattleResults);
    });
  });

  describe('simultaneous modal operations', () => {
    it('should handle both modals being open simultaneously', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showAdaptabilityModalWithAbilities(mockAbilities);
        result.current.showBattleResultsModal(mockBattleResultsData);
      });

      expect(result.current.showAdaptabilityModal).toBe(true);
      expect(result.current.showBattleResults).toBe(true);
      expect(result.current.initialModalAbilities).toEqual(mockAbilities);
      expect(result.current.battleResultsData).toEqual(mockBattleResultsData);
    });

    it('should handle closing one modal while other remains open', () => {
      const { result } = renderHook(() => useModalState());

      // Open both modals
      act(() => {
        result.current.showAdaptabilityModalWithAbilities(mockAbilities);
        result.current.showBattleResultsModal(mockBattleResultsData);
      });

      // Close adaptability modal
      act(() => {
        result.current.closeAdaptabilityModal();
      });

      expect(result.current.showAdaptabilityModal).toBe(false);
      expect(result.current.initialModalAbilities).toBeNull();
      expect(result.current.showBattleResults).toBe(true);
      expect(result.current.battleResultsData).toEqual(mockBattleResultsData);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null abilities gracefully', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showAdaptabilityModalWithAbilities(null as any);
      });

      expect(result.current.showAdaptabilityModal).toBe(true);
      expect(result.current.initialModalAbilities).toBeNull();
    });

    it('should handle undefined battle results data', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showBattleResultsModal(undefined as any);
      });

      expect(result.current.showBattleResults).toBe(true);
      expect(result.current.battleResultsData).toBeUndefined();
    });

    it('should handle updates with undefined values', () => {
      const { result } = renderHook(() => useModalState());

      act(() => {
        result.current.showBattleResultsModal(mockBattleResultsData);
      });

      act(() => {
        result.current.updateBattleResultsData({ winner: undefined });
      });

      expect(result.current.battleResultsData).toEqual({
        ...mockBattleResultsData,
        winner: undefined
      });
    });
  });

  describe('type safety', () => {
    it('should maintain proper TypeScript interfaces', () => {
      const { result } = renderHook(() => useModalState());

      // Test that the returned object matches expected interface
      expect(result.current).toMatchObject({
        showAdaptabilityModal: expect.any(Boolean),
        initialModalAbilities: expect.anything(),
        showAdaptabilityModalWithAbilities: expect.any(Function),
        closeAdaptabilityModal: expect.any(Function),
        showBattleResults: expect.any(Boolean),
        battleResultsData: expect.anything(),
        showBattleResultsModal: expect.any(Function),
        updateBattleResultsData: expect.any(Function),
        closeBattleResultsModal: expect.any(Function)
      });
    });
  });
});