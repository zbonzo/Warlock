/**
 * tests/unit/models/GameRoom.test.js
 */

const fakeSystems = {
  warlockSystem: {
    assignInitialWarlock: jest.fn(),
    decrementWarlockCount: jest.fn(),
    getWarlockCount: () => 0,
  },
  statusEffectManager: {
    isPlayerStunned: jest.fn().mockReturnValue(false),
    processTimedEffects: jest.fn(),
  },
  abilityRegistry: {
    hasClassAbility: jest.fn().mockReturnValue(true),
    hasRacialAbility: jest.fn().mockReturnValue(true),
    executeClassAbility: jest.fn(),
    executeRacialAbility: jest.fn(),
  },
  gameStateUtils: {
    getRandomTarget: jest.fn().mockReturnValue('someId'),
    getAlivePlayers: jest.fn().mockReturnValue([]),
    checkWinConditions: jest.fn().mockReturnValue(null),
  },
  monsterController: {
    ageMonster: jest.fn(),
    attack: jest.fn(),
    getState: jest.fn().mockReturnValue({ hp: 9 }),
    handleDeathAndRespawn: jest.fn().mockReturnValue({ newLevel: 1 }),
  },
  combatSystem: {},
  racialAbilitySystem: { processEndOfRoundEffects: jest.fn() },
};

// 2) Mock out the relative Player import that GameRoom uses
const playerModule = require.resolve('../../../../models/Player');
jest.mock(playerModule, () => {
  return jest.fn().mockImplementation((id, name) => ({
    id,
    name,
    isAlive: true,
    isWarlock: false,
    isReady: false,
    hasStatusEffect: () => false,
    isAbilityOnCooldown: () => false,
    getAbilityCooldown: () => 0,
    putAbilityOnCooldown: jest.fn(),
    setRacialAbility: jest.fn(),
    stoneArmorValue: 3,
    getEffectiveArmor: () => 8,
    resetRacialPerRoundUses: jest.fn(),
    processAbilityCooldowns: jest.fn(),
    processClassEffects: jest.fn(),
    useRacialAbility: jest.fn(),
    racialEffects: null,
    unlocked: [],
    abilities: [],
  }));
});

// 3) Mock out the relative SystemsFactory import
const systemsFactoryModule = require.resolve(
  '../../../../models/systems/SystemsFactory'
);
jest.mock(systemsFactoryModule, () => ({
  createSystems: () => fakeSystems,
}));

// 4) Mock the aliased modules exactly as GameRoom requires them
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};
jest.mock('@utils/logger', () => mockLogger);

const mockConfig = {
  maxPlayers: 2,
  gameBalance: {
    monster: { baseHp: 10, baseDamage: 2, baseAge: 1 },
    calculateStats: jest.fn(() => ({ maxHp: 50, armor: 5, damageMod: 1.5 })),
    player: { levelUp: { hpIncrease: 0.2, damageIncrease: 1.1 } },
    combat: { defaultOrders: { special: 99 } },
  },
  classAbilities: {
    Warrior: [
      { type: 'slash', unlockAt: 1, cooldown: 0, order: 1, name: 'Slash' },
    ],
  },
  racialAbilities: {
    Dwarf: { type: 'stoneArmor', params: { value: 3 } },
    Skeleton: { type: 'undying', params: { resurrectedHp: 2 } },
  },
  messages: {
    getEvent: jest.fn(),
    getSuccess: jest.fn(),
    success: { newAbilitiesUnlocked: 'X', bonusesApplied: 'Y' },
    private: { youAreStunned: 'Z' },
  },
};
jest.mock('@config', () => mockConfig);

// 5) Only now load the class under test
const { GameRoom } = require('@models/GameRoom');
const Player = require('@models/Player');
const logger = require('@utils/logger');
const config = require('@config');

