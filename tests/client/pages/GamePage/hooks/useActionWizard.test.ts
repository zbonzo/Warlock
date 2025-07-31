/**
 * @fileoverview Tests for useActionWizard hook
 */
import { renderHook, act } from '@testing-library/react';
import { useActionWizard } from '../../../../../client/src/pages/GamePage/hooks/useActionWizard';
import useMediaQuery from '../../../../../client/src/hooks/useMediaQuery';
import { Player, Ability } from '../../../../../client/src/types/game';

// Mock dependencies
jest.mock('../../../../../client/src/hooks/useMediaQuery');
const mockUseMediaQuery = useMediaQuery as jest.MockedFunction<typeof useMediaQuery>;

// Mock console methods
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
});

describe('useActionWizard', () => {
  const mockPlayer: Player = {
    id: 'player1',
    name: 'Test Player',
    hp: 100,
    maxHp: 100,
    armor: 0,
    isAlive: true,
    isWarlock: false,
    statusEffects: {}
  };

  const mockAbility: Ability = {
    type: 'fireball',
    name: 'Fireball',
    category: 'Attack',
    target: 'Single'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMediaQuery.mockReturnValue(false); // Default to desktop
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isWizardOpen).toBe(true); // Open for alive player on desktop
      expect(result.current.currentStep).toBe(1);
      expect(result.current.selectedAbility).toBe(null);
      expect(result.current.selectedTarget).toBe(null);
      expect(result.current.submitted).toBe(false);
      expect(result.current.activeTab).toBe('action');
      expect(result.current.showGameState).toBe(false);
    });

    it('should initialize with wizard closed for dead player', () => {
      const deadPlayer = { ...mockPlayer, isAlive: false };
      const { result } = renderHook(() => useActionWizard(deadPlayer));

      expect(result.current.isWizardOpen).toBe(false);
    });

    it('should initialize with wizard closed for stunned player', () => {
      const stunnedPlayer = { 
        ...mockPlayer, 
        statusEffects: { stunned: { turns: 1 } } 
      };
      const { result } = renderHook(() => useActionWizard(stunnedPlayer));

      expect(result.current.isWizardOpen).toBe(false);
    });

    it('should initialize with wizard closed on mobile', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isWizardOpen).toBe(false); // Closed by default on mobile
    });
  });

  describe('desktop behavior', () => {
    it('should open wizard when player can act', () => {
      const { result, rerender } = renderHook(
        ({ player }) => useActionWizard(player),
        { initialProps: { player: { ...mockPlayer, isAlive: false } } }
      );

      expect(result.current.isWizardOpen).toBe(false);

      // Player becomes alive
      rerender({ player: mockPlayer });

      expect(result.current.isWizardOpen).toBe(true);
      expect(result.current.currentStep).toBe(1);
    });

    it('should close wizard when player becomes stunned', () => {
      const { result, rerender } = renderHook(
        ({ player }) => useActionWizard(player),
        { initialProps: { player: mockPlayer } }
      );

      expect(result.current.isWizardOpen).toBe(true);

      // Player becomes stunned
      rerender({ 
        player: { 
          ...mockPlayer, 
          statusEffects: { stunned: { turns: 1 } } 
        } 
      });

      expect(result.current.isWizardOpen).toBe(false);
    });

    it('should reset wizard state on close', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      // Set some state
      act(() => {
        result.current.handleAbilitySelect(mockAbility);
        result.current.handleTargetSelect('target1');
      });

      expect(result.current.currentStep).toBe(2);
      expect(result.current.selectedAbility).toBe(mockAbility);

      // Close wizard
      act(() => {
        result.current.handleCloseWizard();
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.selectedAbility).toBe(null);
      expect(result.current.selectedTarget).toBe(null);
    });
  });

  describe('mobile behavior', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true);
    });

    it('should open wizard when action tab is selected', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      expect(result.current.isWizardOpen).toBe(false);

      act(() => {
        result.current.handleTabChange('action');
      });

      expect(result.current.activeTab).toBe('action');
      expect(result.current.isWizardOpen).toBe(true);
    });

    it('should close wizard when switching away from action tab', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      // First switch to action tab
      act(() => {
        result.current.handleTabChange('action');
      });

      expect(result.current.isWizardOpen).toBe(true);

      // Switch to players tab
      act(() => {
        result.current.handleTabChange('players');
      });

      expect(result.current.activeTab).toBe('players');
      expect(result.current.isWizardOpen).toBe(false);
    });

    it('should prevent switching to action tab for dead player', () => {
      const deadPlayer = { ...mockPlayer, isAlive: false };
      const { result } = renderHook(() => useActionWizard(deadPlayer));

      act(() => {
        result.current.handleTabChange('action');
      });

      expect(result.current.activeTab).toBe('action'); // Stays on initial tab
      expect(console.log).toHaveBeenCalledWith('Cannot switch to action tab - player is dead');
    });

    it('should prevent switching to action tab for stunned player', () => {
      const stunnedPlayer = { 
        ...mockPlayer, 
        statusEffects: { stunned: { turns: 1 } } 
      };
      const { result } = renderHook(() => useActionWizard(stunnedPlayer));

      act(() => {
        result.current.handleTabChange('action');
      });

      expect(result.current.activeTab).toBe('action'); // Stays on initial tab
      expect(console.log).toHaveBeenCalledWith('Cannot switch to action tab - player is stunned');
    });

    it('should switch away from action tab when player dies', () => {
      const { result, rerender } = renderHook(
        ({ player }) => useActionWizard(player),
        { initialProps: { player: mockPlayer } }
      );

      // Switch to action tab
      act(() => {
        result.current.handleTabChange('action');
      });

      expect(result.current.activeTab).toBe('action');

      // Player dies
      rerender({ player: { ...mockPlayer, isAlive: false } });

      expect(result.current.activeTab).toBe('players');
      expect(result.current.isWizardOpen).toBe(false);
    });

    it('should show GameState drawer instead of closing wizard', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.handleTabChange('action');
      });

      act(() => {
        result.current.handleCloseWizard();
      });

      expect(result.current.isWizardOpen).toBe(false);
      expect(result.current.showGameState).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Showing GameState drawer');
    });

    it('should handle GameState drawer navigation', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      // Show GameState
      act(() => {
        result.current.handleShowGameState();
      });

      expect(result.current.showGameState).toBe(true);
      expect(result.current.isWizardOpen).toBe(false);

      // Back to actions
      act(() => {
        result.current.handleBackToActions();
      });

      expect(result.current.showGameState).toBe(false);
      expect(result.current.isWizardOpen).toBe(true);

      // Close GameState completely
      act(() => {
        result.current.handleShowGameState();
      });

      act(() => {
        result.current.handleCloseGameState();
      });

      expect(result.current.showGameState).toBe(false);
    });
  });

  describe('action handling', () => {
    it('should handle ability selection and advance to step 2', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.handleAbilitySelect(mockAbility);
      });

      expect(result.current.selectedAbility).toBe(mockAbility);
      expect(result.current.currentStep).toBe(2);
      expect(console.log).toHaveBeenCalledWith('Ability selected:', mockAbility);
    });

    it('should handle target selection', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.handleTargetSelect('target1');
      });

      expect(result.current.selectedTarget).toBe('target1');
      expect(console.log).toHaveBeenCalledWith('Target selected:', 'target1');
    });

    it('should handle action submission on desktop', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.handleAbilitySelect(mockAbility);
        result.current.handleTargetSelect('target1');
      });

      act(() => {
        result.current.handleSubmitAction();
      });

      expect(result.current.submitted).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Action submitted:', {
        ability: mockAbility,
        target: 'target1'
      });
    });

    it('should handle action submission on mobile and switch tabs', () => {
      mockUseMediaQuery.mockReturnValue(true);
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.handleTabChange('action');
        result.current.handleAbilitySelect(mockAbility);
        result.current.handleTargetSelect('target1');
      });

      act(() => {
        result.current.handleSubmitAction();
      });

      expect(result.current.submitted).toBe(true);
      expect(result.current.isWizardOpen).toBe(false);
      expect(result.current.activeTab).toBe('players');
    });

    it('should reset selection when submitted action is processed', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.handleAbilitySelect(mockAbility);
        result.current.handleTargetSelect('target1');
        result.current.setSubmitted(true);
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.selectedAbility).toBe(null);
      expect(result.current.selectedTarget).toBe(null);
    });

    it('should handle manual step changes', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.handleStepChange(2);
      });

      expect(result.current.currentStep).toBe(2);
    });
  });

  describe('reset functionality', () => {
    it('should reset all wizard state', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      // Set various states
      act(() => {
        result.current.handleAbilitySelect(mockAbility);
        result.current.handleTargetSelect('target1');
        result.current.setSubmitted(true);
        result.current.handleShowGameState();
      });

      act(() => {
        result.current.resetWizard();
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.selectedAbility).toBe(null);
      expect(result.current.selectedTarget).toBe(null);
      expect(result.current.submitted).toBe(false);
      expect(result.current.showGameState).toBe(false);
    });
  });

  describe('external setters', () => {
    it('should handle external setSubmitted', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.setSubmitted(true);
      });

      expect(result.current.submitted).toBe(true);
    });

    it('should handle external setSelectedAbility', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.setSelectedAbility(mockAbility);
      });

      expect(result.current.selectedAbility).toBe(mockAbility);
    });

    it('should handle external setSelectedTarget', () => {
      const { result } = renderHook(() => useActionWizard(mockPlayer));

      act(() => {
        result.current.setSelectedTarget('target1');
      });

      expect(result.current.selectedTarget).toBe('target1');
    });
  });

  describe('responsive behavior switching', () => {
    it('should adapt behavior when switching between mobile and desktop', () => {
      const { result, rerender } = renderHook(() => useActionWizard(mockPlayer));

      // Start on desktop
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isWizardOpen).toBe(true);

      // Switch to mobile
      mockUseMediaQuery.mockReturnValue(true);
      rerender();

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isWizardOpen).toBe(false);

      // Switch back to desktop
      mockUseMediaQuery.mockReturnValue(false);
      rerender();

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isWizardOpen).toBe(true);
    });
  });
});