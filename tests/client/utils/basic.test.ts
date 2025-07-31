/**
 * Basic test to verify TypeScript test setup works
 */

describe('Basic TypeScript test', () => {
  it('should work with basic functionality', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const testString = 'hello world';
    expect(testString.toUpperCase()).toBe('HELLO WORLD');
  });

  it('should handle array operations', () => {
    const testArray = [1, 2, 3];
    expect(testArray.length).toBe(3);
    expect(testArray.includes(2)).toBe(true);
  });
});