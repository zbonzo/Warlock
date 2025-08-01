/**
 * @fileoverview Tests for EntityAdapter class
 * Tests entity adaptation and compatibility with the new status effect system
 */

import EntityAdapter from '../../../../server/models/systems/EntityAdapter';

// Mock dependencies
jest.mock('../../utils/logger.js', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('@config', () => ({
  gameBalance: {
    calculateMonsterDamage: jest.fn((age: number) => 20 * (age + 1))
  }
}));

describe('EntityAdapter', () => {
  describe('adaptPlayer', () => {
    it('should adapt a basic player object', () => {
      const player = {
        socketId: 'socket-123',
        name: 'Test Player',
        hp: 80,
        maxHp: 100
      };

      const adapted = EntityAdapter.adaptPlayer(player);

      expect(adapted.id).toBe('socket-123');
      expect(adapted.name).toBe('Test Player');
      expect(adapted.hp).toBe(80);
      expect(adapted.maxHp).toBe(100);
      expect(adapted.isAlive).toBe(true);
      expect(adapted.entityType).toBe('player');
    });

    it('should use socketId as id when id is not present', () => {
      const player = {
        socketId: 'socket-456',
        hp: 50,
        maxHp: 100
      };

      const adapted = EntityAdapter.adaptPlayer(player);

      expect(adapted.id).toBe('socket-456');
    });

    it('should generate default name when not provided', () => {
      const player = {
        id: 'player-1',
        hp: 60,
        maxHp: 100
      };

      const adapted = EntityAdapter.adaptPlayer(player);

      expect(adapted.name).toBe('Player_player-1');
    });

    it('should set default HP values when missing', () => {
      const player = {
        id: 'player-1',
        name: 'Test Player'
      };

      const adapted = EntityAdapter.adaptPlayer(player);

      expect(adapted.hp).toBe(100);
      expect(adapted.maxHp).toBe(100);
      expect(adapted.isAlive).toBe(true);
    });

    it('should use maxHp for hp when hp is missing', () => {
      const player = {
        id: 'player-1',
        name: 'Test Player',
        maxHp: 120
      };

      const adapted = EntityAdapter.adaptPlayer(player);

      expect(adapted.hp).toBe(120);
      expect(adapted.maxHp).toBe(120);
    });

    it('should use hp for maxHp when maxHp is missing', () => {
      const player = {
        id: 'player-1',
        name: 'Test Player',
        hp: 90
      };

      const adapted = EntityAdapter.adaptPlayer(player);

      expect(adapted.hp).toBe(90);
      expect(adapted.maxHp).toBe(90);
    });

    it('should set isAlive based on HP', () => {
      const deadPlayer = {
        id: 'player-1',
        name: 'Dead Player',
        hp: 0,
        maxHp: 100
      };

      const adapted = EntityAdapter.adaptPlayer(deadPlayer);

      expect(adapted.isAlive).toBe(false);
    });

    it('should add calculation helper methods', () => {
      const player = {
        id: 'player-1',
        name: 'Test Player',
        hp: 100,
        maxHp: 100,
        armor: 5,
        damageMod: 1.2
      };

      const adapted = EntityAdapter.adaptPlayer(player);

      expect(typeof (adapted as any).getBaseArmor).toBe('function');
      expect(typeof (adapted as any).getBaseDamage).toBe('function');
      expect(typeof (adapted as any).processStoneArmorDegradation).toBe('function');
      expect(typeof (adapted as any).clearActionSubmission).toBe('function');

      expect((adapted as any).getBaseArmor()).toBe(5);
      expect((adapted as any).getBaseDamage(10)).toBe(12); // 10 * 1.2
    });

    it('should add legacy compatibility methods', () => {
      const player = {
        id: 'player-1',
        name: 'Test Player',
        hp: 100,
        maxHp: 100
      };

      const adapted = EntityAdapter.adaptPlayer(player);

      expect(typeof (adapted as any).hasStatusEffect).toBe('function');
      expect(typeof (adapted as any).applyStatusEffect).toBe('function');
      expect(typeof (adapted as any).removeStatusEffect).toBe('function');
    });
  });

  describe('adaptMonster', () => {
    it('should adapt a basic monster object', () => {
      const monster = {
        name: 'Goblin',
        hp: 50,
        maxHp: 50,
        baseDmg: 15,
        age: 2
      };

      const adapted = EntityAdapter.adaptMonster(monster);

      expect(adapted.id).toBe('__monster__');
      expect(adapted.name).toBe('Goblin');
      expect(adapted.hp).toBe(50);
      expect(adapted.maxHp).toBe(50);
      expect(adapted.isAlive).toBe(true);
      expect(adapted.entityType).toBe('monster');
      expect(adapted.race).toBe('Monster');
      expect(adapted.isWarlock).toBe(false);
      expect(adapted.pendingDeath).toBe(false);
    });

    it('should set default values when missing', () => {
      const monster = {};

      const adapted = EntityAdapter.adaptMonster(monster);

      expect(adapted.id).toBe('__monster__');
      expect(adapted.name).toBe('Monster');
      expect(adapted.hp).toBe(200);
      expect(adapted.maxHp).toBe(200);
      expect(adapted.isAlive).toBe(true);
      expect(adapted.age).toBe(1);
    });

    it('should add monster-specific methods', () => {
      const monster = {
        name: 'Dragon',
        hp: 100,
        maxHp: 100,
        baseDmg: 25,
        age: 3
      };

      const adapted = EntityAdapter.adaptMonster(monster);

      expect(typeof (adapted as any).calculateAttackDamage).toBe('function');
      expect((adapted as any).calculateAttackDamage()).toBe(80); // 20 * (3 + 1) from mock
    });

    it('should add calculation helpers', () => {
      const monster = {
        name: 'Orc',
        hp: 80,
        maxHp: 80,
        baseDmg: 20
      };

      const adapted = EntityAdapter.adaptMonster(monster);

      expect(typeof (adapted as any).getBaseArmor).toBe('function');
      expect(typeof (adapted as any).getBaseDamage).toBe('function');
      expect((adapted as any).getBaseArmor()).toBe(0);
      expect((adapted as any).getBaseDamage(15)).toBe(15); // Monsters don't have damage mod
    });
  });

  describe('validateEntity', () => {
    it('should validate entity with all required properties', () => {
      const entity = {
        id: 'test-1',
        name: 'Test Entity',
        hp: 100,
        maxHp: 100,
        isAlive: true,
        entityType: 'player'
      };

      const isValid = EntityAdapter.validateEntity(entity);
      expect(isValid).toBe(true);
    });

    it('should reject entity missing required properties', () => {
      const incompleteEntity = {
        id: 'test-1',
        name: 'Test Entity'
        // Missing hp, maxHp, isAlive, entityType
      };

      const isValid = EntityAdapter.validateEntity(incompleteEntity);
      expect(isValid).toBe(false);
    });

    it('should reject entity with undefined required properties', () => {
      const entityWithUndefined = {
        id: 'test-1',
        name: 'Test Entity',
        hp: undefined,
        maxHp: 100,
        isAlive: true,
        entityType: 'player'
      };

      const isValid = EntityAdapter.validateEntity(entityWithUndefined);
      expect(isValid).toBe(false);
    });
  });

  describe('createEntitiesMap', () => {
    it('should create entities map with players only', () => {
      const players = new Map([
        ['player1', { 
          id: 'player1', 
          name: 'Alice', 
          hp: 100, 
          maxHp: 100 
        }],
        ['player2', { 
          id: 'player2', 
          name: 'Bob', 
          hp: 80, 
          maxHp: 100 
        }]
      ]);

      const entities = EntityAdapter.createEntitiesMap(players);

      expect(entities.size).toBe(2);
      expect(entities.has('player1')).toBe(true);
      expect(entities.has('player2')).toBe(true);
      expect(entities.get('player1')?.entityType).toBe('player');
      expect(entities.get('player2')?.entityType).toBe('player');
    });

    it('should create entities map with players and monster', () => {
      const players = new Map([
        ['player1', { 
          id: 'player1', 
          name: 'Alice', 
          hp: 100, 
          maxHp: 100 
        }]
      ]);
      const monster = {
        name: 'Dragon',
        hp: 200,
        maxHp: 200,
        baseDmg: 30
      };

      const entities = EntityAdapter.createEntitiesMap(players, monster);

      expect(entities.size).toBe(2);
      expect(entities.has('player1')).toBe(true);
      expect(entities.has('__monster__')).toBe(true);
      expect(entities.get('__monster__')?.entityType).toBe('monster');
    });

    it('should handle empty players map', () => {
      const players = new Map();
      const entities = EntityAdapter.createEntitiesMap(players);

      expect(entities.size).toBe(0);
    });
  });

  describe('calculation helper methods', () => {
    let adaptedPlayer: any;
    let adaptedMonster: any;

    beforeEach(() => {
      const player = {
        id: 'player-1',
        name: 'Test Player',
        hp: 100,
        maxHp: 100,
        armor: 8,
        damageMod: 1.5,
        race: 'Rockhewn',
        stoneArmorIntact: true,
        stoneArmorValue: 3
      };

      const monster = {
        name: 'Test Monster',
        hp: 150,
        maxHp: 150,
        baseDmg: 20
      };

      adaptedPlayer = EntityAdapter.adaptPlayer(player);
      adaptedMonster = EntityAdapter.adaptMonster(monster);
    });

    it('should get base armor correctly', () => {
      expect(adaptedPlayer.getBaseArmor()).toBe(8);
      expect(adaptedMonster.getBaseArmor()).toBe(0);
    });

    it('should calculate damage with player damage modifier', () => {
      expect(adaptedPlayer.getBaseDamage(10)).toBe(15); // 10 * 1.5
      expect(adaptedMonster.getBaseDamage(10)).toBe(10); // No modifier for monsters
    });

    it('should process stone armor degradation for Rockhewn', () => {
      adaptedPlayer.processStoneArmorDegradation(2);
      
      expect(adaptedPlayer.stoneArmorValue).toBe(2); // 3 - 1 (min degradation per hit)
      expect(adaptedPlayer.stoneArmorIntact).toBe(true);
    });

    it('should break stone armor when value reaches zero', () => {
      adaptedPlayer.stoneArmorValue = 1;
      adaptedPlayer.processStoneArmorDegradation(5);
      
      expect(adaptedPlayer.stoneArmorValue).toBe(0);
      expect(adaptedPlayer.stoneArmorIntact).toBe(false);
    });

    it('should not process stone armor for non-Rockhewn', () => {
      const humanPlayer = EntityAdapter.adaptPlayer({
        id: 'human',
        name: 'Human',
        hp: 100,
        maxHp: 100,
        race: 'Human'
      });

      (humanPlayer as any).processStoneArmorDegradation(10);
      
      expect((humanPlayer as any).stoneArmorValue).toBeUndefined();
    });

    it('should clear action submission', () => {
      adaptedPlayer.hasSubmittedAction = true;
      adaptedPlayer.submittedAction = { type: 'attack' };
      adaptedPlayer.actionSubmissionTime = Date.now();
      adaptedPlayer.actionValidationState = 'valid';

      adaptedPlayer.clearActionSubmission();

      expect(adaptedPlayer.hasSubmittedAction).toBe(false);
      expect(adaptedPlayer.submittedAction).toBeNull();
      expect(adaptedPlayer.actionSubmissionTime).toBeNull();
      expect(adaptedPlayer.actionValidationState).toBe('none');
    });
  });

  describe('legacy compatibility methods', () => {
    let adaptedPlayer: any;

    beforeEach(() => {
      const player = {
        id: 'player-1',
        name: 'Test Player',
        hp: 100,
        maxHp: 100
      };

      adaptedPlayer = EntityAdapter.adaptPlayer(player);
    });

    it('should provide legacy hasStatusEffect method', () => {
      adaptedPlayer.statusEffects = { poison: { duration: 3 } };
      
      expect(adaptedPlayer.hasStatusEffect('poison')).toBe(true);
      expect(adaptedPlayer.hasStatusEffect('vulnerable')).toBe(false);
    });

    it('should provide legacy applyStatusEffect method', () => {
      adaptedPlayer.applyStatusEffect('poison', { duration: 5, damage: 3 });
      
      expect(adaptedPlayer.statusEffects.poison).toBeDefined();
      expect(adaptedPlayer.statusEffects.poison.duration).toBe(5);
      expect(adaptedPlayer.statusEffects.poison.damage).toBe(3);
    });

    it('should provide legacy removeStatusEffect method', () => {
      adaptedPlayer.statusEffects = { 
        poison: { duration: 3 },
        vulnerable: { duration: 2 }
      };
      
      adaptedPlayer.removeStatusEffect('poison');
      
      expect(adaptedPlayer.statusEffects.poison).toBeUndefined();
      expect(adaptedPlayer.statusEffects.vulnerable).toBeDefined();
    });

    it('should handle removeStatusEffect on non-existent effect', () => {
      adaptedPlayer.removeStatusEffect('nonexistent');
      // Should not throw
    });
  });

  describe('migrateLegacyStatusEffects', () => {
    let mockManager: any;
    let entity: any;

    beforeEach(() => {
      mockManager = {
        applyEffect: jest.fn()
      };

      entity = {
        id: 'player-1',
        name: 'Test Player',
        statusEffects: {
          poison: { duration: 3, damage: 5, sourceId: 'attacker-1' },
          vulnerable: { duration: 2, damageIncrease: 0.25 }
        }
      };
    });

    it('should migrate legacy status effects to new system', () => {
      EntityAdapter.migrateLegacyStatusEffects(entity, mockManager);

      expect(mockManager.applyEffect).toHaveBeenCalledTimes(2);
      expect(mockManager.applyEffect).toHaveBeenCalledWith(
        'player-1',
        'poison',
        { duration: 3, damage: 5, sourceId: 'attacker-1' },
        'attacker-1',
        'Legacy',
        []
      );
      expect(mockManager.applyEffect).toHaveBeenCalledWith(
        'player-1',
        'vulnerable',
        { duration: 2, damageIncrease: 0.25 },
        'player-1',
        'Legacy',
        []
      );

      expect(entity.statusEffects).toEqual({});
    });

    it('should handle entity with no status effects', () => {
      const cleanEntity = {
        id: 'player-2',
        name: 'Clean Player'
      };

      EntityAdapter.migrateLegacyStatusEffects(cleanEntity, mockManager);

      expect(mockManager.applyEffect).not.toHaveBeenCalled();
    });

    it('should handle entity with empty status effects', () => {
      entity.statusEffects = {};

      EntityAdapter.migrateLegacyStatusEffects(entity, mockManager);

      expect(mockManager.applyEffect).not.toHaveBeenCalled();
    });

    it('should handle invalid status effect data', () => {
      entity.statusEffects = {
        invalid: null,
        alsoinvalid: 'string'
      };

      EntityAdapter.migrateLegacyStatusEffects(entity, mockManager);

      expect(mockManager.applyEffect).not.toHaveBeenCalled();
    });
  });

  describe('syncLegacyFlags', () => {
    let mockManager: any;
    let entity: any;

    beforeEach(() => {
      mockManager = {
        getEffectsByType: jest.fn()
      };

      entity = {
        id: 'player-1',
        name: 'Test Player'
      };
    });

    it('should sync vulnerability flags when vulnerable effects exist', () => {
      mockManager.getEffectsByType.mockReturnValue([
        { params: { damageIncrease: 0.3 } },
        { params: { damageIncrease: 0.2 } }
      ]);

      EntityAdapter.syncLegacyFlags(entity, mockManager);

      expect(entity.isVulnerable).toBe(true);
      expect(entity.vulnerabilityIncrease).toBe(0.3); // Max value
    });

    it('should clear vulnerability flags when no vulnerable effects', () => {
      mockManager.getEffectsByType.mockReturnValue([]);

      EntityAdapter.syncLegacyFlags(entity, mockManager);

      expect(entity.isVulnerable).toBe(false);
      expect(entity.vulnerabilityIncrease).toBe(0);
    });

    it('should handle missing manager method gracefully', () => {
      delete mockManager.getEffectsByType;

      expect(() => {
        EntityAdapter.syncLegacyFlags(entity, mockManager);
      }).not.toThrow();
    });
  });
});