/**
 * @fileoverview Tests for StatusEffectManager
 */

const StatusEffectManager = require('@models/systems/StatusEffectManager');
const Player = require('@models/Player');

// Mock the config
jest.mock('@config', () => ({
  statusEffects: {
    poison: {
      default: { damage: 5, turns: 3 },
    },
    shielded: {
      default: { armor: 2, turns: 1 },
    },
    invisible: {
      default: { turns: 1 },
    },
    stunned: {
      default: { turns: 1 },
    },
    vulnerable: {
      default: { damageIncrease: 25, turns: 2 },
    },
    processingOrder: {
      poison: 1,
      shielded: 2,
      vulnerable: 3,
      invisible: 4,
      stunned: 5,
    },
    getEffectMessage: jest.fn((effectName, messageType, data) => {
      const templates = {
        poison: {
          applied:
            '{playerName} is poisoned for {damage} damage over {turns} turns.',
          expired: 'The poison affecting {playerName} has worn off.',
          damage: '{playerName} suffers {damage} poison damage.',
        },
        shielded: {
          applied:
            '{playerName} is shielded with {armor} armor for {turns} turn(s).',
          expired: '{playerName} is no longer shielded.',
        },
        invisible: {
          applied: '{playerName} becomes invisible for {turns} turn(s).',
          expired: '{playerName} is no longer invisible.',
        },
        stunned: {
          applied: '{playerName} is stunned for {turns} turn(s).',
          expired: '{playerName} is no longer stunned.',
        },
      };
      return (
        templates[effectName]?.[messageType] || `${effectName} ${messageType}`
      );
    }),
  },
  messages: {
    formatMessage: jest.fn((template, data) => {
      let result = template;
      Object.entries(data).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
      });
      return result;
    }),
    getEvent: jest.fn((key, data) => `Mock event: ${key}`),
  },
}));

