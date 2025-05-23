/**
 * @fileoverview Tests for GameRoom model
 */

// Import the GameRoom class and the configuration
const { GameRoom } = require('@models/GameRoom');
const Player = require('@models/Player'); // Assuming Player model is in this path
const config = require('@config');

// Mock the Player model to control its behavior in tests
jest.mock('@models/Player');

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
    // Mock calculateStats to return a predictable structure
    calculateStats: jest.fn((race, className) => ({
      maxHp: 110, // Example distinct value
      hp: 110, // Example distinct value
      armor: 5, // Example distinct value
      damageMod: 1.1, // Example distinct value
      abilities: [{ type: 'mockAbility', name: 'Mock Ability', unlockAt: 1 }], // Ensure abilities are part of stats
      racialAbility: { type: 'mockRacial', name: 'Mock Racial' }, // Ensure racial ability is part of stats
    })),
  },
  // Define classAbilities for testing
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
        type: 'shieldBash',
        name: 'Shield Bash',
        category: 'Attack',
        unlockAt: 2, // For level up testing
        order: 1001,
        cooldown: 1,
        params: { damage: 20, stunChance: 0.5 },
      },
    ],
    Mage: [
      // Add another class for variety if needed
      {
        type: 'fireball',
        name: 'Fireball',
        category: 'Attack',
        unlockAt: 1,
        cooldown: 1,
        params: { damage: 40 },
      },
    ],
  },
  // Define racialAbilities for testing
  racialAbilities: {
    Human: {
      type: 'adaptability',
      name: 'Adaptability',
      usageLimit: 'perGame',
      maxUses: 1,
      cooldown: 0,
      params: {},
    },
    Orc: {
      // Add another race
      type: 'bloodRage',
      name: 'Blood Rage',
      usageLimit: 'perRound',
      maxUses: 1,
      cooldown: 2,
      params: { damageBoost: 1.2 },
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
  let mockPlayerInstance;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks before each test

    // Mock Player constructor and its methods needed by GameRoom
    mockPlayerInstance = {
      id: '',
      name: '',
      isAlive: true,
      isWarlock: false,
      hp: 100,
      maxHp: 100,
      armor: 0,
      damageMod: 1.0,
      statusEffects: {},
      abilityCooldowns: {},
      unlocked: [],
      abilities: [],
      racialAbility: null,
      racialUsesLeft: 0,
      racialCooldown: 0,
      className: '', // Use className
      race: '',
      isReady: false,
      level: 1,
      // Mock methods that GameRoom might call on a player instance
      setRacialAbility: jest.fn(),
      setStats: jest.fn(function (stats) {
        // Use function to access this
        this.maxHp = stats.maxHp;
        this.hp = stats.hp;
        this.armor = stats.armor;
        this.damageMod = stats.damageMod;
        this.abilities = stats.abilities || [];
        if (stats.racialAbility) {
          this.setRacialAbility(stats.racialAbility);
        }
      }),
      updateUnlockedAbilities: jest.fn(
        function (level, classAbilitiesForClass) {
          this.unlocked = (this.abilities || []).filter(
            (ab) => ab.unlockAt <= level
          );
        }
      ),
      putAbilityOnCooldown: jest.fn(),
      isAbilityOnCooldown: jest.fn().mockReturnValue(false),
      canUseAbility: jest.fn().mockReturnValue(true),
      canUseRacialAbility: jest.fn().mockReturnValue(true),
      useRacialAbility: jest.fn().mockReturnValue(true),
      clearReadyStatus: jest.fn(function () {
        this.isReady = false;
      }),
    };
    Player.mockImplementation((id, name) => {
      // Return a new object that merges the base mockPlayerInstance
      // with specific id and name for this player.
      const player = {
        ...mockPlayerInstance,
        id,
        name,
        abilities: [],
        unlocked: [],
      };
      // Ensure setStats is part of the returned mock, bound correctly or defined to modify itself
      player.setStats = function (stats) {
        this.maxHp = stats.maxHp;
        this.hp = stats.hp;
        this.armor = stats.armor;
        this.damageMod = stats.damageMod;
        this.abilities = stats.abilities || []; // Ensure abilities is an array
        this.unlocked = (this.abilities || []).filter(
          (ab) => ab.unlockAt <= this.level
        );
        if (stats.racialAbility) {
          this.setRacialAbility(stats.racialAbility);
        }
      };
      player.updateUnlockedAbilities = function (
        level,
        classAbilitiesForClass
      ) {
        this.unlocked = (this.abilities || []).filter(
          (ab) => ab.unlockAt <= level
        );
      };
      player.clearReadyStatus = function () {
        this.isReady = false;
      };
      return player;
    });

    gameRoom = new GameRoom('TEST');
  });

  describe('Constructor', () => {
    test('should create game room with correct initial values', () => {
      expect(gameRoom.code).toBe('TEST');
      expect(gameRoom.players instanceof Map).toBe(true);
      expect(gameRoom.players.size).toBe(0);
      expect(gameRoom.started).toBe(false);
      expect(typeof gameRoom.round).toBe('number');
      expect(gameRoom.round).toBe(0);
      expect(typeof gameRoom.level).toBe('number');
      expect(gameRoom.level).toBe(1);
      expect(gameRoom.hostId).toBe(null);
      expect(gameRoom.monster).toBeDefined();
      expect(typeof gameRoom.monster.hp).toBe('number');
      expect(gameRoom.monster.hp).toBe(config.gameBalance.monster.baseHp); // Check against config
      expect(gameRoom.systems).toBeDefined();
      expect(typeof gameRoom.systems).toBe('object');
      expect(gameRoom.pendingActions).toEqual([]); // Should be an array
      expect(gameRoom.pendingRacialActions).toEqual([]); // Should be an array
      expect(gameRoom.nextReady instanceof Set).toBe(true); // Should be a Set
    });
  });

  describe('Player Management', () => {
    test('should add player successfully', () => {
      const result = gameRoom.addPlayer('player1', 'TestPlayer');

      expect(result).toBe(true);
      expect(gameRoom.players.size).toBe(1);
      expect(gameRoom.hostId).toBe('player1'); // First player is host
      expect(gameRoom.aliveCount).toBe(1);

      const player = gameRoom.players.get('player1');
      expect(player).toBeDefined();
      expect(player.name).toBe('TestPlayer');
      expect(player.isAlive).toBe(true);
      expect(Player).toHaveBeenCalledWith(
        'player1',
        'TestPlayer',
        config.gameBalance.player
      );
    });

    test('should not add player when game is full', () => {
      // Fill the game to max capacity (mocked as 8)
      for (let i = 0; i < config.maxPlayers; i++) {
        gameRoom.addPlayer(`player${i}`, `Player${i}`);
      }
      expect(gameRoom.players.size).toBe(config.maxPlayers);
      const result = gameRoom.addPlayer('overflow', 'OverflowPlayer');
      expect(result).toBe(false);
      expect(gameRoom.players.size).toBe(config.maxPlayers); // Still max
    });

    test('should not add player when game has started', () => {
      gameRoom.started = true;
      const result = gameRoom.addPlayer('player1', 'TestPlayer');
      expect(result).toBe(false);
    });

    test('should remove player correctly', () => {
      gameRoom.addPlayer('player1', 'TestPlayer1');
      gameRoom.addPlayer('player2', 'TestPlayer2');
      expect(gameRoom.players.size).toBe(2);
      expect(gameRoom.aliveCount).toBe(2);

      gameRoom.removePlayer('player1');

      expect(gameRoom.players.size).toBe(1);
      expect(gameRoom.aliveCount).toBe(1);
      expect(gameRoom.players.has('player1')).toBe(false);
      expect(gameRoom.players.has('player2')).toBe(true);
    });

    test('should handle warlock removal correctly', () => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      const player = gameRoom.players.get('player1');
      player.isWarlock = true; // Manually set for test

      // Mock the warlock system if it's directly called
      gameRoom.systems.warlockSystem.decrementWarlockCount = jest.fn();

      gameRoom.removePlayer('player1');

      expect(
        gameRoom.systems.warlockSystem.decrementWarlockCount
      ).toHaveBeenCalled();
    });

    test('should reassign host if host leaves', () => {
      gameRoom.addPlayer('hostPlayer', 'Host');
      gameRoom.addPlayer('otherPlayer', 'Other');
      expect(gameRoom.hostId).toBe('hostPlayer');

      gameRoom.removePlayer('hostPlayer');
      expect(gameRoom.hostId).toBe('otherPlayer'); // Should pick the next available player
    });

    test('should set hostId to null if last player leaves', () => {
      gameRoom.addPlayer('singlePlayer', 'Single');
      expect(gameRoom.hostId).toBe('singlePlayer');
      gameRoom.removePlayer('singlePlayer');
      expect(gameRoom.hostId).toBe(null);
    });
  });

  describe('Character Selection', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
    });

    test('should set player class, race, and stats correctly', () => {
      // config.gameBalance.calculateStats is already mocked
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      const player = gameRoom.players.get('player1');

      expect(player).toBeDefined();
      expect(player.race).toBe('Human');
      expect(player.className).toBe('Warrior'); // Use className

      // Check that Player's setStats was called with the result from config.gameBalance.calculateStats
      expect(config.gameBalance.calculateStats).toHaveBeenCalledWith(
        'Human',
        'Warrior'
      );
      expect(player.setStats).toHaveBeenCalledWith(
        config.gameBalance.calculateStats('Human', 'Warrior')
      );

      // Verify stats based on the mocked calculateStats return value
      expect(typeof player.maxHp).toBe('number');
      expect(player.maxHp).toBe(110);
      expect(typeof player.hp).toBe('number');
      expect(player.hp).toBe(110);
      expect(typeof player.armor).toBe('number');
      expect(player.armor).toBe(5);
      expect(typeof player.damageMod).toBe('number');
      expect(player.damageMod).toBe(1.1);

      // Verify abilities based on mocked calculateStats and then updated by setPlayerClass's logic
      // The player.abilities should come from calculateStats
      expect(Array.isArray(player.abilities)).toBe(true);
      // Unlocked abilities should be filtered from player.abilities
      expect(Array.isArray(player.unlocked)).toBe(true);
      expect(player.unlocked.length).toBeGreaterThanOrEqual(1); // At least the level 1 ability
      expect(player.unlocked.some((ab) => ab.type === 'mockAbility')).toBe(
        true
      );

      // Verify racial ability
      expect(player.setRacialAbility).toHaveBeenCalledWith(
        config.racialAbilities.Human
      );
    });
  });

  describe('Action Management', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer1');
      gameRoom.addPlayer('player2', 'TestPlayer2');
      // Mock that players are set up
      gameRoom.players.get('player1').className = 'Warrior';
      gameRoom.players.get('player1').race = 'Human';
      gameRoom.players.get('player1').unlocked = [
        { type: 'slash', name: 'Slash', cooldown: 0 },
      ];
      gameRoom.players.get('player1').canUseAbility = jest
        .fn()
        .mockReturnValue(true);

      gameRoom.players.get('player2').className = 'Warrior';
      gameRoom.players.get('player2').race = 'Human';
      gameRoom.players.get('player2').unlocked = [
        { type: 'slash', name: 'Slash', cooldown: 0 },
      ];
      gameRoom.players.get('player2').canUseAbility = jest
        .fn()
        .mockReturnValue(true);

      gameRoom.started = true; // Game must be started for actions
      gameRoom.round = 1; // Actions occur in a round
    });

    test('should add action successfully', () => {
      const result = gameRoom.addAction('player1', 'slash', '__monster__', {});
      expect(result).toBe(true);
      expect(gameRoom.pendingActions).toHaveLength(1);
      expect(gameRoom.pendingActions[0]).toEqual({
        actorId: 'player1',
        actionType: 'slash',
        targetId: '__monster__',
        options: {},
      });
    });

    test('should not allow double actions from the same player in a round', () => {
      gameRoom.addAction('player1', 'slash', '__monster__', {});
      const result = gameRoom.addAction('player1', 'slash', '__monster__', {}); // Second action
      expect(result).toBe(false); // Should fail
      expect(gameRoom.pendingActions).toHaveLength(1); // Still one action
    });

    test('should not allow actions from dead players', () => {
      const player1 = gameRoom.players.get('player1');
      player1.isAlive = false; // Mark as dead
      const result = gameRoom.addAction('player1', 'slash', '__monster__', {});
      expect(result).toBe(false);
    });

    test('should not allow actions from stunned players', () => {
      // Mock the system to report player1 as stunned
      gameRoom.systems.statusEffectManager.isPlayerStunned = jest.fn(
        (playerId) => playerId === 'player1'
      );
      const result = gameRoom.addAction('player1', 'slash', '__monster__', {});
      expect(result).toBe(false);
      expect(
        gameRoom.systems.statusEffectManager.isPlayerStunned
      ).toHaveBeenCalledWith('player1');
    });

    test('should not allow action if ability is on cooldown', () => {
      const player1 = gameRoom.players.get('player1');
      // Mock canUseAbility to return false specifically for this test
      player1.canUseAbility = jest.fn((abilityType) => abilityType !== 'slash'); // On cooldown for 'slash'

      const result = gameRoom.addAction('player1', 'slash', '__monster__', {});
      expect(result).toBe(false);
      expect(player1.canUseAbility).toHaveBeenCalledWith('slash', {});
    });

    test('should check if all actions are submitted (all alive players acted)', () => {
      expect(gameRoom.allActionsSubmitted()).toBe(false);
      gameRoom.addAction('player1', 'slash', '__monster__', {});
      expect(gameRoom.allActionsSubmitted()).toBe(false); // Player2 hasn't acted
      gameRoom.addAction('player2', 'slash', '__monster__', {});
      expect(gameRoom.allActionsSubmitted()).toBe(true); // All alive players acted
    });

    test('should correctly determine allActionsSubmitted when a player is dead', () => {
      gameRoom.players.get('player2').isAlive = false; // Player2 is dead
      gameRoom.aliveCount = 1; // Update alive count

      expect(gameRoom.allActionsSubmitted()).toBe(false);
      gameRoom.addAction('player1', 'slash', '__monster__', {});
      expect(gameRoom.allActionsSubmitted()).toBe(true); // Only player1 needed to act
    });
  });

  describe('Racial Actions', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior'); // This will call player.setRacialAbility via mocks
      gameRoom.started = true;
      gameRoom.round = 1;

      // Ensure the player mock is set up to allow racial ability use
      const player = gameRoom.players.get('player1');
      player.canUseRacialAbility = jest.fn().mockReturnValue(true);
      player.useRacialAbility = jest.fn().mockReturnValue(true); // Mock this to simulate successful use
      player.racialAbility = config.racialAbilities.Human; // Explicitly set for clarity
      player.racialUsesLeft = config.racialAbilities.Human.maxUses;
    });

    test('should add racial action successfully', () => {
      const result = gameRoom.addRacialAction('player1', 'player1', {}); // Assuming target is self for Adaptability
      expect(result).toBe(true);
      expect(gameRoom.pendingRacialActions).toHaveLength(1);
      expect(gameRoom.pendingRacialActions[0]).toEqual({
        actorId: 'player1',
        targetId: 'player1',
        options: {},
      });
      const player = gameRoom.players.get('player1');
      expect(player.useRacialAbility).toHaveBeenCalled(); // Ensure the player's method was called
    });

    test('should not allow racial action when player cannot use it', () => {
      const player = gameRoom.players.get('player1');
      player.canUseRacialAbility = jest.fn().mockReturnValue(false); // Mock cannot use

      const result = gameRoom.addRacialAction('player1', 'player1', {});
      expect(result).toBe(false);
      expect(gameRoom.pendingRacialActions).toHaveLength(0);
    });

    test('should not allow racial action if player has already submitted a normal action', () => {
      gameRoom.addAction('player1', 'slash', '__monster__', {}); // Player already acted
      const result = gameRoom.addRacialAction('player1', 'player1', {});
      expect(result).toBe(false);
    });

    test('should not allow normal action if player has already submitted a racial action', () => {
      gameRoom.addRacialAction('player1', 'player1', {}); // Player already used racial
      const result = gameRoom.addAction('player1', 'slash', '__monster__', {});
      expect(result).toBe(false);
    });
  });

  describe('Level Progression', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      // setPlayerClass will use the mocked config.gameBalance.calculateStats
      // which provides abilities.
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
      const player = gameRoom.players.get('player1');
      // Ensure player.abilities is populated by the mock setup for setPlayerClass
      // config.classAbilities.Warrior has abilities for level 1 and 2
      player.abilities = config.classAbilities.Warrior;
      player.updateUnlockedAbilities(
        gameRoom.level,
        config.classAbilities.Warrior
      ); // Initial unlock
    });

    test('should update unlocked abilities on level up', () => {
      const player = gameRoom.players.get('player1');
      expect(player.unlocked.some((ab) => ab.type === 'slash')).toBe(true);
      expect(player.unlocked.some((ab) => ab.type === 'shieldBash')).toBe(
        false
      ); // shieldBash is level 2

      gameRoom.level = 2; // Level up the game room
      gameRoom.updateUnlockedAbilities(); // Call the GameRoom method to update for all players

      // Player's updateUnlockedAbilities mock should have been called
      expect(player.updateUnlockedAbilities).toHaveBeenCalledWith(
        2,
        config.classAbilities.Warrior
      );
      // Manually check based on the mock logic for player.unlocked
      const expectedUnlocked = player.abilities.filter(
        (ab) => ab.unlockAt <= 2
      );
      expect(player.unlocked).toEqual(expectedUnlocked);
      expect(player.unlocked.some((ab) => ab.type === 'shieldBash')).toBe(true);
    });
  });

  describe('Player Information', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer');
      gameRoom.setPlayerClass('player1', 'Human', 'Warrior');
    });

    test('should get players info correctly', () => {
      const playersInfo = gameRoom.getPlayersInfo();
      expect(Array.isArray(playersInfo)).toBe(true);
      expect(playersInfo).toHaveLength(1);

      const player = gameRoom.players.get('player1');
      expect(playersInfo[0]).toMatchObject({
        id: 'player1',
        name: 'TestPlayer',
        race: player.race, // Should be 'Human'
        className: player.className, // Should be 'Warrior', use className
        hp: player.hp, // Should be number, e.g., 110 from mock
        maxHp: player.maxHp, // Should be number, e.g., 110 from mock
        isAlive: player.isAlive, // Should be true
        isWarlock: player.isWarlock, // Should be false
        level: player.level, // Should be 1
        // Add other relevant fields that getPlayersInfo is expected to return
        isReady: player.isReady,
        unlocked: player.unlocked,
        statusEffects: player.statusEffects,
        // racialAbility: player.racialAbility, // This might be too complex for toMatchObject if methods are present
      });
      expect(typeof playersInfo[0].hp).toBe('number');
      expect(typeof playersInfo[0].maxHp).toBe('number');
      expect(typeof playersInfo[0].isAlive).toBe('boolean');
      expect(typeof playersInfo[0].level).toBe('number');
    });
  });

  describe('Player ID Transfer (Reconnection)', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1OldSocket', 'TestPlayer');
      gameRoom.setPlayerClass('player1OldSocket', 'Human', 'Warrior');
      gameRoom.hostId = 'player1OldSocket'; // Make this player the host
    });

    test('should transfer player ID successfully', () => {
      const oldPlayerInstance = gameRoom.players.get('player1OldSocket');
      const result = gameRoom.transferPlayerId(
        'player1OldSocket',
        'player1NewSocket'
      );

      expect(result).toBe(true);
      expect(gameRoom.players.has('player1OldSocket')).toBe(false);
      expect(gameRoom.players.has('player1NewSocket')).toBe(true);

      const newPlayerInstance = gameRoom.players.get('player1NewSocket');
      expect(newPlayerInstance).toBe(oldPlayerInstance); // Should be the same player object
      expect(newPlayerInstance.id).toBe('player1NewSocket'); // ID should be updated
      expect(newPlayerInstance.name).toBe('TestPlayer');
    });

    test('should update host ID when transferring host', () => {
      gameRoom.transferPlayerId('player1OldSocket', 'player1NewSocket');
      expect(gameRoom.hostId).toBe('player1NewSocket');
    });

    test('should update pending actions when transferring', () => {
      gameRoom.started = true;
      gameRoom.round = 1;
      // Ensure player can act
      const player = gameRoom.players.get('player1OldSocket');
      player.unlocked = [{ type: 'slash', name: 'Slash', cooldown: 0 }];
      player.canUseAbility = jest.fn().mockReturnValue(true);

      gameRoom.addAction('player1OldSocket', 'slash', '__monster__', {});
      expect(gameRoom.pendingActions[0].actorId).toBe('player1OldSocket');

      gameRoom.transferPlayerId('player1OldSocket', 'player1NewSocket');
      expect(gameRoom.pendingActions[0].actorId).toBe('player1NewSocket');
    });

    test('should update pending racial actions when transferring', () => {
      gameRoom.started = true;
      gameRoom.round = 1;
      const player = gameRoom.players.get('player1OldSocket');
      player.canUseRacialAbility = jest.fn().mockReturnValue(true);
      player.useRacialAbility = jest.fn().mockReturnValue(true);
      player.racialAbility = config.racialAbilities.Human;
      player.racialUsesLeft = 1;

      gameRoom.addRacialAction('player1OldSocket', 'player1OldSocket', {});
      expect(gameRoom.pendingRacialActions[0].actorId).toBe('player1OldSocket');

      gameRoom.transferPlayerId('player1OldSocket', 'player1NewSocket');
      expect(gameRoom.pendingRacialActions[0].actorId).toBe('player1NewSocket');
    });

    test('should fail transfer for non-existent player', () => {
      const result = gameRoom.transferPlayerId(
        'nonexistentOldSocket',
        'newSocketId'
      );
      expect(result).toBe(false);
    });
  });

  describe('Ready Status', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer1');
      gameRoom.addPlayer('player2', 'TestPlayer2');
    });

    test('should clear ready status for all players correctly', () => {
      gameRoom.nextReady.add('player1'); // Simulate player1 was ready
      const player1 = gameRoom.players.get('player1');
      player1.isReady = true; // Manually set for test
      const player2 = gameRoom.players.get('player2');
      player2.isReady = false;

      gameRoom.clearReady();

      expect(gameRoom.nextReady.size).toBe(0);
      expect(player1.clearReadyStatus).toHaveBeenCalled();
      expect(player2.clearReadyStatus).toHaveBeenCalled();
      // Verify through the mock if isReady was set to false
      expect(player1.isReady).toBe(false);
      expect(player2.isReady).toBe(false);
    });
  });

  describe('Warlock Assignment', () => {
    beforeEach(() => {
      gameRoom.addPlayer('player1', 'TestPlayer1');
      gameRoom.addPlayer('player2', 'TestPlayer2');
    });

    test('should delegate initial warlock assignment to WarlockSystem', () => {
      // Mock the system method
      gameRoom.systems.warlockSystem.assignInitialWarlock = jest.fn();
      gameRoom.assignInitialWarlock('player1');
      expect(
        gameRoom.systems.warlockSystem.assignInitialWarlock
      ).toHaveBeenCalledWith('player1');
    });
  });
});
