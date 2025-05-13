/**
 * @fileoverview Unit tests for WarlockSystem
 * Tests warlock assignment, conversion, and tracking
 */
const WarlockSystem = require('@models/systems/WarlockSystem');

describe('WarlockSystem', () => {
  let warlockSystem;
  let mockPlayers;
  let mockGameStateUtils;
  
  beforeEach(() => {
    // Create mock players
    mockPlayers = new Map();
    
    // Add some test players
    mockPlayers.set('player1', { 
      id: 'player1', 
      name: 'Alice', 
      isAlive: true, 
      isWarlock: false 
    });
    
    mockPlayers.set('player2', { 
      id: 'player2', 
      name: 'Bob', 
      isAlive: true, 
      isWarlock: false 
    });
    
    mockPlayers.set('player3', { 
      id: 'player3', 
      name: 'Charlie', 
      isAlive: true, 
      isWarlock: false 
    });
    
    // Create mock gameStateUtils
    mockGameStateUtils = {
      getAlivePlayers: jest.fn().mockImplementation(() => 
        Array.from(mockPlayers.values()).filter(p => p.isAlive)
      )
    };
    
    // Create the WarlockSystem
    warlockSystem = new WarlockSystem(mockPlayers, mockGameStateUtils);
  });
  
  describe('constructor', () => {
    it('should initialize with players and game state utils', () => {
      expect(warlockSystem.players).toBe(mockPlayers);
      expect(warlockSystem.gameStateUtils).toBe(mockGameStateUtils);
    });
    
    it('should initialize with zero warlocks', () => {
      expect(warlockSystem.numWarlocks).toBe(0);
    });
  });
  
  describe('assignInitialWarlock', () => {
    it('should assign a random player as warlock if no preference given', () => {
      // Seed the random number generator for consistency
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // Will pick first player
      
      const warlock = warlockSystem.assignInitialWarlock();
      
      // Should have chosen player1
      expect(warlock).toBe(mockPlayers.get('player1'));
      expect(warlock.isWarlock).toBe(true);
      expect(warlockSystem.numWarlocks).toBe(1);
    });
    
    it('should use preferred player if provided', () => {
      const warlock = warlockSystem.assignInitialWarlock('player2');
      
      // Should have chosen player2
      expect(warlock).toBe(mockPlayers.get('player2'));
      expect(warlock.isWarlock).toBe(true);
      expect(warlockSystem.numWarlocks).toBe(1);
    });
    
    it('should fall back to random if preferred player does not exist', () => {
      // Seed the random number generator for consistency
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Will pick second player
      
      const warlock = warlockSystem.assignInitialWarlock('nonexistent');
      
      // Should have chosen player2 (based on our mock random value)
      expect(warlock).toBe(mockPlayers.get('player2'));
      expect(warlock.isWarlock).toBe(true);
      expect(warlockSystem.numWarlocks).toBe(1);
    });
    
    it('should return null if no players exist', () => {
      // Clear players map
      mockPlayers.clear();
      
      const warlock = warlockSystem.assignInitialWarlock();
      
      // Should return null
      expect(warlock).toBeNull();
      expect(warlockSystem.numWarlocks).toBe(0);
    });
  });
  
  describe('getWarlockCount', () => {
    it('should return the current number of warlocks', () => {
      // Initial count
      expect(warlockSystem.getWarlockCount()).toBe(0);
      
      // Make a player a warlock
      mockPlayers.get('player1').isWarlock = true;
      warlockSystem.numWarlocks = 1;
      
      // Count should be 1
      expect(warlockSystem.getWarlockCount()).toBe(1);
    });
  });
  
  describe('incrementWarlockCount', () => {
    it('should increment the warlock count', () => {
      // Initial count
      expect(warlockSystem.numWarlocks).toBe(0);
      
      // Increment
      warlockSystem.incrementWarlockCount();
      
      // Should be 1
      expect(warlockSystem.numWarlocks).toBe(1);
      
      // Increment again
      warlockSystem.incrementWarlockCount();
      
      // Should be 2
      expect(warlockSystem.numWarlocks).toBe(2);
    });
  });
  
  describe('decrementWarlockCount', () => {
    it('should decrement the warlock count if greater than zero', () => {
      // Set initial count
      warlockSystem.numWarlocks = 2;
      
      // Decrement
      const result = warlockSystem.decrementWarlockCount();
      
      // Should be 1
      expect(warlockSystem.numWarlocks).toBe(1);
      expect(result).toBe(1);
      
      // Decrement again
      warlockSystem.decrementWarlockCount();
      
      // Should be 0
      expect(warlockSystem.numWarlocks).toBe(0);
    });
    
    it('should not decrement below zero', () => {
      // Initial count is 0
      expect(warlockSystem.numWarlocks).toBe(0);
      
      // Try to decrement
      const result = warlockSystem.decrementWarlockCount();
      
      // Should still be 0
      expect(warlockSystem.numWarlocks).toBe(0);
      expect(result).toBe(0);
    });
  });
  
  describe('isPlayerWarlock', () => {
    it('should return true if player is a warlock', () => {
      // Make player a warlock
      mockPlayers.get('player1').isWarlock = true;
      
      // Check
      expect(warlockSystem.isPlayerWarlock('player1')).toBe(true);
    });
    
    it('should return false if player is not a warlock', () => {
      // Player is not a warlock by default
      expect(warlockSystem.isPlayerWarlock('player1')).toBe(false);
    });
    
    it('should return false if player does not exist', () => {
      expect(warlockSystem.isPlayerWarlock('nonexistent')).toBe(false);
    });
  });
  
  describe('countAliveWarlocks', () => {
    it('should return the count of alive warlocks', () => {
      // Make two players warlocks
      mockPlayers.get('player1').isWarlock = true;
      mockPlayers.get('player2').isWarlock = true;
      
      // Initial count (both alive)
      expect(warlockSystem.countAliveWarlocks()).toBe(2);
      
      // Kill one warlock
      mockPlayers.get('player1').isAlive = false;
      
      // Count should be 1
      expect(warlockSystem.countAliveWarlocks()).toBe(1);
    });
  });
  
  describe('getWarlocks', () => {
    beforeEach(() => {
      // Setup 3 players, 2 warlocks (1 dead)
      mockPlayers.get('player1').isWarlock = true;
      mockPlayers.get('player2').isWarlock = true;
      mockPlayers.get('player1').isAlive = false;
    });
    
    it('should return all warlocks when aliveOnly is false', () => {
      const warlocks = warlockSystem.getWarlocks(false);
      
      // Should include both warlocks
      expect(warlocks).toHaveLength(2);
      expect(warlocks[0].id).toBe('player1');
      expect(warlocks[1].id).toBe('player2');
    });
    
    it('should return only alive warlocks when aliveOnly is true', () => {
      const warlocks = warlockSystem.getWarlocks(true);
      
      // Should only include alive warlock
      expect(warlocks).toHaveLength(1);
      expect(warlocks[0].id).toBe('player2');
    });
  });
  
  describe('attemptConversion', () => {
    let mockLog;
    
    beforeEach(() => {
      mockLog = [];
      
      // Setup actor as warlock
      mockPlayers.get('player1').isWarlock = true;
      
      // Mock Math.random to control conversion chance
      jest.spyOn(Math, 'random');
    });
    
    it('should return false if actor is not a warlock', () => {
      // Reset warlock status
      mockPlayers.get('player1').isWarlock = false;
      
      const result = warlockSystem.attemptConversion(
        mockPlayers.get('player1'),
        mockPlayers.get('player2'),
        mockLog
      );
      
      // Should not convert
      expect(result).toBe(false);
      expect(mockPlayers.get('player2').isWarlock).toBe(false);
      expect(mockLog).toHaveLength(0);
    });
    
    it('should return false if target is already a warlock', () => {
      // Make target a warlock
      mockPlayers.get('player2').isWarlock = true;
      
      const result = warlockSystem.attemptConversion(
        mockPlayers.get('player1'),
        mockPlayers.get('player2'),
        mockLog
      );
      
      // Should not convert
      expect(result).toBe(false);
      expect(mockLog).toHaveLength(0);
    });
    
    it('should return false if target is dead', () => {
      // Kill target
      mockPlayers.get('player2').isAlive = false;
      
      const result = warlockSystem.attemptConversion(
        mockPlayers.get('player1'),
        mockPlayers.get('player2'),
        mockLog
      );
      
      // Should not convert
      expect(result).toBe(false);
      expect(mockLog).toHaveLength(0);
    });
    
    it('should convert target if random chance succeeds', () => {
      // Ensure conversion succeeds
      Math.random.mockReturnValue(0.1); // Below threshold
      warlockSystem.numWarlocks = 1; // Set count for calculation
      
      const result = warlockSystem.attemptConversion(
        mockPlayers.get('player1'),
        mockPlayers.get('player2'),
        mockLog
      );
      
      // Should convert
      expect(result).toBe(true);
      expect(mockPlayers.get('player2').isWarlock).toBe(true);
      expect(warlockSystem.numWarlocks).toBe(2);
      expect(mockLog).toContain('Corruption spreads! Bob has been turned into a Warlock by Alice!');
    });
    
    it('should not convert target if random chance fails', () => {
      // Ensure conversion fails
      Math.random.mockReturnValue(0.9); // Above threshold
      
      const result = warlockSystem.attemptConversion(
        mockPlayers.get('player1'),
        mockPlayers.get('player2'),
        mockLog
      );
      
      // Should not convert
      expect(result).toBe(false);
      expect(mockPlayers.get('player2').isWarlock).toBe(false);
      expect(warlockSystem.numWarlocks).toBe(0); // Unchanged
      expect(mockLog).toHaveLength(0);
    });
    
    it('should apply rate modifier to conversion chance', () => {
      // With rate modifier 0.5, the threshold will be halved
      // We'll set random just below the normal threshold
      Math.random.mockReturnValue(0.35); // Would succeed normally but fail with modifier
      
      const result = warlockSystem.attemptConversion(
        mockPlayers.get('player1'),
        mockPlayers.get('player2'),
        mockLog,
        0.5 // Half the normal chance
      );
      
      // Should not convert due to modifier
      expect(result).toBe(false);
      expect(mockPlayers.get('player2').isWarlock).toBe(false);
    });
    
    it('should attempt random conversion if target is null', () => {
      // Mock attemptRandomConversion
      jest.spyOn(warlockSystem, 'attemptRandomConversion').mockReturnValue(true);
      
      const result = warlockSystem.attemptConversion(
        mockPlayers.get('player1'),
        null,
        mockLog
      );
      
      // Should call attemptRandomConversion
      expect(warlockSystem.attemptRandomConversion).toHaveBeenCalledWith(
        mockPlayers.get('player1'),
        mockLog,
        1.0
      );
      expect(result).toBe(true);
    });
  });
  
  describe('attemptRandomConversion', () => {
    let mockLog;
    
    beforeEach(() => {
      mockLog = [];
      
      // Setup actor as warlock
      mockPlayers.get('player1').isWarlock = true;
      
      // Spy on attemptConversion
      jest.spyOn(warlockSystem, 'attemptConversion');
      
      // Control random selection
      jest.spyOn(Math, 'random').mockReturnValue(0.1); // Will select first eligible player
    });
    
    it('should pick a random eligible player and attempt conversion', () => {
      // Spy implementation to just return true
      warlockSystem.attemptConversion.mockImplementation(() => true);
      
      const result = warlockSystem.attemptRandomConversion(
        mockPlayers.get('player1'),
        mockLog,
        0.5
      );
      
      // Should call attemptConversion with player2 (the first eligible)
      expect(warlockSystem.attemptConversion).toHaveBeenCalledWith(
        mockPlayers.get('player1'),
        mockPlayers.get('player2'),
        mockLog,
        0.5
      );
      expect(result).toBe(true);
    });
    
    it('should return false if no eligible players exist', () => {
      // Make all players warlocks or dead
      mockPlayers.get('player2').isWarlock = true;
      mockPlayers.get('player3').isAlive = false;
      
      const result = warlockSystem.attemptRandomConversion(
        mockPlayers.get('player1'),
        mockLog
      );
      
      // Should not call attemptConversion
      expect(warlockSystem.attemptConversion).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
  
  describe('forceConvertPlayer', () => {
    let mockLog;
    
    beforeEach(() => {
      mockLog = [];
    });
    
    it('should convert player without chance calculation', () => {
      const result = warlockSystem.forceConvertPlayer('player2', mockLog, 'testing');
      
      // Should convert
      expect(result).toBe(true);
      expect(mockPlayers.get('player2').isWarlock).toBe(true);
      expect(warlockSystem.numWarlocks).toBe(1);
      expect(mockLog).toContain('Bob has been turned into a Warlock! (Reason: testing)');
    });
    
    it('should return false if player does not exist', () => {
      const result = warlockSystem.forceConvertPlayer('nonexistent', mockLog);
      
      // Should fail
      expect(result).toBe(false);
      expect(warlockSystem.numWarlocks).toBe(0);
      expect(mockLog).toHaveLength(0);
    });
    
    it('should return false if player is dead', () => {
      // Kill player
      mockPlayers.get('player2').isAlive = false;
      
      const result = warlockSystem.forceConvertPlayer('player2', mockLog);
      
      // Should fail
      expect(result).toBe(false);
      expect(mockPlayers.get('player2').isWarlock).toBe(false);
      expect(warlockSystem.numWarlocks).toBe(0);
      expect(mockLog).toHaveLength(0);
    });
    
    it('should return false if player is already a warlock', () => {
      // Make player a warlock
      mockPlayers.get('player2').isWarlock = true;
      
      const result = warlockSystem.forceConvertPlayer('player2', mockLog);
      
      // Should fail (already a warlock)
      expect(result).toBe(false);
      expect(warlockSystem.numWarlocks).toBe(0); // Still 0 because we didn't increment
      expect(mockLog).toHaveLength(0);
    });
  });
  
  describe('areWarlocksWinning', () => {
    it('should return true if warlocks are majority', () => {
      // Setup 3 players, 2 warlocks
      mockPlayers.get('player1').isWarlock = true;
      mockPlayers.get('player2').isWarlock = true;
      
      // Should be winning
      expect(warlockSystem.areWarlocksWinning()).toBe(true);
    });
    
    it('should return false if warlocks are not majority', () => {
      // Setup 3 players, 1 warlock
      mockPlayers.get('player1').isWarlock = true;
      
      // Should not be winning
      expect(warlockSystem.areWarlocksWinning()).toBe(false);
    });
    
    it('should count only alive players', () => {
      // Setup 3 players, 1 warlock, 1 dead non-warlock
      mockPlayers.get('player1').isWarlock = true;
      mockPlayers.get('player3').isAlive = false;
      
      // Should be tied (1 warlock, 1 non-warlock alive)
      expect(warlockSystem.areWarlocksWinning()).toBe(false);
    });
  });
});