import {
  secureRandomInt,
  secureRandomFloat,
  secureRandomChoice,
  secureGameCode,
  secureShuffleArray,
  secureId,
} from '../../../server/utils/secureRandom';

describe('secureRandomInt', () => {
  it('returns an integer within the given range', () => {
    for (let i = 0; i < 50; i++) {
      const result = secureRandomInt(1, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThan(10);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('throws when min >= max', () => {
    expect(() => secureRandomInt(5, 5)).toThrow();
    expect(() => secureRandomInt(10, 5)).toThrow();
  });

  it('works with zero as min', () => {
    const result = secureRandomInt(0, 100);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(100);
  });
});

describe('secureRandomFloat', () => {
  it('returns a float between 0 (inclusive) and 1 (exclusive)', () => {
    for (let i = 0; i < 20; i++) {
      const result = secureRandomFloat();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    }
  });

  it('returns different values across calls', () => {
    const results = new Set(Array.from({ length: 20 }, () => secureRandomFloat()));
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('secureRandomChoice', () => {
  it('returns an element from the array', () => {
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(secureRandomChoice(arr));
    }
  });

  it('works with a single-element array', () => {
    expect(secureRandomChoice([42])).toBe(42);
  });

  it('throws on empty array', () => {
    expect(() => secureRandomChoice([])).toThrow();
  });

  it('works with mixed types', () => {
    const arr = [1, 'two', true];
    const result = secureRandomChoice(arr);
    expect(arr).toContain(result);
  });
});

describe('secureGameCode', () => {
  it('returns a 4-digit string', () => {
    for (let i = 0; i < 20; i++) {
      const code = secureGameCode();
      expect(typeof code).toBe('string');
      expect(code).toMatch(/^\d{4}$/);
    }
  });

  it('generates codes in the range 1000–9999', () => {
    for (let i = 0; i < 20; i++) {
      const num = parseInt(secureGameCode(), 10);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThanOrEqual(9999);
    }
  });
});

describe('secureShuffleArray', () => {
  it('returns the same elements in potentially different order', () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = secureShuffleArray([...original]);
    expect(shuffled.sort()).toEqual(original.sort());
  });

  it('modifies the array in place', () => {
    const arr = [1, 2, 3];
    const returned = secureShuffleArray(arr);
    expect(returned).toBe(arr);
  });

  it('handles empty arrays', () => {
    expect(secureShuffleArray([])).toEqual([]);
  });

  it('handles single-element arrays', () => {
    expect(secureShuffleArray([99])).toEqual([99]);
  });
});

describe('secureId', () => {
  it('generates an ID of the default length', () => {
    const id = secureId();
    expect(id).toHaveLength(12);
  });

  it('generates an ID of a custom length', () => {
    expect(secureId(undefined, 8)).toHaveLength(8);
    expect(secureId(undefined, 20)).toHaveLength(20);
  });

  it('prepends the prefix when provided', () => {
    const id = secureId('player', 8);
    expect(id).toMatch(/^player_/);
    expect(id.split('_')[1]).toHaveLength(8);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 20 }, () => secureId()));
    expect(ids.size).toBe(20);
  });

  it('uses only alphanumeric characters in the random part', () => {
    const id = secureId(undefined, 50);
    expect(id).toMatch(/^[a-zA-Z0-9]+$/);
  });
});
