/**
 * @fileoverview Tests for GameRoom model
 */

const { GameRoom } = require('@models/GameRoom');
const config = require('@config');

// Mock the config to ensure consistent test environment
jest.mock('@config', () => ({
  maxPlayers: 8,
  minPlayers: 2,
  gameBalance: {
    monster: {
      baseHp: 100,
      baseDamage: 10,
      baseAge: 0,
    },
    player: {
      baseHp: 100,
      baseArmor: 0,
      baseDamageMod: 1.0,
      levelUp: {
        hpIncrease: 0.2,
        damageIncrease: 1.25,
        fullHealOnLevelUp: true,
      },
    },
    calculateStats: jest.fn((race, className) => ({
      maxHp: 100,
      armor: 0,
      damageMod: 1.0,
    })),
  },
  classAbilities: {
    Warrior: [
      {
        type: 'slash',
        name: 'Slash',
        category: 'Attack',
        unlockAt: 1,
        order: 1000,
        cooldown: 0,
        params: { damage: 33 },
      },
    ],
  },
  racialAbilities: {
    Human: {
      type: 'adaptability',
      name: 'Adaptability',
      usageLimit: 'perGame',
      maxUses: 1,
    },
  },
  messages: {
    getEvent: jest.fn((key, data) => `Mock event: ${key}`),
    getSuccess: jest.fn((key, data) => `Mock success: ${key}`),
    formatMessage: jest.fn((template, data) => template),
  },
}));

