/**
 * Custom assertion helpers
 */

/**
 * Assert that a player has specific properties
 */
function assertPlayerState(player, expectedState) {
  Object.entries(expectedState).forEach(([key, value]) => {
    expect(player[key]).toBe(value);
  });
}

/**
 * Assert that a game room is in a specific state
 */
function assertGameState(game, expectedState) {
  Object.entries(expectedState).forEach(([key, value]) => {
    if (key === 'playerCount') {
      expect(game.players.size).toBe(value);
    } else {
      expect(game[key]).toBe(value);
    }
  });
}

/**
 * Assert that an event log contains specific events
 */
function assertEventLog(log, expectedEvents) {
  expectedEvents.forEach((event) => {
    const found = log.some((entry) =>
      typeof entry === 'string'
        ? entry.includes(event)
        : entry.message && entry.message.includes(event)
    );
    expect(found).toBe(true);
  });
}

/**
 * Assert that a socket emitted specific events
 */
function assertSocketEmissions(mockSocket, expectedEmissions) {
  expectedEmissions.forEach(({ event, data }) => {
    if (data) {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        event,
        expect.objectContaining(data)
      );
    } else {
      expect(mockSocket.emit).toHaveBeenCalledWith(event);
    }
  });
}

module.exports = {
  assertPlayerState,
  assertGameState,
  assertEventLog,
  assertSocketEmissions,
};
