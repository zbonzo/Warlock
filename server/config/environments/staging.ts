/**
 * @fileoverview Staging environment configuration
 */
import { EnvironmentConfig } from './types';

const config: EnvironmentConfig = {
  logLevel: 'info',
  // More restrictive settings for production
  actionCooldowns: {
    createGame: 3000,
    joinGame: 1500,
    playerReady: 800
  },
};

export default config;