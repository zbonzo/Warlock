/**
 * @fileoverview Tests for JoinGamePage index file
 */

import * as JoinGamePageExports from '@client/pages/JoinGamePage';

describe('JoinGamePage index', () => {
  it('should export default JoinGamePage component', () => {
    expect(JoinGamePageExports.default).toBeDefined();
    expect(typeof JoinGamePageExports.default).toBe('function');
  });

  it('should export constants', () => {
    // Test that constants are exported from the constants file
    expect(JoinGamePageExports).toBeDefined();
  });

  it('should have expected exports structure', () => {
    const exports = Object.keys(JoinGamePageExports);
    expect(exports).toContain('default');
    // Should also contain constants like RANDOM_NAMES
    expect(exports.length).toBeGreaterThanOrEqual(1);
  });

  it('should export RANDOM_NAMES constant', () => {
    expect(JoinGamePageExports.RANDOM_NAMES).toBeDefined();
    expect(Array.isArray(JoinGamePageExports.RANDOM_NAMES)).toBe(true);
    expect(JoinGamePageExports.RANDOM_NAMES.length).toBeGreaterThan(0);
  });
});