describe('GameRoom Model', () => {
  let gameRoom;

  beforeEach(() => {
    jest.clearAllMocks();
    gameRoom = new GameRoom('TEST');
  });

  describe('Constructor', () => {
    test('should create game room with correct initial values', () => {
      expect(gameRoom.code).toBe('TEST');
      expect(gameRoom.players.size).toBe(0);
      expect(gameRoom.started).toBe(false);
      expect(gameRoom.round).toBe(0);
      expect(gameRoom.level).toBe(1);
      expect(gameRoom.hostId).toBe(null);
      expect(gameRoom.monster.hp).toBe(100);
      expect(gameRoom.systems).toBeDefined();
    });
  });

  describe('Player Management', () => {
    test('should add player successfully', () => {
      const result = gameRoom.addPlayer('player1', 'TestPlayer');

      expect(result).toBe(true);
      expect(gameRoom.players.size).toBe(1);
      expect(gameRoom.hostId).toBe('player1');
      expect(gameRoom.aliveCount).toBe(1);

      const player = gameRoom.players.get('player1');
      expect(player.name).toBe('TestPlayer');
      expect(player.isAlive).toBe(true);
    });

    test('should not add player when game is full', () => {
      // Fill the game to max capacity
      for (let i = 0; i < config.maxPlayers; i++) {
        gameRoom.addPlayer(`player${i}`, `Player${i}`);
      }

      const result = gameRoom.addPlayer('overflow', 'OverflowPlayer');
      expect(result).toBe(false);
    });

    test('should not add player when game has started', () => {
      gameRoom.started = true;
      const result = gameRoom.addPlayer('player1', 'TestPlayer');
      expect(result).toBe(false);
    });

    test('should remove player correctly', () => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.addPlayer('player2', 'TestPlayer2');

      expect(gameRoom.players.size).toBe(2);
      expect(gameRoom.aliveCount).toBe(2);

      gameRoom.removePlayer('player1');

      expect(gameRoom.players.size).toBe(1);
      expect(gameRoom.aliveCount).toBe(1);
      expect(gameRoom.players.has('player1')).toBe(false);
    });

    test('should handle warlock removal correctly', () => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      const player = gameRoom.players.get('player1');
      player.isWarlock = true;

      // Mock the warlock system
      gameRoom.systems.warlockSystem.decrementWarlockCount = jest.fn();

      gameRoom.removePlayer('player1');

      expect(
        gameRoom.systems.warlockSystem.decrementWarlockCount
      ).toHaveBeenCalled();
    });
  });

  describe('Character Selection', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
    });

    test('should set player class correctly', () => {
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');

      const player = gameRoom.players.get('player1');
      expect(player.race).toBe('Human');
      expect(player.class).toBe('Warrior');
      expect(player.abilities).toHaveLength(1);
      expect(player.abilities[0].type).toBe('slash');
      expect(player.unlocked).toHaveLength(1);
    });

    test('should apply stat calculations from config', () => {
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');

      const player = gameRoom.players.get('player1');
      expect(player.maxHp).toBe(100);
      expect(player.hp).toBe(100);
      expect(player.armor).toBe(0);
      expect(player.damageMod).toBe(1.0);
    });

    test('should set racial ability correctly', () => {
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');

      const player = gameRoom.players.get('player1');
      expect(player.racialAbility).toEqual(config.racialAbilities.Human);
    });
  });

  describe('Action Management', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.addPlayer('player2', 'TestPlayer2');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.setPlayerClass('player2', 'Human', 'Warrior');
      gameRoom.started = true;
    });

    test('should add action successfully', () => {
      const result = gameRoom.addAction('player1', 'slash', '__monster__');

      expect(result).toBe(true);
      expect(gameRoom.pendingActions).toHaveLength(1);
      expect(gameRoom.pendingActions[0]).toEqual({
        actorId: 'player1',
        actionType: 'slash',
        targetId: '__monster__',
        options: {},
      });
    });

    test('should not allow double actions', () => {
      gameRoom.addAction('player1', 'slash', '__monster__');
      const result = gameRoom.addAction('player1', 'slash', '__monster__');

      expect(result).toBe(false);
      expect(gameRoom.pendingActions).toHaveLength(1);
    });

    test('should not allow actions from dead players', () => {
      const player = gameRoom.players.get('player1');
      player.isAlive = false;

      const result = gameRoom.addAction('player1', 'slash', '__monster__');
      expect(result).toBe(false);
    });

    test('should not allow actions from stunned players', () => {
      gameRoom.systems.statusEffectManager.isPlayerStunned = jest
        .fn()
        .mockReturnValue(true);

      const result = gameRoom.addAction('player1', 'slash', '__monster__');
      expect(result).toBe(false);
    });

    test('should handle ability cooldowns', () => {
      const player = gameRoom.players.get('player1');
      player.putAbilityOnCooldown('slash', 2);

      const result = gameRoom.addAction('player1', 'slash', '__monster__');
      expect(result).toBe(false);
    });

    test('should check if all actions are submitted', () => {
      expect(gameRoom.allActionsSubmitted()).toBe(false);

      gameRoom.addAction('player1', 'slash', '__monster__');
      expect(gameRoom.allActionsSubmitted()).toBe(false);

      gameRoom.addAction('player2', 'slash', '__monster__');
      expect(gameRoom.allActionsSubmitted()).toBe(true);
    });
  });

  describe('Racial Actions', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.started = true;
    });

    test('should add racial action successfully', () => {
      const result = gameRoom.addRacialAction('player1', 'player1');

      expect(result).toBe(true);
      expect(gameRoom.pendingRacialActions).toHaveLength(1);

      const player = gameRoom.players.get('player1');
      expect(player.racialUsesLeft).toBe(0); // Used up
    });

    test('should not allow racial action when cannot use', () => {
      const player = gameRoom.players.get('player1');
      player.racialUsesLeft = 0;

      const result = gameRoom.addRacialAction('player1', 'player1');
      expect(result).toBe(false);
    });
  });

  describe('Level Progression', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
    });

    test('should update unlocked abilities on level up', () => {
      // Add a level 2 ability to the player's abilities
      const player = gameRoom.players.get('player1');
      player.abilities.push({
        type: 'shield',
        name: 'Shield',
        unlockAt: 2,
      });

      expect(player.unlocked).toHaveLength(1); // Only level 1 ability

      gameRoom.level = 2;
      gameRoom.updateUnlockedAbilities();

      expect(player.unlocked).toHaveLength(2); // Now includes level 2 ability
    });
  });

  describe('Player Information', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
    });

    test('should get players info correctly', () => {
      const playersInfo = gameRoom.getPlayersInfo();

      expect(playersInfo).toHaveLength(1);
      expect(playersInfo[0]).toMatchObject({
        id: 'player1',
        name: 'TestPlayer',
        race: 'Human',
        class: 'Warrior',
        hp: 100,
        maxHp: 100,
        isAlive: true,
        isWarlock: false,
        level: 1,
      });
    });
  });

  describe('Player ID Transfer (Reconnection)', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
    });

    test('should transfer player ID successfully', () => {
      const result = gameRoom.transferPlayerId('player1', 'newSocketId');

      expect(result).toBe(true);
      expect(gameRoom.players.has('player1')).toBe(false);
      expect(gameRoom.players.has('newSocketId')).toBe(true);

      const player = gameRoom.players.get('newSocketId');
      expect(player.id).toBe('newSocketId');
      expect(player.name).toBe('TestPlayer');
    });

    test('should update host ID when transferring host', () => {
      gameRoom.hostId = 'player1';

      gameRoom.transferPlayerId('player1', 'newSocketId');

      expect(gameRoom.hostId).toBe('newSocketId');
    });

    test('should update pending actions when transferring', () => {
      gameRoom.started = true;
      gameRoom.addAction('player1', 'slash', '__monster__');

      gameRoom.transferPlayerId('player1', 'newSocketId');

      expect(gameRoom.pendingActions[0].actorId).toBe('newSocketId');
    });

    test('should fail transfer for non-existent player', () => {
      const result = gameRoom.transferPlayerId('nonexistent', 'newSocketId');
      expect(result).toBe(false);
    });
  });

  describe('Ready Status', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.addPlayer('player2', 'TestPlayer2');
    });

    test('should clear ready status correctly', () => {
      gameRoom.nextReady.add('player1');
      const player = gameRoom.players.get('player1');
      player.isReady = true;

      gameRoom.clearReady();

      expect(gameRoom.nextReady.size).toBe(0);
      expect(player.isReady).toBe(false);
    });
  });

  describe('Warlock Assignment', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.addPlayer('player2', 'TestPlayer2');
    });

    test('should assign initial warlock', () => {
      gameRoom.systems.warlockSystem.assignInitialWarlock = jest.fn();

      gameRoom.assignInitialWarlock('player1');

      expect(
        gameRoom.systems.warlockSystem.assignInitialWarlock
      ).toHaveBeenCalledWith('player1');
    });
  });
});
