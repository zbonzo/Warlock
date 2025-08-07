/**
 * @fileoverview Debug configuration for detailed logging and troubleshooting
 */

export interface DebugConfig {
  enabled: boolean;
  features: {
    gameStart: boolean;
    combat: boolean;
    roundResults: boolean;
    socketEvents: boolean;
    playerActions: boolean;
    statusEffects: boolean;
    abilityExecution: boolean;
    phaseTransitions: boolean;
    validation: boolean;
    eventBus: boolean;
  };
  levels: {
    verbose: boolean;
    info: boolean;
    warn: boolean;
    error: boolean;
  };
}

// Get debug settings from environment variables or use defaults
const getDebugEnabled = (): boolean => {
  const envDebug = process.env['DEBUG'];
  if (envDebug === 'true' || envDebug === '1') return true;
  if (envDebug === 'false' || envDebug === '0') return false;
  // Default to true in development, false in production
  return process.env['NODE_ENV'] === 'development';
};

const getFeatureFlag = (featureName: string, defaultValue: boolean): boolean => {
  const envVar = process.env[`DEBUG_${featureName.toUpperCase()}`];
  if (envVar === 'true' || envVar === '1') return true;
  if (envVar === 'false' || envVar === '0') return false;
  return defaultValue;
};

export const debugConfig: DebugConfig = {
  enabled: getDebugEnabled(),
  features: {
    gameStart: getFeatureFlag('GAME_START', false),
    combat: getFeatureFlag('COMBAT', true),
    roundResults: getFeatureFlag('ROUND_RESULTS', true),
    socketEvents: getFeatureFlag('SOCKET_EVENTS', false),
    playerActions: getFeatureFlag('PLAYER_ACTIONS', true),
    statusEffects: getFeatureFlag('STATUS_EFFECTS', false),
    abilityExecution: getFeatureFlag('ABILITY_EXECUTION', true),
    phaseTransitions: getFeatureFlag('PHASE_TRANSITIONS', true),
    validation: getFeatureFlag('VALIDATION', false),
    eventBus: getFeatureFlag('EVENT_BUS', false),
  },
  levels: {
    verbose: getFeatureFlag('LEVEL_VERBOSE', false),
    info: getFeatureFlag('LEVEL_INFO', true),
    warn: getFeatureFlag('LEVEL_WARN', true),
    error: getFeatureFlag('LEVEL_ERROR', true),
  }
};

/**
 * Debug logger wrapper that respects configuration
 */
export class DebugLogger {
  private feature: keyof DebugConfig['features'];
  private context: string;

  constructor(feature: keyof DebugConfig['features'], context: string) {
    this.feature = feature;
    this.context = context;
  }

  private shouldLog(level: keyof DebugConfig['levels'] = 'info'): boolean {
    return debugConfig.enabled && 
           debugConfig.features[this.feature] && 
           debugConfig.levels[level];
  }

  verbose(...args: any[]): void {
    if (this.shouldLog('verbose')) {
      console.log(`[DEBUG:${this.context}]`, ...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`[${this.context}]`, ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN:${this.context}]`, ...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR:${this.context}]`, ...args);
    }
  }

  debug(...args: any[]): void {
    // Alias for verbose
    this.verbose(...args);
  }
}

// Export a factory function for creating debug loggers
export const createDebugLogger = (
  feature: keyof DebugConfig['features'], 
  context: string
): DebugLogger => {
  return new DebugLogger(feature, context);
};