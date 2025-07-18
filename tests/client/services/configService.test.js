/**
 * @fileoverview Tests for configService
 * Tests API calls, caching, and error handling
 */

import axios from 'axios';
import configService from '@client/services/configService';
import { API_URL } from '@client/config/constants';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('configService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the cache before each test
    configService.clearCache();
  });

  describe('getBasicConfig', () => {
    it('should fetch basic config successfully', async () => {
      const mockResponse = {
        data: {
          minPlayers: 2,
          maxPlayers: 20,
          version: '1.0.0'
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await configService.getBasicConfig();

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/config`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should use cached config on subsequent calls', async () => {
      const mockResponse = {
        data: { minPlayers: 2, maxPlayers: 20 }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      // First call
      await configService.getBasicConfig();
      // Second call
      await configService.getBasicConfig();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const mockResponse = {
        data: { minPlayers: 2, maxPlayers: 20 }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      // First call
      await configService.getBasicConfig();
      // Second call with forceRefresh
      await configService.getBasicConfig(true);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(configService.getBasicConfig()).rejects.toThrow('Network Error');
    });
  });

  describe('getRaces', () => {
    it('should fetch races config successfully', async () => {
      const mockResponse = {
        data: {
          races: ['Artisan', 'Rockhewn', 'Lich'],
          raceAttributes: {
            Artisan: { description: 'Adaptable' }
          }
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await configService.getRaces();

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/config/races`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should use cached races on subsequent calls', async () => {
      const mockResponse = {
        data: { races: ['Artisan'] }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await configService.getRaces();
      await configService.getRaces();

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getClasses', () => {
    it('should fetch classes config successfully', async () => {
      const mockResponse = {
        data: {
          classes: ['Warrior', 'Wizard', 'Assassin'],
          classAttributes: {
            Warrior: { description: 'Tank' }
          }
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await configService.getClasses();

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/config/classes`);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCompatibility', () => {
    it('should fetch compatibility config successfully', async () => {
      const mockResponse = {
        data: {
          classToRaces: {
            Warrior: ['Artisan', 'Rockhewn']
          },
          racesToClasses: {
            Artisan: ['Warrior', 'Wizard']
          }
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await configService.getCompatibility();

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/config/compatibility`);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getRacialAbilities', () => {
    it('should fetch racial abilities successfully', async () => {
      const mockResponse = {
        data: {
          Artisan: { type: 'adaptability', name: 'Adaptability' },
          Rockhewn: { type: 'stoneArmor', name: 'Stone Armor' }
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await configService.getRacialAbilities();

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/config/racial-abilities`);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getClassAbilities', () => {
    it('should fetch class abilities successfully', async () => {
      const mockResponse = {
        data: {
          abilities: [
            { type: 'slash', name: 'Slash', unlockAt: 1 },
            { type: 'shieldWall', name: 'Shield Wall', unlockAt: 2 }
          ]
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await configService.getClassAbilities('Warrior');

      expect(mockedAxios.get).toHaveBeenCalledWith(`${API_URL}/config/abilities/Warrior`);
      expect(result).toEqual(mockResponse.data.abilities);
    });

    it('should cache abilities per class', async () => {
      const mockResponse = {
        data: { abilities: [{ type: 'slash', name: 'Slash' }] }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await configService.getClassAbilities('Warrior');
      await configService.getClassAbilities('Warrior');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('preloadConfig', () => {
    it('should preload all configs in parallel', async () => {
      const mockResponses = {
        basic: { data: { minPlayers: 2 } },
        races: { data: { races: ['Artisan'] } },
        classes: { data: { classes: ['Warrior'] } },
        compatibility: { data: { classToRaces: {} } },
        racialAbilities: { data: { Artisan: {} } }
      };

      mockedAxios.get
        .mockResolvedValueOnce(mockResponses.basic)
        .mockResolvedValueOnce(mockResponses.races)
        .mockResolvedValueOnce(mockResponses.classes)
        .mockResolvedValueOnce(mockResponses.compatibility)
        .mockResolvedValueOnce(mockResponses.racialAbilities);

      const result = await configService.preloadConfig();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(5);
    });

    it('should handle preload errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Preload failed'));

      await expect(configService.preloadConfig()).rejects.toThrow('Preload failed');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      const mockResponse = { data: { minPlayers: 2 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      // Load some data
      await configService.getBasicConfig();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Clear cache
      configService.clearCache();

      // Load again - should make new request
      await configService.getBasicConfig();
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle 404 errors', async () => {
      const error = new Error('Not Found');
      error.response = { status: 404, data: { message: 'Not Found' } };
      mockedAxios.get.mockRejectedValue(error);

      await expect(configService.getBasicConfig()).rejects.toThrow('Not Found');
    });

    it('should handle 500 errors', async () => {
      const error = new Error('Internal Server Error');
      error.response = { status: 500, data: { message: 'Server Error' } };
      mockedAxios.get.mockRejectedValue(error);

      await expect(configService.getRaces()).rejects.toThrow('Internal Server Error');
    });

    it('should handle network timeouts', async () => {
      const error = new Error('Request timeout');
      error.code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(error);

      await expect(configService.getClasses()).rejects.toThrow('Request timeout');
    });
  });
});