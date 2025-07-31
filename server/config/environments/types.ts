/**
 * @fileoverview Types for environment configuration
 */

export interface RateLimitConfig {
  limit: number;
  window: number;
}

export interface RateLimiting {
  defaultLimit: number;
  defaultTimeWindow: number;
  actionLimits: {
    createGame: RateLimitConfig;
    joinGame: RateLimitConfig;
    performAction: RateLimitConfig;
  };
}

export interface ActionCooldowns {
  createGame: number;
  joinGame: number;
  playerReady: number;
}

export interface DebugConfig {
  logAllEvents: boolean;
  showDetailedErrors: boolean;
  enableTestEndpoints: boolean;
}

export interface SecurityConfig {
  enableRateLimiting: boolean;
  logSuspiciousActivity: boolean;
  maxConnectionsPerIP: number;
}

export interface PerformanceConfig {
  enableGzip: boolean;
  enableEtag: boolean;
  cacheStaticFiles: boolean;
  cacheExpiry: number;
}

export interface DatabaseConfig {
  inMemory: boolean;
  logging: boolean;
}

export interface TestingConfig {
  enableTestHelpers: boolean;
  mockNetworkDelay: number;
  controlledRandomSeed: number;
  skipAnimations: boolean;
  forceExecutionOrder: boolean;
  automaticCleanup: boolean;
}

export interface EnvironmentConfig {
  // Logging
  logLevel?: string;

  // Timeouts
  gameTimeout?: number;
  roundTimeout?: number;

  // Action cooldowns
  actionCooldowns?: ActionCooldowns;

  // Game settings
  minPlayers?: number;
  maxPlayers?: number;

  // Rate limiting
  rateLimiting?: RateLimiting;

  // CORS settings
  corsOrigins?: string | string[];

  // Debug features
  debug?: DebugConfig;

  // Server settings
  port?: number;
  host?: string;

  // Production-specific settings
  security?: SecurityConfig;
  performance?: PerformanceConfig;
  maxGames?: number;
  serverMemoryThreshold?: number;

  // Test-specific settings
  enableRandomness?: boolean;
  database?: DatabaseConfig;
  testing?: TestingConfig;
}