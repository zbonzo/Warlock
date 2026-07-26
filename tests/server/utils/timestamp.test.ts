import {
  getCurrentTimestamp,
  getCurrentTimestampISO,
  getTimestamp,
  getTimestampISO,
} from '../../../server/utils/timestamp';

describe('getCurrentTimestamp', () => {
  it('returns a number', () => {
    expect(typeof getCurrentTimestamp()).toBe('number');
  });

  it('returns a value close to Date.now()', () => {
    const before = Date.now();
    const ts = getCurrentTimestamp();
    const after = Date.now();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('getCurrentTimestampISO', () => {
  it('returns a valid ISO 8601 string', () => {
    const ts = getCurrentTimestampISO();
    expect(typeof ts).toBe('string');
    expect(() => new Date(ts)).not.toThrow();
    expect(new Date(ts).toISOString()).toBe(ts);
  });

  it('represents a time close to now', () => {
    const before = Date.now();
    const ts = getCurrentTimestampISO();
    const after = Date.now();
    const parsed = new Date(ts).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });
});

describe('getTimestamp', () => {
  it('returns the correct millisecond value for a date', () => {
    const date = new Date('2024-01-15T12:00:00.000Z');
    expect(getTimestamp(date)).toBe(date.getTime());
  });

  it('handles epoch date', () => {
    const epoch = new Date(0);
    expect(getTimestamp(epoch)).toBe(0);
  });

  it('returns a number', () => {
    expect(typeof getTimestamp(new Date())).toBe('number');
  });
});

describe('getTimestampISO', () => {
  it('returns a valid ISO string for a given date', () => {
    const date = new Date('2024-06-01T09:30:00.000Z');
    expect(getTimestampISO(date)).toBe('2024-06-01T09:30:00.000Z');
  });

  it('matches the date\'s own toISOString()', () => {
    const date = new Date();
    expect(getTimestampISO(date)).toBe(date.toISOString());
  });

  it('returns a string', () => {
    expect(typeof getTimestampISO(new Date())).toBe('string');
  });
});
