/**
 * @fileoverview Staging environment configuration
 */
module.exports = {
  logLevel: 'info',
  // More restrictive settings for production
  actionCooldowns: {
    createGame: 3000,
    joinGame: 1500,
    playerReady: 800
  },
};