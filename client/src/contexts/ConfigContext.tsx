/**
 * React context for providing game configuration throughout the application
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import configService from '../services/configService';
import { PlayerClass, PlayerRace, Ability } from '../../../shared/types';

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

interface GameConfig {
  loaded: boolean;
  races: PlayerRace[];
  classes: PlayerClass[];
  raceAttributes: Record<string, RaceAttribute>;
  classAttributes: Record<string, ClassAttribute>;
  racialAbilities: Record<string, Ability>;
  compatibility: {
    classToRaces: Record<string, string[]>;
    racesToClasses: Record<string, string[]>;
  };
}

interface ConfigContextValue {
  loading: boolean;
  error: string | null;
  config: GameConfig;
  isValidRaceClassCombo: (race: string, className: string) => boolean;
  getCompatibleClasses: (race: string) => string[] | null;
  getCompatibleRaces: (className: string) => string[] | null;
  getRacialAbility: (race: string) => Ability | null;
  getClassAbilities: (className: string) => Promise<Ability[]>;
}

// Create context
const ConfigContext = createContext<ConfigContextValue | null>(null);

interface ConfigProviderProps {
  children: ReactNode;
}

/**
 * Configuration provider component
 * Loads configuration data and provides it to the application
 */
export function ConfigProvider({ children }: ConfigProviderProps): React.ReactElement {
  // State for managing configuration loading
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GameConfig>({
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
    const loadConfiguration = async (): Promise<void> => {
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
      } catch (error: any) {
        console.error('Failed to load configuration:', error);
        console.error('Error details:', error.response?.data || error);
        setError(error.message || 'Failed to load game configuration');
        setLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  // Derived helper functions (for convenience in consuming components)
  const helpers = {
    isValidRaceClassCombo: (race: string, className: string): boolean => {
      return configService.isValidRaceClassCombo(race, className);
    },

    getCompatibleClasses: (race: string): string[] | null => {
      return configService.getCompatibleClasses(race);
    },

    getCompatibleRaces: (className: string): string[] | null => {
      return configService.getCompatibleRaces(className);
    },

    getRacialAbility: (race: string): Ability | null => {
      return configService.getRacialAbility(race);
    },

    // Fetch class abilities (this is async so we don't pre-cache all of them)
    getClassAbilities: async (className: string): Promise<Ability[]> => {
      return await configService.getClassAbilities(className);
    },
  };

  // Provide both configuration data and helper functions
  const value: ConfigContextValue = {
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
 */
export function useConfig(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (context === null) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

export default ConfigContext;
