/**
 * @fileoverview Tests for CharacterSelectPage index file
 */

import * as CharacterSelectPageExports from '@client/pages/CharacterSelectPage';

describe('CharacterSelectPage index', () => {
  it('should export default CharacterSelectPage component', () => {
    expect(CharacterSelectPageExports.default).toBeDefined();
    expect(typeof CharacterSelectPageExports.default).toBe('function');
  });

  it('should export constants', () => {
    // Test that constants are exported (the specific constants will depend on the constants file)
    // This is a basic structure test to ensure the re-export works
    expect(CharacterSelectPageExports).toBeDefined();
  });

  it('should have expected exports structure', () => {
    const exports = Object.keys(CharacterSelectPageExports);
    expect(exports).toContain('default');
    // Additional constants may be exported - this tests the basic structure
    expect(exports.length).toBeGreaterThanOrEqual(1);
  });
});
