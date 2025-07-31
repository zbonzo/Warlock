/**
 * @fileoverview Tests for configService
 */
import axios from 'axios';
import configService from '../../../client/src/services/configService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  jest.clearAllMocks();
  configService.clearCache();
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

describe('configService', () => {
  const mockBasicConfig = {
    gameVersion: '1.0.0',
    supportedFeatures: ['feature1', 'feature2']
  };

  const mockRacesConfig = {
    races: [{ name: 'human', description: 'A human race' }],
    raceAttributes: {
      human: {
        name: 'Human',
        description: 'Versatile race',
        bonuses: { strength: 1 }
      }
    }
  };

  const mockClassesConfig = {
    classes: [{ name: 'warrior', description: 'A warrior class' }],
    classAttributes: {
      warrior: {
        name: 'Warrior',
        description: 'Combat specialist',
        baseStats: { hp: 100 }
      }
    }
  };

  const mockCompatibilityConfig = {
    classToRaces: {
      warrior: ['human', 'orc']
    },
    racesToClasses: {
      human: ['warrior', 'wizard']
    }
  };

  const mockRacialAbilities = {
    human: {
      type: 'adaptability',
      name: 'Adaptability',
      category: 'Racial' as const,
      description: 'Human adaptability'
    }
  };

  const mockClassAbilities = {
    abilities: [
      {
        type: 'slash',
        name: 'Slash',
        category: 'Attack' as const,
        description: 'Basic attack'
      }
    ]
  };

  describe('getBasicConfig', () => {
    it('should fetch and cache basic config', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockBasicConfig });

      const result = await configService.getBasicConfig();

      expect(result).toEqual(mockBasicConfig);
      expect(mockedAxios.get).toHaveBeenCalledWith('undefined/config');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const cachedResult = await configService.getBasicConfig();
      expect(cachedResult).toEqual(mockBasicConfig);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should force refresh when requested', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockBasicConfig });
      await configService.getBasicConfig();

      const updatedConfig = { ...mockBasicConfig, gameVersion: '2.0.0' };
      mockedAxios.get.mockResolvedValueOnce({ data: updatedConfig });

      const result = await configService.getBasicConfig(true);

      expect(result).toEqual(updatedConfig);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('Network error');
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(configService.getBasicConfig()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Failed to load basic config:', error);
    });
  });

  describe('getRaces', () => {
    it('should fetch and cache races config', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRacesConfig });

      const result = await configService.getRaces();

      expect(result).toEqual(mockRacesConfig);
      expect(mockedAxios.get).toHaveBeenCalledWith('undefined/config/races');
    });

    it('should handle API errors', async () => {
      const error = new Error('API error');
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(configService.getRaces()).rejects.toThrow('API error');
      expect(console.error).toHaveBeenCalledWith('Failed to load races config:', error);
    });
  });

  describe('getClasses', () => {
    it('should fetch and cache classes config', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockClassesConfig });

      const result = await configService.getClasses();

      expect(result).toEqual(mockClassesConfig);
      expect(mockedAxios.get).toHaveBeenCalledWith('undefined/config/classes');
    });
  });

  describe('getCompatibility', () => {
    it('should fetch and cache compatibility config', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockCompatibilityConfig });

      const result = await configService.getCompatibility();

      expect(result).toEqual(mockCompatibilityConfig);
      expect(mockedAxios.get).toHaveBeenCalledWith('undefined/config/compatibility');
    });
  });

  describe('getRacialAbilities', () => {
    it('should fetch and cache racial abilities', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRacialAbilities });

      const result = await configService.getRacialAbilities();

      expect(result).toEqual(mockRacialAbilities);
      expect(mockedAxios.get).toHaveBeenCalledWith('undefined/config/racial-abilities');
    });
  });

  describe('getClassAbilities', () => {
    it('should fetch and cache class abilities', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockClassAbilities });

      const result = await configService.getClassAbilities('warrior');

      expect(result).toEqual(mockClassAbilities.abilities);
      expect(mockedAxios.get).toHaveBeenCalledWith('undefined/config/abilities/warrior');
    });

    it('should cache abilities per class', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockClassAbilities });
      
      await configService.getClassAbilities('warrior');
      const cachedResult = await configService.getClassAbilities('warrior');

      expect(cachedResult).toEqual(mockClassAbilities.abilities);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors for class abilities', async () => {
      const error = new Error('Class not found');
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(configService.getClassAbilities('invalidClass')).rejects.toThrow('Class not found');
      expect(console.error).toHaveBeenCalledWith('Failed to load abilities for invalidClass:', error);
    });
  });

  describe('preloadConfig', () => {
    it('should preload all basic configuration', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: mockBasicConfig })
        .mockResolvedValueOnce({ data: mockRacesConfig })
        .mockResolvedValueOnce({ data: mockClassesConfig })
        .mockResolvedValueOnce({ data: mockCompatibilityConfig })
        .mockResolvedValueOnce({ data: mockRacialAbilities });

      const result = await configService.preloadConfig();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(5);
      expect(console.log).toHaveBeenCalledWith('Configuration preloaded successfully');
    });

    it('should handle preload errors', async () => {
      const error = new Error('Preload failed');
      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(configService.preloadConfig()).rejects.toThrow('Preload failed');
      expect(console.error).toHaveBeenCalledWith('Failed to preload configuration:', error);
    });
  });

  describe('compatibility helpers', () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockCompatibilityConfig });
      await configService.getCompatibility();
    });

    describe('isValidRaceClassCombo', () => {
      it('should return true for valid combinations', () => {
        const result = configService.isValidRaceClassCombo('human', 'warrior');
        expect(result).toBe(true);
      });

      it('should return false for invalid combinations', () => {
        const result = configService.isValidRaceClassCombo('elf', 'warrior');
        expect(result).toBe(false);
      });

      it('should return false when compatibility data not loaded', () => {
        configService.clearCache();
        const result = configService.isValidRaceClassCombo('human', 'warrior');
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
          'Compatibility data not loaded, cannot validate combination'
        );
      });
    });

    describe('getCompatibleClasses', () => {
      it('should return compatible classes for a race', () => {
        const result = configService.getCompatibleClasses('human');
        expect(result).toEqual(['warrior', 'wizard']);
      });

      it('should return empty array for unknown race', () => {
        const result = configService.getCompatibleClasses('unknown');
        expect(result).toEqual([]);
      });

      it('should return null when compatibility data not loaded', () => {
        configService.clearCache();
        const result = configService.getCompatibleClasses('human');
        expect(result).toBe(null);
        expect(console.warn).toHaveBeenCalledWith(
          'Compatibility data not loaded, cannot get compatible classes'
        );
      });
    });

    describe('getCompatibleRaces', () => {
      it('should return compatible races for a class', () => {
        const result = configService.getCompatibleRaces('warrior');
        expect(result).toEqual(['human', 'orc']);
      });

      it('should return empty array for unknown class', () => {
        const result = configService.getCompatibleRaces('unknown');
        expect(result).toEqual([]);
      });

      it('should return null when compatibility data not loaded', () => {
        configService.clearCache();
        const result = configService.getCompatibleRaces('warrior');
        expect(result).toBe(null);
        expect(console.warn).toHaveBeenCalledWith(
          'Compatibility data not loaded, cannot get compatible races'
        );
      });
    });
  });

  describe('getRacialAbility', () => {
    beforeEach(async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockRacialAbilities });
      await configService.getRacialAbilities();
    });

    it('should return racial ability for valid race', () => {
      const result = configService.getRacialAbility('human');
      expect(result).toEqual(mockRacialAbilities.human);
    });

    it('should return null for unknown race', () => {
      const result = configService.getRacialAbility('unknown');
      expect(result).toBe(null);
    });

    it('should return null when racial abilities not loaded', () => {
      configService.clearCache();
      const result = configService.getRacialAbility('human');
      expect(result).toBe(null);
      expect(console.warn).toHaveBeenCalledWith('Racial abilities not loaded, cannot get ability');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      // Load some data first
      mockedAxios.get.mockResolvedValueOnce({ data: mockBasicConfig });
      await configService.getBasicConfig();

      configService.clearCache();

      // Next call should fetch again
      mockedAxios.get.mockResolvedValueOnce({ data: mockBasicConfig });
      await configService.getBasicConfig();

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});