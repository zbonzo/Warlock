/**
 * @fileoverview Tests for useMobileState hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMobileState } from '@client/pages/GamePage/hooks/useMobileState';
import useMediaQuery from '@client/hooks/useMediaQuery';
import type { Player } from '@client/shared/types';

// Mock useMediaQuery
jest.mock('@client/hooks/useMediaQuery');
const mockUseMediaQuery = useMediaQuery as jest.MockedFunction<typeof useMediaQuery>;

// Mock data
const mockPlayer: Player = {
  id: 'player1',
  name: 'TestPlayer',
  race: 'Artisan',
  class: 'Warrior',
  level: 2,
  hp: 80,
  maxHp: 100,
  isAlive: true,
  statusEffects: {}
} as any;

const mockDeadPlayer: Player = {
  ...mockPlayer,
  isAlive: false,
  hp: 0
} as any;

const mockStunnedPlayer: Player = {
  ...mockPlayer,
  statusEffects: { stunned: true }
} as any;

describe('useMobileState hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to desktop
    mockUseMediaQuery.mockReturnValue(false);
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useMobileState(mockPlayer));

      expect(result.current.isMobile).toBe(false);
      expect(result.current.activeTab).toBe('action');
      expect(result.current.mobileActionStep).toBe(1);
      expect(result.current.showMobileActionWizard).toBe(false);
    });

    it('should reflect mobile state from useMediaQuery', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockPlayer));

      expect(result.current.isMobile).toBe(true);
    });
  });

  describe('mobile wizard behavior', () => {
    it('should open wizard when on mobile and action tab is active', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockPlayer));

      expect(result.current.showMobileActionWizard).toBe(true);
      expect(result.current.mobileActionStep).toBe(1);
    });

    it('should not open wizard for dead player', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockDeadPlayer));

      // Should redirect to players tab instead
      expect(result.current.activeTab).toBe('players');
      expect(result.current.showMobileActionWizard).toBe(false);
    });

    it('should not open wizard for stunned player', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockStunnedPlayer));

      // Should redirect to players tab instead
      expect(result.current.activeTab).toBe('players');
      expect(result.current.showMobileActionWizard).toBe(false);
    });

    it('should close wizard when switching to desktop', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result, rerender } = renderHook(() => useMobileState(mockPlayer));

      expect(result.current.showMobileActionWizard).toBe(true);

      // Switch to desktop
      mockUseMediaQuery.mockReturnValue(false);
      rerender();

      expect(result.current.showMobileActionWizard).toBe(false);
    });

    it('should close wizard when player becomes dead', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result, rerender } = renderHook(
        ({ player }) => useMobileState(player),
        { initialProps: { player: mockPlayer } }
      );

      expect(result.current.showMobileActionWizard).toBe(true);

      // Player dies
      rerender({ player: mockDeadPlayer });

      expect(result.current.showMobileActionWizard).toBe(false);
      expect(result.current.activeTab).toBe('players');
    });

    it('should close wizard when player becomes stunned', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result, rerender } = renderHook(
        ({ player }) => useMobileState(player),
        { initialProps: { player: mockPlayer } }
      );

      expect(result.current.showMobileActionWizard).toBe(true);

      // Player becomes stunned
      rerender({ player: mockStunnedPlayer });

      expect(result.current.showMobileActionWizard).toBe(false);
      expect(result.current.activeTab).toBe('players');
    });
  });

  describe('tab handling', () => {
    it('should handle tab change to action for alive player', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockPlayer));

      act(() => {
        result.current.setActiveTab('players');
      });

      expect(result.current.activeTab).toBe('players');
      expect(result.current.showMobileActionWizard).toBe(false);

      act(() => {
        result.current.handleTabChange('action');
      });

      expect(result.current.activeTab).toBe('action');
      expect(result.current.showMobileActionWizard).toBe(true);
      expect(result.current.mobileActionStep).toBe(1);
    });

    it('should prevent tab change to action for dead player', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockDeadPlayer));

      act(() => {
        result.current.handleTabChange('action');
      });

      // Should not change to action tab
      expect(result.current.activeTab).not.toBe('action');
      expect(result.current.showMobileActionWizard).toBe(false);
    });

    it('should prevent tab change to action for stunned player', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockStunnedPlayer));

      act(() => {
        result.current.handleTabChange('action');
      });

      // Should not change to action tab
      expect(result.current.activeTab).not.toBe('action');
      expect(result.current.showMobileActionWizard).toBe(false);
    });

    it('should handle tab change to non-action tabs', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockPlayer));

      act(() => {
        result.current.handleTabChange('players');
      });

      expect(result.current.activeTab).toBe('players');
      expect(result.current.showMobileActionWizard).toBe(false);

      act(() => {
        result.current.handleTabChange('history');
      });

      expect(result.current.activeTab).toBe('history');
      expect(result.current.showMobileActionWizard).toBe(false);
    });

    it('should close wizard when switching away from action tab', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockPlayer));

      expect(result.current.showMobileActionWizard).toBe(true);

      act(() => {
        result.current.handleTabChange('players');
      });

      expect(result.current.showMobileActionWizard).toBe(false);
    });
  });

  describe('wizard controls', () => {
    it('should close wizard and switch to players tab', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockPlayer));

      expect(result.current.activeTab).toBe('action');
      expect(result.current.showMobileActionWizard).toBe(true);

      act(() => {
        result.current.handleCloseWizard();
      });

      expect(result.current.showMobileActionWizard).toBe(false);
      expect(result.current.activeTab).toBe('players');
    });

    it('should not change tab when closing wizard from non-action tab', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockPlayer));

      act(() => {
        result.current.setActiveTab('history');
        result.current.setShowMobileActionWizard(true);
      });

      act(() => {
        result.current.handleCloseWizard();
      });

      expect(result.current.showMobileActionWizard).toBe(false);
      expect(result.current.activeTab).toBe('history');
    });

    it('should reset wizard state', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockPlayer));

      act(() => {
        result.current.setMobileActionStep(3);
        result.current.setShowMobileActionWizard(true);
      });

      act(() => {
        result.current.resetMobileWizard();
      });

      expect(result.current.mobileActionStep).toBe(1);
      expect(result.current.showMobileActionWizard).toBe(false);
    });
  });

  describe('setters', () => {
    it('should update activeTab via setter', () => {
      const { result } = renderHook(() => useMobileState(mockPlayer));

      act(() => {
        result.current.setActiveTab('history');
      });

      expect(result.current.activeTab).toBe('history');
    });

    it('should update mobileActionStep via setter', () => {
      const { result } = renderHook(() => useMobileState(mockPlayer));

      act(() => {
        result.current.setMobileActionStep(2);
      });

      expect(result.current.mobileActionStep).toBe(2);
    });

    it('should update showMobileActionWizard via setter', () => {
      const { result } = renderHook(() => useMobileState(mockPlayer));

      act(() => {
        result.current.setShowMobileActionWizard(true);
      });

      expect(result.current.showMobileActionWizard).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined player', () => {
      const { result } = renderHook(() => useMobileState(undefined));

      expect(result.current.activeTab).toBe('action');
      expect(result.current.showMobileActionWizard).toBe(false);
    });

    it('should handle player without statusEffects', () => {
      const playerNoStatus = { ...mockPlayer, statusEffects: undefined };
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(playerNoStatus as any));

      expect(result.current.showMobileActionWizard).toBe(true);
    });

    it('should handle rapid tab changes', () => {
      mockUseMediaQuery.mockReturnValue(true);

      const { result } = renderHook(() => useMobileState(mockPlayer));

      act(() => {
        result.current.handleTabChange('players');
        result.current.handleTabChange('history');
        result.current.handleTabChange('action');
      });

      expect(result.current.activeTab).toBe('action');
      expect(result.current.showMobileActionWizard).toBe(true);
    });
  });
});
