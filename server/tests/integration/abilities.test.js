/**
 * @fileoverview Integration tests for ability system
 */

const { GameRoom } = require('@models/GameRoom');

// Minimal config mock for ability testing
jest.mock('@config', () => ({
  maxPlayers: 8,
  gameBalance: {
    monster: { baseHp: 100, baseDamage: 10, baseAge: 0 },
    calculateStats: jest.fn(() => ({ maxHp: 100, armor: 0, damageMod: 1.0 })),
  },
  classAbilities: {
    TestClass: [
      {
        type: 'heal',
        name: 'Heal',
        category: 'Heal',
        target: 'Single',
        unlockAt: 1,
        params: { amount: 30 },
      },
      {
        type: 'fireball',
        name: 'Fireball',
        category: 'Attack',
        target: 'Single',
        unlockAt: 1,
        params: { damage: 35 },
      },
    ],
  },
  racialAbilities: {
    TestRace: {
      type: 'testRacial',
      name: 'Test Racial',
      usageLimit: 'perGame',
      maxUses: 1,
    },
  },
  statusEffects: {
    getEffectDefaults: jest.fn(() => ({ damage: 5, turns: 3 })),
  },
  messages: {
    getEvent: jest.fn((key) => `Event: ${key}`),
    formatMessage: jest.fn((template) => template),
  },
}));

describe('Ability System Integration', () => {
  let gameRoom;
  let player1;
  let player2;

  beforeEach(() => {
    gameRoom = new GameRoom('TEST');

    // Add and set up players
    gameRoom.addPlayer('player1', 'Healer');
    gameRoom.addPlayer('player2', 'Fighter');
    gameRoom.setPlayerClass('player1', 'TestRace', 'TestClass');
    gameRoom.setPlayerClass('player2', 'TestRace', 'TestClass');

    player1 = gameRoom.players.get('player1');
    player2 = gameRoom.players.get('player2');

    gameRoom.started = true;

    // Mock ability registry to return success
    gameRoom.systems.abilityRegistry.executeClassAbility = jest
      .fn()
      .mockReturnValue(true);
    gameRoom.systems.abilityRegistry.hasClassAbility = jest
      .fn()
      .mockReturnValue(true);
  });

  test('should execute healing abilities correctly', () => {
    // Damage player2 first
    player2.hp = 50;

    // Player1 heals player2
    const success = gameRoom.addAction('player1', 'heal', 'player2');
    expect(success).toBe(true);

    // Process the action
    const log = [];
    gameRoom.processPlayerActions(log);

    expect(
      gameRoom.systems.abilityRegistry.executeClassAbility
    ).toHaveBeenCalledWith('heal', player1, player2, expect.any(Object), log);
  });

  test('should execute attack abilities correctly', () => {
    const success = gameRoom.addAction('player1', 'fireball', '__monster__');
    expect(success).toBe(true);

    const log = [];
    gameRoom.processPlayerActions(log);

    expect(
      gameRoom.systems.abilityRegistry.executeClassAbility
    ).toHaveBeenCalledWith(
      'fireball',
      player1,
      '__monster__',
      expect.any(Object),
      log
    );
  });

  test('should handle racial abilities', () => {
    gameRoom.systems.abilityRegistry.executeRacialAbility = jest
      .fn()
      .mockReturnValue(true);
    gameRoom.systems.abilityRegistry.hasRacialAbility = jest
      .fn()
      .mockReturnValue(true);

    const success = gameRoom.addRacialAction('player1', 'player1');
    expect(success).toBe(true);

    const log = [];
    gameRoom.processRacialAbilities(log);

    expect(
      gameRoom.systems.abilityRegistry.executeRacialAbility
    ).toHaveBeenCalled();
  });
});
