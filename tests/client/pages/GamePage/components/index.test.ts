/**
 * @fileoverview Tests for GamePage components index file
 */

import * as GamePageComponentsExports from '@client/pages/GamePage/components';

describe('GamePage components index', () => {
  it('should export ActionColumn component', () => {
    expect(GamePageComponentsExports.ActionColumn).toBeDefined();
    expect(typeof GamePageComponentsExports.ActionColumn).toBe('function');
  });

  it('should export PlayerColumn component', () => {
    expect(GamePageComponentsExports.PlayerColumn).toBeDefined();
    expect(typeof GamePageComponentsExports.PlayerColumn).toBe('function');
  });

  it('should export HistoryColumn component', () => {
    expect(GamePageComponentsExports.HistoryColumn).toBeDefined();
    expect(typeof GamePageComponentsExports.HistoryColumn).toBe('function');
  });

  it('should export MobileNavigation component', () => {
    expect(GamePageComponentsExports.MobileNavigation).toBeDefined();
    expect(typeof GamePageComponentsExports.MobileNavigation).toBe('function');
  });

  it('should export ActionPhase component', () => {
    expect(GamePageComponentsExports.ActionPhase).toBeDefined();
    expect(typeof GamePageComponentsExports.ActionPhase).toBe('function');
  });

  it('should export ResultsPhase component', () => {
    expect(GamePageComponentsExports.ResultsPhase).toBeDefined();
    expect(typeof GamePageComponentsExports.ResultsPhase).toBe('function');
  });

  it('should export all expected components', () => {
    const exports = Object.keys(GamePageComponentsExports);
    expect(exports).toContain('ActionColumn');
    expect(exports).toContain('PlayerColumn');
    expect(exports).toContain('HistoryColumn');
    expect(exports).toContain('MobileNavigation');
    expect(exports).toContain('ActionPhase');
    expect(exports).toContain('ResultsPhase');
    expect(exports).toHaveLength(6);
  });

  it('should have the correct export structure', () => {
    expect(GamePageComponentsExports).toBeDefined();
    expect(typeof GamePageComponentsExports).toBe('object');
  });
});