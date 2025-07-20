/**
 * Utility for managing socket reconnection and character persistence
 */

const STORAGE_KEYS = {
  RECONNECTION_ENABLED: 'warlock_reconnection_enabled',
  CHARACTER_DATA: 'warlock_character_data',
  SOCKET_ID: 'warlock_socket_id',
  GAME_CODE: 'warlock_game_code'
};

export const reconnectionStorage = {
  /**
   * Get reconnection prevention toggle state
   * @returns {boolean} True if reconnection is enabled (default)
   */
  getReconnectionEnabled() {
    const stored = localStorage.getItem(STORAGE_KEYS.RECONNECTION_ENABLED);
    return stored !== null ? JSON.parse(stored) : true; // Default to enabled
  },

  /**
   * Set reconnection prevention toggle state
   * @param {boolean} enabled - Whether reconnection should be enabled
   */
  setReconnectionEnabled(enabled) {
    localStorage.setItem(STORAGE_KEYS.RECONNECTION_ENABLED, JSON.stringify(enabled));
  },

  /**
   * Save character data for reconnection
   * @param {Object} characterData - Character information
   * @param {string} socketId - Current socket ID
   * @param {string} gameCode - Game code
   */
  saveCharacterSession(characterData, socketId, gameCode) {
    if (!this.getReconnectionEnabled()) {
      return; // Don't save if reconnection is disabled
    }

    const sessionData = {
      character: characterData,
      socketId,
      gameCode,
      timestamp: Date.now()
    };

    localStorage.setItem(STORAGE_KEYS.CHARACTER_DATA, JSON.stringify(sessionData));
  },

  /**
   * Get saved character session data
   * @returns {Object|null} Saved session data or null
   */
  getCharacterSession() {
    if (!this.getReconnectionEnabled()) {
      return null; // Don't return data if reconnection is disabled
    }

    const stored = localStorage.getItem(STORAGE_KEYS.CHARACTER_DATA);
    if (!stored) return null;

    try {
      const sessionData = JSON.parse(stored);
      
      // Check if session is too old (older than 1 hour)
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - sessionData.timestamp > oneHour) {
        this.clearCharacterSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Error parsing character session data:', error);
      this.clearCharacterSession();
      return null;
    }
  },

  /**
   * Clear saved character session
   */
  clearCharacterSession() {
    localStorage.removeItem(STORAGE_KEYS.CHARACTER_DATA);
  },

  /**
   * Update socket ID for current session
   * @param {string} socketId - New socket ID
   */
  updateSocketId(socketId) {
    const session = this.getCharacterSession();
    if (session) {
      session.socketId = socketId;
      session.timestamp = Date.now();
      localStorage.setItem(STORAGE_KEYS.CHARACTER_DATA, JSON.stringify(session));
    }
  },

  /**
   * Check if there's a valid session to reconnect to
   * @returns {boolean}
   */
  hasValidSession() {
    return this.getCharacterSession() !== null;
  }
};

export default reconnectionStorage;