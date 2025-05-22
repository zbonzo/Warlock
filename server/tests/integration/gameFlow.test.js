/**
 * @fileoverview Integration tests for complete game scenarios
 */
const { GameRoom } = require('@models/GameRoom');
const config = require('@config');

describe('Game Flow Integration', () => {
  let gameRoom;

  beforeEach(() => {
    gameRoom = new GameRoom('TEST');
  });

  describe('Complete Game Scenario', () => {
    it('should handle full game from creation to completion', () => {
      // 1. Add players
      expect(gameRoom.addPlayer('player1', 'Alice')).toBe(true);
      expect(gameRoom.addPlayer('player2', 'Bob')).toBe(true);
      expect(gameRoom.addPlayer('player3', 'Charlie')).toBe(true);

      // 2. Set character classes
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.setPlayerClass('player2', 'Elf', 'Wizard');
      gameRoom.setPlayerClass('player3', 'Orc', 'Barbarian');

      // 3. Start game and assign warlock
      gameRoom.started = true;
      gameRoom.assignInitialWarlock('player2'); // Bob is warlock

        // Mock ability registry
  jest.spyOn(gameRoom.systems.abilityRegistry, 'hasClassAbility')
    .mockImplementation((type) => ['slash', 'fireball', 'recklessStrike', 'heal', 'backstab', 'shadowVeil', 'holyBolt'].includes(type));
});


      expect(gameRoom.players.get('player2').isWarlock).toBe(true);

      // 4. Simulate combat round
      expect(gameRoom.addAction('player1', 'slash', '__monster__')).toBe(true);
      expect(gameRoom.addAction('player2', 'fireball', 'player1')).toBe(true);
      expect(
        gameRoom.addAction('player3', 'recklessStrike', '__monster__')
      ).toBe(true);

      // 5. Process round
      const result = gameRoom.processRound();

      expect(result).toHaveProperty('eventsLog');
      expect(result).toHaveProperty('players');
      expect(result).toHaveProperty('monster');
      expect(result).toHaveProperty('turn');
      expect(result.turn).toBe(1);

      // 6. Verify game state updated
      expect(gameRoom.pendingActions).toHaveLength(0);
      expect(gameRoom.round).toBe(1);
    });

    it('should handle warlock victory scenario', () => {
      // Setup game with 2 players
      gameRoom.addPlayer('player1', 'Alice');
      gameRoom.addPlayer('player2', 'Bob');

      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.setPlayerClass('player2', 'Elf', 'Wizard');

      gameRoom.started = true;
      gameRoom.assignInitialWarlock('player2');

      // Kill the good player
      const alice = gameRoom.players.get('player1');
      alice.hp = 0;
      alice.isAlive = false;
      alice.pendingDeath = true;

      // Process deaths and check win condition
      gameRoom.systems.combatSystem.processPendingDeaths([]);

      const result = gameRoom.processRound();
      expect(result.winner).toBe('Evil');
    });
  });

  describe('Ability System Integration', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'Alice');
      gameRoom.addPlayer('player2', 'Bob');

      gameRoom.setPlayerClass('player1', 'Human', 'Priest');
      gameRoom.setPlayerClass('player2', 'Elf', 'Assassin');

      gameRoom.started = true;
    });

    it('should handle healing abilities correctly', () => {
      const priest = gameRoom.players.get('player1');
      const assassin = gameRoom.players.get('player2');

      // Damage the assassin
      assassin.hp = 50;

      // Priest heals assassin
      expect(gameRoom.addAction('player1', 'heal', 'player2')).toBe(true);
      expect(gameRoom.addAction('player2', 'backstab', '__monster__')).toBe(
        true
      );

      const result = gameRoom.processRound();

      // Verify healing occurred
      expect(assassin.hp).toBeGreaterThan(50);
    });

    it('should handle status effects correctly', () => {
      const assassin = gameRoom.players.get('player2');

      // Use shadow veil (invisibility)
      expect(gameRoom.addAction('player2', 'shadowVeil', 'player2')).toBe(true);
      expect(gameRoom.addAction('player1', 'holyBolt', '__monster__')).toBe(
        true
      );

      gameRoom.processRound();

      // Verify invisibility applied
      expect(assassin.hasStatusEffect('invisible')).toBe(true);
    });
  });
});
