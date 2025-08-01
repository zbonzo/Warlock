/**
 * @fileoverview Tests for CoordinationTracker class
 */

import CoordinationTracker from '../../../../../server/models/systems/combat/CoordinationTracker';

jest.mock('@config', () => ({
  gameBalance: {
    coordination: {
      bonusPerAttacker: 0.15,
      maxBonus: 0.5
    }
  }
}));

describe('CoordinationTracker', () => {
  let coordinationTracker: CoordinationTracker;

  beforeEach(() => {
    coordinationTracker = new CoordinationTracker();
  });

  describe('trackCoordination', () => {
    it('should track multiple players targeting same enemy', () => {
      coordinationTracker.trackCoordination('player1', 'monster');
      coordinationTracker.trackCoordination('player2', 'monster');
      
      expect(coordinationTracker.getCoordinationCount('monster', 'player1')).toBe(1);
      expect(coordinationTracker.hasCoordinatedAttacks('monster')).toBe(true);
    });

    it('should not duplicate same player-target combination', () => {
      coordinationTracker.trackCoordination('player1', 'monster');
      coordinationTracker.trackCoordination('player1', 'monster');
      
      expect(coordinationTracker.getCoordinationCount('monster', 'player2')).toBe(1);
    });
  });

  describe('calculateCoordinationBonus', () => {
    it('should calculate bonus based on other attackers', () => {
      coordinationTracker.trackCoordination('player1', 'monster');
      coordinationTracker.trackCoordination('player2', 'monster');
      coordinationTracker.trackCoordination('player3', 'monster');
      
      const bonus = coordinationTracker.calculateCoordinationBonus('player1', 'monster');
      
      expect(bonus.count).toBe(2); // Other 2 players
      expect(bonus.bonus).toBe(0.3); // 2 * 0.15
    });

    it('should cap bonus at maximum', () => {
      for (let i = 1; i <= 5; i++) {
        coordinationTracker.trackCoordination(`player${i}`, 'monster');
      }
      
      const bonus = coordinationTracker.calculateCoordinationBonus('player1', 'monster');
      
      expect(bonus.bonus).toBe(0.5); // Capped at maxBonus
    });

    it('should return zero bonus for single attacker', () => {
      coordinationTracker.trackCoordination('player1', 'monster');
      
      const bonus = coordinationTracker.calculateCoordinationBonus('player1', 'monster');
      
      expect(bonus.bonus).toBe(0);
      expect(bonus.count).toBe(0);
    });
  });

  describe('getCoordinationStats', () => {
    it('should return accurate coordination statistics', () => {
      coordinationTracker.trackCoordination('player1', 'monster1');
      coordinationTracker.trackCoordination('player2', 'monster1');
      coordinationTracker.trackCoordination('player3', 'monster2');
      
      const stats = coordinationTracker.getCoordinationStats();
      
      expect(stats.totalTargets).toBe(2);
      expect(stats.coordinatedTargets).toBe(1); // Only monster1 has multiple attackers
      expect(stats.maxAttackersOnSingleTarget).toBe(2);
    });
  });

  describe('resetTracking', () => {
    it('should clear all coordination data', () => {
      coordinationTracker.trackCoordination('player1', 'monster');
      coordinationTracker.resetTracking();
      
      expect(coordinationTracker.hasCoordinatedAttacks('monster')).toBe(false);
      expect(coordinationTracker.getCoordinationStats().totalTargets).toBe(0);
    });
  });
});