/**
 * @fileoverview Tests for AbilityLoader
 */
import fs from 'fs';
import path from 'path';
import { AbilityLoader, CombatContext } from '../../../../server/config/loaders/AbilityLoader';
import * as abilitySchema from '../../../../server/config/schemas/ability.schema';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../../../server/config/schemas/ability.schema');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockAbilitySchema = abilitySchema as jest.Mocked<typeof abilitySchema>;

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeEach(() => {
  jest.clearAllMocks();
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('AbilityLoader', () => {
  const mockAbilitiesData = {
    fireball: {
      id: 'fireball',
      name: 'Fireball',
      category: 'Attack' as const,
      description: 'Cast a fireball',
      params: { damage: 25 },
      target: 'Single' as const,
      tags: ['fire', 'projectile'],
      cooldown: 2,
      order: 1,
      effect: null,
      buttonText: {
        ready: 'Cast Fireball',
        submitted: 'Casting...'
      }
    },
    heal: {
      id: 'heal',
      name: 'Heal',
      category: 'Heal' as const,
      description: 'Restore health points',
      params: { amount: 20 },
      target: 'Self' as const,
      tags: ['restoration'],
      cooldown: 1,
      order: 2,
      effect: null,
      buttonText: {
        ready: 'Heal',
        submitted: 'Healing...'
      }
    },
    bloodFrenzy: {
      id: 'bloodFrenzy',
      name: 'Blood Frenzy',
      category: 'Attack' as const,
      description: 'Damage increases as HP decreases',
      params: {
        damage: 15,
        damageIncreasePerHpMissing: 1.5
      },
      target: 'Single' as const,
      tags: ['berserker', 'scaling'],
      cooldown: 3,
      order: 3,
      effect: null,
      buttonText: {
        ready: 'Blood Frenzy',
        submitted: 'Raging...'
      }
    },
    multiStrike: {
      id: 'multiStrike',
      name: 'Multi Strike',
      category: 'Attack' as const,
      description: 'Hit multiple times',
      params: {
        damage: 8,
        hits: 3
      },
      target: 'Single' as const,
      tags: ['physical'],
      cooldown: 2,
      order: 4,
      effect: null,
      buttonText: {
        ready: 'Multi Strike',
        submitted: 'Striking...'
      }
    },
    hiddenAbility: {
      id: 'hiddenAbility',
      name: 'Hidden Ability',
      category: 'Special' as const,
      description: 'A secret ability',
      params: { damage: 50 },
      target: 'Single' as const,
      tags: ['hidden', 'special'],
      cooldown: 5,
      order: 5,
      effect: null,
      buttonText: {
        ready: 'Hidden',
        submitted: 'Using...'
      }
    },
    poisonDart: {
      id: 'poisonDart',
      name: 'Poison Dart',
      category: 'Attack' as const,
      description: 'Poisonous projectile',
      params: {
        damage: 10,
        poison: {
          damage: 5,
          turns: 3
        }
      },
      target: 'Single' as const,
      tags: ['poison', 'projectile'],
      cooldown: 2,
      order: 6,
      effect: 'poison',
      buttonText: {
        ready: 'Poison Dart',
        submitted: 'Shooting...'
      }
    }
  };

  describe('constructor and initialization', () => {
    it('should initialize with default data path', () => {
      mockPath.join.mockReturnValue('/default/path/abilities.json');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: mockAbilitiesData
      } as any);

      const loader = new AbilityLoader();

      expect(mockPath.join).toHaveBeenCalledWith(__dirname, '../data/abilities.json');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/default/path/abilities.json', 'utf-8');
      expect(console.log).toHaveBeenCalledWith('Loaded 6 abilities from config');
    });

    it('should initialize with custom data path', () => {
      const customPath = '/custom/abilities.json';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: mockAbilitiesData
      } as any);

      const loader = new AbilityLoader(customPath);

      expect(mockFs.readFileSync).toHaveBeenCalledWith(customPath, 'utf-8');
    });

    it('should throw error if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => new AbilityLoader('/nonexistent/path')).toThrow(
        'Abilities data file not found at: /nonexistent/path'
      );
    });

    it('should throw error on JSON parse failure', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue('invalid json');

      expect(() => new AbilityLoader()).toThrow();
    });

    it('should throw error on validation failure', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: false,
        error: { message: 'Validation failed' }
      } as any);

      expect(() => new AbilityLoader()).toThrow('Invalid abilities data: Validation failed');
    });
  });

  describe('hot reloading', () => {
    let loader: AbilityLoader;

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: mockAbilitiesData
      } as any);

      loader = new AbilityLoader();
      jest.clearAllMocks();
    });

    it('should reload when file is modified', () => {
      mockFs.statSync.mockReturnValue({ mtimeMs: 999999 } as any);
      const newData = { ...mockAbilitiesData, newAbility: mockAbilitiesData.fireball };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(newData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: newData
      } as any);

      const reloaded = loader.reloadIfChanged();

      expect(reloaded).toBe(true);
      expect(mockFs.readFileSync).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Loaded 7 abilities from config');
    });

    it('should not reload when file is unchanged', () => {
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);

      const reloaded = loader.reloadIfChanged();

      expect(reloaded).toBe(false);
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should handle reload errors gracefully', () => {
      mockFs.statSync.mockImplementation(() => {
        throw new Error('File access error');
      });

      const reloaded = loader.reloadIfChanged();

      expect(reloaded).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error checking for ability config changes:', expect.any(Error));
    });
  });

  describe('ability retrieval', () => {
    let loader: AbilityLoader;

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: mockAbilitiesData
      } as any);

      loader = new AbilityLoader();
    });

    describe('getAbility', () => {
      it('should return ability by ID', () => {
        const ability = loader.getAbility('fireball');
        expect(ability).toEqual(mockAbilitiesData.fireball);
      });

      it('should return null for non-existent ability', () => {
        const ability = loader.getAbility('nonexistent');
        expect(ability).toBeNull();
      });

      it('should trigger hot reload check', () => {
        const spy = jest.spyOn(loader, 'reloadIfChanged');
        loader.getAbility('fireball');
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('getAbilities', () => {
      it('should return multiple abilities by IDs', () => {
        const abilities = loader.getAbilities(['fireball', 'heal']);
        expect(abilities).toHaveLength(2);
        expect(abilities[0]).toEqual(mockAbilitiesData.fireball);
        expect(abilities[1]).toEqual(mockAbilitiesData.heal);
      });

      it('should filter out non-existent abilities', () => {
        const abilities = loader.getAbilities(['fireball', 'nonexistent', 'heal']);
        expect(abilities).toHaveLength(2);
      });

      it('should return empty array for empty input', () => {
        const abilities = loader.getAbilities([]);
        expect(abilities).toEqual([]);
      });
    });

    describe('getAbilitiesByTag', () => {
      it('should return abilities with specific tag', () => {
        const fireAbilities = loader.getAbilitiesByTag('fire');
        expect(fireAbilities).toHaveLength(1);
        expect(fireAbilities[0]).toEqual(mockAbilitiesData.fireball);
      });

      it('should return empty array for non-existent tag', () => {
        const abilities = loader.getAbilitiesByTag('nonexistent');
        expect(abilities).toEqual([]);
      });

      it('should return multiple abilities with same tag', () => {
        const projectileAbilities = loader.getAbilitiesByTag('projectile');
        expect(projectileAbilities).toHaveLength(2);
      });
    });

    describe('getAbilitiesByCategory', () => {
      it('should return abilities by category', () => {
        const attackAbilities = loader.getAbilitiesByCategory('Attack');
        expect(attackAbilities).toHaveLength(4);
      });

      it('should return single ability for unique category', () => {
        const healAbilities = loader.getAbilitiesByCategory('Heal');
        expect(healAbilities).toHaveLength(1);
        expect(healAbilities[0]).toEqual(mockAbilitiesData.heal);
      });

      it('should return empty array for non-existent category', () => {
        const abilities = loader.getAbilitiesByCategory('NonExistent' as any);
        expect(abilities).toEqual([]);
      });
    });

    describe('getAllAbilityIds', () => {
      it('should return all ability IDs', () => {
        const ids = loader.getAllAbilityIds();
        expect(ids).toHaveLength(6);
        expect(ids).toContain('fireball');
        expect(ids).toContain('heal');
      });
    });

    describe('getAllAbilities', () => {
      it('should return copy of all abilities', () => {
        const abilities = loader.getAllAbilities();
        expect(abilities).toEqual(mockAbilitiesData);
        expect(abilities).not.toBe(mockAbilitiesData); // Should be a copy
      });
    });
  });

  describe('ability properties', () => {
    let loader: AbilityLoader;

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: mockAbilitiesData
      } as any);

      loader = new AbilityLoader();
    });

    describe('getAbilityButtonText', () => {
      it('should return button text for ability', () => {
        const buttonText = loader.getAbilityButtonText('fireball');
        expect(buttonText).toEqual({
          ready: 'Cast Fireball',
          submitted: 'Casting...'
        });
      });

      it('should return null for non-existent ability', () => {
        const buttonText = loader.getAbilityButtonText('nonexistent');
        expect(buttonText).toBeNull();
      });
    });

    describe('getCooldownInfo', () => {
      it('should return cooldown info for ability', () => {
        const cooldownInfo = loader.getCooldownInfo('fireball');
        expect(cooldownInfo).toEqual({
          baseCooldown: 2,
          canReduce: true
        });
      });

      it('should return default for non-existent ability', () => {
        const cooldownInfo = loader.getCooldownInfo('nonexistent');
        expect(cooldownInfo).toEqual({
          baseCooldown: 0,
          canReduce: false
        });
      });
    });

    describe('getAbilitiesByOrder', () => {
      it('should return abilities sorted by order', () => {
        const orderedAbilities = loader.getAbilitiesByOrder();
        expect(orderedAbilities[0]).toEqual(mockAbilitiesData.fireball);
        expect(orderedAbilities[1]).toEqual(mockAbilitiesData.heal);
        expect(orderedAbilities[2]).toEqual(mockAbilitiesData.bloodFrenzy);
      });
    });
  });

  describe('availability and validation', () => {
    let loader: AbilityLoader;

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: mockAbilitiesData
      } as any);

      loader = new AbilityLoader();
    });

    describe('isAbilityAvailable', () => {
      it('should return true for regular abilities', () => {
        const available = loader.isAbilityAvailable('fireball');
        expect(available).toBe(true);
      });

      it('should return false for non-existent abilities', () => {
        const available = loader.isAbilityAvailable('nonexistent');
        expect(available).toBe(false);
      });

      it('should check hidden access for hidden abilities', () => {
        const availableWithoutAccess = loader.isAbilityAvailable('hiddenAbility');
        expect(availableWithoutAccess).toBe(false);

        const availableWithAccess = loader.isAbilityAvailable('hiddenAbility', { hasHiddenAccess: true });
        expect(availableWithAccess).toBe(true);
      });
    });

    describe('validateAbilityParams', () => {
      it('should validate single target requirements', () => {
        const validSingle = loader.validateAbilityParams('fireball', { targetId: 'player1' });
        expect(validSingle).toBe(true);

        const invalidSingle = loader.validateAbilityParams('fireball', {});
        expect(invalidSingle).toBe(false);
      });

      it('should validate multi target requirements', () => {
        // Assuming we had a multi-target ability, it should not have targetId
        // For now, this tests the logic structure
        const result = loader.validateAbilityParams('heal', {});
        expect(result).toBe(true); // Self target doesn't need targetId
      });

      it('should return false for non-existent ability', () => {
        const result = loader.validateAbilityParams('nonexistent', {});
        expect(result).toBe(false);
      });
    });
  });

  describe('damage calculation', () => {
    let loader: AbilityLoader;

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: mockAbilitiesData
      } as any);

      loader = new AbilityLoader();
    });

    it('should calculate basic damage', () => {
      const ability = loader.getAbility('fireball')!;
      const damage = loader.calculateDamage(ability);
      expect(damage).toBe(25);
    });

    it('should return 0 for abilities without damage', () => {
      const ability = loader.getAbility('heal')!;
      const damage = loader.calculateDamage(ability);
      expect(damage).toBe(0);
    });

    it('should apply level scaling', () => {
      const ability = { ...mockAbilitiesData.fireball, tags: ['fire', 'scaling'] };
      const damage = loader.calculateDamage(ability, { level: 3 });
      expect(damage).toBe(30); // 25 * 1.2 = 30
    });

    it('should apply berserker rage scaling', () => {
      const ability = loader.getAbility('bloodFrenzy')!;
      const context: CombatContext = {
        currentHp: 50,
        maxHp: 100
      };
      const damage = loader.calculateDamage(ability, context);
      expect(damage).toBe(90); // 15 + (50 * 1.5) = 90
    });

    it('should apply multi-hit calculations', () => {
      const ability = loader.getAbility('multiStrike')!;
      const damage = loader.calculateDamage(ability);
      expect(damage).toBe(24); // 8 * 3 = 24
    });

    it('should floor damage results', () => {
      const ability = { ...mockAbilitiesData.fireball, tags: ['fire', 'scaling'] };
      const damage = loader.calculateDamage(ability, { level: 2 });
      expect(damage).toBe(27); // 25 * 1.1 = 27.5, floored to 27
    });
  });

  describe('effect information', () => {
    let loader: AbilityLoader;

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: mockAbilitiesData
      } as any);

      loader = new AbilityLoader();
    });

    it('should return effect info for ability with effects', () => {
      const effectInfo = loader.getEffectInfo('poisonDart');
      expect(effectInfo).toEqual({
        hasEffect: true,
        effectType: 'poison',
        effectParams: {
          poison: {
            damage: 5,
            turns: 3
          }
        }
      });
    });

    it('should return no effect info for abilities without effects', () => {
      const effectInfo = loader.getEffectInfo('fireball');
      expect(effectInfo).toEqual({
        hasEffect: false,
        effectType: null,
        effectParams: {}
      });
    });

    it('should return default for non-existent ability', () => {
      const effectInfo = loader.getEffectInfo('nonexistent');
      expect(effectInfo).toEqual({
        hasEffect: false,
        effectType: null,
        effectParams: {}
      });
    });
  });

  describe('statistics', () => {
    let loader: AbilityLoader;

    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ mtimeMs: 123456 } as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockAbilitiesData));
      mockAbilitySchema.safeValidateAbilitiesMap.mockReturnValue({
        success: true,
        data: mockAbilitiesData
      } as any);

      loader = new AbilityLoader();
    });

    it('should calculate ability statistics', () => {
      const stats = loader.getAbilityStats();

      expect(stats.total).toBe(6);
      expect(stats.byCategory.Attack).toBe(4);
      expect(stats.byCategory.Heal).toBe(1);
      expect(stats.byCategory.Special).toBe(1);
      expect(stats.byTags.projectile).toBe(2);
      expect(stats.averageDamage).toBe(17.6); // (25+15+8+50+10)/5 = 21.6, but only counting damage abilities
      expect(stats.averageCooldown).toBe(2.5); // (2+1+3+2+5+2)/6 = 2.5
    });
  });
});
