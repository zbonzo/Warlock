/**
 * @fileoverview Tests for ClassLoader
 */
import fs from 'fs';
import path from 'path';
import { ClassLoader, ClassWithAbilities, ClassBalanceContext } from '../../../../server/config/loaders/ClassLoader';
import { ClassesConfig, ClassAttributes, AbilityProgression } from '../../../../server/config/schemas/class.schema';

// Mock external dependencies
jest.mock('fs');
jest.mock('path');

const mockFS = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

// Mock ability loader
const mockAbilityLoader = {
  getAbility: jest.fn()
};

jest.mock('../../../../server/config/loaders/AbilityLoader', () => ({
  abilityLoader: mockAbilityLoader
}));

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation()
};

describe('ClassLoader', () => {
  let classLoader: ClassLoader;
  let mockClassesConfig: ClassesConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock classes config
    mockClassesConfig = {
      availableClasses: ['Warrior', 'Mage', 'Cleric'],
      classCategories: {
        'Melee': ['Warrior'],
        'Caster': ['Mage'],
        'Support': ['Cleric']
      },
      classAttributes: {
        'Warrior': {
          hpModifier: 1.2,
          armorModifier: 1.1,
          damageModifier: 1.1
        },
        'Mage': {
          hpModifier: 0.8,
          armorModifier: 0.9,
          damageModifier: 1.3
        },
        'Cleric': {
          hpModifier: 1.0,
          armorModifier: 1.0,
          damageModifier: 0.9
        }
      },
      classAbilityProgression: {
        'Warrior': {
          level1: 'slash',
          level2: 'charge',
          level3: 'berserk',
          level4: 'execution'
        },
        'Mage': {
          level1: 'fireball',
          level2: 'frostbolt',
          level3: 'lightning',
          level4: 'meteor'
        },
        'Cleric': {
          level1: 'heal',
          level2: 'bless',
          level3: 'sanctuary',
          level4: 'resurrection'
        }
      }
    };

    // Mock file system
    mockPath.join.mockReturnValue('/mock/path/classes.json');
    mockFS.existsSync.mockReturnValue(true);
    mockFS.statSync.mockReturnValue({
      mtimeMs: Date.now()
    } as any);
    mockFS.readFileSync.mockReturnValue(JSON.stringify(mockClassesConfig));

    // Mock ability loader responses
    mockAbilityLoader.getAbility.mockImplementation((abilityId: string) => ({
      id: abilityId,
      name: abilityId.charAt(0).toUpperCase() + abilityId.slice(1),
      description: `${abilityId} ability`,
      type: 'active',
      params: { damage: 25 }
    }));
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('constructor and initialization', () => {
    it('should create ClassLoader with default path', () => {
      classLoader = new ClassLoader();
      
      expect(mockPath.join).toHaveBeenCalledWith(__dirname, '../data/classes.json');
      expect(mockFS.existsSync).toHaveBeenCalled();
      expect(mockFS.readFileSync).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('Loaded 3 classes from config');
    });

    it('should create ClassLoader with custom path', () => {
      const customPath = '/custom/classes.json';
      classLoader = new ClassLoader(customPath);
      
      expect(mockFS.existsSync).toHaveBeenCalledWith(customPath);
    });

    it('should throw error when file does not exist', () => {
      mockFS.existsSync.mockReturnValue(false);
      
      expect(() => new ClassLoader()).toThrow('Classes data file not found');
    });

    it('should throw error when JSON is invalid', () => {
      mockFS.readFileSync.mockReturnValue('invalid json');
      
      expect(() => new ClassLoader()).toThrow();
      expect(consoleSpy.error).toHaveBeenCalledWith('Failed to load classes:', expect.any(Error));
    });

    it('should throw error when validation fails', () => {
      const invalidConfig = {
        availableClasses: 'not an array' // Should be array
      };
      mockFS.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));
      
      expect(() => new ClassLoader()).toThrow('Invalid classes data');
    });
  });

  describe('file watching and reloading', () => {
    beforeEach(() => {
      classLoader = new ClassLoader();
    });

    it('should reload when file is modified', () => {
      const newMtime = Date.now() + 10000;
      mockFS.statSync.mockReturnValue({ mtimeMs: newMtime } as any);
      
      const reloaded = classLoader.reloadIfChanged();
      
      expect(reloaded).toBe(true);
      expect(mockFS.readFileSync).toHaveBeenCalledTimes(2); // Once in constructor, once in reload
    });

    it('should not reload when file is unchanged', () => {
      const reloaded = classLoader.reloadIfChanged();
      
      expect(reloaded).toBe(false);
      expect(mockFS.readFileSync).toHaveBeenCalledTimes(1); // Only in constructor
    });

    it('should handle stat errors gracefully', () => {
      mockFS.statSync.mockImplementation(() => {
        throw new Error('File stat error');
      });
      
      const reloaded = classLoader.reloadIfChanged();
      
      expect(reloaded).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error checking for class config changes:', expect.any(Error));
    });
  });

  describe('basic class information methods', () => {
    beforeEach(() => {
      classLoader = new ClassLoader();
    });

    describe('getAvailableClasses', () => {
      it('should return available class names', () => {
        const classes = classLoader.getAvailableClasses();
        
        expect(classes).toEqual(['Warrior', 'Mage', 'Cleric']);
        expect(classes).not.toBe(mockClassesConfig.availableClasses); // Should be a copy
      });
    });

    describe('getClassCategories', () => {
      it('should return class categories', () => {
        const categories = classLoader.getClassCategories();
        
        expect(categories).toEqual({
          'Melee': ['Warrior'],
          'Caster': ['Mage'],
          'Support': ['Cleric']
        });
        expect(categories).not.toBe(mockClassesConfig.classCategories); // Should be a copy
      });
    });

    describe('getClassesByCategory', () => {
      it('should return classes for valid category', () => {
        const meleeClasses = classLoader.getClassesByCategory('Melee');
        expect(meleeClasses).toEqual(['Warrior']);
      });

      it('should return empty array for invalid category', () => {
        const invalidClasses = classLoader.getClassesByCategory('Invalid' as any);
        expect(invalidClasses).toEqual([]);
      });
    });

    describe('getClassAttributes', () => {
      it('should return attributes for valid class', () => {
        const attributes = classLoader.getClassAttributes('Warrior');
        
        expect(attributes).toEqual({
          hpModifier: 1.2,
          armorModifier: 1.1,
          damageModifier: 1.1
        });
      });

      it('should return null for invalid class', () => {
        const attributes = classLoader.getClassAttributes('InvalidClass');
        expect(attributes).toBeNull();
      });
    });

    describe('getClassAbilityProgression', () => {
      it('should return progression for valid class', () => {
        const progression = classLoader.getClassAbilityProgression('Mage');
        
        expect(progression).toEqual({
          level1: 'fireball',
          level2: 'frostbolt',
          level3: 'lightning',
          level4: 'meteor'
        });
      });

      it('should return null for invalid class', () => {
        const progression = classLoader.getClassAbilityProgression('InvalidClass');
        expect(progression).toBeNull();
      });
    });

    describe('isValidClass', () => {
      it('should return true for valid class', () => {
        expect(classLoader.isValidClass('Warrior')).toBe(true);
      });

      it('should return false for invalid class', () => {
        expect(classLoader.isValidClass('InvalidClass')).toBe(false);
      });
    });
  });

  describe('ability-related methods', () => {
    beforeEach(() => {
      classLoader = new ClassLoader();
    });

    describe('getClassAbilities', () => {
      it('should return abilities with unlock levels', () => {
        const abilities = classLoader.getClassAbilities('Warrior', 3);
        
        expect(abilities).toHaveLength(3);
        expect(abilities[0]).toEqual({
          id: 'slash',
          name: 'Slash',
          description: 'slash ability',
          type: 'active',
          params: { damage: 25 },
          unlockAt: 1
        });
        expect(abilities[2]).toEqual({
          id: 'berserk',
          name: 'Berserk',
          description: 'berserk ability',
          type: 'active',
          params: { damage: 25 },
          unlockAt: 3
        });
      });

      it('should return empty array for invalid class', () => {
        const abilities = classLoader.getClassAbilities('InvalidClass');
        expect(abilities).toEqual([]);
      });

      it('should handle missing abilities gracefully', () => {
        mockAbilityLoader.getAbility.mockReturnValue(null);
        
        const abilities = classLoader.getClassAbilities('Warrior');
        expect(abilities).toEqual([]);
      });

      it('should respect max level parameter', () => {
        const abilities = classLoader.getClassAbilities('Warrior', 2);
        expect(abilities).toHaveLength(2);
      });

      it('should not exceed level 4', () => {
        const abilities = classLoader.getClassAbilities('Warrior', 10);
        expect(abilities).toHaveLength(4);
      });
    });

    describe('getAllClassAbilities', () => {
      it('should return all abilities for class', () => {
        const abilities = classLoader.getAllClassAbilities('Mage');
        expect(abilities).toHaveLength(4);
      });
    });

    describe('getClassAbilityForLevel', () => {
      it('should return ability ID for valid level', () => {
        const abilityId = classLoader.getClassAbilityForLevel('Warrior', 2);
        expect(abilityId).toBe('charge');
      });

      it('should return null for invalid level', () => {
        expect(classLoader.getClassAbilityForLevel('Warrior', 0)).toBeNull();
        expect(classLoader.getClassAbilityForLevel('Warrior', 5)).toBeNull();
      });

      it('should return null for invalid class', () => {
        const abilityId = classLoader.getClassAbilityForLevel('InvalidClass', 1);
        expect(abilityId).toBeNull();
      });
    });
  });

  describe('comprehensive class information', () => {
    beforeEach(() => {
      classLoader = new ClassLoader();
    });

    describe('getClassInfo', () => {
      it('should return complete class information', () => {
        const classInfo = classLoader.getClassInfo('Warrior');
        
        expect(classInfo).toEqual({
          name: 'Warrior',
          category: 'Melee',
          attributes: {
            hpModifier: 1.2,
            armorModifier: 1.1,
            damageModifier: 1.1
          },
          abilities: expect.arrayContaining([
            expect.objectContaining({
              id: 'slash',
              unlockAt: 1
            })
          ])
        });
      });

      it('should return null for invalid class', () => {
        const classInfo = classLoader.getClassInfo('InvalidClass');
        expect(classInfo).toBeNull();
      });

      it('should use default category fallback', () => {
        // Create a class without a category
        mockClassesConfig.availableClasses.push('Orphan');
        mockClassesConfig.classAttributes['Orphan'] = {
          hpModifier: 1.0,
          armorModifier: 1.0,
          damageModifier: 1.0
        };
        mockClassesConfig.classAbilityProgression['Orphan'] = {
          level1: 'basic'
        };
        mockFS.readFileSync.mockReturnValue(JSON.stringify(mockClassesConfig));
        
        classLoader = new ClassLoader();
        const classInfo = classLoader.getClassInfo('Orphan');
        
        expect(classInfo?.category).toBe('Melee'); // Default fallback
      });
    });

    describe('getClassCategory', () => {
      it('should return correct category for class', () => {
        expect(classLoader.getClassCategory('Warrior')).toBe('Melee');
        expect(classLoader.getClassCategory('Mage')).toBe('Caster');
      });

      it('should return null for invalid class', () => {
        expect(classLoader.getClassCategory('InvalidClass')).toBeNull();
      });
    });
  });

  describe('stat calculations', () => {
    beforeEach(() => {
      classLoader = new ClassLoader();
    });

    describe('calculateClassStats', () => {
      it('should calculate stats with class modifiers', () => {
        const context: ClassBalanceContext = {
          baseHp: 100,
          baseArmor: 10,
          baseDamage: 25
        };
        
        const stats = classLoader.calculateClassStats('Warrior', context);
        
        expect(stats).toEqual({
          hp: 120, // 100 * 1.2
          armor: 11, // 10 * 1.1
          damage: 27 // 25 * 1.1 (floored)
        });
      });

      it('should use default values when context is empty', () => {
        const stats = classLoader.calculateClassStats('Mage');
        
        expect(stats).toEqual({
          hp: 80, // 100 * 0.8
          armor: 9, // 10 * 0.9
          damage: 32 // 25 * 1.3
        });
      });

      it('should return base stats for invalid class', () => {
        const context: ClassBalanceContext = {
          baseHp: 100,
          baseArmor: 10,
          baseDamage: 25
        };
        
        const stats = classLoader.calculateClassStats('InvalidClass', context);
        
        expect(stats).toEqual({
          hp: 100,
          armor: 10,
          damage: 25
        });
      });

      it('should handle missing context gracefully', () => {
        const stats = classLoader.calculateClassStats('Cleric');
        
        expect(stats.hp).toBe(100); // Default 100 * 1.0
        expect(stats.armor).toBe(10); // Default 10 * 1.0
        expect(stats.damage).toBe(22); // Default 25 * 0.9 (floored)
      });
    });
  });

  describe('validation and analysis', () => {
    beforeEach(() => {
      classLoader = new ClassLoader();
    });

    describe('validateClassAbilities', () => {
      it('should validate when all abilities exist', () => {
        const validation = classLoader.validateClassAbilities();
        
        expect(validation.isValid).toBe(true);
        expect(validation.missing).toEqual([]);
        expect(validation.warnings).toEqual([]);
      });

      it('should detect missing abilities', () => {
        mockAbilityLoader.getAbility.mockImplementation((abilityId: string) => {
          return abilityId === 'fireball' ? null : {
            id: abilityId,
            name: abilityId,
            description: '',
            type: 'active'
          };
        });
        
        const validation = classLoader.validateClassAbilities();
        
        expect(validation.isValid).toBe(false);
        expect(validation.missing).toContain('Mage level 1: ability \'fireball\' not found');
      });

      it('should detect missing level abilities', () => {
        // Create class with missing level
        mockClassesConfig.classAbilityProgression['TestClass'] = {
          level1: 'ability1',
          level3: 'ability3' // Missing level2
        };
        mockFS.readFileSync.mockReturnValue(JSON.stringify(mockClassesConfig));
        
        classLoader = new ClassLoader();
        const validation = classLoader.validateClassAbilities();
        
        expect(validation.warnings).toContain('TestClass missing ability for level 2');
      });
    });

    describe('getClassBalanceStats', () => {
      it('should calculate comprehensive balance statistics', () => {
        const stats = classLoader.getClassBalanceStats();
        
        expect(stats.classes).toBe(3);
        expect(stats.categories).toEqual({
          'Melee': 1,
          'Caster': 1,
          'Support': 1
        });
        expect(stats.averageModifiers.hp).toBeCloseTo(1.0); // (1.2 + 0.8 + 1.0) / 3
        expect(stats.averageModifiers.damage).toBeCloseTo(1.1); // (1.1 + 1.3 + 0.9) / 3
        
        expect(stats.extremes.highestHp).toEqual({ class: 'Warrior', value: 1.2 });
        expect(stats.extremes.lowestHp).toEqual({ class: 'Mage', value: 0.8 });
        expect(stats.extremes.highestDamage).toEqual({ class: 'Mage', value: 1.3 });
        expect(stats.extremes.lowestDamage).toEqual({ class: 'Cleric', value: 0.9 });
      });

      it('should handle empty class list', () => {
        mockClassesConfig.availableClasses = [];
        mockFS.readFileSync.mockReturnValue(JSON.stringify(mockClassesConfig));
        
        classLoader = new ClassLoader();
        const stats = classLoader.getClassBalanceStats();
        
        expect(stats.classes).toBe(0);
        expect(stats.averageModifiers.hp).toBeNaN(); // Division by zero
      });
    });
  });

  describe('data access methods', () => {
    beforeEach(() => {
      classLoader = new ClassLoader();
    });

    describe('getAllClassData', () => {
      it('should return complete config as copies', () => {
        const allData = classLoader.getAllClassData();
        
        expect(allData.availableClasses).toEqual(mockClassesConfig.availableClasses);
        expect(allData.classCategories).toEqual(mockClassesConfig.classCategories);
        expect(allData.classAttributes).toEqual(mockClassesConfig.classAttributes);
        expect(allData.classAbilityProgression).toEqual(mockClassesConfig.classAbilityProgression);
        
        // Should be copies, not references
        expect(allData.availableClasses).not.toBe(mockClassesConfig.availableClasses);
        expect(allData.classCategories).not.toBe(mockClassesConfig.classCategories);
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle file read errors', () => {
      mockFS.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => new ClassLoader()).toThrow('Permission denied');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', () => {
      mockFS.readFileSync.mockReturnValue('{ "invalid": json }');
      
      expect(() => new ClassLoader()).toThrow();
    });

    it('should handle empty file', () => {
      mockFS.readFileSync.mockReturnValue('');
      
      expect(() => new ClassLoader()).toThrow();
    });

    it('should handle partial config data', () => {
      const partialConfig = {
        availableClasses: ['Warrior'],
        classCategories: {},
        classAttributes: {},
        classAbilityProgression: {}
      };
      mockFS.readFileSync.mockReturnValue(JSON.stringify(partialConfig));
      
      classLoader = new ClassLoader();
      
      expect(classLoader.getClassAttributes('Warrior')).toBeNull();
      expect(classLoader.getClassAbilityProgression('Warrior')).toBeNull();
    });

    it('should not reload when file timestamps are equal', () => {
      const fixedTime = Date.now();
      mockFS.statSync.mockReturnValue({ mtimeMs: fixedTime } as any);
      
      classLoader = new ClassLoader();
      
      // Reset call count and try reload
      mockFS.readFileSync.mockClear();
      const reloaded = classLoader.reloadIfChanged();
      
      expect(reloaded).toBe(false);
      expect(mockFS.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      classLoader = new ClassLoader();
    });

    it('should handle complete character creation workflow', () => {
      // 1. Get available classes
      const classes = classLoader.getAvailableClasses();
      expect(classes.length).toBeGreaterThan(0);
      
      // 2. Select a class and get its info
      const className = classes[0];
      const classInfo = classLoader.getClassInfo(className);
      expect(classInfo).toBeDefined();
      
      // 3. Calculate stats for the class
      const stats = classLoader.calculateClassStats(className, {
        baseHp: 100,
        baseArmor: 10,
        baseDamage: 25
      });
      expect(stats.hp).toBeGreaterThan(0);
      
      // 4. Get abilities for the class
      const abilities = classLoader.getAllClassAbilities(className);
      expect(abilities.length).toBeLessThanOrEqual(4);
    });

    it('should provide consistent data across multiple calls', () => {
      const classes1 = classLoader.getAvailableClasses();
      const classes2 = classLoader.getAvailableClasses();
      
      expect(classes1).toEqual(classes2);
      expect(classes1).not.toBe(classes2); // Different instances
      
      const attributes1 = classLoader.getClassAttributes('Warrior');
      const attributes2 = classLoader.getClassAttributes('Warrior');
      
      expect(attributes1).toEqual(attributes2);
    });
  });

  describe('type safety and interface compliance', () => {
    beforeEach(() => {
      classLoader = new ClassLoader();
    });

    it('should enforce ClassWithAbilities interface', () => {
      const classInfo = classLoader.getClassInfo('Warrior');
      
      if (classInfo) {
        expect(typeof classInfo.name).toBe('string');
        expect(typeof classInfo.category).toBe('string');
        expect(typeof classInfo.attributes).toBe('object');
        expect(Array.isArray(classInfo.abilities)).toBe(true);
        
        if (classInfo.abilities.length > 0) {
          const ability = classInfo.abilities[0];
          expect(typeof ability.unlockAt).toBe('number');
          expect(typeof ability.type).toBe('string');
        }
      }
    });

    it('should enforce ClassBalanceContext interface', () => {
      const context: ClassBalanceContext = {
        level: 3,
        baseHp: 100,
        baseArmor: 10,
        baseDamage: 25,
        customProperty: 'test'
      };
      
      const stats = classLoader.calculateClassStats('Warrior', context);
      
      expect(typeof stats.hp).toBe('number');
      expect(typeof stats.armor).toBe('number');
      expect(typeof stats.damage).toBe('number');
    });
  });
});