/**
 * client/src/services/configService.js
 * Service for fetching and caching game configuration from the server
 */
import axios from 'axios';
import { API_URL } from '../config/constants';

/**
 * Cache for configuration data fetched from the server
 * This prevents unnecessary repeated API calls
 */
const configCache = {
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
   * @returns {Promise<Object>} Basic game configuration
   */
  async getBasicConfig() {
    if (configCache.basic) return configCache.basic;

    try {
      const response = await axios.get(`${API_URL}/config`);
      configCache.basic = response.data;
      return configCache.basic;
    } catch (error) {
      console.error('Failed to load basic config:', error);
      throw error;
    }
  },

  /**
   * Get races configuration
   * @returns {Promise<Object>} Races configuration
   */
  async getRaces() {
    if (configCache.races) return configCache.races;

    try {
      const response = await axios.get(`${API_URL}/config/races`);
      configCache.races = response.data;
      return configCache.races;
    } catch (error) {
      console.error('Failed to load races config:', error);
      throw error;
    }
  },

  /**
   * Get classes configuration
   * @returns {Promise<Object>} Classes configuration
   */
  async getClasses() {
    if (configCache.classes) return configCache.classes;

    try {
      const response = await axios.get(`${API_URL}/config/classes`);
      configCache.classes = response.data;
      return configCache.classes;
    } catch (error) {
      console.error('Failed to load classes config:', error);
      throw error;
    }
  },

  /**
   * Get race-class compatibility mappings
   * @returns {Promise<Object>} Compatibility mappings
   */
  async getCompatibility() {
    if (configCache.compatibility) return configCache.compatibility;

    try {
      const response = await axios.get(`${API_URL}/config/compatibility`);
      configCache.compatibility = response.data;
      return configCache.compatibility;
    } catch (error) {
      console.error('Failed to load compatibility config:', error);
      throw error;
    }
  },

  /**
   * Get racial abilities configuration
   * @returns {Promise<Object>} Racial abilities configuration
   */
  async getRacialAbilities() {
    if (configCache.racialAbilities) return configCache.racialAbilities;

    try {
      const response = await axios.get(`${API_URL}/config/racial-abilities`);
      configCache.racialAbilities = response.data;
      return configCache.racialAbilities;
    } catch (error) {
      console.error('Failed to load racial abilities config:', error);
      throw error;
    }
  },

  /**
   * Get abilities for a specific class
   * @param {string} className - Class name
   * @returns {Promise<Array>} Class abilities
   */
  async getClassAbilities(className) {
    if (configCache.classAbilities[className]) {
      return configCache.classAbilities[className];
    }

    try {
      const response = await axios.get(
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
   * @returns {Promise<boolean>} Success status
   */
  async preloadConfig() {
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
   *
   * @param {string} race - Race name
   * @param {string} className - Class name
   * @returns {boolean} Whether the combination is valid
   */
  isValidRaceClassCombo(race, className) {
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
   * @param {string} race - Race name
   * @returns {Array<string>|null} Compatible class names or null if data not loaded
   */
  getCompatibleClasses(race) {
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
   * @param {string} className - Class name
   * @returns {Array<string>|null} Compatible race names or null if data not loaded
   */
  getCompatibleRaces(className) {
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
   * @param {string} race - Race name
   * @returns {Object|null} Racial ability or null if not found
   */
  getRacialAbility(race) {
    if (!configCache.racialAbilities) {
      console.warn('Racial abilities not loaded, cannot get ability');
      return null;
    }

    return configCache.racialAbilities[race] || null;
  },

  /**
   * Clear the cache (useful for testing or forced refreshes)
   */
  clearCache() {
    configCache.basic = null;
    configCache.races = null;
    configCache.classes = null;
    configCache.compatibility = null;
    configCache.racialAbilities = null;
    configCache.classAbilities = {};
  },
};

export default configService;


