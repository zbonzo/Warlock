/**
 * @fileoverview Tests for GameStateUtils
 */

const GameStateUtils = require('@models/systems/GameStateUtils');
const Player = require('@models/Player');

// Mock config for win conditions
jest.mock('@config', () => ({
  gameBalance: {
    warlock: {
      winConditions: {
        allWarlocksGone: 'Good',
        allPlayersWarlocks: 'Evil',
        majorityThreshold: 0.5,
      },
    },
  },
}));

describe('GameStateUtils', () => {
  let gameStateUtils;
  let players;

  beforeEach(() => {
    players = new Map();
    gameStateUtils = new GameStateUtils(players);
  });

  describe('Player Queries', () => {
    beforeEach(() => {
      const player1 = new Player('player1', 'Alice');
      const player2 = new Player('player2', 'Bob');
      const player3 = new Player('player3', 'Charlie');

      player1.isAlive = true;
      player2.isAlive = true;
      player3.isAlive = false; // Dead player

      players.set('player1', player1);
      players.set('player2', player2);
      players.set('player3', player3);
    });

    test('should get alive players correctly', () => {
      const alivePlayers = gameStateUtils.getAlivePlayers();

      expect(alivePlayers).toHaveLength(2);
      expect(alivePlayers.map((p) => p.id)).toEqual(['player1', 'player2']);
    });

    test('should check if player is alive', () => {
      expect(gameStateUtils.isPlayerAlive('player1')).toBe(true);
      expect(gameStateUtils.isPlayerAlive('player3')).toBe(false);
      expect(gameStateUtils.isPlayerAlive('nonexistent')).toBe(false);
    });

    test('should get lowest HP player', () => {
      players.get('player1').hp = 30;
      players.get('player2').hp = 80;

      const lowestHp = gameStateUtils.getLowestHpPlayer();

      expect(lowestHp.id).toBe('player1');
      expect(lowestHp.hp).toBe(30);
    });

    test('should get highest HP player', () => {
      players.get('player1').hp = 30;
      players.get('player2').hp = 80;

      const highestHp = gameStateUtils.getHighestHpPlayer();

      expect(highestHp.id).toBe('player2');
      expect(highestHp.hp).toBe(80);
    });

    test('should exclude invisible players when requested', () => {
      players.get('player1').applyStatusEffect('invisible', { turns: 1 });
      players.get('player2').hp = 30;

      const lowestHp = gameStateUtils.getLowestHpPlayer(false);

      expect(lowestHp.id).toBe('player2'); // Should skip invisible player1
    });

    test('should return null when no alive players', () => {
      players.get('player1').isAlive = false;
      players.get('player2').isAlive = false;

      const lowestHp = gameStateUtils.getLowestHpPlayer();
      expect(lowestHp).toBe(null);
    });
  });

  describe('Random Target Selection', () => {
    beforeEach(() => {
      const player1 = new Player('player1', 'Alice');
      const player2 = new Player('player2', 'Bob');
      const player3 = new Player('player3', 'Charlie');

      player1.isAlive = true;
      player2.isAlive = true;
      player3.isAlive = true;

      players.set('player1', player1);
      players.set('player2', player2);
      players.set('player3', player3);
    });

    test('should select random target excluding actor', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const target = gameStateUtils.getRandomTarget({ actorId: 'player1' });

      expect(target).toBeOneOf(['player2', 'player3']);
      expect(target).not.toBe('player1');
    });

    test('should exclude specified IDs', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);

      const target = gameStateUtils.getRandomTarget({
        actorId: 'player1',
        excludeIds: ['player2'],
      });

      expect(target).toBe('player3');
    });

    test('should include monster when requested', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.99); // Should pick last option

      const target = gameStateUtils.getRandomTarget({
        actorId: 'player1',
        includeMonster: true,
        monsterRef: { hp: 100 },
      });

      // With 3 targets (player2, player3, __monster__), 0.99 should pick __monster__
      expect(target).toBe('__monster__');
    });

    test('should exclude invisible players', () => {
      players.get('player2').applyStatusEffect('invisible', { turns: 1 });
      jest.spyOn(Math, 'random').mockReturnValue(0);

      const target = gameStateUtils.getRandomTarget({ actorId: 'player1' });

      expect(target).toBe('player3'); // Should skip invisible player2
    });

    test('should fall back to self when no other targets', () => {
      players.get('player2').isAlive = false;
      players.get('player3').isAlive = false;

      const target = gameStateUtils.getRandomTarget({ actorId: 'player1' });

      expect(target).toBe('player1');
    });

    test('should return null when only players requested but none available', () => {
      players.get('player2').isAlive = false;
      players.get('player3').isAlive = false;

      const target = gameStateUtils.getRandomTarget({
        actorId: 'player1',
        onlyPlayers: true,
      });

      expect(target).toBe(null);
    });
  });

  describe('Win Conditions', () => {
    test('should return Good when no warlocks and players alive', () => {
      const winner = gameStateUtils.checkWinConditions(0, 3);
      expect(winner).toBe('Good');
    });

    test('should return Evil when all players are warlocks', () => {
      const winner = gameStateUtils.checkWinConditions(2, 2);
      expect(winner).toBe('Evil');
    });

    test('should return null when game continues', () => {
      const winner = gameStateUtils.checkWinConditions(1, 3);
      expect(winner).toBe(null);
    });

    test('should return null when no players alive', () => {
      const winner = gameStateUtils.checkWinConditions(0, 0);
      expect(winner).toBe(null);
    });
  });

  describe('Player Grouping and Sorting', () => {
    beforeEach(() => {
      const player1 = new Player('player1', 'Alice');
      const player2 = new Player('player2', 'Bob');
      const player3 = new Player('player3', 'Charlie');

      player1.isAlive = true;
      player1.hp = 80;
      player1.race = 'Human';

      player2.isAlive = true;
      player2.hp = 60;
      player2.race = 'Dwarf';

      player3.isAlive = true;
      player3.hp = 90;
      player3.race = 'Human';

      players.set('player1', player1);
      players.set('player2', player2);
      players.set('player3', player3);
    });

    test('should sort players by property ascending', () => {
      const sorted = gameStateUtils.getPlayersSortedBy('hp', true);

      expect(sorted.map((p) => p.hp)).toEqual([60, 80, 90]);
      expect(sorted.map((p) => p.id)).toEqual([
        'player2',
        'player1',
        'player3',
      ]);
    });

    test('should sort players by property descending', () => {
      const sorted = gameStateUtils.getPlayersSortedBy('hp', false);

      expect(sorted.map((p) => p.hp)).toEqual([90, 80, 60]);
      expect(sorted.map((p) => p.id)).toEqual([
        'player3',
        'player1',
        'player2',
      ]);
    });

    test('should group players by property', () => {
      const groups = gameStateUtils.getPlayerGroups('race');

      expect(groups.Human).toHaveLength(2);
      expect(groups.Human.map((p) => p.id)).toEqual(['player1', 'player3']);
      expect(groups.Dwarf).toHaveLength(1);
      expect(groups.Dwarf[0].id).toBe('player2');
    });

    test('should check if all players have property', () => {
      const allAlive = gameStateUtils.allPlayersHave(
        [players.get('player1'), players.get('player2')],
        'isAlive',
        true
      );

      expect(allAlive).toBe(true);

      const allWarlocks = gameStateUtils.allPlayersHave(
        [players.get('player1'), players.get('player2')],
        'isWarlock',
        true
      );

      expect(allWarlocks).toBe(false);
    });

    test('should count players with status effect', () => {
      players
        .get('player1')
        .applyStatusEffect('poison', { damage: 5, turns: 3 });
      players
        .get('player2')
        .applyStatusEffect('poison', { damage: 5, turns: 3 });

      const count = gameStateUtils.countPlayersWithEffect('poison');

      expect(count).toBe(2);
    });
  });
});
