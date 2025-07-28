/**
 * Utility for managing socket reconnection and character persistence
 */

interface StorageKeys {
  RECONNECTION_ENABLED: string;
  CHARACTER_DATA: string;
  SOCKET_ID: string;
  GAME_CODE: string;
}

interface CharacterSessionData {
  character: any; // Could be typed more specifically based on character data structure
  socketId: string;
  gameCode: string;
  timestamp: number;
}

const STORAGE_KEYS: StorageKeys = {
  RECONNECTION_ENABLED: 'warlock_reconnection_enabled',
  CHARACTER_DATA: 'warlock_character_data',
  SOCKET_ID: 'warlock_socket_id',
  GAME_CODE: 'warlock_game_code'
};

export const reconnectionStorage = {
  /**
   * Get reconnection prevention toggle state
   */
  getReconnectionEnabled(): boolean {
    const stored = localStorage.getItem(STORAGE_KEYS.RECONNECTION_ENABLED);
    return stored !== null ? JSON.parse(stored) : true; // Default to enabled
  },

  /**
   * Set reconnection prevention toggle state
   */
  setReconnectionEnabled(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEYS.RECONNECTION_ENABLED, JSON.stringify(enabled));
  },

  /**
   * Save character data for reconnection
   */
  saveCharacterSession(characterData: any, socketId: string, gameCode: string): void {
    if (!this.getReconnectionEnabled()) {
      return; // Don't save if reconnection is disabled
    }

    const sessionData: CharacterSessionData = {
      character: characterData,
      socketId,
      gameCode,
      timestamp: Date.now()
    };

    localStorage.setItem(STORAGE_KEYS.CHARACTER_DATA, JSON.stringify(sessionData));
  },

  /**
   * Get saved character session data
   */
  getCharacterSession(): CharacterSessionData | null {
    if (!this.getReconnectionEnabled()) {
      return null; // Don't return data if reconnection is disabled
    }

    const stored = localStorage.getItem(STORAGE_KEYS.CHARACTER_DATA);
    if (!stored) return null;

    try {
      const sessionData: CharacterSessionData = JSON.parse(stored);
      
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
  clearCharacterSession(): void {
    localStorage.removeItem(STORAGE_KEYS.CHARACTER_DATA);
  },

  /**
   * Update socket ID for current session
   */
  updateSocketId(socketId: string): void {
    const session = this.getCharacterSession();
    if (session) {
      session.socketId = socketId;
      session.timestamp = Date.now();
      localStorage.setItem(STORAGE_KEYS.CHARACTER_DATA, JSON.stringify(session));
    }
  },

  /**
   * Check if there's a valid session to reconnect to
   */
  hasValidSession(): boolean {
    return this.getCharacterSession() !== null;
  }
};

export default reconnectionStorage;
