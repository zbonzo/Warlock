/**
 * @fileoverview Tests for LobbyPage index file
 */

import * as LobbyPageExports from '@client/pages/LobbyPage';

describe('LobbyPage index', () => {
  it('should export default LobbyPage component', () => {
    expect(LobbyPageExports.default).toBeDefined();
    expect(typeof LobbyPageExports.default).toBe('function');
  });

  it('should only export the default component', () => {
    const exports = Object.keys(LobbyPageExports);
    expect(exports).toEqual(['default']);
  });

  it('should have the correct export structure', () => {
    expect(LobbyPageExports).toBeDefined();
    expect(Object.keys(LobbyPageExports)).toHaveLength(1);
  });
});
