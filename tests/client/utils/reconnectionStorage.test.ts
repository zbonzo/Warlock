/**
 * @fileoverview Tests for reconnectionStorage utility
 * Tests socket reconnection and character persistence logic
 */

import { reconnectionStorage } from '@client/utils/reconnectionStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null)
  };
})();

// Mock console.error to avoid noise in tests
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('reconnectionStorage utility', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    // Reset Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getReconnectionEnabled', () => {
    it('should return true by default when no value is stored', () => {
      expect(reconnectionStorage.getReconnectionEnabled()).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('warlock_reconnection_enabled');
    });

    it('should return stored boolean value when present', () => {
      localStorageMock.setItem('warlock_reconnection_enabled', 'false');
      expect(reconnectionStorage.getReconnectionEnabled()).toBe(false);

      localStorageMock.setItem('warlock_reconnection_enabled', 'true');
      expect(reconnectionStorage.getReconnectionEnabled()).toBe(true);
    });

    it('should handle JSON parsing of stored value', () => {
      // Test that it properly parses JSON boolean values
      localStorageMock.setItem('warlock_reconnection_enabled', JSON.stringify(false));
      expect(reconnectionStorage.getReconnectionEnabled()).toBe(false);

      localStorageMock.setItem('warlock_reconnection_enabled', JSON.stringify(true));
      expect(reconnectionStorage.getReconnectionEnabled()).toBe(true);
    });
  });

  describe('setReconnectionEnabled', () => {
    it('should store boolean value as JSON string', () => {
      reconnectionStorage.setReconnectionEnabled(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('warlock_reconnection_enabled', 'true');

      reconnectionStorage.setReconnectionEnabled(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('warlock_reconnection_enabled', 'false');
    });

    it('should affect subsequent getReconnectionEnabled calls', () => {
      reconnectionStorage.setReconnectionEnabled(false);
      expect(reconnectionStorage.getReconnectionEnabled()).toBe(false);

      reconnectionStorage.setReconnectionEnabled(true);
      expect(reconnectionStorage.getReconnectionEnabled()).toBe(true);
    });
  });

  describe('saveCharacterSession', () => {
    const mockCharacterData = {
      name: 'TestPlayer',
      race: 'Artisan',
      class: 'Warrior',
      level: 2
    };
    const mockSocketId = 'socket123';
    const mockGameCode = 'GAME456';

    it('should save character session when reconnection is enabled', () => {
      reconnectionStorage.setReconnectionEnabled(true);

      reconnectionStorage.saveCharacterSession(mockCharacterData, mockSocketId, mockGameCode);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'warlock_character_data',
        JSON.stringify({
          character: mockCharacterData,
          socketId: mockSocketId,
          gameCode: mockGameCode,
          timestamp: 1000000
        })
      );
    });

    it('should not save character session when reconnection is disabled', () => {
      reconnectionStorage.setReconnectionEnabled(false);

      reconnectionStorage.saveCharacterSession(mockCharacterData, mockSocketId, mockGameCode);

      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'warlock_character_data',
        expect.any(String)
      );
    });

    it('should include current timestamp in saved data', () => {
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      reconnectionStorage.setReconnectionEnabled(true);
      reconnectionStorage.saveCharacterSession(mockCharacterData, mockSocketId, mockGameCode);

      const savedData = JSON.parse(
        (localStorageMock.setItem as jest.Mock).mock.calls.find(
          call => call[0] === 'warlock_character_data'
        )?.[1] || '{}'
      );

      expect(savedData.timestamp).toBe(mockTimestamp);
    });
  });

  describe('getCharacterSession', () => {
    const mockSessionData = {
      character: { name: 'TestPlayer', race: 'Artisan' },
      socketId: 'socket123',
      gameCode: 'GAME456',
      timestamp: 1000000
    };

    it('should return null when reconnection is disabled', () => {
      reconnectionStorage.setReconnectionEnabled(false);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(mockSessionData));

      const result = reconnectionStorage.getCharacterSession();
      expect(result).toBeNull();
    });

    it('should return null when no data is stored', () => {
      reconnectionStorage.setReconnectionEnabled(true);

      const result = reconnectionStorage.getCharacterSession();
      expect(result).toBeNull();
    });

    it('should return stored session data when valid', () => {
      reconnectionStorage.setReconnectionEnabled(true);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(mockSessionData));

      const result = reconnectionStorage.getCharacterSession();
      expect(result).toEqual(mockSessionData);
    });

    it('should clear expired session data (older than 1 hour)', () => {
      const expiredTimestamp = 1000000 - ((60 * 60 * 1000) + 1); // 1 hour + 1ms ago
      const expiredSessionData = { ...mockSessionData, timestamp: expiredTimestamp };

      reconnectionStorage.setReconnectionEnabled(true);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(expiredSessionData));

      const result = reconnectionStorage.getCharacterSession();

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('warlock_character_data');
    });

    it('should return valid session data within 1 hour', () => {
      const recentTimestamp = 1000000 - (30 * 60 * 1000); // 30 minutes ago
      const recentSessionData = { ...mockSessionData, timestamp: recentTimestamp };

      reconnectionStorage.setReconnectionEnabled(true);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(recentSessionData));

      const result = reconnectionStorage.getCharacterSession();
      expect(result).toEqual(recentSessionData);
    });

    it('should handle malformed JSON data', () => {
      reconnectionStorage.setReconnectionEnabled(true);
      localStorageMock.setItem('warlock_character_data', 'invalid json');

      const result = reconnectionStorage.getCharacterSession();

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error parsing character session data:',
        expect.any(Error)
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('warlock_character_data');
    });

    it('should handle edge case of exactly 1 hour old data', () => {
      const exactlyOneHourAgo = 1000000 - (60 * 60 * 1000); // Exactly 1 hour ago
      const edgeSessionData = { ...mockSessionData, timestamp: exactlyOneHourAgo };

      reconnectionStorage.setReconnectionEnabled(true);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(edgeSessionData));

      const result = reconnectionStorage.getCharacterSession();
      expect(result).toEqual(edgeSessionData); // Should still be valid
    });
  });

  describe('clearCharacterSession', () => {
    it('should remove character data from localStorage', () => {
      reconnectionStorage.clearCharacterSession();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('warlock_character_data');
    });

    it('should clear session regardless of reconnection setting', () => {
      reconnectionStorage.setReconnectionEnabled(false);
      reconnectionStorage.clearCharacterSession();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('warlock_character_data');
    });
  });

  describe('updateSocketId', () => {
    const mockSessionData = {
      character: { name: 'TestPlayer' },
      socketId: 'oldSocket',
      gameCode: 'GAME456',
      timestamp: 900000
    };

    it('should update socket ID and timestamp when session exists', () => {
      const newTimestamp = 1100000;
      jest.spyOn(Date, 'now').mockReturnValue(newTimestamp);

      reconnectionStorage.setReconnectionEnabled(true);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(mockSessionData));

      reconnectionStorage.updateSocketId('newSocket123');

      const expectedUpdatedData = {
        ...mockSessionData,
        socketId: 'newSocket123',
        timestamp: newTimestamp
      };

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'warlock_character_data',
        JSON.stringify(expectedUpdatedData)
      );
    });

    it('should do nothing when no session exists', () => {
      reconnectionStorage.setReconnectionEnabled(true);

      reconnectionStorage.updateSocketId('newSocket123');

      // Should not call setItem for character data
      const setItemCalls = (localStorageMock.setItem as jest.Mock).mock.calls;
      const characterDataCalls = setItemCalls.filter(call => call[0] === 'warlock_character_data');
      expect(characterDataCalls).toHaveLength(0);
    });

    it('should do nothing when reconnection is disabled', () => {
      reconnectionStorage.setReconnectionEnabled(false);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(mockSessionData));

      reconnectionStorage.updateSocketId('newSocket123');

      // Should not update the session data
      const setItemCalls = (localStorageMock.setItem as jest.Mock).mock.calls;
      const characterDataCalls = setItemCalls.filter(call => call[0] === 'warlock_character_data');
      expect(characterDataCalls).toHaveLength(1); // Only the initial setItem
    });
  });

  describe('hasValidSession', () => {
    it('should return true when valid session exists', () => {
      const mockSessionData = {
        character: { name: 'TestPlayer' },
        socketId: 'socket123',
        gameCode: 'GAME456',
        timestamp: 1000000
      };

      reconnectionStorage.setReconnectionEnabled(true);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(mockSessionData));

      expect(reconnectionStorage.hasValidSession()).toBe(true);
    });

    it('should return false when no session exists', () => {
      reconnectionStorage.setReconnectionEnabled(true);

      expect(reconnectionStorage.hasValidSession()).toBe(false);
    });

    it('should return false when reconnection is disabled', () => {
      const mockSessionData = {
        character: { name: 'TestPlayer' },
        socketId: 'socket123',
        gameCode: 'GAME456',
        timestamp: 1000000
      };

      reconnectionStorage.setReconnectionEnabled(false);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(mockSessionData));

      expect(reconnectionStorage.hasValidSession()).toBe(false);
    });

    it('should return false when session is expired', () => {
      const expiredSessionData = {
        character: { name: 'TestPlayer' },
        socketId: 'socket123',
        gameCode: 'GAME456',
        timestamp: 1000000 - (2 * 60 * 60 * 1000) // 2 hours ago
      };

      reconnectionStorage.setReconnectionEnabled(true);
      localStorageMock.setItem('warlock_character_data', JSON.stringify(expiredSessionData));

      expect(reconnectionStorage.hasValidSession()).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should handle complete reconnection workflow', () => {
      const characterData = { name: 'TestPlayer', race: 'Artisan', class: 'Warrior' };
      const socketId = 'socket123';
      const gameCode = 'GAME456';

      // Enable reconnection
      reconnectionStorage.setReconnectionEnabled(true);
      expect(reconnectionStorage.getReconnectionEnabled()).toBe(true);

      // Save session
      reconnectionStorage.saveCharacterSession(characterData, socketId, gameCode);
      expect(reconnectionStorage.hasValidSession()).toBe(true);

      // Retrieve session
      const session = reconnectionStorage.getCharacterSession();
      expect(session).toBeTruthy();
      expect(session?.character).toEqual(characterData);
      expect(session?.socketId).toBe(socketId);
      expect(session?.gameCode).toBe(gameCode);

      // Update socket ID
      const newSocketId = 'newSocket456';
      reconnectionStorage.updateSocketId(newSocketId);

      const updatedSession = reconnectionStorage.getCharacterSession();
      expect(updatedSession?.socketId).toBe(newSocketId);
      expect(updatedSession?.character).toEqual(characterData);

      // Clear session
      reconnectionStorage.clearCharacterSession();
      expect(reconnectionStorage.hasValidSession()).toBe(false);
      expect(reconnectionStorage.getCharacterSession()).toBeNull();
    });

    it('should respect reconnection disabled setting throughout workflow', () => {
      const characterData = { name: 'TestPlayer' };
      const socketId = 'socket123';
      const gameCode = 'GAME456';

      // Disable reconnection
      reconnectionStorage.setReconnectionEnabled(false);

      // Try to save session - should not save
      reconnectionStorage.saveCharacterSession(characterData, socketId, gameCode);
      expect(reconnectionStorage.hasValidSession()).toBe(false);

      // Try to get session - should return null
      expect(reconnectionStorage.getCharacterSession()).toBeNull();

      // Update socket should do nothing
      reconnectionStorage.updateSocketId('newSocket');
      expect(reconnectionStorage.hasValidSession()).toBe(false);
    });
  });
});
