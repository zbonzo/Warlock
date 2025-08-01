/**
 * Service for fetching and caching game configuration from the server
 */
import axios, { AxiosResponse } from 'axios';
import { API_URL } from '../config/constants';
import { PlayerClass, PlayerRace, Ability } from '../types/shared';

interface BasicConfig {
  gameVersion: string;
  supportedFeatures: string[];
  [key: string]: any;
}

interface RaceAttribute {
  name: string;
  description: string;
  bonuses: Record<string, number>;
  [key: string]: any;
}

interface ClassAttribute {
  name: string;
  description: string;
  baseStats: Record<string, number>;
  [key: string]: any;
}

// Server response interfaces (what the API actually returns)
interface ServerRacesResponse {
  races: string[];
  raceAttributes: Record<string, RaceAttribute>;
  racialAbilities: Record<string, Ability>;
}

interface ServerClassesResponse {
  classes: string[];
  classAttributes: Record<string, ClassAttribute>;
}

// Client-side interfaces (what we want to use in the app)
interface RacesConfig {
  races: PlayerRace[];
  raceAttributes: Record<string, RaceAttribute>;
}

interface ClassesConfig {
  classes: PlayerClass[];
  classAttributes: Record<string, ClassAttribute>;
}

interface CompatibilityConfig {
  classToRaces: Record<string, string[]>;
  racesToClasses: Record<string, string[]>;
}

interface RacialAbilitiesConfig {
  [race: string]: Ability;
}

interface ClassAbilitiesResponse {
  abilities: Ability[];
}

/**
 * Cache for configuration data fetched from the server
 * This prevents unnecessary repeated API calls
 */
interface ConfigCache {
  basic: BasicConfig | null;
  races: RacesConfig | null;
  classes: ClassesConfig | null;
  compatibility: CompatibilityConfig | null;
  racialAbilities: RacialAbilitiesConfig | null;
  classAbilities: Record<string, Ability[]>;
}

const configCache: ConfigCache = {
  basic: null,
  races: null,
  classes: null,
  compatibility: null,
  racialAbilities: null,
  classAbilities: {},
};

/**
 * Configuration service for loading and accessing game configuration
 */
