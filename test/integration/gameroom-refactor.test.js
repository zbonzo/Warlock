/**
 * @fileoverview Integration test for GameRoom refactoring
 * Verifies that the refactored GameRoom maintains backward compatibility
 */
const { GameRoom } = require('../../server/models/GameRoom');

describe('GameRoom Refactoring - Backward Compatibility', () => {
  let gameRoom;

  beforeEach(() => {
    gameRoom = new GameRoom('TEST123');
  });

  test('should create GameRoom with domain models', () => {
    expect(gameRoom.gameState).toBeDefined();
    expect(gameRoom.gamePhase).toBeDefined();
    expect(gameRoom.gameRules).toBeDefined();
  });

  test('should maintain backward compatibility for property access', () => {
    // Test property delegation
    expect(gameRoom.code).toBe('TEST123');
    expect(gameRoom.players).toBeInstanceOf(Map);
    expect(gameRoom.started).toBe(false);
    expect(gameRoom.round).toBe(0);
    expect(gameRoom.level).toBe(1);
    expect(gameRoom.phase).toBe('lobby');
    expect(gameRoom.aliveCount).toBe(0);
    expect(gameRoom.pendingActions).toBeInstanceOf(Array);
    expect(gameRoom.pendingRacialActions).toBeInstanceOf(Array);
    expect(gameRoom.nextReady).toBeInstanceOf(Set);
    expect(gameRoom.monster).toBeDefined();
  });

  test('should maintain backward compatibility for property assignment', () => {
    // Test property delegation setters
    gameRoom.started = true;
    expect(gameRoom.gameState.started).toBe(true);
    expect(gameRoom.started).toBe(true);

    gameRoom.round = 5;
    expect(gameRoom.gameState.round).toBe(5);
    expect(gameRoom.round).toBe(5);

    gameRoom.level = 3;
    expect(gameRoom.gameState.level).toBe(3);
    expect(gameRoom.level).toBe(3);

    gameRoom.phase = 'action';
    expect(gameRoom.gamePhase.getCurrentPhase()).toBe('action');
    expect(gameRoom.phase).toBe('action');

    gameRoom.aliveCount = 2;
    expect(gameRoom.gameState.aliveCount).toBe(2);
    expect(gameRoom.aliveCount).toBe(2);
  });

  test('should maintain addPlayer functionality', () => {
    const success = gameRoom.addPlayer('player1', 'TestPlayer');
    expect(success).toBe(true);
    expect(gameRoom.players.size).toBe(1);
    expect(gameRoom.players.has('player1')).toBe(true);
    expect(gameRoom.hostId).toBe('player1');
    expect(gameRoom.aliveCount).toBe(1);
  });

  test('should maintain removePlayer functionality', () => {
    gameRoom.addPlayer('player1', 'TestPlayer1');
    gameRoom.addPlayer('player2', 'TestPlayer2');
    
    gameRoom.removePlayer('player1');
    expect(gameRoom.players.size).toBe(1);
    expect(gameRoom.players.has('player1')).toBe(false);
    expect(gameRoom.hostId).toBe('player2'); // Should transfer host
  });

  test('should maintain getPlayersInfo functionality', () => {
    gameRoom.addPlayer('player1', 'TestPlayer');
    const playersInfo = gameRoom.getPlayersInfo();
    
    expect(Array.isArray(playersInfo)).toBe(true);
    expect(playersInfo.length).toBe(1);
    expect(playersInfo[0]).toHaveProperty('id');
    expect(playersInfo[0]).toHaveProperty('name');
    expect(playersInfo[0]).toHaveProperty('hp');
    expect(playersInfo[0]).toHaveProperty('maxHp');
  });

  test('should maintain transferPlayerId functionality', () => {
    gameRoom.addPlayer('oldId', 'TestPlayer');
    const success = gameRoom.transferPlayerId('oldId', 'newId');
    
    expect(success).toBe(true);
    expect(gameRoom.players.has('oldId')).toBe(false);
    expect(gameRoom.players.has('newId')).toBe(true);
    expect(gameRoom.hostId).toBe('newId');
  });

  test('should maintain getPlayer methods', () => {
    gameRoom.addPlayer('player1', 'TestPlayer');
    
    const player1 = gameRoom.getPlayerBySocketId('player1');
    const player2 = gameRoom.getPlayerById('player1');
    
    expect(player1).toBeDefined();
    expect(player2).toBeDefined();
    expect(player1.id).toBe('player1');
    expect(player2.id).toBe('player1');
  });

  test('should handle ready state management', () => {
    gameRoom.clearReady();
    expect(gameRoom.nextReady.size).toBe(0);
    
    // Test phase management
    gameRoom.phase = 'action';
    expect(gameRoom.phase).toBe('action');
    
    gameRoom.phase = 'results';
    expect(gameRoom.phase).toBe('results');
  });
});