/**
 * @fileoverview Comprehensive TypeScript tests for Player model
 * Testing the Player class with composition pattern using domain models
 */

import { Player, PlayerConstructorOptions, DamageOptions, ClientDataOptions } from '../../../server/models/Player.js';

// Mock external dependencies
const mockConfig = {
  gameBalance: {
    player: {
      baseHp: 100
    },
    armor: {
      reductionRate: 0.1,
      maxReduction: 0.9
    },
    stoneArmor: {
      initialValue: 5
    }
  },
  classAttributes: {
    'Warrior': {
      damageModifier: 1.2
    },
    'Mage': {
      damageModifier: 0.9
    }
  }
};

const mockMessages = {
  getError: jest.fn().mockReturnValue('Player is dead and cannot act'),
  formatMessage: jest.fn().mockImplementation((template, vars) => template.replace(/{(\w+)}/g, (match, key) => vars[key] || match)),
  getEvent: jest.fn().mockReturnValue('Kinfolk lifebond healing template'),
  privateMessages: {
    kinfolkLifebondPrivate: 'You healed {healAmount} HP from lifebond'
  }
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock domain model classes
const MockPlayerStats = jest.fn();
const MockPlayerAbilities = jest.fn();
const MockPlayerEffects = jest.fn();

jest.doMock('../../../server/config/index.js', () => ({ default: mockConfig }));
jest.doMock('../../../server/utils/logger.js', () => ({ default: mockLogger }));
jest.doMock('../../../server/messages/index.js', () => ({ default: mockMessages }));
jest.doMock('../../../server/models/player/PlayerStats.js', () => ({ PlayerStats: MockPlayerStats }));
jest.doMock('../../../server/models/player/PlayerAbilities.js', () => ({ PlayerAbilities: MockPlayerAbilities }));
jest.doMock('../../../server/models/player/PlayerEffects.js', () => ({ PlayerEffects: MockPlayerEffects }));

describe('Player (TypeScript)', () => {
  let mockPlayerStats: any;
  let mockPlayerAbilities: any;
  let mockPlayerEffects: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock domain models
    mockPlayerStats = {
      addDamageDealt: jest.fn(),
      addDamageTaken: jest.fn(),
      addHealingDone: jest.fn(),
      addCorruption: jest.fn(),
      addAbilityUse: jest.fn(),
      addDeath: jest.fn(),
      addMonsterKill: jest.fn(),
      addSelfHeal: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        damageDealt: 100,
        damageTaken: 50,
        healingDone: 25
      }),
      setPlayerName: jest.fn()
    };

    mockPlayerAbilities = {
      abilities: [],
      unlocked: [],
      abilityCooldowns: {},
      hasSubmittedAction: false,
      submittedAction: null,
      actionValidationState: null,
      actionSubmissionTime: 0,
      lastValidAction: null,
      racialAbility: null,
      racialUsesLeft: 0,
      racialCooldown: 0,
      playerId: 'player1',
      submitAction: jest.fn().mockReturnValue({ success: true, data: null }),
      validateSubmittedAction: jest.fn().mockReturnValue({ isValid: true }),
      invalidateAction: jest.fn(),
      clearActionSubmission: jest.fn(),
      isAbilityOnCooldown: jest.fn().mockReturnValue(false),
      getAbilityCooldown: jest.fn().mockReturnValue(0),
      putAbilityOnCooldown: jest.fn(),
      canUseAbility: jest.fn().mockReturnValue(true),
      processAbilityCooldowns: jest.fn(),
      getAvailableAbilities: jest.fn().mockReturnValue([]),
      canUseRacialAbility: jest.fn().mockReturnValue(true),
      useRacialAbility: jest.fn().mockReturnValue({ success: true }),
      processRacialCooldowns: jest.fn(),
      setRacialAbility: jest.fn(),
      resetRacialPerRoundUses: jest.fn(),
      getSubmissionStatus: jest.fn().mockReturnValue({ hasSubmitted: false }),
      getAbilityDamageDisplay: jest.fn().mockReturnValue('25 damage'),
      setPlayerName: jest.fn()
    };

    mockPlayerEffects = {
      statusEffects: [],
      isVulnerable: false,
      vulnerabilityIncrease: 0,
      stoneArmorIntact: false,
      stoneArmorValue: 0,
      classEffects: {},
      racialEffects: {},
      playerId: 'player1',
      hasStatusEffect: jest.fn().mockReturnValue(false),
      applyStatusEffect: jest.fn(),
      removeStatusEffect: jest.fn(),
      processVulnerability: jest.fn(),
      applyVulnerability: jest.fn(),
      getEffectiveArmor: jest.fn().mockReturnValue(5),
      processStoneArmorDegradation: jest.fn(),
      processClassEffects: jest.fn(),
      updateRelentlessFuryLevel: jest.fn(),
      processThirstyBladeLifeSteal: jest.fn().mockReturnValue({ healed: 0, newHp: 100 }),
      refreshThirstyBladeOnKill: jest.fn(),
      getSweepingStrikeParams: jest.fn().mockReturnValue({}),
      getRelentlessFuryVulnerability: jest.fn().mockReturnValue(0),
      calculateDamageWithVulnerability: jest.fn().mockReturnValue(25),
      applyDamageModifiers: jest.fn().mockImplementation((damage) => damage),
      applyDamageResistance: jest.fn().mockImplementation((damage) => damage),
      initializeUndying: jest.fn(),
      initializeStoneArmor: jest.fn(),
      setPlayerName: jest.fn()
    };

    // Setup mock constructors to return our mock objects
    MockPlayerStats.mockImplementation(() => mockPlayerStats);
    MockPlayerAbilities.mockImplementation(() => mockPlayerAbilities);
    MockPlayerEffects.mockImplementation(() => mockPlayerEffects);
  });

  describe('Constructor and Initialization', () => {
    it('should create Player with options object', () => {
      const options: PlayerConstructorOptions = {
        id: 'player1',
        name: 'Alice',
        race: 'Human',
        class: 'Warrior',
        hp: 120,
        maxHp: 120,
        armor: 5,
        level: 3,
        isWarlock: false
      };

      const player = new Player(options);

      expect(player.id).toBe('player1');
      expect(player.name).toBe('Alice');
      expect(player.race).toBe('Human');
      expect(player.class).toBe('Warrior');
      expect(player.hp).toBe(120);
      expect(player.maxHp).toBe(120);
      expect(player.armor).toBe(5);
      expect(player.level).toBe(3);
      expect(player.isWarlock).toBe(false);
      expect(player.isAlive).toBe(true);
      expect(player.isReady).toBe(false);
    });

    it('should create Player with legacy constructor (id, name)', () => {
      const player = new Player('player2', 'Bob');

      expect(player.id).toBe('player2');
      expect(player.name).toBe('Bob');
      expect(player.race).toBeNull();
      expect(player.class).toBeNull();
      expect(player.hp).toBe(100); // Default from config
      expect(player.maxHp).toBe(100);
      expect(player.armor).toBe(0);
      expect(player.level).toBe(1);
      expect(player.isWarlock).toBe(false);
    });

    it('should initialize with default HP from config', () => {
      const options: PlayerConstructorOptions = {
        id: 'player3',
        name: 'Charlie'
      };

      const player = new Player(options);

      expect(player.hp).toBe(100);
      expect(player.maxHp).toBe(100);
    });

    it('should initialize composed domain models', () => {
      const player = new Player({ id: 'test', name: 'Test' });

      expect(player.playerStats).toBeDefined();
      expect(player.playerAbilities).toBeDefined();
      expect(player.playerEffects).toBeDefined();
      expect(MockPlayerStats).toHaveBeenCalled();
      expect(MockPlayerAbilities).toHaveBeenCalled();
      expect(MockPlayerEffects).toHaveBeenCalled();
    });

    it('should setup compatibility properties', () => {
      const player = new Player({ id: 'test', name: 'Test' });

      // Test stats compatibility
      expect((player as any).stats).toEqual({
        damageDealt: 100,
        damageTaken: 50,
        healingDone: 25
      });

      // Test abilities compatibility
      expect((player as any).abilities).toEqual([]);
      expect((player as any).unlocked).toEqual([]);
      expect((player as any).abilityCooldowns).toEqual({});

      // Test effects compatibility
      expect((player as any).statusEffects).toEqual([]);
      expect((player as any).isVulnerable).toBe(false);
    });

    it('should initialize socket IDs array', () => {
      const player = new Player('player1', 'Alice');

      expect(player.socketIds).toEqual(['player1']);
    });
  });

  describe('Stats Methods Delegation', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({ id: 'test', name: 'Test' });
    });

    it('should delegate addDamageDealt to PlayerStats', () => {
      player.addDamageDealt(25);
      expect(mockPlayerStats.addDamageDealt).toHaveBeenCalledWith(25);
    });

    it('should delegate addDamageTaken to PlayerStats', () => {
      player.addDamageTaken(15);
      expect(mockPlayerStats.addDamageTaken).toHaveBeenCalledWith(15);
    });

    it('should delegate addHealingDone to PlayerStats', () => {
      player.addHealingDone(30);
      expect(mockPlayerStats.addHealingDone).toHaveBeenCalledWith(30);
    });

    it('should delegate addCorruption to PlayerStats', () => {
      player.addCorruption();
      expect(mockPlayerStats.addCorruption).toHaveBeenCalled();
    });

    it('should delegate addAbilityUse to PlayerStats', () => {
      player.addAbilityUse();
      expect(mockPlayerStats.addAbilityUse).toHaveBeenCalled();
    });

    it('should delegate addDeath to PlayerStats', () => {
      player.addDeath();
      expect(mockPlayerStats.addDeath).toHaveBeenCalled();
    });

    it('should delegate addMonsterKill to PlayerStats', () => {
      player.addMonsterKill();
      expect(mockPlayerStats.addMonsterKill).toHaveBeenCalled();
    });

    it('should delegate addSelfHeal to PlayerStats', () => {
      player.addSelfHeal(20);
      expect(mockPlayerStats.addSelfHeal).toHaveBeenCalledWith(20);
    });

    it('should delegate getStats to PlayerStats', () => {
      const stats = player.getStats();
      expect(mockPlayerStats.getStats).toHaveBeenCalled();
      expect(stats).toEqual({
        damageDealt: 100,
        damageTaken: 50,
        healingDone: 25
      });
    });
  });

  describe('Ability Methods Delegation', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({ id: 'test', name: 'Test' });
    });

    it('should delegate submitAction to PlayerAbilities but check alive status first', () => {
      const result = player.submitAction('attack', 'target1');
      expect(result.success).toBe(true);
      expect(mockPlayerAbilities.submitAction).toHaveBeenCalledWith('attack', 'target1', {});
    });

    it('should prevent dead players from submitting actions', () => {
      player.isAlive = false;
      const result = player.submitAction('attack', 'target1');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Player is dead and cannot act');
      expect(mockPlayerAbilities.submitAction).not.toHaveBeenCalled();
    });

    it('should delegate validateSubmittedAction to PlayerAbilities', () => {
      const alivePlayers = [player];
      const monster = { id: 'monster', hp: 100 };

      player.validateSubmittedAction(alivePlayers, monster);
      expect(mockPlayerAbilities.validateSubmittedAction).toHaveBeenCalledWith(alivePlayers, monster);
    });

    it('should delegate invalidateAction to PlayerAbilities', () => {
      player.invalidateAction('Invalid target');
      expect(mockPlayerAbilities.invalidateAction).toHaveBeenCalledWith('Invalid target');
    });

    it('should delegate clearActionSubmission and set isReady to false', () => {
      player.isReady = true;
      player.clearActionSubmission();

      expect(mockPlayerAbilities.clearActionSubmission).toHaveBeenCalled();
      expect(player.isReady).toBe(false);
    });

    it('should delegate ability cooldown methods to PlayerAbilities', () => {
      player.isAbilityOnCooldown('fireball');
      expect(mockPlayerAbilities.isAbilityOnCooldown).toHaveBeenCalledWith('fireball');

      player.getAbilityCooldown('fireball');
      expect(mockPlayerAbilities.getAbilityCooldown).toHaveBeenCalledWith('fireball');

      player.putAbilityOnCooldown('fireball', 3);
      expect(mockPlayerAbilities.putAbilityOnCooldown).toHaveBeenCalledWith('fireball', 3);

      player.canUseAbility('fireball');
      expect(mockPlayerAbilities.canUseAbility).toHaveBeenCalledWith('fireball');

      player.processAbilityCooldowns();
      expect(mockPlayerAbilities.processAbilityCooldowns).toHaveBeenCalled();
    });

    it('should delegate racial ability methods to PlayerAbilities', () => {
      player.canUseRacialAbility();
      expect(mockPlayerAbilities.canUseRacialAbility).toHaveBeenCalled();

      player.useRacialAbility();
      expect(mockPlayerAbilities.useRacialAbility).toHaveBeenCalled();

      player.processRacialCooldowns();
      expect(mockPlayerAbilities.processRacialCooldowns).toHaveBeenCalled();

      player.resetRacialPerRoundUses();
      expect(mockPlayerAbilities.resetRacialPerRoundUses).toHaveBeenCalled();
    });

    it('should handle racial ability setup with special effects', () => {
      const undyingAbility = {
        type: 'undying',
        params: { resurrectedHp: 1 }
      };

      player.setRacialAbility(undyingAbility);
      expect(mockPlayerAbilities.setRacialAbility).toHaveBeenCalledWith(undyingAbility);
      expect(mockPlayerEffects.initializeUndying).toHaveBeenCalledWith(1);

      const stoneArmorAbility = {
        type: 'stoneArmor',
        params: { initialArmor: 8 }
      };

      player.setRacialAbility(stoneArmorAbility);
      expect(mockPlayerEffects.initializeStoneArmor).toHaveBeenCalledWith(8);
    });

    it('should delegate getSubmissionStatus to PlayerAbilities', () => {
      player.getSubmissionStatus();
      expect(mockPlayerAbilities.getSubmissionStatus).toHaveBeenCalled();
    });

    it('should delegate getAbilityDamageDisplay with damage modifier', () => {
      const ability = { name: 'Fireball', params: { damage: 25 } };
      player.damageMod = 1.5;

      player.getAbilityDamageDisplay(ability as any);
      expect(mockPlayerAbilities.getAbilityDamageDisplay).toHaveBeenCalledWith(ability, 1.5);
    });
  });

  describe('Effects Methods Delegation', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({ id: 'test', name: 'Test' });
    });

    it('should delegate status effect methods to PlayerEffects', () => {
      player.hasStatusEffect('poison');
      expect(mockPlayerEffects.hasStatusEffect).toHaveBeenCalledWith('poison');

      player.applyStatusEffect('poison', { damage: 5 });
      expect(mockPlayerEffects.applyStatusEffect).toHaveBeenCalledWith('poison', { damage: 5 });

      player.removeStatusEffect('poison');
      expect(mockPlayerEffects.removeStatusEffect).toHaveBeenCalledWith('poison');
    });

    it('should delegate vulnerability methods to PlayerEffects', () => {
      player.processVulnerability();
      expect(mockPlayerEffects.processVulnerability).toHaveBeenCalled();

      player.applyVulnerability(0.5, 3);
      expect(mockPlayerEffects.applyVulnerability).toHaveBeenCalledWith(0.5, 3);

      player.calculateDamageWithVulnerability(20);
      expect(mockPlayerEffects.calculateDamageWithVulnerability).toHaveBeenCalledWith(20);
    });

    it('should delegate armor methods to PlayerEffects', () => {
      player.armor = 3;
      player.getEffectiveArmor();
      expect(mockPlayerEffects.getEffectiveArmor).toHaveBeenCalledWith(3);

      player.processStoneArmorDegradation(15);
      expect(mockPlayerEffects.processStoneArmorDegradation).toHaveBeenCalledWith(15);
    });

    it('should delegate class effect methods to PlayerEffects', () => {
      player.maxHp = 150;
      player.processClassEffects();
      expect(mockPlayerEffects.processClassEffects).toHaveBeenCalledWith(150);

      player.level = 5;
      player.class = 'Warrior';
      player.updateRelentlessFuryLevel(5);
      expect(player.level).toBe(5);
      expect(mockPlayerEffects.updateRelentlessFuryLevel).toHaveBeenCalledWith(5, 'Warrior');
    });

    it('should handle Thirsty Blade life steal with HP update', () => {
      player.class = 'Warrior';
      player.hp = 80;
      player.maxHp = 100;
      mockPlayerEffects.processThirstyBladeLifeSteal.mockReturnValue({ healed: 10, newHp: 90 });

      const healed = player.processThirstyBladeLifeSteal(25);

      expect(mockPlayerEffects.processThirstyBladeLifeSteal).toHaveBeenCalledWith(25, 'Warrior', 80, 100);
      expect(healed).toBe(10);
      expect(player.hp).toBe(90);
    });

    it('should delegate additional class effect methods', () => {
      player.class = 'Warrior';

      player.refreshThirstyBladeOnKill();
      expect(mockPlayerEffects.refreshThirstyBladeOnKill).toHaveBeenCalledWith('Warrior');

      player.getSweepingStrikeParams();
      expect(mockPlayerEffects.getSweepingStrikeParams).toHaveBeenCalledWith('Warrior');

      player.getRelentlessFuryVulnerability(30);
      expect(mockPlayerEffects.getRelentlessFuryVulnerability).toHaveBeenCalledWith(30, 'Warrior');
    });
  });

  describe('Core Combat Methods', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({ id: 'test', name: 'Test' });
      player.armor = 5;
      mockPlayerEffects.getEffectiveArmor.mockReturnValue(5);
    });

    it('should calculate damage reduction with positive armor', () => {
      const damage = player.calculateDamageReduction(100);

      // 5 armor * 0.1 reduction rate = 50% reduction
      // 100 * (1 - 0.5) = 50, but at least 1 damage
      expect(damage).toBe(50);
    });

    it('should calculate damage reduction with negative armor', () => {
      mockPlayerEffects.getEffectiveArmor.mockReturnValue(-2);

      const damage = player.calculateDamageReduction(100);

      // -2 armor * 0.1 = -0.2 (20% increase)
      // 100 * (1 - (-0.2)) = 120
      expect(damage).toBe(120);
    });

    it('should ensure minimum 1 damage', () => {
      mockPlayerEffects.getEffectiveArmor.mockReturnValue(100); // Very high armor

      const damage = player.calculateDamageReduction(10);
      expect(damage).toBe(1); // Should be at least 1
    });

    it('should modify damage with damage modifier and effects', () => {
      player.damageMod = 1.5;
      player.class = 'Warrior';
      player.level = 3;
      player.hp = 80;
      player.maxHp = 100;
      mockPlayerEffects.applyDamageModifiers.mockReturnValue(45);

      const modifiedDamage = player.modifyDamage(20);

      // First: 20 * 1.5 = 30 (floored)
      // Then effects modify to 45
      expect(mockPlayerEffects.applyDamageModifiers).toHaveBeenCalledWith(30, 'Warrior', 3, 80, 100);
      expect(modifiedDamage).toBe(45);
    });

    it('should take damage with armor reduction and mark as dead', () => {
      player.hp = 50;
      mockPlayerEffects.applyDamageResistance.mockReturnValue(30);

      // Mock calculateDamageReduction to return 25 final damage
      jest.spyOn(player, 'calculateDamageReduction').mockReturnValue(25);

      const finalDamage = player.takeDamage(40, 'monster');

      expect(mockPlayerEffects.applyDamageResistance).toHaveBeenCalledWith(40, player.class);
      expect(player.calculateDamageReduction).toHaveBeenCalledWith(30);
      expect(finalDamage).toBe(25);
      expect(player.hp).toBe(25); // 50 - 25
      expect(player.isAlive).toBe(true);

      // Take lethal damage
      const lethalDamage = player.takeDamage(30);
      expect(player.hp).toBe(0);
      expect(player.isAlive).toBe(false);
    });

    it('should heal player up to max HP', () => {
      player.hp = 70;
      player.maxHp = 100;

      const actualHealing = player.heal(40);

      expect(actualHealing).toBe(30); // Only healed 30 to reach max
      expect(player.hp).toBe(100);

      // Try to overheal
      const overheal = player.heal(20);
      expect(overheal).toBe(0);
      expect(player.hp).toBe(100);
    });

    it('should calculate healing modifier based on damage modifier', () => {
      player.damageMod = 1.5;
      player.class = 'Warrior';
      mockConfig.classAttributes['Warrior'].damageModifier = 1.2;

      const healingMod = player.getHealingModifier();

      // levelMultiplier = 1.5 / 1.2 = 1.25
      expect(healingMod).toBe(1.25);
    });
  });

  describe('Socket Management', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({ id: 'player1', name: 'Alice' });
    });

    it('should add new socket IDs', () => {
      player.addSocketId('socket123');

      expect(player.socketIds).toContain('socket123');
      expect(player.socketIds).toContain('player1'); // Original ID
      expect(mockPlayerAbilities.playerId).toBe('socket123');
      expect(mockPlayerEffects.playerId).toBe('socket123');
    });

    it('should not add duplicate socket IDs', () => {
      player.addSocketId('socket123');
      player.addSocketId('socket123');

      expect(player.socketIds.filter(id => id === 'socket123')).toHaveLength(1);
    });

    it('should check if socket ID was used', () => {
      player.addSocketId('socket456');

      expect(player.hasUsedSocketId('socket456')).toBe(true);
      expect(player.hasUsedSocketId('player1')).toBe(true);
      expect(player.hasUsedSocketId('unknown')).toBe(false);
    });
  });

  describe('Name Management', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({ id: 'test', name: 'Original' });
    });

    it('should update name and propagate to domain models', () => {
      player.setName('Updated');

      expect(player.name).toBe('Updated');
      expect(mockPlayerStats.setPlayerName).toHaveBeenCalledWith('Updated');
      expect(mockPlayerAbilities.setPlayerName).toHaveBeenCalledWith('Updated');
      expect(mockPlayerEffects.setPlayerName).toHaveBeenCalledWith('Updated');
    });
  });

  describe('Type Safety and Interfaces', () => {
    it('should enforce PlayerConstructorOptions interface', () => {
      const options: PlayerConstructorOptions = {
        id: 'test',
        name: 'Test',
        race: 'Human',
        class: 'Warrior',
        hp: 100,
        maxHp: 100,
        armor: 5,
        level: 1,
        isWarlock: false
      };

      expect(typeof options.id).toBe('string');
      expect(typeof options.name).toBe('string');
      expect(typeof options.hp).toBe('number');
      expect(typeof options.isWarlock).toBe('boolean');
    });

    it('should enforce DamageOptions interface', () => {
      const options: DamageOptions = {
        source: 'monster',
        type: 'physical',
        bypassArmor: false
      };

      expect(typeof options.source).toBe('string');
      expect(['physical', 'magical', 'true']).toContain(options.type);
      expect(typeof options.bypassArmor).toBe('boolean');
    });

    it('should enforce ClientDataOptions interface', () => {
      const options: ClientDataOptions = {
        includePrivate: true,
        requestingPlayerId: 'player1'
      };

      expect(typeof options.includePrivate).toBe('boolean');
      expect(typeof options.requestingPlayerId).toBe('string');
    });
  });
});
