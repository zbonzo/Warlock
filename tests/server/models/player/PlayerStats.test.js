/**
 * @fileoverview Tests for PlayerStats domain model
 */
const PlayerStats = require('../../../../server/models/player/PlayerStats');

describe('PlayerStats', () => {
  let playerStats;

  beforeEach(() => {
    playerStats = new PlayerStats('TestPlayer');
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      const stats = playerStats.getStats();
      
      expect(stats.totalDamageDealt).toBe(0);
      expect(stats.totalHealingDone).toBe(0);
      expect(stats.damageTaken).toBe(0);
      expect(stats.corruptionsPerformed).toBe(0);
      expect(stats.abilitiesUsed).toBe(0);
      expect(stats.monsterKills).toBe(0);
      expect(stats.timesDied).toBe(0);
      expect(stats.selfHeals).toBe(0);
      expect(stats.highestSingleHit).toBe(0);
    });
  });

  describe('Damage Tracking', () => {
    test('should track damage dealt correctly', () => {
      playerStats.addDamageDealt(50);
      playerStats.addDamageDealt(75);
      
      const stats = playerStats.getStats();
      expect(stats.totalDamageDealt).toBe(125);
      expect(stats.highestSingleHit).toBe(75);
    });

    test('should ignore zero or negative damage', () => {
      playerStats.addDamageDealt(0);
      playerStats.addDamageDealt(-5);
      
      const stats = playerStats.getStats();
      expect(stats.totalDamageDealt).toBe(0);
      expect(stats.highestSingleHit).toBe(0);
    });

    test('should track damage taken correctly', () => {
      playerStats.addDamageTaken(30);
      playerStats.addDamageTaken(45);
      
      const stats = playerStats.getStats();
      expect(stats.damageTaken).toBe(75);
    });

    test('should ignore zero or negative damage taken', () => {
      playerStats.addDamageTaken(0);
      playerStats.addDamageTaken(-10);
      
      const stats = playerStats.getStats();
      expect(stats.damageTaken).toBe(0);
    });
  });

  describe('Healing Tracking', () => {
    test('should track healing done correctly', () => {
      playerStats.addHealingDone(25);
      playerStats.addHealingDone(15);
      
      const stats = playerStats.getStats();
      expect(stats.totalHealingDone).toBe(40);
    });

    test('should track self-healing correctly', () => {
      playerStats.addSelfHeal(20);
      playerStats.addSelfHeal(10);
      
      const stats = playerStats.getStats();
      expect(stats.selfHeals).toBe(30);
    });

    test('should ignore zero or negative healing', () => {
      playerStats.addHealingDone(0);
      playerStats.addHealingDone(-5);
      playerStats.addSelfHeal(0);
      playerStats.addSelfHeal(-3);
      
      const stats = playerStats.getStats();
      expect(stats.totalHealingDone).toBe(0);
      expect(stats.selfHeals).toBe(0);
    });
  });

  describe('Action Tracking', () => {
    test('should track corruptions correctly', () => {
      playerStats.addCorruption();
      playerStats.addCorruption();
      playerStats.addCorruption();
      
      const stats = playerStats.getStats();
      expect(stats.corruptionsPerformed).toBe(3);
    });

    test('should track ability uses correctly', () => {
      playerStats.addAbilityUse();
      playerStats.addAbilityUse();
      
      const stats = playerStats.getStats();
      expect(stats.abilitiesUsed).toBe(2);
    });

    test('should track deaths correctly', () => {
      playerStats.addDeath();
      
      const stats = playerStats.getStats();
      expect(stats.timesDied).toBe(1);
    });

    test('should track monster kills correctly', () => {
      playerStats.addMonsterKill();
      playerStats.addMonsterKill();
      
      const stats = playerStats.getStats();
      expect(stats.monsterKills).toBe(2);
    });
  });

  describe('Utility Methods', () => {
    test('should get specific stat value', () => {
      playerStats.addDamageDealt(100);
      
      expect(playerStats.getStat('totalDamageDealt')).toBe(100);
      expect(playerStats.getStat('nonexistent')).toBe(0);
    });

    test('should reset stats correctly', () => {
      playerStats.addDamageDealt(100);
      playerStats.addCorruption();
      playerStats.addAbilityUse();
      
      playerStats.reset();
      
      const stats = playerStats.getStats();
      expect(stats.totalDamageDealt).toBe(0);
      expect(stats.corruptionsPerformed).toBe(0);
      expect(stats.abilitiesUsed).toBe(0);
    });

    test('should update player name correctly', () => {
      playerStats.setPlayerName('NewName');
      expect(playerStats.playerName).toBe('NewName');
    });

    test('should return summary statistics correctly', () => {
      playerStats.addDamageDealt(100);
      playerStats.addDamageTaken(50);
      playerStats.addHealingDone(30);
      playerStats.addMonsterKill();
      playerStats.addCorruption();
      
      const summary = playerStats.getSummary();
      
      expect(summary.combatStats.damageDealt).toBe(100);
      expect(summary.combatStats.damageTaken).toBe(50);
      expect(summary.combatStats.highestHit).toBe(100);
      expect(summary.combatStats.monsterKills).toBe(1);
      expect(summary.supportStats.healingDone).toBe(30);
      expect(summary.gameplayStats.corruptions).toBe(1);
    });

    test('should return immutable stats copy', () => {
      playerStats.addDamageDealt(50);
      
      const stats1 = playerStats.getStats();
      const stats2 = playerStats.getStats();
      
      stats1.totalDamageDealt = 999;
      expect(stats2.totalDamageDealt).toBe(50);
    });
  });
});