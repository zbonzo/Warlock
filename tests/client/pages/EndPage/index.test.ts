/**
 * @fileoverview Tests for EndPage index file
 */

import * as EndPageExports from '@client/pages/EndPage';

describe('EndPage index', () => {
  it('should export default EndPage component', () => {
    expect(EndPageExports.default).toBeDefined();
    expect(typeof EndPageExports.default).toBe('function');
  });

  it('should only export the default component', () => {
    const exports = Object.keys(EndPageExports);
    expect(exports).toEqual(['default']);
  });

  it('should have the correct export structure', () => {
    expect(EndPageExports).toBeDefined();
    expect(Object.keys(EndPageExports)).toHaveLength(1);
  });
});