const configService = {
  /**
   * Get basic game configuration
   */
  async getBasicConfig(forceRefresh: boolean = false): Promise<BasicConfig> {
    if (configCache.basic && !forceRefresh) return configCache.basic;

    try {
      const response: AxiosResponse<BasicConfig> = await axios.get(`${API_URL}/config`);
      configCache.basic = response.data;
      return configCache.basic;
    } catch (error) {
      console.error('Failed to load basic config:', error);
      throw error;
    }
  },

  /**
   * Get races configuration
   */
  async getRaces(): Promise<RacesConfig> {
    if (configCache.races) return configCache.races;

    try {
      const response: AxiosResponse<ServerRacesResponse> = await axios.get(`${API_URL}/config/races`);
      
      // Transform server response to client format
      const transformedData: RacesConfig = {
        races: response.data.races.map(raceName => ({
          id: raceName,
          name: raceName,
          description: response.data.raceAttributes[raceName]?.description || '',
          attributes: response.data.raceAttributes[raceName] || {}
        })),
        raceAttributes: response.data.raceAttributes
      };

      configCache.races = transformedData;
      return configCache.races;
    } catch (error) {
      console.error('Failed to load races config:', error);
      throw error;
    }
  },

  /**
   * Get classes configuration
   */
  async getClasses(): Promise<ClassesConfig> {
    if (configCache.classes) return configCache.classes;

    try {
      const response: AxiosResponse<ServerClassesResponse> = await axios.get(`${API_URL}/config/classes`);
      
      // Transform server response to client format
      const transformedData: ClassesConfig = {
        classes: response.data.classes.map(className => ({
          id: className,
          name: className,
          description: response.data.classAttributes[className]?.description || '',
          abilities: [], // Will be populated separately when needed
          attributes: response.data.classAttributes[className] || {}
        })),
        classAttributes: response.data.classAttributes
      };

      configCache.classes = transformedData;
      return configCache.classes;
    } catch (error) {
      console.error('Failed to load classes config:', error);
      throw error;
    }
  },

  /**
   * Get race-class compatibility mappings
   */
  async getCompatibility(): Promise<CompatibilityConfig> {
    if (configCache.compatibility) return configCache.compatibility;

    try {
      const response: AxiosResponse<CompatibilityConfig> = await axios.get(`${API_URL}/config/compatibility`);
      configCache.compatibility = response.data;
      return configCache.compatibility;
    } catch (error) {
      console.error('Failed to load compatibility config:', error);
      throw error;
    }
  },

  /**
   * Get racial abilities configuration
   */
  async getRacialAbilities(): Promise<RacialAbilitiesConfig> {
    if (configCache.racialAbilities) return configCache.racialAbilities;

    try {
      const response: AxiosResponse<RacialAbilitiesConfig> = await axios.get(`${API_URL}/config/racial-abilities`);
      configCache.racialAbilities = response.data;
      return configCache.racialAbilities;
    } catch (error) {
      console.error('Failed to load racial abilities config:', error);
      throw error;
    }
  },

  /**
   * Get abilities for a specific class
   */
  async getClassAbilities(className: string): Promise<Ability[]> {
    if (configCache.classAbilities[className]) {
      return configCache.classAbilities[className];
    }

    try {
      const response: AxiosResponse<ClassAbilitiesResponse> = await axios.get(
        `${API_URL}/config/abilities/${className}`
      );
      configCache.classAbilities[className] = response.data.abilities;
      return configCache.classAbilities[className];
    } catch (error) {
      console.error(`Failed to load abilities for ${className}:`, error);
      throw error;
    }
  },

  /**
   * Preload all basic configuration at application startup
   */
  async preloadConfig(): Promise<boolean> {
    try {
      // Load all basic configuration in parallel
      await Promise.all([
        this.getBasicConfig(),
        this.getRaces(),
        this.getClasses(),
        this.getCompatibility(),
        this.getRacialAbilities(),
      ]);

      console.log('Configuration preloaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to preload configuration:', error);
      throw error;
    }
  },

  /**
   * Check if a race and class combination is valid
   * Uses cached compatibility data if available
   */
  isValidRaceClassCombo(race: string, className: string): boolean {
    if (!configCache.compatibility) {
      console.warn(
        'Compatibility data not loaded, cannot validate combination'
      );
      return false;
    }

    return (
      configCache.compatibility.classToRaces[className]?.includes(race) || false
    );
  },

  /**
   * Get compatible classes for a race
   */
  getCompatibleClasses(race: string): string[] | null {
    if (!configCache.compatibility) {
      console.warn(
        'Compatibility data not loaded, cannot get compatible classes'
      );
      return null;
    }

    return configCache.compatibility.racesToClasses[race] || [];
  },

  /**
   * Get compatible races for a class
   */
  getCompatibleRaces(className: string): string[] | null {
    if (!configCache.compatibility) {
      console.warn(
        'Compatibility data not loaded, cannot get compatible races'
      );
      return null;
    }

    return configCache.compatibility.classToRaces[className] || [];
  },

  /**
   * Get racial ability for a specific race
   */
  getRacialAbility(race: string): Ability | null {
    if (!configCache.racialAbilities) {
      console.warn('Racial abilities not loaded, cannot get ability');
      return null;
    }

    return configCache.racialAbilities[race] || null;
  },

  /**
   * Clear the cache (useful for testing or forced refreshes)
   */
  clearCache(): void {
    configCache.basic = null;
    configCache.races = null;
    configCache.classes = null;
    configCache.compatibility = null;
    configCache.racialAbilities = null;
    configCache.classAbilities = {};
  },
};

export default configService;
