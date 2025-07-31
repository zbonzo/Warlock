/**
 * @fileoverview Tests for playerCardUtils utility functions
 * Tests player card sizing and configuration logic
 */

import {
  getPlayerCardSize,
  getPlayerGridGap
} from '@client/utils/playerCardUtils';

describe('playerCardUtils utility functions', () => {
  describe('getPlayerCardSize', () => {
    describe('lobby context', () => {
      it('should return large size for desktop in lobby', () => {
        expect(getPlayerCardSize(false, 'lobby')).toBe('large');
      });

      it('should return large size for mobile in lobby', () => {
        expect(getPlayerCardSize(true, 'lobby')).toBe('large');
      });

      it('should default to lobby context when no context provided', () => {
        expect(getPlayerCardSize(false)).toBe('large');
        expect(getPlayerCardSize(true)).toBe('large');
      });
    });

    describe('game context', () => {
      it('should return medium size for desktop in game', () => {
        expect(getPlayerCardSize(false, 'game')).toBe('medium');
      });

      it('should return small size for mobile in game', () => {
        expect(getPlayerCardSize(true, 'game')).toBe('small');
      });
    });

    describe('target context', () => {
      it('should return small size for desktop in target', () => {
        expect(getPlayerCardSize(false, 'target')).toBe('small');
      });

      it('should return small size for mobile in target', () => {
        expect(getPlayerCardSize(true, 'target')).toBe('small');
      });
    });

    describe('unknown context', () => {
      it('should fallback to lobby behavior for unknown context', () => {
        expect(getPlayerCardSize(false, 'unknown' as any)).toBe('large');
        expect(getPlayerCardSize(true, 'unknown' as any)).toBe('large');
      });

      it('should fallback to medium size when context config is missing', () => {
        // This tests the fallback behavior in the function
        const contexts = ['nonexistent', 'invalid', ''] as any[];
        
        contexts.forEach(context => {
          // Should fallback to lobby, then to medium if something goes wrong
          const desktopSize = getPlayerCardSize(false, context);
          const mobileSize = getPlayerCardSize(true, context);
          
          expect(['small', 'medium', 'large']).toContain(desktopSize);
          expect(['small', 'medium', 'large']).toContain(mobileSize);
        });
      });
    });

    describe('edge cases', () => {
      it('should handle null context', () => {
        expect(getPlayerCardSize(false, null as any)).toBe('large');
        expect(getPlayerCardSize(true, null as any)).toBe('large');
      });

      it('should handle undefined context', () => {
        expect(getPlayerCardSize(false, undefined as any)).toBe('large');
        expect(getPlayerCardSize(true, undefined as any)).toBe('large');
      });
    });

    describe('type safety', () => {
      it('should only accept valid CardContext values', () => {
        const validContexts: Array<'lobby' | 'game' | 'target'> = ['lobby', 'game', 'target'];
        
        validContexts.forEach(context => {
          const desktopSize = getPlayerCardSize(false, context);
          const mobileSize = getPlayerCardSize(true, context);
          
          expect(['small', 'medium', 'large']).toContain(desktopSize);
          expect(['small', 'medium', 'large']).toContain(mobileSize);
        });
      });
    });
  });

  describe('getPlayerGridGap', () => {
    describe('normal conditions', () => {
      it('should return 20px gap for desktop', () => {
        expect(getPlayerGridGap(false)).toBe('20px');
      });

      it('should return 16px gap for mobile', () => {
        expect(getPlayerGridGap(true)).toBe('16px');
      });
    });

    describe('very small screen conditions', () => {
      it('should return 12px gap for very small desktop screens', () => {
        expect(getPlayerGridGap(false, true)).toBe('12px');
      });

      it('should return 12px gap for very small mobile screens', () => {
        expect(getPlayerGridGap(true, true)).toBe('12px');
      });

      it('should prioritize very small over mobile/desktop distinction', () => {
        // When isVerySmall is true, it should return 12px regardless of isMobile
        expect(getPlayerGridGap(false, true)).toBe('12px');
        expect(getPlayerGridGap(true, true)).toBe('12px');
      });
    });

    describe('parameter combinations', () => {
      it('should handle all parameter combinations correctly', () => {
        const combinations = [
          { isMobile: false, isVerySmall: false, expected: '20px' },
          { isMobile: false, isVerySmall: true, expected: '12px' },
          { isMobile: true, isVerySmall: false, expected: '16px' },
          { isMobile: true, isVerySmall: true, expected: '12px' }
        ];

        combinations.forEach(({ isMobile, isVerySmall, expected }) => {
          expect(getPlayerGridGap(isMobile, isVerySmall)).toBe(expected);
        });
      });
    });

    describe('optional parameters', () => {
      it('should default isVerySmall to false when not provided', () => {
        expect(getPlayerGridGap(false)).toBe('20px');
        expect(getPlayerGridGap(true)).toBe('16px');
      });

      it('should handle explicit false for isVerySmall', () => {
        expect(getPlayerGridGap(false, false)).toBe('20px');
        expect(getPlayerGridGap(true, false)).toBe('16px');
      });
    });

    describe('return type validation', () => {
      it('should always return a string with px unit', () => {
        const testCases = [
          [false, false],
          [false, true],
          [true, false],
          [true, true]
        ] as const;

        testCases.forEach(([isMobile, isVerySmall]) => {
          const result = getPlayerGridGap(isMobile, isVerySmall);
          expect(typeof result).toBe('string');
          expect(result).toMatch(/^\d+px$/);
        });
      });

      it('should return valid CSS gap values', () => {
        const validGaps = ['12px', '16px', '20px'];
        
        const testCases = [
          [false, false],
          [false, true],
          [true, false],
          [true, true]
        ] as const;

        testCases.forEach(([isMobile, isVerySmall]) => {
          const result = getPlayerGridGap(isMobile, isVerySmall);
          expect(validGaps).toContain(result);
        });
      });
    });
  });

  describe('integration tests', () => {
    it('should provide consistent sizing logic across different contexts', () => {
      const contexts: Array<'lobby' | 'game' | 'target'> = ['lobby', 'game', 'target'];
      
      contexts.forEach(context => {
        const desktopSize = getPlayerCardSize(false, context);
        const mobileSize = getPlayerCardSize(true, context);
        const gap = getPlayerGridGap(false);
        
        // All functions should return valid values
        expect(['small', 'medium', 'large']).toContain(desktopSize);
        expect(['small', 'medium', 'large']).toContain(mobileSize);
        expect(gap).toMatch(/^\d+px$/);
      });
    });

    it('should handle responsive design patterns', () => {
      // Test common responsive scenarios
      const scenarios = [
        { context: 'lobby', mobile: false, verySmall: false },
        { context: 'lobby', mobile: true, verySmall: false },
        { context: 'game', mobile: false, verySmall: false },
        { context: 'game', mobile: true, verySmall: true },
        { context: 'target', mobile: true, verySmall: true }
      ] as const;

      scenarios.forEach(({ context, mobile, verySmall }) => {
        const cardSize = getPlayerCardSize(mobile, context);
        const gridGap = getPlayerGridGap(mobile, verySmall);
        
        // Verify responsive behavior makes sense
        if (context === 'target') {
          expect(cardSize).toBe('small');
        }
        
        if (verySmall) {
          expect(gridGap).toBe('12px');
        }
        
        if (mobile && context === 'game') {
          expect(cardSize).toBe('small');
        }
      });
    });

    it('should demonstrate proper usage patterns', () => {
      // Example: Lobby page on desktop
      const lobbyDesktop = {
        cardSize: getPlayerCardSize(false, 'lobby'),
        gridGap: getPlayerGridGap(false, false)
      };
      expect(lobbyDesktop.cardSize).toBe('large');
      expect(lobbyDesktop.gridGap).toBe('20px');

      // Example: Game page on mobile
      const gameMobile = {
        cardSize: getPlayerCardSize(true, 'game'),
        gridGap: getPlayerGridGap(true, false)
      };
      expect(gameMobile.cardSize).toBe('small');
      expect(gameMobile.gridGap).toBe('16px');

      // Example: Target selector on very small screen
      const targetVerySmall = {
        cardSize: getPlayerCardSize(true, 'target'),
        gridGap: getPlayerGridGap(true, true)
      };
      expect(targetVerySmall.cardSize).toBe('small');
      expect(targetVerySmall.gridGap).toBe('12px');
    });
  });
});