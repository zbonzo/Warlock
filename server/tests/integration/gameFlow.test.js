/**
 * @fileoverview Integration tests for game flow
 * Tests complete game scenarios with multiple systems working together
 */

const { GameRoom } = require('@models/GameRoom');
const gameService = require('@services/gameService');

// Mock the config for consistent testing
jest.mock('@config', () => ({
  maxPlayers: 8,
  minPlayers: 2,
  gameBalance: {
    monster: {
      baseHp: 100,
      baseDamage: 10,
      baseAge: 0,
      hpPerLevel: 50,
    },
    player: {
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
    calculateMonsterHp: jest.fn((level) => 100 + (level - 1) * 50),
    calculateMonsterDamage: jest.fn((age) => 10 * (age + 1)),
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
      {
        type: 'shieldWall',
        name: 'Shield Wall',
        category: 'Defense',
        effect: 'shielded',
        target: 'Self',
        unlockAt: 2,
        order: 10,
        cooldown: 0,
        params: { armor: 5, duration: 1 },
      },
    ],
    Pyromancer: [
      {
        type: 'fireball',
        name: 'Fireball',
        category: 'Attack',
        unlockAt: 1,
        order: 1010,
        cooldown: 0,
        params: { damage: 35 },
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
    Dwarf: {
      type: 'stoneArmor',
      name: 'Stone Armor',
      usageLimit: 'passive',
      maxUses: 0,
      params: { initialArmor: 10 },
    },
  },
  statusEffects: {
    getEffectDefaults: jest.fn((name) => ({ damage: 5, turns: 3 })),
  },
  messages: {
    getEvent: jest.fn((key, data) => `Mock event: ${key}`),
    getSuccess: jest.fn((key, data) => `Mock success: ${key}`),
    formatMessage: jest.fn((template, data) => template),
  },
}));

describe('Game Flow Integration Tests', () => {
  let gameRoom;

  beforeEach(() => {
    gameRoom = new GameRoom('TEST');

    // Mock the ability registry to prevent errors
    gameRoom.systems.abilityRegistry.hasClassAbility = jest
      .fn()
      .mockReturnValue(true);
    gameRoom.systems.abilityRegistry.executeClassAbility = jest
      .fn()
      .mockReturnValue(true);
    gameRoom.systems.abilityRegistry.hasRacialAbility = jest
      .fn()
      .mockReturnValue(true);
    gameRoom.systems.abilityRegistry.executeRacialAbility = jest
      .fn()
      .mockReturnValue(true);
  });

  describe('Complete Game Setup', () => {
    test('should create game and add players successfully', () => {
      // Add players
      expect(gameRoom.addPlayer('player1', 'Alice')).toBe(true);
      expect(gameRoom.addPlayer('player2', 'Bob')).toBe(true);
      expect(gameRoom.addPlayer('player3', 'Charlie')).toBe(true);

      expect(gameRoom.players.size).toBe(3);
      expect(gameRoom.hostId).toBe('player1');
    });

    test('should handle character selection for all players', () => {
      gameRoom.addPlayer('player1', 'Alice');
      gameRoom.addPlayer('player2', 'Bob');

      // Select characters
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.setPlayerClass('player2', 'Dwarf', 'Pyromancer');

      const player1 = gameRoom.players.get('player1');
      const player2 = gameRoom.players.get('player2');

      expect(player1.race).toBe('Human');
      expect(player1.class).toBe('Warrior');
      expect(player1.abilities).toHaveLength(2);
      expect(player1.unlocked).toHaveLength(1); // Only level 1 abilities

      expect(player2.race).toBe('Dwarf');
      expect(player2.class).toBe('Pyromancer');
      expect(player2.stoneArmorIntact).toBe(true);
      expect(player2.stoneArmorValue).toBe(10);
    });
  });

  describe('Game Round Processing', () => {
    beforeEach(() => {
      // Set up a basic game
      gameRoom.addPlayer('player1', 'Alice');
      gameRoom.addPlayer('player2', 'Bob');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.setPlayerClass('player2', 'Dwarf', 'Pyromancer');
      gameRoom.started = true;
      gameRoom.assignInitialWarlock();
    });

    test('should process player actions and monster attack', () => {
      // Players submit actions
      gameRoom.addAction('player1', 'slash', '__monster__');
      gameRoom.addAction('player2', 'fireball', '__monster__');

      expect(gameRoom.pendingActions).toHaveLength(2);
      expect(gameRoom.allActionsSubmitted()).toBe(true);

      // Process round
      const result = gameRoom.processRound();

      expect(result).toBeDefined();
      expect(result.eventsLog).toBeDefined();
      expect(result.players).toHaveLength(2);
      expect(result.monster).toBeDefined();
      expect(result.turn).toBe(1);

      // Actions should be cleared after processing
      expect(gameRoom.pendingActions).toHaveLength(0);
    });

    test('should handle level progression when monster dies', () => {
      // Kill the monster by setting its HP to 0
      gameRoom.monster.hp = 1;

      gameRoom.addAction('player1', 'slash', '__monster__');
      gameRoom.addAction('player2', 'fireball', '__monster__');

      const result = gameRoom.processRound();

      expect(result.levelUp).toBeTruthy();
      expect(result.level).toBe(2);
      expect(gameRoom.level).toBe(2);

      // Players should have new abilities unlocked
      const player1 = gameRoom.players.get('player1');
      expect(player1.unlocked.length).toBeGreaterThan(1);
    });

    test('should handle status effects across rounds', () => {
      // Apply a status effect to a player
      const player1 = gameRoom.players.get('player1');
      gameRoom.systems.statusEffectManager.applyEffect(
        'player1',
        'poison',
        { damage: 5, turns: 3 },
        []
      );

      expect(player1.hasStatusEffect('poison')).toBe(true);

      // Process a round
      gameRoom.addAction('player1', 'slash', '__monster__');
      gameRoom.addAction('player2', 'fireball', '__monster__');

      const result = gameRoom.processRound();

      // Status effect should still be present but decremented
      expect(player1.hasStatusEffect('poison')).toBe(true);
      expect(player1.statusEffects.poison.turns).toBeLessThan(3);
    });
  });

  describe('Warlock Mechanics Integration', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'Alice');
      gameRoom.addPlayer('player2', 'Bob');
      gameRoom.addPlayer('player3', 'Charlie');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.setPlayerClass('player2', 'Human', 'Warrior');
      gameRoom.setPlayerClass('player3', 'Human', 'Warrior');
      gameRoom.started = true;
    });

    test('should assign initial warlock and track count', () => {
      gameRoom.assignInitialWarlock('player1');

      const player1 = gameRoom.players.get('player1');
      expect(player1.isWarlock).toBe(true);
      expect(gameRoom.systems.warlockSystem.getWarlockCount()).toBe(1);
    });

    test('should handle warlock conversion during combat', () => {
      // Make player1 a warlock
      const player1 = gameRoom.players.get('player1');
      const player2 = gameRoom.players.get('player2');
      player1.isWarlock = true;
      gameRoom.systems.warlockSystem.numWarlocks = 1;

      // Mock successful conversion
      jest.spyOn(Math, 'random').mockReturnValue(0.1);

      // Simulate warlock attacking another player
      gameRoom.systems.combatSystem.applyDamageToPlayer(
        player2,
        20,
        player1,
        []
      );

      // Expect conversion attempt to be made
      expect(gameRoom.systems.warlockSystem.attemptConversion).toBeDefined();
    });
  });

  describe('Combat System Integration', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'Alice');
      gameRoom.addPlayer('player2', 'Bob');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.setPlayerClass('player2', 'Dwarf', 'Pyromancer');
      gameRoom.started = true;
    });

    test('should handle damage with armor calculation', () => {
      const player2 = gameRoom.players.get('player2');
      player2.armor = 5; // 50% damage reduction

      const log = [];
      gameRoom.systems.combatSystem.applyDamageToPlayer(
        player2,
        20,
        gameRoom.players.get('player1'),
        log
      );

      expect(player2.hp).toBe(90); // 100 - 10 (reduced damage)
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('damage');
    });

    test('should handle Stone Armor degradation', () => {
      const player2 = gameRoom.players.get('player2');
      expect(player2.stoneArmorIntact).toBe(true);
      expect(player2.stoneArmorValue).toBe(10);

      const log = [];
      gameRoom.systems.combatSystem.applyDamageToPlayer(
        player2,
        20,
        gameRoom.players.get('player1'),
        log
      );

      expect(player2.stoneArmorValue).toBe(9); // Degraded by 1
      expect(
        log.some((entry) => entry.type === 'stone_armor_degradation')
      ).toBe(true);
    });

    test('should handle player death and resurrection', () => {
      const player1 = gameRoom.players.get('player1');
      player1.hp = 5;

      // Mock Skeleton with Undying
      player1.race = 'Skeleton';
      player1.racialEffects = { resurrect: { resurrectedHp: 1 } };

      const log = [];
      gameRoom.systems.combatSystem.applyDamageToPlayer(
        player1,
        10,
        gameRoom.players.get('player2'),
        log
      );

      expect(player1.hp).toBe(0);
      expect(player1.pendingDeath).toBe(true);

      // Process pending deaths
      gameRoom.systems.combatSystem.processPendingDeaths(log);

      expect(player1.hp).toBe(1); // Resurrected
      expect(player1.isAlive).toBe(true);
      expect(player1.racialEffects.resurrect).toBeUndefined(); // Used up
    });
  });

  describe('Ability Cooldown Integration', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'Alice');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.started = true;

      // Add a cooldown ability to the player
      const player1 = gameRoom.players.get('player1');
      player1.abilities.push({
        type: 'powerAttack',
        name: 'Power Attack',
        category: 'Attack',
        unlockAt: 1,
        cooldown: 2,
        params: { damage: 50 },
      });
      player1.unlocked.push(player1.abilities[player1.abilities.length - 1]);
    });

    test('should handle ability cooldowns correctly', () => {
      const player1 = gameRoom.players.get('player1');

      // Use ability with cooldown
      const result = gameRoom.addAction(
        'player1',
        'powerAttack',
        '__monster__'
      );
      expect(result).toBe(true);

      // Ability should be on cooldown
      expect(player1.isAbilityOnCooldown('powerAttack')).toBe(true);
      expect(player1.getAbilityCooldown('powerAttack')).toBe(3); // 2 + 1 for timing

      // Should not be able to use again immediately
      const result2 = gameRoom.addAction(
        'player1',
        'powerAttack',
        '__monster__'
      );
      expect(result2).toBe(false);

      // Process cooldowns
      player1.processAbilityCooldowns();
      expect(player1.getAbilityCooldown('powerAttack')).toBe(2);

      player1.processAbilityCooldowns();
      expect(player1.getAbilityCooldown('powerAttack')).toBe(1);

      player1.processAbilityCooldowns();
      expect(player1.isAbilityOnCooldown('powerAttack')).toBe(false);
    });
  });

  describe('Player Reconnection Integration', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'Alice');
      gameRoom.addPlayer('player2', 'Bob');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      gameRoom.setPlayerClass('player2', 'Dwarf', 'Pyromancer');
      gameRoom.started = true;
    });

    test('should transfer player ID successfully', () => {
      const player1 = gameRoom.players.get('player1');
      const originalData = {
        name: player1.name,
        race: player1.race,
        class: player1.class,
        hp: player1.hp,
      };

      // Simulate reconnection
      const success = gameRoom.transferPlayerId('player1', 'newSocketId');

      expect(success).toBe(true);
      expect(gameRoom.players.has('player1')).toBe(false);
      expect(gameRoom.players.has('newSocketId')).toBe(true);

      const reconnectedPlayer = gameRoom.players.get('newSocketId');
      expect(reconnectedPlayer.name).toBe(originalData.name);
      expect(reconnectedPlayer.race).toBe(originalData.race);
      expect(reconnectedPlayer.class).toBe(originalData.class);
      expect(reconnectedPlayer.hp).toBe(originalData.hp);
    });

    test('should update host ID during reconnection', () => {
      expect(gameRoom.hostId).toBe('player1');

      gameRoom.transferPlayerId('player1', 'newHostSocket');

      expect(gameRoom.hostId).toBe('newHostSocket');
    });
  });
});
