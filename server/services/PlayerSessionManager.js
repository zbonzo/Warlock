/**
 * @fileoverview Manages player session data and reconnection
 * Allows players to rejoin games after disconnection
 */
const logger = require('@utils/logger');
const config = require('@config');

/**
 * Class for managing player sessions and reconnection
 */
class PlayerSessionManager {
  constructor() {
    // Map of gameCode -> { playerName -> { socketId, lastActive, playerData } }
    this.sessions = new Map();

    // Map of socketId -> { gameCode, playerName }
    this.socketMap = new Map();

    this.reconnectionWindow = config.player.reconnectionWindow;

    // Setup cleanup interval (every 30 seconds)
    this.cleanupInterval = setInterval(() => this.cleanupSessions(), 30 * 1000);
  }

  /**
   * Register a new player session
   * @param {string} gameCode - Game code
   * @param {string} playerName - Player name
   * @param {string} socketId - Socket ID
   * @param {Object} playerData - Player data to preserve
   */
  registerSession(gameCode, playerName, socketId, playerData = {}) {
    // Create game entry if it doesn't exist
    if (!this.sessions.has(gameCode)) {
      this.sessions.set(gameCode, new Map());
    }

    const gameSession = this.sessions.get(gameCode);

    // Register the player in this game
    gameSession.set(playerName, {
      socketId,
      lastActive: Date.now(),
      playerData,
    });

    // Map the socket ID to the game code and player name
    this.socketMap.set(socketId, { gameCode, playerName });

    logger.debug(
      `Registered session for ${playerName} in game ${gameCode} with socket ${socketId}`
    );
  }

  /**
   * Update the socket ID for a player
   * @param {string} gameCode - Game code
   * @param {string} playerName - Player name
   * @param {string} newSocketId - New socket ID
   * @returns {Object|null} Previous session data if found, null otherwise
   */
  updateSocketId(gameCode, playerName, newSocketId) {
    if (!this.sessions.has(gameCode)) {
      return null;
    }

    const gameSession = this.sessions.get(gameCode);

    // If player exists in the game
    if (gameSession.has(playerName)) {
      const sessionData = gameSession.get(playerName);
      const oldSocketId = sessionData.socketId;

      // Remove old socket mapping
      this.socketMap.delete(oldSocketId);

      // Update with new socket ID
      sessionData.socketId = newSocketId;
      sessionData.lastActive = Date.now();

      // Add new socket mapping
      this.socketMap.set(newSocketId, { gameCode, playerName });

      logger.info(
        `Player ${playerName} reconnected to game ${gameCode} (${oldSocketId} -> ${newSocketId})`
      );

      return sessionData;
    }

    return null;
  }

  /**
   * Get session data for a player
   * @param {string} gameCode - Game code
   * @param {string} playerName - Player name
   * @returns {Object|null} Session data if found, null otherwise
   */
  getSession(gameCode, playerName) {
    if (!this.sessions.has(gameCode)) {
      return null;
    }

    const gameSession = this.sessions.get(gameCode);

    if (gameSession.has(playerName)) {
      const sessionData = gameSession.get(playerName);

      // Check if the session is still valid
      if (Date.now() - sessionData.lastActive <= this.reconnectionWindow) {
        return sessionData;
      } else {
        // Session expired
        gameSession.delete(playerName);
        this.socketMap.delete(sessionData.socketId);
        return null;
      }
    }

    return null;
  }

  /**
   * Update player data in session
   * @param {string} socketId - Socket ID
   * @param {Object} playerData - Updated player data
   * @returns {boolean} Success status
   */
  updatePlayerData(socketId, playerData) {
    const socketInfo = this.socketMap.get(socketId);

    if (!socketInfo) {
      return false;
    }

    const { gameCode, playerName } = socketInfo;
    const gameSession = this.sessions.get(gameCode);

    if (!gameSession || !gameSession.has(playerName)) {
      return false;
    }

    const sessionData = gameSession.get(playerName);
    sessionData.playerData = { ...sessionData.playerData, ...playerData };
    sessionData.lastActive = Date.now();

    return true;
  }

  /**
   * Handle player disconnection
   * @param {string} socketId - Socket ID
   * @returns {Object|null} Session info if player should be preserved, null otherwise
   */
  handleDisconnect(socketId) {
    const socketInfo = this.socketMap.get(socketId);

    if (!socketInfo) {
      return null;
    }

    const { gameCode, playerName } = socketInfo;
    logger.debug(`Player ${playerName} disconnected from game ${gameCode}`);

    // Don't remove from sessions yet - give the player time to reconnect
    // Just return the info so the game service knows about the disconnection
    return {
      gameCode,
      playerName,
      socketId,
    };
  }

  /**
   * Remove a player session
   * @param {string} gameCode - Game code
   * @param {string} playerName - Player name
   */
  removeSession(gameCode, playerName) {
    if (!this.sessions.has(gameCode)) {
      return;
    }

    const gameSession = this.sessions.get(gameCode);

    if (gameSession.has(playerName)) {
      const sessionData = gameSession.get(playerName);
      this.socketMap.delete(sessionData.socketId);
      gameSession.delete(playerName);

      // If this was the last player in the game, remove the game entry
      if (gameSession.size === 0) {
        this.sessions.delete(gameCode);
      }

      logger.debug(`Removed session for ${playerName} in game ${gameCode}`);
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupSessions() {
    const now = Date.now();

    // Iterate through all games
    for (const [gameCode, gameSession] of this.sessions.entries()) {
      // Players to remove
      const toRemove = [];

      // Check each player in the game
      for (const [playerName, sessionData] of gameSession.entries()) {
        if (now - sessionData.lastActive > this.reconnectionWindow) {
          toRemove.push(playerName);
          this.socketMap.delete(sessionData.socketId);
        }
      }

      // Remove expired players
      toRemove.forEach((playerName) => gameSession.delete(playerName));

      // If no more players in the game, remove the game
      if (gameSession.size === 0) {
        this.sessions.delete(gameCode);
      }
    }
  }

  /**
   * Clean up resources when shutting down
   */
  cleanup() {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    this.socketMap.clear();
  }
}

module.exports = new PlayerSessionManager();
