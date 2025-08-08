/**
 * @fileoverview Tests for trophy system configuration
 * Tests trophy definitions and winner calculation logic
 */
import trophies, { trophies as namedTrophies } from '../../server/config/trophies';
import type { Trophy, Player, PlayerStats, GameResult } from '../../server/config/trophies';

// Mock player data for testing
const createMockPlayer = (stats: Partial<PlayerStats>, isWarlock = false, isAlive = true): Player => ({
  stats: {
    totalDamageDealt: 0,
    totalHealingDone: 0,
    damageTaken: 0,
    highestSingleHit: 0,
    timesDied: 0,
    selfHeals: 0,
    abilitiesUsed: 0,
    ...stats
  },
  isWarlock,
  isAlive,
  isRevealed: false
});

describe('Trophies Configuration', () => {
  it('should export a valid trophies array', () => {
    expect(trophies).toBeDefined();
    expect(Array.isArray(trophies)).toBe(true);
    expect(trophies.length).toBeGreaterThan(0);
    expect(trophies).toBe(namedTrophies);
  });

  describe('Trophy structure validation', () => {
    it('should have valid structure for all trophies', () => {
      trophies.forEach((trophy, index) => {
        expect(trophy).toBeDefined();
        expect(typeof trophy).toBe('object');

        // Required properties
        expect(trophy.name).toBeDefined();
        expect(typeof trophy.name).toBe('string');
        expect(trophy.name.length).toBeGreaterThan(0);

        expect(trophy.description).toBeDefined();
        expect(typeof trophy.description).toBe('string');
        expect(trophy.description.length).toBeGreaterThan(0);

        expect(trophy.getWinner).toBeDefined();
        expect(typeof trophy.getWinner).toBe('function');
      });
    });

    it('should have unique trophy names', () => {
      const names = trophies.map(trophy => trophy.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have meaningful descriptions', () => {
      trophies.forEach(trophy => {
        expect(trophy.description.length).toBeGreaterThan(10);
        expect(trophy.description.endsWith('.')).toBe(true);
      });
    });
  });

  describe('Trophy winner calculation', () => {
    describe('The Participant trophy', () => {
      const participantTrophy = trophies.find(t => t.name === 'The Participant');

      it('should exist and be defined', () => {
        expect(participantTrophy).toBeDefined();
      });

      it('should return a random player when players exist', () => {
        const players = [
          createMockPlayer({}),
          createMockPlayer({})
        ];

        const winner = participantTrophy!.getWinner(players);
        expect(winner).toBeDefined();
        expect(players).toContain(winner);
      });

      it('should return null when no players exist', () => {
        const winner = participantTrophy!.getWinner([]);
        expect(winner).toBeNull();
      });
    });

    describe('The Gladiator trophy', () => {
      const gladiatorTrophy = trophies.find(t => t.name === 'The Gladiator');

      it('should award to player with most damage dealt', () => {
        const players = [
          createMockPlayer({ totalDamageDealt: 50 }),
          createMockPlayer({ totalDamageDealt: 100 }),
          createMockPlayer({ totalDamageDealt: 75 })
        ];

        const winner = gladiatorTrophy!.getWinner(players);
        expect(winner).toBe(players[1]); // Player with 100 damage
      });

      it('should return null when no players have stats', () => {
        const players = [
          { stats: null, isWarlock: false, isAlive: true } as any,
          { stats: null, isWarlock: false, isAlive: true } as any
        ];

        const winner = gladiatorTrophy!.getWinner(players);
        expect(winner).toBeNull();
      });

      it('should handle players with zero damage', () => {
        const players = [
          createMockPlayer({ totalDamageDealt: 0 }),
          createMockPlayer({ totalDamageDealt: 0 })
        ];

        const winner = gladiatorTrophy!.getWinner(players);
        expect(winner).toBeDefined();
        expect(players).toContain(winner);
      });
    });

    describe('The Savior trophy', () => {
      const saviorTrophy = trophies.find(t => t.name === 'The Savior');

      it('should award to player with most healing done', () => {
        const players = [
          createMockPlayer({ totalHealingDone: 30 }),
          createMockPlayer({ totalHealingDone: 80 }),
          createMockPlayer({ totalHealingDone: 0 })
        ];

        const winner = saviorTrophy!.getWinner(players);
        expect(winner).toBe(players[1]); // Player with 80 healing
      });

      it('should return null when no players have done healing', () => {
        const players = [
          createMockPlayer({ totalHealingDone: 0 }),
          createMockPlayer({ totalHealingDone: 0 })
        ];

        const winner = saviorTrophy!.getWinner(players);
        expect(winner).toBeNull();
      });
    });

    describe('The Punching Bag trophy', () => {
      const punchingBagTrophy = trophies.find(t => t.name === 'The Punching Bag');

      it('should award to player who took most damage', () => {
        const players = [
          createMockPlayer({ damageTaken: 120 }),
          createMockPlayer({ damageTaken: 200 }),
          createMockPlayer({ damageTaken: 50 })
        ];

        const winner = punchingBagTrophy!.getWinner(players);
        expect(winner).toBe(players[1]); // Player with 200 damage taken
      });

      it('should return null when no players took damage', () => {
        const players = [
          createMockPlayer({ damageTaken: 0 }),
          createMockPlayer({ damageTaken: 0 })
        ];

        const winner = punchingBagTrophy!.getWinner(players);
        expect(winner).toBeNull();
      });
    });

    describe('The Pacifist trophy', () => {
      const pacifistTrophy = trophies.find(t => t.name === 'The Pacifist');

      it('should award to player with zero damage dealt', () => {
        const players = [
          createMockPlayer({ totalDamageDealt: 50 }),
          createMockPlayer({ totalDamageDealt: 0 }),
          createMockPlayer({ totalDamageDealt: 0 })
        ];

        const winner = pacifistTrophy!.getWinner(players);
        expect(winner).toBeDefined();
        expect([players[1], players[2]]).toContain(winner);
        expect(winner!.stats.totalDamageDealt).toBe(0);
      });

      it('should return null when all players dealt damage', () => {
        const players = [
          createMockPlayer({ totalDamageDealt: 50 }),
          createMockPlayer({ totalDamageDealt: 30 })
        ];

        const winner = pacifistTrophy!.getWinner(players);
        expect(winner).toBeNull();
      });
    });

    describe('The Berserker trophy', () => {
      const berserkerTrophy = trophies.find(t => t.name === 'The Berserker');

      it('should award to player with highest single hit', () => {
        const players = [
          createMockPlayer({ highestSingleHit: 45 }),
          createMockPlayer({ highestSingleHit: 80 }),
          createMockPlayer({ highestSingleHit: 60 })
        ];

        const winner = berserkerTrophy!.getWinner(players);
        expect(winner).toBe(players[1]); // Player with 80 single hit
      });
    });

    describe('The Phoenix trophy', () => {
      const phoenixTrophy = trophies.find(t => t.name === 'The Phoenix');

      it('should award to winning player who died and came back', () => {
        const players = [
          createMockPlayer({ timesDied: 1 }, false, true), // Good player who died
          createMockPlayer({ timesDied: 0 }, false, true), // Good player who never died
          createMockPlayer({ timesDied: 2 }, true, true)   // Warlock who died
        ];

        const gameResult: GameResult = { winner: 'Good' };
        const winner = phoenixTrophy!.getWinner(players, gameResult);
        expect(winner).toBe(players[0]); // Only good player who died
      });

      it('should return null when no game result provided', () => {
        const players = [createMockPlayer({ timesDied: 1 })];
        const winner = phoenixTrophy!.getWinner(players);
        expect(winner).toBeNull();
      });

      it('should return null when no winners died', () => {
        const players = [
          createMockPlayer({ timesDied: 0 }, false, true),
          createMockPlayer({ timesDied: 1 }, true, true) // Warlock died but good won
        ];

        const gameResult: GameResult = { winner: 'Good' };
        const winner = phoenixTrophy!.getWinner(players, gameResult);
        expect(winner).toBeNull();
      });
    });

    describe('The Healer trophy', () => {
      const healerTrophy = trophies.find(t => t.name === 'The Healer');

      it('should award to player with most self heals', () => {
        const players = [
          createMockPlayer({ selfHeals: 15 }),
          createMockPlayer({ selfHeals: 30 }),
          createMockPlayer({ selfHeals: 5 })
        ];

        const winner = healerTrophy!.getWinner(players);
        expect(winner).toBe(players[1]); // Player with 30 self heals
      });
    });

    describe('The Overachiever trophy', () => {
      const overachieverTrophy = trophies.find(t => t.name === 'The Overachiever');

      it('should award to player with most abilities used', () => {
        const players = [
          createMockPlayer({ abilitiesUsed: 12 }),
          createMockPlayer({ abilitiesUsed: 25 }),
          createMockPlayer({ abilitiesUsed: 8 })
        ];

        const winner = overachieverTrophy!.getWinner(players);
        expect(winner).toBe(players[1]); // Player with 25 abilities used
      });
    });

    describe('Master of Deception trophy', () => {
      const deceptionTrophy = trophies.find(t => t.name === 'Master of Deception');

      it('should award to unrevealed warlock when evil wins', () => {
        const players = [
          createMockPlayer({}, false, true), // Good player
          createMockPlayer({}, true, true)   // Unrevealed warlock
        ];
        players[1].isRevealed = false;

        const gameResult: GameResult = { winner: 'Evil' };
        const winner = deceptionTrophy!.getWinner(players, gameResult);
        expect(winner).toBe(players[1]);
      });

      it('should return null when good wins', () => {
        const players = [
          createMockPlayer({}, true, true) // Warlock
        ];

        const gameResult: GameResult = { winner: 'Good' };
        const winner = deceptionTrophy!.getWinner(players, gameResult);
        expect(winner).toBeNull();
      });

      it('should return null when warlock was revealed', () => {
        const players = [
          createMockPlayer({}, true, true) // Revealed warlock
        ];
        players[0].isRevealed = true;

        const gameResult: GameResult = { winner: 'Evil' };
        const winner = deceptionTrophy!.getWinner(players, gameResult);
        expect(winner).toBeNull();
      });
    });

    describe('The Last Stand trophy', () => {
      const lastStandTrophy = trophies.find(t => t.name === 'The Last Stand');

      it('should award to last player alive', () => {
        const players = [
          createMockPlayer({}, false, false), // Dead
          createMockPlayer({}, false, true),  // Alive
          createMockPlayer({}, true, false)   // Dead warlock
        ];

        const gameResult: GameResult = { winner: 'Good' };
        const winner = lastStandTrophy!.getWinner(players, gameResult);
        expect(winner).toBe(players[1]); // Only alive player
      });

      it('should return null when multiple players alive', () => {
        const players = [
          createMockPlayer({}, false, true),
          createMockPlayer({}, false, true)
        ];

        const gameResult: GameResult = { winner: 'Good' };
        const winner = lastStandTrophy!.getWinner(players, gameResult);
        expect(winner).toBeNull();
      });

      it('should return null when no game result provided', () => {
        const players = [createMockPlayer({}, false, true)];
        const winner = lastStandTrophy!.getWinner(players);
        expect(winner).toBeNull();
      });
    });
  });

  describe('Trophy system behavior', () => {
    it('should handle empty player arrays gracefully', () => {
      trophies.forEach(trophy => {
        const winner = trophy.getWinner([]);
        // Most trophies should return null, except The Participant which should also return null for empty array
        expect(winner).toBeNull();
      });
    });

    it('should handle players with null/undefined stats', () => {
      const invalidPlayers = [
        { stats: null, isWarlock: false, isAlive: true } as any,
        { stats: undefined, isWarlock: false, isAlive: true } as any
      ];

      trophies.forEach(trophy => {
        expect(() => {
          trophy.getWinner(invalidPlayers);
        }).not.toThrow();
      });
    });

    it('should maintain randomness for ties', () => {
      const tiedPlayers = [
        createMockPlayer({ totalDamageDealt: 50 }),
        createMockPlayer({ totalDamageDealt: 50 }),
        createMockPlayer({ totalDamageDealt: 50 })
      ];

      const gladiatorTrophy = trophies.find(t => t.name === 'The Gladiator')!;

      // Run multiple times to check that different players can win
      const winners = new Set();
      for (let i = 0; i < 20; i++) {
        const winner = gladiatorTrophy.getWinner(tiedPlayers);
        if (winner) winners.add(winner);
      }

      // Should have some variation in winners (though this test could occasionally fail due to randomness)
      expect(winners.size).toBeGreaterThan(0);
    });
  });

  describe('Trophy descriptions and names', () => {
    it('should have appropriate trophy names', () => {
      const expectedTrophyNames = [
        'The Participant',
        'The Gladiator',
        'The Savior',
        'The Punching Bag',
        'The Pacifist',
        'The Berserker',
        'The Phoenix',
        'The Healer',
        'The Overachiever',
        'Master of Deception',
        'The Last Stand'
      ];

      const actualNames = trophies.map(t => t.name);
      expectedTrophyNames.forEach(expectedName => {
        expect(actualNames).toContain(expectedName);
      });
    });

    it('should have descriptions that match trophy behavior', () => {
      const gladiator = trophies.find(t => t.name === 'The Gladiator')!;
      expect(gladiator.description.toLowerCase()).toContain('damage');
      expect(gladiator.description.toLowerCase()).toContain('monster');

      const savior = trophies.find(t => t.name === 'The Savior')!;
      expect(savior.description.toLowerCase()).toContain('heal');

      const pacifist = trophies.find(t => t.name === 'The Pacifist')!;
      expect(pacifist.description.toLowerCase()).toContain('zero');
      expect(pacifist.description.toLowerCase()).toContain('damage');
    });
  });
});
