/**
 * @fileoverview Tests for GameStateDrawer index file
 */

import * as GameStateDrawerExports from '@client/pages/GamePage/components/GameStateDrawer';

describe('GameStateDrawer index', () => {
  it('should export GameStateDrawer as named export', () => {
    expect(GameStateDrawerExports.GameStateDrawer).toBeDefined();
    expect(typeof GameStateDrawerExports.GameStateDrawer).toBe('function');
  });

  it('should only export the GameStateDrawer component', () => {
    const exports = Object.keys(GameStateDrawerExports);
    expect(exports).toEqual(['GameStateDrawer']);
  });

  it('should have the correct export structure', () => {
    expect(GameStateDrawerExports).toBeDefined();
    expect(typeof GameStateDrawerExports).toBe('object');
    expect(Object.keys(GameStateDrawerExports)).toHaveLength(1);
  });
});
