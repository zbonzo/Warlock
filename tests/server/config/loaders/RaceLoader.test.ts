/**
 * @fileoverview Tests for RaceLoader
 */
import fs from 'fs';
import path from 'path';
import { RaceLoader, RaceBalanceContext, ClassRaceCompatibility } from '../../../../server/config/loaders/RaceLoader';
import { RacesConfig, RaceAttributes, RacialAbility, UsageLimit } from '../../../../server/config/schemas/race.schema';

// Mock external dependencies
jest.mock('fs');
jest.mock('path');

const mockFS = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation()
};

describe('RaceLoader', () => {
  let raceLoader: RaceLoader;
  let mockRacesConfig: RacesConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock races config
    mockRacesConfig = {
      availableRaces: ['Human', 'Elf', 'Dwarf', 'Orc'],
      raceAttributes: {
        'Human': {
          hpModifier: 1.0,
          armorModifier: 1.0,
          damageModifier: 1.0,
          compatibleClasses: ['Warrior', 'Mage', 'Cleric', 'Rogue']
        },
        'Elf': {
          hpModifier: 0.9,
          armorModifier: 0.9,
          damageModifier: 1.1,
          compatibleClasses: ['Mage', 'Rogue', 'Ranger']
        },
        'Dwarf': {
          hpModifier: 1.2,
          armorModifier: 1.3,
          damageModifier: 0.9,
          compatibleClasses: ['Warrior', 'Cleric']
        },
        'Orc': {
          hpModifier: 1.3,
          armorModifier: 0.8,
          damageModifier: 1.2,
          compatibleClasses: ['Warrior', 'Barbarian']
        }
      },
      racialAbilities: {
        'Human': {
          id: 'adaptability',
          name: 'Adaptability',
          description: 'Can learn any ability',
          usageLimit: 'perGame',
          maxUses: 1,
          cooldown: 0,
          params: {}
        },
        'Elf': {
          id: 'keenSenses',
          name: 'Keen Senses',
          description: 'Enhanced perception',
          usageLimit: 'passive',
          maxUses: 0,
          cooldown: 0,
          params: {}
        },
        'Dwarf': {
          id: 'stoneArmor',
          name: 'Stone Armor',
          description: 'Damage reduction',
          usageLimit: 'perRound',
          maxUses: 1,
          cooldown: 2,
          params: { armor: 5 }
        },
        'Orc': {
          id: 'bloodRage',
          name: 'Blood Rage',
          description: 'Increased damage when wounded',
          usageLimit: 'perTurn',
          maxUses: 3,
          cooldown: 1,
          params: { damageBonus: 0.5 }
        }
      }
    };

    // Mock file system
    mockPath.join.mockReturnValue('/mock/path/races.json');
    mockFS.existsSync.mockReturnValue(true);
    mockFS.statSync.mockReturnValue({
      mtimeMs: Date.now()
    } as any);
    mockFS.readFileSync.mockReturnValue(JSON.stringify(mockRacesConfig));
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('constructor and initialization', () => {
    it('should create RaceLoader with default path', () => {
      raceLoader = new RaceLoader();

      expect(mockPath.join).toHaveBeenCalledWith(__dirname, '../data/races.json');
      expect(mockFS.existsSync).toHaveBeenCalled();
      expect(mockFS.readFileSync).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith('Loaded 4 races from config');
    });

    it('should create RaceLoader with custom path', () => {
      const customPath = '/custom/races.json';
      raceLoader = new RaceLoader(customPath);

      expect(mockFS.existsSync).toHaveBeenCalledWith(customPath);
    });

    it('should throw error when file does not exist', () => {
      mockFS.existsSync.mockReturnValue(false);

      expect(() => new RaceLoader()).toThrow('Races data file not found');
    });

    it('should throw error when JSON is invalid', () => {
      mockFS.readFileSync.mockReturnValue('invalid json');

      expect(() => new RaceLoader()).toThrow();
      expect(consoleSpy.error).toHaveBeenCalledWith('Failed to load races:', expect.any(Error));
    });

    it('should throw error when validation fails', () => {
      const invalidConfig = {
        availableRaces: 'not an array' // Should be array
      };
      mockFS.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => new RaceLoader()).toThrow('Invalid races data');
    });

    it('should build class-race compatibility mapping', () => {
      raceLoader = new RaceLoader();

      const compatibleRaces = raceLoader.getCompatibleRaces('Warrior');
      expect(compatibleRaces).toContain('Human');
      expect(compatibleRaces).toContain('Dwarf');
      expect(compatibleRaces).toContain('Orc');
      expect(compatibleRaces).not.toContain('Elf');
    });
  });

  describe('file watching and reloading', () => {
    beforeEach(() => {
      raceLoader = new RaceLoader();
    });

    it('should reload when file is modified', () => {
      const newMtime = Date.now() + 10000;
      mockFS.statSync.mockReturnValue({ mtimeMs: newMtime } as any);

      const reloaded = raceLoader.reloadIfChanged();

      expect(reloaded).toBe(true);
      expect(mockFS.readFileSync).toHaveBeenCalledTimes(2); // Once in constructor, once in reload
    });

    it('should not reload when file is unchanged', () => {
      const reloaded = raceLoader.reloadIfChanged();

      expect(reloaded).toBe(false);
      expect(mockFS.readFileSync).toHaveBeenCalledTimes(1); // Only in constructor
    });

    it('should handle stat errors gracefully', () => {
      mockFS.statSync.mockImplementation(() => {
        throw new Error('File stat error');
      });

      const reloaded = raceLoader.reloadIfChanged();

      expect(reloaded).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error checking for race config changes:', expect.any(Error));
    });
  });

  describe('basic race information methods', () => {
    beforeEach(() => {
      raceLoader = new RaceLoader();
    });

    describe('getAvailableRaces', () => {
      it('should return available race names', () => {
        const races = raceLoader.getAvailableRaces();

        expect(races).toEqual(['Human', 'Elf', 'Dwarf', 'Orc']);
        expect(races).not.toBe(mockRacesConfig.availableRaces); // Should be a copy
      });
    });

    describe('getRaceAttributes', () => {
      it('should return attributes for valid race', () => {
        const attributes = raceLoader.getRaceAttributes('Human');

        expect(attributes).toEqual({
          hpModifier: 1.0,
          armorModifier: 1.0,
          damageModifier: 1.0,
          compatibleClasses: ['Warrior', 'Mage', 'Cleric', 'Rogue']
        });
      });

      it('should return null for invalid race', () => {
        const attributes = raceLoader.getRaceAttributes('InvalidRace');
        expect(attributes).toBeNull();
      });
    });

    describe('getRacialAbility', () => {
      it('should return racial ability for valid race', () => {
        const ability = raceLoader.getRacialAbility('Dwarf');

        expect(ability).toEqual({
          id: 'stoneArmor',
          name: 'Stone Armor',
          description: 'Damage reduction',
          usageLimit: 'perRound',
          maxUses: 1,
          cooldown: 2,
          params: { armor: 5 }
        });
      });

      it('should return null for invalid race', () => {
        const ability = raceLoader.getRacialAbility('InvalidRace');
        expect(ability).toBeNull();
      });
    });

    describe('isValidRace', () => {
      it('should return true for valid race', () => {
        expect(raceLoader.isValidRace('Elf')).toBe(true);
      });

      it('should return false for invalid race', () => {
        expect(raceLoader.isValidRace('InvalidRace')).toBe(false);
      });
    });
  });

  describe('compatibility methods', () => {
    beforeEach(() => {
      raceLoader = new RaceLoader();
    });

    describe('getCompatibleClasses', () => {
      it('should return compatible classes for race', () => {
        const classes = raceLoader.getCompatibleClasses('Elf');
        expect(classes).toEqual(['Mage', 'Rogue', 'Ranger']);
      });

      it('should return empty array for invalid race', () => {
        const classes = raceLoader.getCompatibleClasses('InvalidRace');
        expect(classes).toEqual([]);
      });
    });

    describe('getCompatibleRaces', () => {
      it('should return compatible races for class', () => {
        const races = raceLoader.getCompatibleRaces('Warrior');
        expect(races).toContain('Human');
        expect(races).toContain('Dwarf');
        expect(races).toContain('Orc');
        expect(races).not.toContain('Elf');
      });

      it('should return empty array for class with no compatible races', () => {
        const races = raceLoader.getCompatibleRaces('InvalidClass');
        expect(races).toEqual([]);
      });
    });

    describe('isValidCombination', () => {
      it('should return true for valid race-class combination', () => {
        expect(raceLoader.isValidCombination('Human', 'Warrior')).toBe(true);
        expect(raceLoader.isValidCombination('Elf', 'Mage')).toBe(true);
      });

      it('should return false for invalid race-class combination', () => {
        expect(raceLoader.isValidCombination('Elf', 'Warrior')).toBe(false);
        expect(raceLoader.isValidCombination('Dwarf', 'Mage')).toBe(false);
      });

      it('should return false for invalid race', () => {
        expect(raceLoader.isValidCombination('InvalidRace', 'Warrior')).toBe(false);
      });
    });
  });

  describe('stat calculations', () => {
    beforeEach(() => {
      raceLoader = new RaceLoader();
    });

    describe('calculateRaceStats', () => {
      it('should calculate stats with race modifiers', () => {
        const context: RaceBalanceContext = {
          baseHp: 100,
          baseArmor: 10,
          baseDamage: 25
        };

        const stats = raceLoader.calculateRaceStats('Dwarf', context);

        expect(stats).toEqual({
          hp: 120, // 100 * 1.2
          armor: 13, // 10 * 1.3
          damage: 22 // 25 * 0.9 (floored)
        });
      });

      it('should use default values when context is empty', () => {
        const stats = raceLoader.calculateRaceStats('Orc');

        expect(stats).toEqual({
          hp: 130, // 100 * 1.3
          armor: 8,  // 10 * 0.8
          damage: 30 // 25 * 1.2
        });
      });

      it('should return base stats for invalid race', () => {
        const context: RaceBalanceContext = {
          baseHp: 100,
          baseArmor: 10,
          baseDamage: 25
        };

        const stats = raceLoader.calculateRaceStats('InvalidRace', context);

        expect(stats).toEqual({
          hp: 100,
          armor: 10,
          damage: 25
        });
      });

      it('should handle missing context gracefully', () => {
        const stats = raceLoader.calculateRaceStats('Human');

        expect(stats.hp).toBe(100); // Default 100 * 1.0
        expect(stats.armor).toBe(10); // Default 10 * 1.0
        expect(stats.damage).toBe(25); // Default 25 * 1.0
      });
    });
  });

  describe('racial ability analysis', () => {
    beforeEach(() => {
      raceLoader = new RaceLoader();
    });

    describe('getRacialAbilityUsage', () => {
      it('should return usage information for race ability', () => {
        const usage = raceLoader.getRacialAbilityUsage('Orc');

        expect(usage).toEqual({
          isPassive: false,
          maxUses: 3,
          cooldown: 1,
          usageLimit: 'perTurn'
        });
      });

      it('should identify passive abilities', () => {
        const usage = raceLoader.getRacialAbilityUsage('Elf');

        expect(usage?.isPassive).toBe(true);
        expect(usage?.usageLimit).toBe('passive');
      });

      it('should return null for invalid race', () => {
        const usage = raceLoader.getRacialAbilityUsage('InvalidRace');
        expect(usage).toBeNull();
      });
    });

    describe('getRacesByUsageLimit', () => {
      it('should return races by usage limit type', () => {
        const passiveRaces = raceLoader.getRacesByUsageLimit('passive');
        expect(passiveRaces).toEqual(['Elf']);

        const perGameRaces = raceLoader.getRacesByUsageLimit('perGame');
        expect(perGameRaces).toEqual(['Human']);

        const perRoundRaces = raceLoader.getRacesByUsageLimit('perRound');
        expect(perRoundRaces).toEqual(['Dwarf']);

        const perTurnRaces = raceLoader.getRacesByUsageLimit('perTurn');
        expect(perTurnRaces).toEqual(['Orc']);
      });

      it('should return empty array for usage limit with no races', () => {
        // Add a new usage limit type not used by any race
        const races = raceLoader.getRacesByUsageLimit('perBattle' as UsageLimit);
        expect(races).toEqual([]);
      });
    });
  });

  describe('balance analysis and statistics', () => {
    beforeEach(() => {
      raceLoader = new RaceLoader();
    });

    describe('getRaceBalanceStats', () => {
      it('should calculate comprehensive balance statistics', () => {
        const stats = raceLoader.getRaceBalanceStats();

        expect(stats.races).toBe(4);

        // Average modifiers: (1.0 + 0.9 + 1.2 + 1.3) / 4 = 1.1 hp
        expect(stats.averageModifiers.hp).toBeCloseTo(1.1);
        // (1.0 + 0.9 + 1.3 + 0.8) / 4 = 1.0 armor
        expect(stats.averageModifiers.armor).toBeCloseTo(1.0);
        // (1.0 + 1.1 + 0.9 + 1.2) / 4 = 1.05 damage
        expect(stats.averageModifiers.damage).toBeCloseTo(1.05);

        expect(stats.extremes.highestHp).toEqual({ race: 'Orc', value: 1.3 });
        expect(stats.extremes.lowestHp).toEqual({ race: 'Elf', value: 0.9 });
        expect(stats.extremes.highestDamage).toEqual({ race: 'Orc', value: 1.2 });
        expect(stats.extremes.lowestDamage).toEqual({ race: 'Dwarf', value: 0.9 });
      });

      it('should track compatibility matrix', () => {
        const stats = raceLoader.getRaceBalanceStats();

        expect(stats.compatibilityMatrix).toEqual({
          'Human': 4,  // Compatible with 4 classes
          'Elf': 3,    // Compatible with 3 classes
          'Dwarf': 2,  // Compatible with 2 classes
          'Orc': 2     // Compatible with 2 classes
        });
      });

      it('should categorize ability types', () => {
        const stats = raceLoader.getRaceBalanceStats();

        expect(stats.abilityTypes).toEqual({
          passive: 1,   // Elf
          perGame: 1,   // Human
          perRound: 1,  // Dwarf
          perTurn: 1    // Orc
        });
      });

      it('should handle empty race list', () => {
        mockRacesConfig.availableRaces = [];
        mockFS.readFileSync.mockReturnValue(JSON.stringify(mockRacesConfig));

        raceLoader = new RaceLoader();
        const stats = raceLoader.getRaceBalanceStats();

        expect(stats.races).toBe(0);
        expect(stats.averageModifiers.hp).toBeNaN(); // Division by zero
      });
    });

    describe('validateCompatibility', () => {
      it('should validate when compatibility is correct', () => {
        const validation = raceLoader.validateCompatibility();

        expect(validation.isValid).toBe(true);
        expect(validation.orphanedClasses).toEqual([]);
        expect(validation.orphanedRaces).toEqual([]);
      });

      it('should detect orphaned races', () => {
        // Create race with no compatible classes
        mockRacesConfig.availableRaces.push('Goblin');
        mockRacesConfig.raceAttributes['Goblin'] = {
          hpModifier: 0.8,
          armorModifier: 0.7,
          damageModifier: 1.1,
          compatibleClasses: []
        };
        mockRacesConfig.racialAbilities['Goblin'] = {
          id: 'sneak',
          name: 'Sneak',
          description: 'Stealth ability',
          usageLimit: 'perTurn',
          maxUses: 2,
          cooldown: 0,
          params: {}
        };
        mockFS.readFileSync.mockReturnValue(JSON.stringify(mockRacesConfig));

        raceLoader = new RaceLoader();
        const validation = raceLoader.validateCompatibility();

        expect(validation.isValid).toBe(false);
        expect(validation.orphanedRaces).toContain('Goblin');
      });

      it('should warn about classes with limited race options', () => {
        // Barbarian only has 1 compatible race (Orc)
        const validation = raceLoader.validateCompatibility();

        expect(validation.warnings).toContain("Class 'Barbarian' only has 1 compatible race");
      });

      it('should warn about classes with 2 race options', () => {
        // Add a class with exactly 2 compatible races
        mockRacesConfig.raceAttributes.Human.compatibleClasses = ['TestClass'];
        mockRacesConfig.raceAttributes.Elf.compatibleClasses = ['TestClass'];
        mockFS.readFileSync.mockReturnValue(JSON.stringify(mockRacesConfig));

        raceLoader = new RaceLoader();
        const validation = raceLoader.validateCompatibility();

        expect(validation.warnings).toContain("Class 'TestClass' only has 2 compatible races");
      });
    });
  });

  describe('data access methods', () => {
    beforeEach(() => {
      raceLoader = new RaceLoader();
    });

    describe('getAllRaceData', () => {
      it('should return complete config with compatibility mapping', () => {
        const allData = raceLoader.getAllRaceData();

        expect(allData.availableRaces).toEqual(mockRacesConfig.availableRaces);
        expect(allData.raceAttributes).toEqual(mockRacesConfig.raceAttributes);
        expect(allData.racialAbilities).toEqual(mockRacesConfig.racialAbilities);
        expect(allData.classRaceCompatibility).toBeDefined();

        // Should be copies, not references
        expect(allData.availableRaces).not.toBe(mockRacesConfig.availableRaces);
        expect(allData.raceAttributes).not.toBe(mockRacesConfig.raceAttributes);

        // Check class-race compatibility
        expect(allData.classRaceCompatibility['Warrior']).toContain('Human');
        expect(allData.classRaceCompatibility['Mage']).toContain('Elf');
      });
    });

    describe('getClassRaceCompatibility', () => {
      it('should return class-race compatibility mapping', () => {
        const compatibility = raceLoader.getClassRaceCompatibility();

        expect(compatibility['Warrior']).toEqual(['Human', 'Dwarf', 'Orc']);
        expect(compatibility['Mage']).toEqual(['Human', 'Elf']);
        expect(compatibility['Cleric']).toEqual(['Human', 'Dwarf']);
        expect(compatibility['Rogue']).toEqual(['Human', 'Elf']);
        expect(compatibility['Ranger']).toEqual(['Elf']);
        expect(compatibility['Barbarian']).toEqual(['Orc']);

        // Should be a copy
        expect(compatibility).not.toBe((raceLoader as any).classRaceCompatibility);
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle file read errors', () => {
      mockFS.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => new RaceLoader()).toThrow('Permission denied');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', () => {
      mockFS.readFileSync.mockReturnValue('{ "invalid": json }');

      expect(() => new RaceLoader()).toThrow();
    });

    it('should handle empty file', () => {
      mockFS.readFileSync.mockReturnValue('');

      expect(() => new RaceLoader()).toThrow();
    });

    it('should handle partial config data', () => {
      const partialConfig = {
        availableRaces: ['Human'],
        raceAttributes: {},
        racialAbilities: {}
      };
      mockFS.readFileSync.mockReturnValue(JSON.stringify(partialConfig));

      raceLoader = new RaceLoader();

      expect(raceLoader.getRaceAttributes('Human')).toBeNull();
      expect(raceLoader.getRacialAbility('Human')).toBeNull();
    });

    it('should handle race without attributes', () => {
      raceLoader = new RaceLoader();

      const classes = raceLoader.getCompatibleClasses('NonExistentRace');
      expect(classes).toEqual([]);
    });

    it('should not reload when file timestamps are equal', () => {
      const fixedTime = Date.now();
      mockFS.statSync.mockReturnValue({ mtimeMs: fixedTime } as any);

      raceLoader = new RaceLoader();

      // Reset call count and try reload
      mockFS.readFileSync.mockClear();
      const reloaded = raceLoader.reloadIfChanged();

      expect(reloaded).toBe(false);
      expect(mockFS.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      raceLoader = new RaceLoader();
    });

    it('should handle complete character creation workflow', () => {
      // 1. Get available races
      const races = raceLoader.getAvailableRaces();
      expect(races.length).toBeGreaterThan(0);

      // 2. Select a race and validate with a class
      const raceName = races[0];
      const isValid = raceLoader.isValidCombination(raceName, 'Warrior');
      expect(typeof isValid).toBe('boolean');

      // 3. Calculate stats for the race
      const stats = raceLoader.calculateRaceStats(raceName, {
        baseHp: 100,
        baseArmor: 10,
        baseDamage: 25
      });
      expect(stats.hp).toBeGreaterThan(0);

      // 4. Get racial ability information
      const ability = raceLoader.getRacialAbility(raceName);
      expect(ability).toBeDefined();

      const usage = raceLoader.getRacialAbilityUsage(raceName);
      expect(usage).toBeDefined();
    });

    it('should provide consistent data across multiple calls', () => {
      const races1 = raceLoader.getAvailableRaces();
      const races2 = raceLoader.getAvailableRaces();

      expect(races1).toEqual(races2);
      expect(races1).not.toBe(races2); // Different instances

      const attributes1 = raceLoader.getRaceAttributes('Human');
      const attributes2 = raceLoader.getRaceAttributes('Human');

      expect(attributes1).toEqual(attributes2);
    });

    it('should maintain consistency between race-class and class-race mappings', () => {
      const humanCompatibleClasses = raceLoader.getCompatibleClasses('Human');

      humanCompatibleClasses.forEach(className => {
        const classCompatibleRaces = raceLoader.getCompatibleRaces(className);
        expect(classCompatibleRaces).toContain('Human');
      });
    });
  });

  describe('type safety and interface compliance', () => {
    beforeEach(() => {
      raceLoader = new RaceLoader();
    });

    it('should enforce RaceBalanceContext interface', () => {
      const context: RaceBalanceContext = {
        level: 3,
        baseHp: 100,
        baseArmor: 10,
        baseDamage: 25,
        customProperty: 'test'
      };

      const stats = raceLoader.calculateRaceStats('Human', context);

      expect(typeof stats.hp).toBe('number');
      expect(typeof stats.armor).toBe('number');
      expect(typeof stats.damage).toBe('number');
    });

    it('should enforce ClassRaceCompatibility interface', () => {
      const compatibility = raceLoader.getClassRaceCompatibility();

      Object.entries(compatibility).forEach(([className, races]) => {
        expect(typeof className).toBe('string');
        expect(Array.isArray(races)).toBe(true);
        races.forEach(race => {
          expect(typeof race).toBe('string');
        });
      });
    });

    it('should enforce UsageLimit type safety', () => {
      const validLimits: UsageLimit[] = ['passive', 'perGame', 'perRound', 'perTurn'];

      validLimits.forEach(limit => {
        const races = raceLoader.getRacesByUsageLimit(limit);
        expect(Array.isArray(races)).toBe(true);
      });
    });

    it('should return proper racial ability usage information', () => {
      const usage = raceLoader.getRacialAbilityUsage('Human');

      if (usage) {
        expect(typeof usage.isPassive).toBe('boolean');
        expect(typeof usage.maxUses).toBe('number');
        expect(typeof usage.cooldown).toBe('number');
        expect(['passive', 'perGame', 'perRound', 'perTurn']).toContain(usage.usageLimit);
      }
    });
  });
});
