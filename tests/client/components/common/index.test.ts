/**
 * @fileoverview Tests for common/index.ts
 * Tests the component export barrel file
 */

import * as CommonComponents from '../../../../client/src/components/common/index';

// Mock all the components that are imported
jest.mock('../../../../client/src/components/common/PlayerCard', () => ({
  PlayerCard: 'MockPlayerCard'
}));

jest.mock('../../../../client/src/components/common/ErrorBoundary', () => ({
  __esModule: true,
  default: 'MockErrorBoundary'
}));

jest.mock('../../../../client/src/components/common/LoadingScreen', () => ({
  __esModule: true,
  default: 'MockLoadingScreen'
}));

jest.mock('../../../../client/src/components/common/ThemeToggle', () => ({
  __esModule: true,
  default: 'MockThemeToggle'
}));

describe('Common Components Index', () => {
  describe('Named Exports', () => {
    it('should export PlayerCard as named export', () => {
      expect(CommonComponents.PlayerCard).toBeDefined();
      expect(CommonComponents.PlayerCard).toBe('MockPlayerCard');
    });
  });

  describe('Default Exports', () => {
    it('should export ErrorBoundary as default export', () => {
      expect(CommonComponents.ErrorBoundary).toBeDefined();
      expect(CommonComponents.ErrorBoundary).toBe('MockErrorBoundary');
    });

    it('should export LoadingScreen as default export', () => {
      expect(CommonComponents.LoadingScreen).toBeDefined();
      expect(CommonComponents.LoadingScreen).toBe('MockLoadingScreen');
    });

    it('should export ThemeToggle as default export', () => {
      expect(CommonComponents.ThemeToggle).toBeDefined();
      expect(CommonComponents.ThemeToggle).toBe('MockThemeToggle');
    });
  });

  describe('Export Structure', () => {
    it('should export all expected components', () => {
      const expectedExports = [
        'PlayerCard',
        'ErrorBoundary', 
        'LoadingScreen',
        'ThemeToggle'
      ];

      expectedExports.forEach(exportName => {
        expect(CommonComponents).toHaveProperty(exportName);
      });
    });

    it('should not export any unexpected components', () => {
      const actualExports = Object.keys(CommonComponents);
      const expectedExports = [
        'PlayerCard',
        'ErrorBoundary',
        'LoadingScreen', 
        'ThemeToggle'
      ];

      expect(actualExports.sort()).toEqual(expectedExports.sort());
    });
  });
});