/**
 * @fileoverview Tests for useRacialAbilities hook
 */
import { renderHook, act } from '@testing-library/react';
import { useRacialAbilities } from '../../../../../client/src/pages/GamePage/hooks/useRacialAbilities';

// Mock console.log to avoid test output pollution
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

describe('useRacialAbilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useRacialAbilities());

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(false);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useRacialAbilities());

      expect(typeof result.current.setBloodRageActive).toBe('function');
      expect(typeof result.current.setKeenSensesActive).toBe('function');
      expect(typeof result.current.setRacialSelected).toBe('function');
      expect(typeof result.current.handleRacialAbilityUse).toBe('function');
      expect(typeof result.current.resetRacialStates).toBe('function');
    });
  });

  describe('direct state setters', () => {
    it('should set bloodRageActive correctly', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.setBloodRageActive(true);
      });

      expect(result.current.bloodRageActive).toBe(true);

      act(() => {
        result.current.setBloodRageActive(false);
      });

      expect(result.current.bloodRageActive).toBe(false);
    });

    it('should set keenSensesActive correctly', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.setKeenSensesActive(true);
      });

      expect(result.current.keenSensesActive).toBe(true);

      act(() => {
        result.current.setKeenSensesActive(false);
      });

      expect(result.current.keenSensesActive).toBe(false);
    });

    it('should set racialSelected correctly', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.setRacialSelected(true);
      });

      expect(result.current.racialSelected).toBe(true);

      act(() => {
        result.current.setRacialSelected(false);
      });

      expect(result.current.racialSelected).toBe(false);
    });

    it('should allow setting multiple states independently', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.setBloodRageActive(true);
        result.current.setKeenSensesActive(true);
        result.current.setRacialSelected(true);
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);
    });
  });

  describe('handleRacialAbilityUse function', () => {
    it('should activate bloodRage and set racialSelected when bloodRage is used', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.handleRacialAbilityUse('bloodRage');
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Racial ability used:', 'bloodRage');
    });

    it('should activate keenSenses and set racialSelected when keenSenses is used', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.handleRacialAbilityUse('keenSenses');
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Racial ability used:', 'keenSenses');
    });

    it('should only set racialSelected for unknown ability types', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.handleRacialAbilityUse('unknownAbility');
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Racial ability used:', 'unknownAbility');
    });

    it('should handle empty string ability type', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.handleRacialAbilityUse('');
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Racial ability used:', '');
    });

    it('should handle null/undefined ability type', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.handleRacialAbilityUse(null as any);
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Racial ability used:', null);
    });

    it('should handle case sensitivity', () => {
      const { result } = renderHook(() => useRacialAbilities());

      // Test uppercase
      act(() => {
        result.current.handleRacialAbilityUse('BLOODRAGE');
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.racialSelected).toBe(true);

      // Reset and test mixed case
      act(() => {
        result.current.resetRacialStates();
      });

      act(() => {
        result.current.handleRacialAbilityUse('BloodRage');
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.racialSelected).toBe(true);
    });

    it('should allow multiple ability activations', () => {
      const { result } = renderHook(() => useRacialAbilities());

      // First use bloodRage
      act(() => {
        result.current.handleRacialAbilityUse('bloodRage');
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(false);

      // Then use keenSenses (should not affect bloodRage)
      act(() => {
        result.current.handleRacialAbilityUse('keenSenses');
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);
    });

    it('should handle repeated use of same ability', () => {
      const { result } = renderHook(() => useRacialAbilities());

      // Use bloodRage twice
      act(() => {
        result.current.handleRacialAbilityUse('bloodRage');
      });

      act(() => {
        result.current.handleRacialAbilityUse('bloodRage');
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('resetRacialStates function', () => {
    it('should reset all racial states to false', () => {
      const { result } = renderHook(() => useRacialAbilities());

      // First set all states to true
      act(() => {
        result.current.setBloodRageActive(true);
        result.current.setKeenSensesActive(true);
        result.current.setRacialSelected(true);
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);

      // Then reset
      act(() => {
        result.current.resetRacialStates();
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(false);
    });

    it('should reset states even when already false', () => {
      const { result } = renderHook(() => useRacialAbilities());

      // States should already be false by default
      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(false);

      // Reset anyway
      act(() => {
        result.current.resetRacialStates();
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(false);
    });

    it('should reset after using abilities', () => {
      const { result } = renderHook(() => useRacialAbilities());

      // Use both abilities
      act(() => {
        result.current.handleRacialAbilityUse('bloodRage');
        result.current.handleRacialAbilityUse('keenSenses');
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);

      // Reset
      act(() => {
        result.current.resetRacialStates();
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(false);
    });
  });

  describe('function stability', () => {
    it('should maintain function references across rerenders', () => {
      const { result, rerender } = renderHook(() => useRacialAbilities());

      const firstSetBloodRageActive = result.current.setBloodRageActive;
      const firstSetKeenSensesActive = result.current.setKeenSensesActive;
      const firstSetRacialSelected = result.current.setRacialSelected;
      const firstHandleRacialAbilityUse = result.current.handleRacialAbilityUse;
      const firstResetRacialStates = result.current.resetRacialStates;

      rerender();

      expect(result.current.setBloodRageActive).toBe(firstSetBloodRageActive);
      expect(result.current.setKeenSensesActive).toBe(firstSetKeenSensesActive);
      expect(result.current.setRacialSelected).toBe(firstSetRacialSelected);
      expect(result.current.handleRacialAbilityUse).toBe(firstHandleRacialAbilityUse);
      expect(result.current.resetRacialStates).toBe(firstResetRacialStates);
    });
  });

  describe('state persistence during rerenders', () => {
    it('should maintain state values across rerenders', () => {
      const { result, rerender } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.setBloodRageActive(true);
        result.current.setKeenSensesActive(true);
        result.current.setRacialSelected(true);
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);

      rerender();

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);
    });
  });

  describe('complex workflows', () => {
    it('should support complete ability usage workflow', () => {
      const { result } = renderHook(() => useRacialAbilities());

      // 1. Start with default state
      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(false);

      // 2. Use bloodRage ability
      act(() => {
        result.current.handleRacialAbilityUse('bloodRage');
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);

      // 3. Manually activate keenSenses as well
      act(() => {
        result.current.setKeenSensesActive(true);
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);

      // 4. Reset everything
      act(() => {
        result.current.resetRacialStates();
      });

      expect(result.current.bloodRageActive).toBe(false);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(false);
    });

    it('should handle mixed manual and automatic state changes', () => {
      const { result } = renderHook(() => useRacialAbilities());

      // Use handleRacialAbilityUse for bloodRage
      act(() => {
        result.current.handleRacialAbilityUse('bloodRage');
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.racialSelected).toBe(true);

      // Manually set keenSenses
      act(() => {
        result.current.setKeenSensesActive(true);
      });

      expect(result.current.keenSensesActive).toBe(true);

      // Manually unset racialSelected
      act(() => {
        result.current.setRacialSelected(false);
      });

      expect(result.current.racialSelected).toBe(false);
      expect(result.current.bloodRageActive).toBe(true); // Should remain true
      expect(result.current.keenSensesActive).toBe(true); // Should remain true
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle rapid successive calls', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.handleRacialAbilityUse('bloodRage');
        result.current.handleRacialAbilityUse('keenSenses');
        result.current.resetRacialStates();
        result.current.handleRacialAbilityUse('bloodRage');
      });

      expect(result.current.bloodRageActive).toBe(true);
      expect(result.current.keenSensesActive).toBe(false);
      expect(result.current.racialSelected).toBe(true);
    });

    it('should handle boolean state changes with non-boolean values', () => {
      const { result } = renderHook(() => useRacialAbilities());

      act(() => {
        result.current.setBloodRageActive(1 as any);
        result.current.setKeenSensesActive('true' as any);
        result.current.setRacialSelected(null as any);
      });

      // React state should handle type coercion
      expect(typeof result.current.bloodRageActive).toBe('boolean');
      expect(typeof result.current.keenSensesActive).toBe('boolean');
      expect(typeof result.current.racialSelected).toBe('boolean');
    });
  });

  describe('console logging behavior', () => {
    it('should log each ability use with correct parameters', () => {
      const { result } = renderHook(() => useRacialAbilities());

      const testAbilities = ['bloodRage', 'keenSenses', 'unknownAbility'];

      testAbilities.forEach(ability => {
        act(() => {
          result.current.handleRacialAbilityUse(ability);
        });
      });

      expect(consoleSpy).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, 'Racial ability used:', 'bloodRage');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, 'Racial ability used:', 'keenSenses');
      expect(consoleSpy).toHaveBeenNthCalledWith(3, 'Racial ability used:', 'unknownAbility');
    });
  });

  describe('type safety', () => {
    it('should maintain proper TypeScript interfaces', () => {
      const { result } = renderHook(() => useRacialAbilities());

      // Test that the returned object matches expected interface
      expect(result.current).toMatchObject({
        bloodRageActive: expect.any(Boolean),
        keenSensesActive: expect.any(Boolean),
        racialSelected: expect.any(Boolean),
        setBloodRageActive: expect.any(Function),
        setKeenSensesActive: expect.any(Function),
        setRacialSelected: expect.any(Function),
        handleRacialAbilityUse: expect.any(Function),
        resetRacialStates: expect.any(Function)
      });
    });
  });
});
