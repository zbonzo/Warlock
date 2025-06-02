/**
 * client/src/contexts/ConfigContext.js
 * React context for providing game configuration throughout the application
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import configService from '../services/configService';

// Create context
const ConfigContext = createContext(null);

/**
 * Configuration provider component
 * Loads configuration data and provides it to the application
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
export function ConfigProvider({ children }) {
  // State for managing configuration loading
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState({
    loaded: false,
    races: [],
    classes: [],
    raceAttributes: {},
    classAttributes: {},
    racialAbilities: {},
    compatibility: {
      classToRaces: {},
      racesToClasses: {},
    },
  });

  // Load configuration on component mount
  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        setLoading(true);

        // Preload all basic configuration
        await configService.preloadConfig();

        // Get specific configuration objects
        const basicConfig = await configService.getBasicConfig();
        const racesConfig = await configService.getRaces();
        const classesConfig = await configService.getClasses();
        const compatibilityConfig = await configService.getCompatibility();
        const racialAbilitiesConfig = await configService.getRacialAbilities();

        // Combine all configuration
        setConfig({
          loaded: true,
          ...basicConfig,
          races: racesConfig.races,
          raceAttributes: racesConfig.raceAttributes,
          classes: classesConfig.classes,
          classAttributes: classesConfig.classAttributes,
          racialAbilities: racialAbilitiesConfig,
          compatibility: compatibilityConfig,
        });

        setLoading(false);
      } catch (error) {
        console.error('Failed to load configuration:', error);
        setError(error.message || 'Failed to load game configuration');
        setLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  // Derived helper functions (for convenience in consuming components)
  const helpers = {
    isValidRaceClassCombo: (race, className) => {
      return configService.isValidRaceClassCombo(race, className);
    },

    getCompatibleClasses: (race) => {
      return configService.getCompatibleClasses(race);
    },

    getCompatibleRaces: (className) => {
      return configService.getCompatibleRaces(className);
    },

    getRacialAbility: (race) => {
      return configService.getRacialAbility(race);
    },

    // Fetch class abilities (this is async so we don't pre-cache all of them)
    getClassAbilities: async (className) => {
      return await configService.getClassAbilities(className);
    },
  };

  // Provide both configuration data and helper functions
  const value = {
    loading,
    error,
    config,
    ...helpers,
  };

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

/**
 * Hook for accessing game configuration
 * @returns {Object} Config context value
 */
export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

export default ConfigContext;

