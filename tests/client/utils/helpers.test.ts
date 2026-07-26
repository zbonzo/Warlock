import {
  generateRandomCode,
  generateRandomName,
  getHealthPercentage,
  getHealthColor,
  getEventClass,
  getInitials,
  safeJsonParse,
} from '../../../client/src/utils/helpers';

describe('generateRandomCode', () => {
  it('returns a 4-digit string', () => {
    const code = generateRandomCode();
    expect(typeof code).toBe('string');
    expect(code).toMatch(/^\d{4}$/);
  });

  it('generates codes in range 1000–9999', () => {
    for (let i = 0; i < 20; i++) {
      const num = parseInt(generateRandomCode(), 10);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThanOrEqual(9999);
    }
  });
});

describe('generateRandomName', () => {
  it('returns a non-empty string', () => {
    const name = generateRandomName();
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });
});

describe('getHealthPercentage', () => {
  it('calculates correct percentage', () => {
    expect(getHealthPercentage(50, 100)).toBe(50);
    expect(getHealthPercentage(100, 100)).toBe(100);
    expect(getHealthPercentage(0, 100)).toBe(0);
    expect(getHealthPercentage(75, 100)).toBe(75);
  });

  it('clamps to 0 when hp is negative', () => {
    expect(getHealthPercentage(-10, 100)).toBe(0);
  });

  it('clamps to 100 when hp exceeds max', () => {
    expect(getHealthPercentage(150, 100)).toBe(100);
  });

  it('returns 0 when max is 0', () => {
    expect(getHealthPercentage(0, 0)).toBe(0);
  });

  it('returns 0 when current is 0', () => {
    expect(getHealthPercentage(0, 100)).toBe(0);
  });
});

describe('getHealthColor', () => {
  it('returns danger color below 25%', () => {
    expect(getHealthColor(0)).toBe('#e84855');
    expect(getHealthColor(24)).toBe('#e84855');
  });

  it('returns warning color between 25% and 50%', () => {
    expect(getHealthColor(25)).toBe('#ff7b25');
    expect(getHealthColor(49)).toBe('#ff7b25');
  });

  it('returns good color at 50% and above', () => {
    expect(getHealthColor(50)).toBe('#2cb978');
    expect(getHealthColor(100)).toBe('#2cb978');
  });
});

describe('getEventClass', () => {
  it('returns empty string for empty input', () => {
    expect(getEventClass('')).toBe('');
  });

  it('identifies warlock events', () => {
    expect(getEventClass('Warlock attacks!')).toBe('warlock-event');
  });

  it('identifies attack events', () => {
    expect(getEventClass('Player attacked the monster')).toBe('attack-event');
    expect(getEventClass('Dealt 10 damage')).toBe('attack-event');
  });

  it('identifies heal events', () => {
    expect(getEventClass('Player healed ally')).toBe('heal-event');
    expect(getEventClass('healing restored 20 HP')).toBe('heal-event');
  });

  it('identifies defense events', () => {
    expect(getEventClass('Player shielded themselves')).toBe('defense-event');
    expect(getEventClass('The shield blocks attack')).toBe('defense-event');
  });

  it('identifies monster events', () => {
    expect(getEventClass('Monster charges')).toBe('monster-event');
  });

  it('identifies death events', () => {
    expect(getEventClass('Player has fallen')).toBe('death-event');
    expect(getEventClass('Hero died')).toBe('death-event');
  });

  it('identifies level up events', () => {
    expect(getEventClass('Party reached level up')).toBe('level-event');
  });

  it('returns empty string for unrecognized events', () => {
    expect(getEventClass('Some neutral event happened')).toBe('');
  });
});

describe('getInitials', () => {
  it('returns empty string for empty input', () => {
    expect(getInitials('')).toBe('');
  });

  it('returns first letter uppercased for single word', () => {
    expect(getInitials('alice')).toBe('A');
    expect(getInitials('Bob')).toBe('B');
  });

  it('returns first and last initials for multi-word names', () => {
    expect(getInitials('Alice Smith')).toBe('AS');
    expect(getInitials('john doe')).toBe('JD');
  });

  it('uses first and last word for three-word names', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MW');
  });

  it('uppercases the result', () => {
    expect(getInitials('alice smith')).toBe('AS');
  });
});

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"key":"value"}')).toEqual({ key: 'value' });
    expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
    expect(safeJsonParse('"hello"')).toBe('hello');
  });

  it('returns the fallback for invalid JSON', () => {
    expect(safeJsonParse('not json', null)).toBeNull();
    expect(safeJsonParse('{bad}', { default: true })).toEqual({ default: true });
  });

  it('returns empty object as default fallback', () => {
    expect(safeJsonParse('invalid')).toEqual({});
  });
});
