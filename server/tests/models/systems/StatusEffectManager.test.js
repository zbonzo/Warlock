/**
 * @fileoverview Unit tests for StatusEffectManager
 * Tests application, removal, and processing of status effects
 */
const StatusEffectManager = require('@models/systems/StatusEffectManager');

describe('StatusEffectManager', () => {
  let statusEffectManager;
  let mockPlayers;
  let mockGameStateUtils;
  let mockPlayer;
  let mockLog;

  beforeEach(() => {
    // Create mock player
    mockPlayer = {
      id: 'player1',
      name: 'Alice',
      isAlive: true,
      hp: 100,
      statusEffects: {},
      hasStatusEffect: jest.fn(),
      applyStatusEffect: jest.fn(),
      removeStatusEffect: jest.fn(),
      pendingDeath: false,
      deathAttacker: null,
    };

    // Setup mock players map
    mockPlayers = new Map();
    mockPlayers.set('player1', mockPlayer);

    // Setup mock game state utils
    mockGameStateUtils = {
      getAlivePlayers: jest.fn().mockReturnValue([mockPlayer]),
    };

    // Create the status effect manager
    statusEffectManager = new StatusEffectManager(
      mockPlayers,
      mockGameStateUtils
    );

    // Create log array
    mockLog = [];
  });

  describe('constructor', () => {
    it('should initialize with players and game state utils', () => {
      expect(statusEffectManager.players).toBe(mockPlayers);
      expect(statusEffectManager.gameStateUtils).toBe(mockGameStateUtils);
    });

    it('should have effect definitions for known effects', () => {
      expect(statusEffectManager.effectDefinitions).toHaveProperty('poison');
      expect(statusEffectManager.effectDefinitions).toHaveProperty('shielded');
      expect(statusEffectManager.effectDefinitions).toHaveProperty('invisible');
      expect(statusEffectManager.effectDefinitions).toHaveProperty('stunned');
    });
  });

  describe('applyEffect', () => {
    it('should apply an effect to a player', () => {
      // Mock player not having the effect yet
      mockPlayer.hasStatusEffect.mockReturnValue(false);

      // Apply effect
      const result = statusEffectManager.applyEffect(
        'player1',
        'poison',
        { damage: 10, turns: 2 },
        mockLog
      );

      // Check result
      expect(result).toBe(true);
      expect(mockPlayer.applyStatusEffect).toHaveBeenCalledWith('poison', {
        damage: 10,
        turns: 2,
      });
      expect(mockLog).toContain(
        'Alice is poisoned for 10 damage over 2 turns.'
      );
    });

    it('should apply effect with default values when parameters missing', () => {
      // Mock player not having the effect yet
      mockPlayer.hasStatusEffect.mockReturnValue(false);

      // Apply effect with missing parameters
      const result = statusEffectManager.applyEffect(
        'player1',
        'poison',
        { damage: 10 },
        mockLog
      );

      // Check result - should use default turns value
      expect(result).toBe(true);
      expect(mockPlayer.applyStatusEffect).toHaveBeenCalledWith('poison', {
        damage: 10,
        turns: 3,
      });
    });

    it('should return false if player does not exist', () => {
      // Apply effect to non-existent player
      const result = statusEffectManager.applyEffect(
        'nonexistent',
        'poison',
        { damage: 10 },
        mockLog
      );

      // Check result
      expect(result).toBe(false);
      expect(mockPlayer.applyStatusEffect).not.toHaveBeenCalled();
      expect(mockLog).toHaveLength(0);
    });

    it('should return false if player is dead', () => {
      // Set player as dead
      mockPlayer.isAlive = false;

      // Apply effect
      const result = statusEffectManager.applyEffect(
        'player1',
        'poison',
        { damage: 10 },
        mockLog
      );

      // Check result
      expect(result).toBe(false);
      expect(mockPlayer.applyStatusEffect).not.toHaveBeenCalled();
      expect(mockLog).toHaveLength(0);
    });

    it('should log a refresh message if player already has the effect', () => {
      // Mock player already having the effect
      mockPlayer.hasStatusEffect.mockReturnValue(true);

      // Apply effect
      const result = statusEffectManager.applyEffect(
        'player1',
        'poison',
        { damage: 10, turns: 2 },
        mockLog
      );

      // Check result
      expect(result).toBe(true);
      expect(mockPlayer.applyStatusEffect).toHaveBeenCalledWith('poison', {
        damage: 10,
        turns: 2,
      });
      expect(mockLog).toContain(
        "Alice's poison is refreshed for 10 damage over 2 turns."
      );
    });

    it('should return false for unknown effect type', () => {
      // Apply unknown effect
      const result = statusEffectManager.applyEffect(
        'player1',
        'unknown',
        { param: 'value' },
        mockLog
      );

      // Check result
      expect(result).toBe(false);
      expect(mockPlayer.applyStatusEffect).not.toHaveBeenCalled();
      expect(mockLog).toContain(
        'Unknown effect unknown could not be applied to Alice.'
      );
    });
  });

  describe('removeEffect', () => {
    it('should remove an effect from a player', () => {
      // Mock player having the effect
      mockPlayer.hasStatusEffect.mockReturnValue(true);

      // Remove effect
      const result = statusEffectManager.removeEffect(
        'player1',
        'poison',
        mockLog
      );

      // Check result
      expect(result).toBe(true);
      expect(mockPlayer.removeStatusEffect).toHaveBeenCalledWith('poison');
      expect(mockLog).toContain('The poison effect on Alice has worn off.');
    });

    it('should return false if player does not exist', () => {
      // Remove effect from non-existent player
      const result = statusEffectManager.removeEffect(
        'nonexistent',
        'poison',
        mockLog
      );

      // Check result
      expect(result).toBe(false);
      expect(mockPlayer.removeStatusEffect).not.toHaveBeenCalled();
      expect(mockLog).toHaveLength(0);
    });

    it('should return false if player does not have the effect', () => {
      // Mock player not having the effect
      mockPlayer.hasStatusEffect.mockReturnValue(false);

      // Remove effect
      const result = statusEffectManager.removeEffect(
        'player1',
        'poison',
        mockLog
      );

      // Check result
      expect(result).toBe(false);
      expect(mockPlayer.removeStatusEffect).toHaveBeenCalledWith('poison');
      expect(mockLog).toHaveLength(0);
    });
  });

  describe('hasEffect', () => {
    it('should return true if player has the effect', () => {
      // Mock player having the effect
      mockPlayer.hasStatusEffect.mockReturnValue(true);

      // Check effect
      const result = statusEffectManager.hasEffect('player1', 'poison');

      // Check result
      expect(result).toBe(true);
      expect(mockPlayer.hasStatusEffect).toHaveBeenCalledWith('poison');
    });

    it('should return false if player does not exist', () => {
      // Check effect on non-existent player
      const result = statusEffectManager.hasEffect('nonexistent', 'poison');

      // Check result
      expect(result).toBe(false);
      expect(mockPlayer.hasStatusEffect).not.toHaveBeenCalled();
    });

    it('should return false if player does not have the effect', () => {
      // Mock player not having the effect
      mockPlayer.hasStatusEffect.mockReturnValue(false);

      // Check effect
      const result = statusEffectManager.hasEffect('player1', 'poison');

      // Check result
      expect(result).toBe(false);
      expect(mockPlayer.hasStatusEffect).toHaveBeenCalledWith('poison');
    });
  });

  describe('getEffectData', () => {
    it('should return effect data if player has the effect', () => {
      // Set up effect data
      const effectData = { damage: 10, turns: 2 };
      mockPlayer.statusEffects.poison = effectData;

      // Mock player having the effect
      mockPlayer.hasStatusEffect.mockReturnValue(true);

      // Get effect data
      const result = statusEffectManager.getEffectData('player1', 'poison');

      // Check result
      expect(result).toBe(effectData);
      expect(mockPlayer.hasStatusEffect).toHaveBeenCalledWith('poison');
    });

    it('should return null if player does not exist', () => {
      // Get effect data for non-existent player
      const result = statusEffectManager.getEffectData('nonexistent', 'poison');

      // Check result
      expect(result).toBeNull();
      expect(mockPlayer.hasStatusEffect).not.toHaveBeenCalled();
    });

    it('should return null if player does not have the effect', () => {
      // Mock player not having the effect
      mockPlayer.hasStatusEffect.mockReturnValue(false);

      // Get effect data
      const result = statusEffectManager.getEffectData('player1', 'poison');

      // Check result
      expect(result).toBeNull();
      expect(mockPlayer.hasStatusEffect).toHaveBeenCalledWith('poison');
    });
  });

  describe('isPlayerStunned', () => {
    it('should return true if player is stunned', () => {
      // Setup hasEffect spy to return true for stunned
      jest.spyOn(statusEffectManager, 'hasEffect').mockReturnValue(true);

      // Check if stunned
      const result = statusEffectManager.isPlayerStunned('player1');

      // Check result
      expect(result).toBe(true);
      expect(statusEffectManager.hasEffect).toHaveBeenCalledWith(
        'player1',
        'stunned'
      );
    });

    it('should return false if player is not stunned', () => {
      // Setup hasEffect spy to return false for stunned
      jest.spyOn(statusEffectManager, 'hasEffect').mockReturnValue(false);

      // Check if stunned
      const result = statusEffectManager.isPlayerStunned('player1');

      // Check result
      expect(result).toBe(false);
      expect(statusEffectManager.hasEffect).toHaveBeenCalledWith(
        'player1',
        'stunned'
      );
    });
  });

  describe('processTimedEffects', () => {
    it('should process all effects for all alive players', () => {
      // Setup spies for process methods
      jest.spyOn(statusEffectManager, 'processPoisonEffect');
      jest.spyOn(statusEffectManager, 'processTimedEffect');

      // Process effects
      statusEffectManager.processTimedEffects(mockLog);

      // Check result
      expect(mockGameStateUtils.getAlivePlayers).toHaveBeenCalled();
      expect(statusEffectManager.processPoisonEffect).toHaveBeenCalledWith(
        mockPlayer,
        mockLog
      );
      expect(statusEffectManager.processTimedEffect).toHaveBeenCalledWith(
        mockPlayer,
        'shielded',
        mockLog
      );
      expect(statusEffectManager.processTimedEffect).toHaveBeenCalledWith(
        mockPlayer,
        'invisible',
        mockLog
      );
      expect(statusEffectManager.processTimedEffect).toHaveBeenCalledWith(
        mockPlayer,
        'stunned',
        mockLog
      );
    });
  });

  describe('processPoisonEffect', () => {
    it('should apply poison damage and decrement turns', () => {
      // Setup player having poison effect
      mockPlayer.hasStatusEffect.mockImplementation(
        (effect) => effect === 'poison'
      );
      mockPlayer.statusEffects.poison = { damage: 10, turns: 2 };

      // Process poison effect
      statusEffectManager.processPoisonEffect(mockPlayer, mockLog);

      // Check result
      expect(mockPlayer.hp).toBe(90); // 100 - 10
      expect(mockPlayer.statusEffects.poison.turns).toBe(1); // 2 - 1
      expect(mockLog).toContain('Alice suffers 10 poison damage.');
    });

    it('should mark player for death if HP reaches 0', () => {
      // Setup player having poison effect
      mockPlayer.hasStatusEffect.mockImplementation(
        (effect) => effect === 'poison'
      );
      mockPlayer.statusEffects.poison = { damage: 110, turns: 2 };

      // Process poison effect
      statusEffectManager.processPoisonEffect(mockPlayer, mockLog);

      // Check result
      expect(mockPlayer.hp).toBe(0);
      expect(mockPlayer.pendingDeath).toBe(true);
      expect(mockPlayer.deathAttacker).toBe('Poison');
    });

    it('should remove poison effect when turns reach 0', () => {
      // Setup player having poison effect with 1 turn left
      mockPlayer.hasStatusEffect.mockImplementation(
        (effect) => effect === 'poison'
      );
      mockPlayer.statusEffects.poison = { damage: 10, turns: 1 };

      // Process poison effect
      statusEffectManager.processPoisonEffect(mockPlayer, mockLog);

      // Check result
      expect(mockPlayer.hp).toBe(90);
      expect(mockPlayer.removeStatusEffect).toHaveBeenCalledWith('poison');
      expect(mockLog).toContain('The poison affecting Alice has worn off.');
    });

    it('should do nothing if player does not have poison effect', () => {
      // Setup player not having poison effect
      mockPlayer.hasStatusEffect.mockReturnValue(false);

      // Process poison effect
      statusEffectManager.processPoisonEffect(mockPlayer, mockLog);

      // Check result
      expect(mockPlayer.hp).toBe(100); // Unchanged
      expect(mockPlayer.removeStatusEffect).not.toHaveBeenCalled();
      expect(mockLog).toHaveLength(0);
    });
  });

  describe('processTimedEffect', () => {
    it('should decrement turns for a timed effect', () => {
      // Setup player having the effect
      mockPlayer.hasStatusEffect.mockImplementation(
        (effect) => effect === 'invisible'
      );
      mockPlayer.statusEffects.invisible = { turns: 2 };

      // Process effect
      statusEffectManager.processTimedEffect(mockPlayer, 'invisible', mockLog);

      // Check result
      expect(mockPlayer.statusEffects.invisible.turns).toBe(1); // 2 - 1
      expect(mockPlayer.removeStatusEffect).not.toHaveBeenCalled();
      expect(mockLog).toHaveLength(0);
    });

    it('should remove effect when turns reach 0', () => {
      // Setup player having the effect with 1 turn left
      mockPlayer.hasStatusEffect.mockImplementation(
        (effect) => effect === 'stunned'
      );
      mockPlayer.statusEffects.stunned = { turns: 1 };

      // Process effect
      statusEffectManager.processTimedEffect(mockPlayer, 'stunned', mockLog);

      // Check result
      expect(mockPlayer.removeStatusEffect).toHaveBeenCalledWith('stunned');
      expect(mockLog).toContain('Alice is no longer stunned.');
    });

    it('should do nothing if player does not have the effect', () => {
      // Setup player not having the effect
      mockPlayer.hasStatusEffect.mockReturnValue(false);

      // Process effect
      statusEffectManager.processTimedEffect(mockPlayer, 'invisible', mockLog);

      // Check result
      expect(mockPlayer.removeStatusEffect).not.toHaveBeenCalled();
      expect(mockLog).toHaveLength(0);
    });
  });

  describe('message generation', () => {
    it('should generate appropriate application messages for each effect type', () => {
      // Check poison message
      expect(
        statusEffectManager.getEffectApplicationMessage('Alice', 'poison', {
          damage: 10,
          turns: 2,
        })
      ).toBe('Alice is poisoned for 10 damage over 2 turns.');

      // Check shielded message
      expect(
        statusEffectManager.getEffectApplicationMessage('Alice', 'shielded', {
          armor: 5,
          turns: 2,
        })
      ).toBe('Alice is shielded with 5 armor for 2 turn(s).');

      // Check invisible message
      expect(
        statusEffectManager.getEffectApplicationMessage('Alice', 'invisible', {
          turns: 1,
        })
      ).toBe('Alice becomes invisible for 1 turn(s).');

      // Check stunned message
      expect(
        statusEffectManager.getEffectApplicationMessage('Alice', 'stunned', {
          turns: 2,
        })
      ).toBe('Alice is stunned for 2 turn(s).');

      // Check unknown effect
      expect(
        statusEffectManager.getEffectApplicationMessage('Alice', 'unknown', {})
      ).toBe('Alice is affected by unknown.');
    });

    it('should generate appropriate refresh messages for each effect type', () => {
      // Check poison message
      expect(
        statusEffectManager.getEffectRefreshMessage('Alice', 'poison', {
          damage: 10,
          turns: 2,
        })
      ).toBe("Alice's poison is refreshed for 10 damage over 2 turns.");

      // Check shielded message
      expect(
        statusEffectManager.getEffectRefreshMessage('Alice', 'shielded', {
          armor: 5,
          turns: 2,
        })
      ).toBe("Alice's protection is refreshed for 2 turn(s).");

      // Check invisible message
      expect(
        statusEffectManager.getEffectRefreshMessage('Alice', 'invisible', {
          turns: 1,
        })
      ).toBe("Alice's invisibility is extended for 1 turn(s).");

      // Check stunned message
      expect(
        statusEffectManager.getEffectRefreshMessage('Alice', 'stunned', {
          turns: 2,
        })
      ).toBe('Alice remains stunned for 2 more turn(s).');

      // Check unknown effect
      expect(
        statusEffectManager.getEffectRefreshMessage('Alice', 'unknown', {})
      ).toBe("Alice's unknown effect is refreshed.");
    });

    it('should generate appropriate expiration messages for each effect type', () => {
      // Check poison message
      expect(
        statusEffectManager.getEffectExpirationMessage('Alice', 'poison')
      ).toBe('The poison affecting Alice has worn off.');

      // Check shielded message
      expect(
        statusEffectManager.getEffectExpirationMessage('Alice', 'shielded')
      ).toBe('Alice is no longer shielded.');

      // Check invisible message
      expect(
        statusEffectManager.getEffectExpirationMessage('Alice', 'invisible')
      ).toBe('Alice is no longer invisible.');

      // Check stunned message
      expect(
        statusEffectManager.getEffectExpirationMessage('Alice', 'stunned')
      ).toBe('Alice is no longer stunned.');

      // Check unknown effect
      expect(
        statusEffectManager.getEffectExpirationMessage('Alice', 'unknown')
      ).toBe('The unknown effect on Alice has worn off.');
    });
  });
});