describe('GameRoom Model', () => {
  let room;

  beforeEach(() => {
    jest.clearAllMocks();
    room = new GameRoom('ROOM1');
  });

  // --- Constructor ---
  it('should create game room with correct initial values', () => {
    expect(room.code).toBe('ROOM1');
    expect(room.players.size).toBe(0);
    expect(room.hostId).toBeNull();
    expect(room.started).toBe(false);
    expect(room.round).toBe(0);
    expect(room.level).toBe(1);
    expect(room.aliveCount).toBe(0);
    expect(room.monster.hp).toBe(10);
    expect(room.monster.maxHp).toBe(10);
    expect(SystemsFactory.createSystems).toHaveBeenCalledWith(
      room.players,
      room.monster
    );
  });

  // --- Player Management ---
  describe('Player Management', () => {
    it('should add player successfully', () => {
      expect(room.addPlayer('p1', 'Alice')).toBe(true);
      expect(room.players.has('p1')).toBe(true);
      expect(room.hostId).toBe('p1');
      expect(room.aliveCount).toBe(1);
      expect(Player).toHaveBeenCalledWith('p1', 'Alice');
    });

    it('should not add player when game is full', () => {
      room.addPlayer('p1', 'A');
      room.addPlayer('p2', 'B'); // maxPlayers is 2
      expect(room.addPlayer('p3', 'C')).toBe(false);
    });

    it('should not add player when game has started', () => {
      room.started = true;
      expect(room.addPlayer('p1', 'Alice')).toBe(false);
    });

    it('should remove player correctly', () => {
      room.addPlayer('p1', 'Alice');
      expect(room.players.has('p1')).toBe(true);
      room.removePlayer('p1');
      expect(room.players.has('p1')).toBe(false);
      expect(room.aliveCount).toBe(0);
    });

    it('should handle warlock removal correctly', () => {
      room.addPlayer('p1', 'A');
      const p = room.players.get('p1');
      p.isWarlock = true;
      room.aliveCount = 1;
      room.removePlayer('p1');
      expect(
        fakeSystems.warlockSystem.decrementWarlockCount
      ).toHaveBeenCalled();
    });

    it('should reassign host if host leaves', () => {
      room.addPlayer('p1', 'A');
      room.addPlayer('p2', 'B');
      expect(room.hostId).toBe('p1');
      room.removePlayer('p1');
      expect(room.hostId).toBe('p2');
    });

    it('should set hostId to null if last player leaves', () => {
      room.addPlayer('p1', 'A');
      room.removePlayer('p1');
      expect(room.hostId).toBeNull();
    });
  });

  // --- Character Selection ---
  it('should set player class, race, and stats correctly', () => {
    room.addPlayer('p1', 'A');
    room.level = 1;
    room.setPlayerClass('p1', 'Dwarf', 'Warrior');
    const p = room.players.get('p1');
    expect(p.race).toBe('Dwarf');
    expect(p.class).toBe('Warrior');
    expect(p.abilities.length).toBeGreaterThan(0);
    expect(p.unlocked.every((a) => a.unlockAt <= 1)).toBe(true);
    // Stone Armor debug
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Stone Armor')
    );
  });

  // --- Action Management ---
  describe('Action Management', () => {
    beforeEach(() => {
      room.started = true;
      room.addPlayer('p1', 'A');
    });

    it('should add action successfully', () => {
      const p = room.players.get('p1');
      p.unlocked = [{ type: 'slash', cooldown: 0 }];
      fakeSystems.abilityRegistry.hasClassAbility.mockReturnValue(true);
      expect(room.addAction('p1', 'slash', '__monster__')).toBe(true);
      expect(room.pendingActions).toHaveLength(1);
    });

    it('should not allow double actions from the same player in a round', () => {
      const p = room.players.get('p1');
      p.unlocked = [{ type: 'slash', cooldown: 0 }];
      fakeSystems.abilityRegistry.hasClassAbility.mockReturnValue(true);
      room.addAction('p1', 'slash', '__monster__');
      expect(room.addAction('p1', 'slash', '__monster__')).toBe(false);
    });

    it('should not allow actions from dead players', () => {
      const p = room.players.get('p1');
      p.isAlive = false;
      expect(room.addAction('p1', 'slash', '__monster__')).toBe(false);
    });

    it('should not allow actions from stunned players', () => {
      fakeSystems.statusEffectManager.isPlayerStunned.mockReturnValue(true);
      expect(room.addAction('p1', 'slash', '__monster__')).toBe(false);
    });

    it('should not allow action if ability is on cooldown', () => {
      const p = room.players.get('p1');
      p.unlocked = [{ type: 'slash', cooldown: 1 }];
      p.isAbilityOnCooldown = () => true;
      expect(room.addAction('p1', 'slash', '__monster__')).toBe(false);
    });

    it('should check if all actions are submitted (all alive players acted)', () => {
      fakeSystems.gameStateUtils.getAlivePlayers.mockReturnValue([
        { id: 'p1' },
      ]);
      room.pendingActions = [{ actorId: 'p1' }];
      expect(room.allActionsSubmitted()).toBe(true);
    });

    it('should correctly determine allActionsSubmitted when a player is dead', () => {
      fakeSystems.gameStateUtils.getAlivePlayers.mockReturnValue([
        { id: 'p1' },
        { id: 'p2' },
      ]);
      room.addPlayer('p2', 'B');
      room.players.get('p2').isAlive = false;
      room.pendingActions = [{ actorId: 'p1' }];
      expect(room.allActionsSubmitted()).toBe(true);
    });
  });

  // --- Racial Actions ---
  describe('Racial Actions', () => {
    beforeEach(() => {
      room.started = true;
      room.addPlayer('p1', 'A');
    });

    it('should add racial action successfully', () => {
      const p = room.players.get('p1');
      p.canUseRacialAbility = () => true;
      p.racialAbility = { type: 'stoneArmor' };
      fakeSystems.abilityRegistry.hasRacialAbility.mockReturnValue(true);
      expect(room.addRacialAction('p1', '__monster__')).toBe(true);
      expect(room.pendingRacialActions).toHaveLength(1);
      expect(p.useRacialAbility).toHaveBeenCalled();
    });

    it('should not allow racial action when player cannot use it', () => {
      const p = room.players.get('p1');
      p.canUseRacialAbility = () => false;
      expect(room.addRacialAction('p1', '__monster__')).toBe(false);
    });

    it('should not allow racial action if player has already submitted a racial action', () => {
      const p = room.players.get('p1');
      p.canUseRacialAbility = () => true;
      p.racialAbility = { type: 'stoneArmor' };
      fakeSystems.abilityRegistry.hasRacialAbility.mockReturnValue(true);
      room.addRacialAction('p1', '__monster__');
      expect(room.addRacialAction('p1', '__monster__')).toBe(false);
    });
  });

  // --- Level Progression ---
  it('should update unlocked abilities on level up', () => {
    room.addPlayer('p1', 'A');
    const p = room.players.get('p1');
    p.abilities = [{ type: 'x', unlockAt: 2, name: 'X' }];
    room.level = 2;
    room.updateUnlockedAbilities();
    expect(p.unlocked.find((a) => a.type === 'x')).toBeDefined();
    expect(mockLogger.info).toHaveBeenCalled();
  });

  // --- Player Information ---
  it('should get players info correctly', () => {
    room.addPlayer('p1', 'A');
    const info = room.getPlayersInfo();
    expect(Array.isArray(info)).toBe(true);
    expect(info[0]).toMatchObject({ id: 'p1', name: 'A' });
  });

  // --- Player ID Transfer (Reconnection) ---
  describe('Player ID Transfer', () => {
    beforeEach(() => {
      room.addPlayer('old', 'A');
      room.hostId = 'old';
      room.pendingActions = [{ actorId: 'old', targetId: 'old' }];
      room.pendingRacialActions = [
        { actorId: 'old', targetId: 'old', racialType: 'stoneArmor' },
      ];
      room.nextReady.add('old');
    });

    it('should transfer player ID successfully', () => {
      expect(room.transferPlayerId('old', 'new')).toBe(true);
      expect(room.players.has('new')).toBe(true);
      expect(room.players.has('old')).toBe(false);
    });

    it('should update host ID when transferring host', () => {
      room.transferPlayerId('old', 'new');
      expect(room.hostId).toBe('new');
    });

    it('should update pending actions when transferring', () => {
      room.transferPlayerId('old', 'new');
      expect(room.pendingActions[0].actorId).toBe('new');
      expect(room.pendingActions[0].targetId).toBe('new');
    });

    it('should update pending racial actions when transferring', () => {
      room.transferPlayerId('old', 'new');
      expect(room.pendingRacialActions[0].actorId).toBe('new');
      expect(room.pendingRacialActions[0].targetId).toBe('new');
    });

    it('should fail transfer for non-existent player', () => {
      expect(room.transferPlayerId('nope', 'x')).toBe(false);
    });
  });

  // --- Ready Status ---
  it('should clear ready status for all players correctly', () => {
    room.addPlayer('p1', 'A');
    room.players.get('p1').isReady = true;
    room.nextReady.add('p1');
    room.clearReady();
    expect(room.nextReady.size).toBe(0);
    expect(room.players.get('p1').isReady).toBe(false);
  });

  // --- Warlock Assignment ---
  it('should delegate initial warlock assignment to WarlockSystem', () => {
    room.assignInitialWarlock('p1');
    expect(fakeSystems.warlockSystem.assignInitialWarlock).toHaveBeenCalledWith(
      'p1'
    );
  });
});
