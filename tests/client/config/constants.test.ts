/**
 * @fileoverview Tests for client constants
 */
import {
  SOCKET_URL,
  API_URL,
  GAME_PHASES,
  ACTION_PHASES,
  STATUS_EFFECTS,
  UI,
  ICONS,
  STORAGE_KEYS,
} from '../../../client/src/config/constants';

// Mock window.location for tests
const mockLocation = {
  protocol: 'http:',
  hostname: 'localhost',
  origin: 'http://localhost:3000',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock process.env
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };

  // Reset window.location to default
  Object.assign(mockLocation, {
    protocol: 'http:',
    hostname: 'localhost',
    origin: 'http://localhost:3000',
  });
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Constants', () => {
  describe('GAME_PHASES', () => {
    it('should have all required game phases', () => {
      expect(GAME_PHASES.JOIN).toBe('join');
      expect(GAME_PHASES.CHARACTER_SELECT).toBe('charSelect');
      expect(GAME_PHASES.LOBBY).toBe('lobby');
      expect(GAME_PHASES.GAME).toBe('game');
      expect(GAME_PHASES.END).toBe('end');
    });

    it('should be readonly', () => {
      expect(() => {
        // @ts-expect-error Testing immutability
        GAME_PHASES.JOIN = 'modified';
      }).toThrow();
    });
  });

  describe('ACTION_PHASES', () => {
    it('should have all required action phases', () => {
      expect(ACTION_PHASES.ACTION).toBe('action');
      expect(ACTION_PHASES.RESULTS).toBe('results');
    });

    it('should be readonly', () => {
      expect(() => {
        // @ts-expect-error Testing immutability
        ACTION_PHASES.ACTION = 'modified';
      }).toThrow();
    });
  });

  describe('STATUS_EFFECTS', () => {
    it('should have all required status effects', () => {
      expect(STATUS_EFFECTS.POISON).toBe('poison');
      expect(STATUS_EFFECTS.SHIELDED).toBe('shielded');
      expect(STATUS_EFFECTS.INVISIBLE).toBe('invisible');
      expect(STATUS_EFFECTS.STUNNED).toBe('stunned');
    });

    it('should be readonly', () => {
      expect(() => {
        // @ts-expect-error Testing immutability
        STATUS_EFFECTS.POISON = 'modified';
      }).toThrow();
    });
  });

  describe('UI constants', () => {
    it('should have animation durations', () => {
      expect(UI.ANIMATION.DURATION.FAST).toBe(150);
      expect(UI.ANIMATION.DURATION.MEDIUM).toBe(300);
      expect(UI.ANIMATION.DURATION.SLOW).toBe(500);
      expect(UI.ANIMATION.EASING).toBe('ease-in-out');
    });

    it('should have breakpoints', () => {
      expect(UI.BREAKPOINTS.MOBILE).toBe(480);
      expect(UI.BREAKPOINTS.TABLET).toBe(768);
      expect(UI.BREAKPOINTS.DESKTOP).toBe(1024);
      expect(UI.BREAKPOINTS.LARGE).toBe(1440);
    });

    it('should have theme settings', () => {
      expect(UI.THEME.DEFAULT_MODE).toBe('light');
      expect(UI.THEME.AVAILABLE_MODES).toEqual(['light', 'dark', 'colorblind']);
    });

    it('should have display settings', () => {
      expect(UI.DISPLAY.MAX_PLAYERS_PER_PAGE).toBe(10);
      expect(UI.DISPLAY.LOG_ENTRIES_PER_PAGE).toBe(20);
    });
  });

  describe('ICONS', () => {
    it('should have race icons', () => {
      expect(ICONS.RACES.Artisan).toBe('/images/races/artisan.png');
      expect(ICONS.RACES.Rockhewn).toBe('/images/races/rockhewn.png');
      expect(ICONS.RACES.Lich).toBe('/images/races/lich.png');
      expect(ICONS.RACES.Orc).toBe('/images/races/orc.png');
      expect(ICONS.RACES.Crestfallen).toBe('/images/races/crestfallen.png');
      expect(ICONS.RACES.Kinfolk).toBe('/images/races/kinfolk.png');
    });

    it('should have class icons', () => {
      expect(ICONS.CLASSES.Warrior).toBe('/images/classes/warrior.png');
      expect(ICONS.CLASSES.Pyromancer).toBe('/images/classes/pyromancer.png');
      expect(ICONS.CLASSES.Wizard).toBe('/images/classes/wizard.png');
      expect(Object.keys(ICONS.CLASSES)).toHaveLength(12);
    });

    it('should have ability icons', () => {
      expect(ICONS.ABILITIES.attack).toBe('⚔️');
      expect(ICONS.ABILITIES.heal).toBe('💚');
      expect(ICONS.ABILITIES.defense).toBe('🛡️');
      expect(ICONS.ABILITIES.special).toBe('✨');
    });

    it('should have status icons', () => {
      expect(ICONS.STATUS.poison).toBe('☠️');
      expect(ICONS.STATUS.shielded).toBe('🛡️');
      expect(ICONS.STATUS.invisible).toBe('👻');
      expect(ICONS.STATUS.stunned).toBe('⚡');
    });
  });

  describe('STORAGE_KEYS', () => {
    it('should have all required storage keys', () => {
      expect(STORAGE_KEYS.LAST_GAME_CODE).toBe('lastGameCode');
      expect(STORAGE_KEYS.LAST_PLAYER_NAME).toBe('lastPlayerName');
      expect(STORAGE_KEYS.TUTORIAL_SEEN).toBe('tutorialSeen');
      expect(STORAGE_KEYS.THEME_PREFERENCE).toBe('themePreference');
    });

    it('should be readonly', () => {
      expect(() => {
        // @ts-expect-error Testing immutability
        STORAGE_KEYS.LAST_GAME_CODE = 'modified';
      }).toThrow();
    });
  });
});