describe('StatusEffectManager', () => {
  let statusEffectManager;
  let players;
  let mockGameStateUtils;

  beforeEach(() => {
    players = new Map();

    mockGameStateUtils = {
      getAlivePlayers: jest.fn(),
    };

    statusEffectManager = new StatusEffectManager(players, mockGameStateUtils);
  });

  describe('Constructor', () => {
    test('should initialize with correct dependencies', () => {
      expect(statusEffectManager.players).toBe(players);
      expect(statusEffectManager.gameStateUtils).toBe(mockGameStateUtils);
    });
  });

  describe('Effect Application', () => {
    let player;
    let log;

    beforeEach(() => {
      player = new Player('player1', 'TestPlayer');
      players.set('player1', player);
      log = [];
    });

    test('should apply poison effect correctly', () => {
      const result = statusEffectManager.applyEffect(
        'player1',
        'poison',
        { damage: 10, turns: 2 },
        log
      );

      expect(result).toBe(true);
      expect(player.hasStatusEffect('poison')).toBe(true);
      expect(player.statusEffects.poison).toEqual({ damage: 10, turns: 3 }); // +1 for timing fix
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('poisoned for 10 damage over 2 turns');
    });

    test('should apply shielded effect correctly', () => {
      const result = statusEffectManager.applyEffect(
        'player1',
        'shielded',
        { armor: 5, turns: 2 },
        log
      );

      expect(result).toBe(true);
      expect(player.hasStatusEffect('shielded')).toBe(true);
      expect(player.statusEffects.shielded).toEqual({ armor: 5, turns: 3 }); // +1 for timing fix
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('shielded with 5 armor for 2 turn(s)');
    });

    test('should apply vulnerability effect correctly', () => {
      const result = statusEffectManager.applyEffect(
        'player1',
        'vulnerable',
        { damageIncrease: 50, turns: 3 },
        log
      );

      expect(result).toBe(true);
      expect(player.isVulnerable).toBe(true);
      expect(player.vulnerabilityIncrease).toBe(50);
      expect(log).toHaveLength(1);
      expect(log[0]).toContain(
        'VULNERABLE and will take 50% more damage for 3 turn(s)'
      );
    });

    test('should use default values when parameters missing', () => {
      const result = statusEffectManager.applyEffect(
        'player1',
        'poison',
        {},
        log
      );

      expect(result).toBe(true);
      expect(player.statusEffects.poison).toEqual({ damage: 5, turns: 4 }); // Default + 1
    });

    test('should not apply effect to dead players', () => {
      player.isAlive = false;

      const result = statusEffectManager.applyEffect(
        'player1',
        'poison',
        { damage: 10, turns: 2 },
        log
      );

      expect(result).toBe(false);
      expect(player.hasStatusEffect('poison')).toBe(false);
      expect(log).toHaveLength(0);
    });

    test('should not apply effect to non-existent players', () => {
      const result = statusEffectManager.applyEffect(
        'nonexistent',
        'poison',
        { damage: 10, turns: 2 },
        log
      );

      expect(result).toBe(false);
      expect(log).toHaveLength(0);
    });

    test('should handle unknown effect types', () => {
      const result = statusEffectManager.applyEffect(
        'player1',
        'unknownEffect',
        { value: 10 },
        log
      );

      expect(result).toBe(false);
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('Unknown effect');
    });

    test('should refresh existing effects', () => {
      // Apply initial effect
      statusEffectManager.applyEffect(
        'player1',
        'poison',
        { damage: 5, turns: 1 },
        log
      );
      log.length = 0; // Clear log

      // Refresh the effect
      const result = statusEffectManager.applyEffect(
        'player1',
        'poison',
        { damage: 8, turns: 2 },
        log
      );

      expect(result).toBe(true);
      expect(player.statusEffects.poison).toEqual({ damage: 8, turns: 3 }); // Refreshed + 1
      expect(log[0]).toContain('poison is refreshed');
    });
  });

  describe('Effect Removal', () => {
    let player;
    let log;

    beforeEach(() => {
      player = new Player('player1', 'TestPlayer');
      players.set('player1', player);
      log = [];
    });

    test('should remove regular effects correctly', () => {
      player.applyStatusEffect('stunned', { turns: 2 });

      const result = statusEffectManager.removeEffect(
        'player1',
        'stunned',
        log
      );

      expect(result).toBe(true);
      expect(player.hasStatusEffect('stunned')).toBe(false);
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('no longer stunned');
    });

    test('should remove vulnerability correctly', () => {
      player.applyVulnerability(25, 2);

      const result = statusEffectManager.removeEffect(
        'player1',
        'vulnerable',
        log
      );

      expect(result).toBe(true);
      expect(player.isVulnerable).toBe(false);
      expect(player.vulnerabilityIncrease).toBe(0);
      expect(log).toHaveLength(1);
      expect(log[0]).toContain('no longer vulnerable');
    });

    test('should return false when effect not present', () => {
      const result = statusEffectManager.removeEffect('player1', 'poison', log);

      expect(result).toBe(false);
      expect(log).toHaveLength(0);
    });

    test('should return false for non-existent players', () => {
      const result = statusEffectManager.removeEffect(
        'nonexistent',
        'poison',
        log
      );

      expect(result).toBe(false);
      expect(log).toHaveLength(0);
    });
  });

  describe('Effect Queries', () => {
    let player;

    beforeEach(() => {
      player = new Player('player1', 'TestPlayer');
      players.set('player1', player);
    });

    test('should check if player has effect', () => {
      player.applyStatusEffect('poison', { damage: 5, turns: 3 });

      expect(statusEffectManager.hasEffect('player1', 'poison')).toBe(true);
      expect(statusEffectManager.hasEffect('player1', 'stunned')).toBe(false);
    });

    test('should check vulnerability separately', () => {
      player.applyVulnerability(25, 2);

      expect(statusEffectManager.hasEffect('player1', 'vulnerable')).toBe(true);
    });

    test('should get effect data correctly', () => {
      player.applyStatusEffect('shielded', { armor: 3, turns: 2 });

      const data = statusEffectManager.getEffectData('player1', 'shielded');

      expect(data).toEqual({ armor: 3, turns: 2 });
    });

    test('should get vulnerability data correctly', () => {
      player.applyVulnerability(30, 3);

      const data = statusEffectManager.getEffectData('player1', 'vulnerable');

      expect(data.damageIncrease).toBe(30);
      expect(data.turns).toBeGreaterThan(0);
    });

    test('should return null for non-existent effects', () => {
      const data = statusEffectManager.getEffectData('player1', 'poison');
      expect(data).toBe(null);
    });

    test('should check if player is stunned', () => {
      expect(statusEffectManager.isPlayerStunned('player1')).toBe(false);

      player.applyStatusEffect('stunned', { turns: 1 });

      expect(statusEffectManager.isPlayerStunned('player1')).toBe(true);
    });
  });

  describe('Timed Effects Processing', () => {
    let player1;
    let player2;
    let log;

    beforeEach(() => {
      player1 = new Player('player1', 'TestPlayer1');
      player2 = new Player('player2', 'TestPlayer2');
      player1.isAlive = true;
      player2.isAlive = true;

      players.set('player1', player1);
      players.set('player2', player2);

      mockGameStateUtils.getAlivePlayers.mockReturnValue([player1, player2]);
      log = [];
    });

    test('should process poison effects', () => {
      player1.applyStatusEffect('poison', { damage: 8, turns: 2 });
      player1.hp = 50;

      statusEffectManager.processTimedEffects(log);

      expect(player1.hp).toBe(42); // 50 - 8 = 42
      expect(player1.statusEffects.poison.turns).toBe(1); // Decremented
      expect(
        log.some((entry) => entry.includes('suffers 8 poison damage'))
      ).toBe(true);
    });

    test('should remove expired poison effects', () => {
      player1.applyStatusEffect('poison', { damage: 5, turns: 1 });

      statusEffectManager.processTimedEffects(log);

      expect(player1.hasStatusEffect('poison')).toBe(false);
      expect(
        log.some((entry) =>
          entry.includes('poison affecting TestPlayer1 has worn off')
        )
      ).toBe(true);
    });

    test('should process vulnerability effects', () => {
      player1.applyVulnerability(25, 2);

      statusEffectManager.processTimedEffects(log);

      expect(player1.isVulnerable).toBe(true);
      expect(player1.statusEffects.vulnerable.turns).toBe(1); // Decremented
      expect(log.some((entry) => entry.includes('remains VULNERABLE'))).toBe(
        true
      );
    });

    test('should remove expired vulnerability', () => {
      player1.applyVulnerability(25, 1);

      statusEffectManager.processTimedEffects(log);

      expect(player1.isVulnerable).toBe(false);
      expect(log.some((entry) => entry.includes('no longer vulnerable'))).toBe(
        true
      );
    });

    test('should process regular timed effects', () => {
      player1.applyStatusEffect('stunned', { turns: 2 });

      statusEffectManager.processTimedEffects(log);

      expect(player1.statusEffects.stunned.turns).toBe(1); // Decremented
      expect(player1.hasStatusEffect('stunned')).toBe(true);
    });

    test('should remove expired regular effects', () => {
      player1.applyStatusEffect('invisible', { turns: 1 });

      statusEffectManager.processTimedEffects(log);

      expect(player1.hasStatusEffect('invisible')).toBe(false);
      expect(log.some((entry) => entry.includes('invisible effect'))).toBe(
        true
      );
    });

    test('should handle poison causing death', () => {
      player1.applyStatusEffect('poison', { damage: 15, turns: 2 });
      player1.hp = 10; // Will die from poison

      statusEffectManager.processTimedEffects(log);

      expect(player1.hp).toBe(0);
      expect(player1.pendingDeath).toBe(true);
      expect(player1.deathAttacker).toBe('Poison');
    });

    test('should process stone armor degradation with poison', () => {
      player1.race = 'Dwarf';
      player1.stoneArmorIntact = true;
      player1.processStoneArmorDegradation = jest.fn().mockReturnValue({
        degraded: true,
        oldValue: 5,
        newArmorValue: 4,
        destroyed: false,
      });
      player1.applyStatusEffect('poison', { damage: 5, turns: 2 });

      statusEffectManager.processTimedEffects(log);

      expect(player1.processStoneArmorDegradation).toHaveBeenCalledWith(5);
      expect(log.some((entry) => entry.includes('Stone Armor'))).toBe(true);
    });

    test('should process multiple effects in correct order', () => {
      player1.applyStatusEffect('poison', { damage: 5, turns: 2 });
      player1.applyStatusEffect('stunned', { turns: 2 });
      player1.applyVulnerability(25, 2);

      statusEffectManager.processTimedEffects(log);

      // All effects should be processed
      expect(player1.statusEffects.poison.turns).toBe(1);
      expect(player1.statusEffects.stunned.turns).toBe(1);
      expect(player1.statusEffects.vulnerable.turns).toBe(1);
    });
  });
});
