/**
 * @fileoverview Tests for PlayerStats model
 */
import { PlayerStats, PlayerStatsData, PlayerStatsSummary } from '../../../../server/models/player/PlayerStats';
import logger from '../../../../server/utils/logger';

// Mock dependencies
jest.mock('@utils/logger');
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('PlayerStats', () => {
  let playerStats: PlayerStats;
  const playerName = 'TestPlayer';

  beforeEach(() => {
    jest.clearAllMocks();
    playerStats = new PlayerStats(playerName);
  });

  describe('constructor', () => {
    it('should initialize with default stats', () => {
      const stats = playerStats.getStats();
      
      expect(stats).toEqual({
        totalDamageDealt: 0,
        totalHealingDone: 0,
        damageTaken: 0,
        corruptionsPerformed: 0,
        abilitiesUsed: 0,
        monsterKills: 0,
        timesDied: 0,
        selfHeals: 0,
        highestSingleHit: 0
      });
    });

    it('should initialize with provided initial stats', () => {
      const initialStats: Partial<PlayerStatsData> = {
        totalDamageDealt: 100,
        damageTaken: 50,
        abilitiesUsed: 5
      };

      const stats = new PlayerStats(playerName, initialStats);
      const currentStats = stats.getStats();

      expect(currentStats.totalDamageDealt).toBe(100);
      expect(currentStats.damageTaken).toBe(50);
      expect(currentStats.abilitiesUsed).toBe(5);
      expect(currentStats.totalHealingDone).toBe(0); // Default value
    });

    it('should validate initial stats with schema', () => {
      // Negative values should default to 0
      const invalidStats: any = {
        totalDamageDealt: -100,
        damageTaken: 'invalid',
        abilitiesUsed: 3.14
      };

      expect(() => new PlayerStats(playerName, invalidStats)).toThrow();
    });
  });

  describe('damage tracking', () => {
    describe('addDamageDealt', () => {
      it('should add damage dealt and update total', () => {
        playerStats.addDamageDealt(50);
        playerStats.addDamageDealt(30);

        const stats = playerStats.getStats();
        expect(stats.totalDamageDealt).toBe(80);
        expect(stats.highestSingleHit).toBe(50);
      });

      it('should update highest single hit', () => {
        playerStats.addDamageDealt(20);
        playerStats.addDamageDealt(50);
        playerStats.addDamageDealt(30);

        const stats = playerStats.getStats();
        expect(stats.highestSingleHit).toBe(50);
      });

      it('should ignore zero or negative damage', () => {
        playerStats.addDamageDealt(0);
        playerStats.addDamageDealt(-10);

        const stats = playerStats.getStats();
        expect(stats.totalDamageDealt).toBe(0);
        expect(stats.highestSingleHit).toBe(0);
      });

      it('should log damage updates', () => {
        playerStats.addDamageDealt(100);

        expect(mockLogger.info).toHaveBeenCalledWith(
          `${playerName} stats updated: +100 damage, total: 100, highest: 100`
        );
      });
    });

    describe('addDamageTaken', () => {
      it('should add damage taken', () => {
        playerStats.addDamageTaken(25);
        playerStats.addDamageTaken(15);

        const stats = playerStats.getStats();
        expect(stats.damageTaken).toBe(40);
      });

      it('should ignore zero or negative damage', () => {
        playerStats.addDamageTaken(0);
        playerStats.addDamageTaken(-5);

        const stats = playerStats.getStats();
        expect(stats.damageTaken).toBe(0);
      });

      it('should log damage taken updates', () => {
        playerStats.addDamageTaken(50);

        expect(mockLogger.info).toHaveBeenCalledWith(
          `${playerName} stats updated: +50 damage taken, total: 50`
        );
      });
    });
  });

  describe('healing tracking', () => {
    describe('addHealingDone', () => {
      it('should add healing done', () => {
        playerStats.addHealingDone(30);
        playerStats.addHealingDone(20);

        const stats = playerStats.getStats();
        expect(stats.totalHealingDone).toBe(50);
      });

      it('should ignore zero or negative healing', () => {
        playerStats.addHealingDone(0);
        playerStats.addHealingDone(-10);

        const stats = playerStats.getStats();
        expect(stats.totalHealingDone).toBe(0);
      });

      it('should log healing updates', () => {
        playerStats.addHealingDone(25);

        expect(mockLogger.info).toHaveBeenCalledWith(
          `${playerName} stats updated: +25 healing done, total: 25`
        );
      });
    });

    describe('addSelfHeal', () => {
      it('should add self healing', () => {
        playerStats.addSelfHeal(15);
        playerStats.addSelfHeal(10);

        const stats = playerStats.getStats();
        expect(stats.selfHeals).toBe(25);
      });

      it('should ignore zero or negative self healing', () => {
        playerStats.addSelfHeal(0);
        playerStats.addSelfHeal(-5);

        const stats = playerStats.getStats();
        expect(stats.selfHeals).toBe(0);
      });

      it('should log self heal updates', () => {
        playerStats.addSelfHeal(20);

        expect(mockLogger.info).toHaveBeenCalledWith(
          `${playerName} stats updated: +20 self-heal, total: 20`
        );
      });
    });
  });

  describe('counter tracking', () => {
    describe('addCorruption', () => {
      it('should increment corruption count', () => {
        playerStats.addCorruption();
        playerStats.addCorruption();

        const stats = playerStats.getStats();
        expect(stats.corruptionsPerformed).toBe(2);
      });

      it('should log corruption updates', () => {
        playerStats.addCorruption();

        expect(mockLogger.info).toHaveBeenCalledWith(
          `${playerName} stats updated: corruption performed, total: 1`
        );
      });
    });

    describe('addAbilityUse', () => {
      it('should increment ability use count', () => {
        playerStats.addAbilityUse();
        playerStats.addAbilityUse();
        playerStats.addAbilityUse();

        const stats = playerStats.getStats();
        expect(stats.abilitiesUsed).toBe(3);
      });

      it('should log ability use updates', () => {
        playerStats.addAbilityUse();

        expect(mockLogger.info).toHaveBeenCalledWith(
          `${playerName} stats updated: ability used, total: 1`
        );
      });
    });

    describe('addDeath', () => {
      it('should increment death count', () => {
        playerStats.addDeath();

        const stats = playerStats.getStats();
        expect(stats.timesDied).toBe(1);
      });

      it('should log death updates', () => {
        playerStats.addDeath();

        expect(mockLogger.info).toHaveBeenCalledWith(
          `${playerName} stats updated: death recorded, total: 1`
        );
      });
    });

    describe('addMonsterKill', () => {
      it('should increment monster kill count', () => {
        playerStats.addMonsterKill();
        playerStats.addMonsterKill();

        const stats = playerStats.getStats();
        expect(stats.monsterKills).toBe(2);
      });

      it('should log monster kill updates', () => {
        playerStats.addMonsterKill();

        expect(mockLogger.info).toHaveBeenCalledWith(
          `${playerName} stats updated: monster kill, total: 1`
        );
      });
    });
  });

  describe('utility methods', () => {
    describe('getStats', () => {
      it('should return a copy of stats', () => {
        playerStats.addDamageDealt(100);
        
        const stats1 = playerStats.getStats();
        const stats2 = playerStats.getStats();

        expect(stats1).toEqual(stats2);
        expect(stats1).not.toBe(stats2); // Different objects
      });
    });

    describe('getStat', () => {
      it('should return specific stat value', () => {
        playerStats.addDamageDealt(150);
        playerStats.addAbilityUse();
        playerStats.addAbilityUse();

        expect(playerStats.getStat('totalDamageDealt')).toBe(150);
        expect(playerStats.getStat('abilitiesUsed')).toBe(2);
      });

      it('should return 0 for invalid stat names', () => {
        expect(playerStats.getStat('invalidStat' as any)).toBe(0);
      });
    });

    describe('reset', () => {
      it('should reset all stats to zero', () => {
        // Add some stats
        playerStats.addDamageDealt(100);
        playerStats.addHealingDone(50);
        playerStats.addAbilityUse();
        playerStats.addDeath();

        // Reset
        playerStats.reset();

        const stats = playerStats.getStats();
        expect(stats).toEqual({
          totalDamageDealt: 0,
          totalHealingDone: 0,
          damageTaken: 0,
          corruptionsPerformed: 0,
          abilitiesUsed: 0,
          monsterKills: 0,
          timesDied: 0,
          selfHeals: 0,
          highestSingleHit: 0
        });
      });
    });

    describe('setPlayerName', () => {
      it('should update player name for logging', () => {
        playerStats.setPlayerName('NewName');
        playerStats.addDamageDealt(50);

        expect(mockLogger.info).toHaveBeenCalledWith(
          'NewName stats updated: +50 damage, total: 50, highest: 50'
        );
      });
    });
  });

  describe('getSummary', () => {
    it('should return organized summary statistics', () => {
      // Add various stats
      playerStats.addDamageDealt(100);
      playerStats.addDamageDealt(50);
      playerStats.addDamageTaken(75);
      playerStats.addHealingDone(30);
      playerStats.addSelfHeal(20);
      playerStats.addAbilityUse();
      playerStats.addAbilityUse();
      playerStats.addDeath();
      playerStats.addCorruption();
      playerStats.addMonsterKill();

      const summary: PlayerStatsSummary = playerStats.getSummary();

      expect(summary).toEqual({
        combatStats: {
          damageDealt: 150,
          damageTaken: 75,
          highestHit: 100,
          monsterKills: 1
        },
        supportStats: {
          healingDone: 30,
          selfHealing: 20
        },
        gameplayStats: {
          abilitiesUsed: 2,
          deaths: 1,
          corruptions: 1
        }
      });
    });
  });

  describe('serialization', () => {
    describe('toJSON', () => {
      it('should return serializable stats data', () => {
        playerStats.addDamageDealt(100);
        playerStats.addAbilityUse();

        const json = playerStats.toJSON();

        expect(json).toEqual(expect.objectContaining({
          totalDamageDealt: 100,
          abilitiesUsed: 1
        }));
        expect(typeof json).toBe('object');
      });
    });

    describe('fromJSON', () => {
      it('should create PlayerStats from valid JSON data', () => {
        const data: PlayerStatsData = {
          totalDamageDealt: 200,
          totalHealingDone: 100,
          damageTaken: 150,
          corruptionsPerformed: 2,
          abilitiesUsed: 10,
          monsterKills: 3,
          timesDied: 1,
          selfHeals: 50,
          highestSingleHit: 75
        };

        const stats = PlayerStats.fromJSON('NewPlayer', data);
        
        expect(stats.getStats()).toEqual(data);
        expect(stats.getStat('totalDamageDealt')).toBe(200);
      });

      it('should validate JSON data with schema', () => {
        const invalidData = {
          totalDamageDealt: 'not a number',
          totalHealingDone: -100
        };

        expect(() => PlayerStats.fromJSON('Player', invalidData)).toThrow();
      });

      it('should apply defaults for missing fields', () => {
        const partialData = {
          totalDamageDealt: 100,
          abilitiesUsed: 5
        };

        const stats = PlayerStats.fromJSON('Player', partialData);
        const fullStats = stats.getStats();

        expect(fullStats.totalDamageDealt).toBe(100);
        expect(fullStats.abilitiesUsed).toBe(5);
        expect(fullStats.totalHealingDone).toBe(0); // Default
        expect(fullStats.damageTaken).toBe(0); // Default
      });
    });
  });

  describe('complex scenarios', () => {
    it('should track multiple damage instances correctly', () => {
      const damages = [10, 25, 15, 30, 20];
      
      damages.forEach(damage => playerStats.addDamageDealt(damage));

      const stats = playerStats.getStats();
      expect(stats.totalDamageDealt).toBe(100);
      expect(stats.highestSingleHit).toBe(30);
    });

    it('should maintain separate tracking for different stat types', () => {
      playerStats.addDamageDealt(100);
      playerStats.addDamageTaken(50);
      playerStats.addHealingDone(30);
      playerStats.addSelfHeal(20);

      const stats = playerStats.getStats();
      expect(stats.totalDamageDealt).toBe(100);
      expect(stats.damageTaken).toBe(50);
      expect(stats.totalHealingDone).toBe(30);
      expect(stats.selfHeals).toBe(20);
    });

    it('should handle rapid stat updates', () => {
      for (let i = 0; i < 100; i++) {
        playerStats.addAbilityUse();
      }

      expect(playerStats.getStat('abilitiesUsed')).toBe(100);
    });
  });
});