/**
 * @fileoverview Tests for GamePage index file
 */

import * as GamePageExports from '@client/pages/GamePage';

describe('GamePage index', () => {
  it('should export default GamePage component', () => {
    expect(GamePageExports.default).toBeDefined();
    expect(typeof GamePageExports.default).toBe('function');
  });

  it('should only export the default component', () => {
    const exports = Object.keys(GamePageExports);
    expect(exports).toEqual(['default']);
  });

  it('should have the correct export structure', () => {
    expect(GamePageExports).toBeDefined();
    expect(Object.keys(GamePageExports)).toHaveLength(1);
  });
});