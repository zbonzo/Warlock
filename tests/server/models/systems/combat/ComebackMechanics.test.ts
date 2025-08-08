/**
 * @fileoverview Tests for ComebackMechanics class
 */

import ComebackMechanics from '../../../../../server/models/systems/combat/ComebackMechanics';

jest.mock('@config', () => ({
  gameBalance: {
    comeback: {
      threshold: 0.3,
      bonus: 0.2
    }
  }
}));

jest.mock('@utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn()
}));

describe('ComebackMechanics', () => {
  let players: Map<string, any>;
  let comebackMechanics: ComebackMechanics;
  let monster: any;

  beforeEach(() => {
    players = new Map();
    monster = { hp: 100, maxHp: 100 };
    comebackMechanics = new ComebackMechanics(players);
  });

  describe('updateComebackStatus', () => {
    it('should activate comeback when good team is struggling', () => {
      players.set('player1', { hp: 20, maxHp: 100, isAlive: true, isWarlock: false });
      players.set('player2', { hp: 30, maxHp: 100, isAlive: true, isWarlock: false });

      const result = comebackMechanics.updateComebackStatus(monster);

      expect(result).toBe(true);
      expect(comebackMechanics.isActive()).toBe(true);
    });

    it('should not activate when good team has high health', () => {
      players.set('player1', { hp: 80, maxHp: 100, isAlive: true, isWarlock: false });

      const result = comebackMechanics.updateComebackStatus(monster);

      expect(result).toBe(false);
      expect(comebackMechanics.isActive()).toBe(false);
    });
  });

  describe('getComebackBonus', () => {
    it('should return bonus for good players when active', () => {
      comebackMechanics.forceActivate(true);
      const player = { isWarlock: false };

      const bonus = comebackMechanics.getComebackBonus(player);

      expect(bonus).toBe(0.2);
    });

    it('should return 0 for warlocks', () => {
      comebackMechanics.forceActivate(true);
      const player = { isWarlock: true };

      const bonus = comebackMechanics.getComebackBonus(player);

      expect(bonus).toBe(0);
    });
  });
});
