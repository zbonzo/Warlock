/**
 * @fileoverview Data Collector - Processes raw game results into structured data
 * Prepares data for analysis and CSV export
 */

class DataCollector {
  constructor() {
    this.collectedData = {
      games: [],
      players: [],
      events: [],
      metadata: {},
    };
  }

  /**
   * Collect data from multiple game results
   * @param {Array} gameResults - Array of game result objects
   * @param {Object} options - Collection options
   * @returns {Object} Structured collected data
   */
  collectFromResults(gameResults, options = {}) {
    console.log(`Collecting data from ${gameResults.length} games...`);

    this.collectedData = {
      games: [],
      players: [],
      events: [],
      metadata: this.generateMetadata(gameResults, options),
    };

    gameResults.forEach((result, gameIndex) => {
      this.processGameResult(result, gameIndex);
    });

    console.log(
      `Collected data: ${this.collectedData.games.length} games, ${this.collectedData.players.length} players`
    );
    return this.collectedData;
  }

  /**
   * Process a single game result
   * @param {Object} gameResult - Single game result
   * @param {number} gameIndex - Game index
   */
  processGameResult(gameResult, gameIndex) {
    // Validate game result
    if (!this.isValidGameResult(gameResult)) {
      console.warn(`Skipping invalid game result at index ${gameIndex}`);
      return;
    }

    // Process game-level data
    const gameData = this.extractGameData(gameResult, gameIndex);
    this.collectedData.games.push(gameData);

    // Process player data
    if (gameResult.players || gameResult.gameSummary?.players) {
      const players = gameResult.players || gameResult.gameSummary.players;
      players.forEach((player, playerIndex) => {
        const playerData = this.extractPlayerData(
          player,
          gameIndex,
          playerIndex,
          gameResult
        );
        this.collectedData.players.push(playerData);
      });
    }

    // Process events if available
    if (gameResult.events) {
      gameResult.events.forEach((event, eventIndex) => {
        const eventData = this.extractEventData(event, gameIndex, eventIndex);
        this.collectedData.events.push(eventData);
      });
    }
  }

  /**
   * Extract game-level data
   * @param {Object} gameResult - Game result
   * @param {number} gameIndex - Game index
   * @returns {Object} Game data
   */
  extractGameData(gameResult, gameIndex) {
    return {
      gameId: gameIndex + 1,
      winner: gameResult.winner,
      rounds: gameResult.rounds,
      survivors: gameResult.survivors,
      totalPlayers: gameResult.totalPlayers || gameResult.players?.length || 0,
      warlockCount:
        gameResult.warlocks || this.countWarlocks(gameResult.players),
      finalLevel: gameResult.finalLevel || 1,
      gameType: gameResult.gameType || 'unknown',
      aiType: gameResult.aiType || 'unknown',
      configuration:
        gameResult.configuration || gameResult.setupType || 'random',

      // Calculated metrics
      gameLength: this.categorizeGameLength(gameResult.rounds),
      survivalRate:
        gameResult.survivors && gameResult.totalPlayers
          ? (gameResult.survivors / gameResult.totalPlayers) * 100
          : 0,
      corruptionEvents: this.countCorruptionEvents(gameResult.events),

      // Balance metrics
      goodPlayerCount: this.countGoodPlayers(gameResult.players),
      warlockPlayerCount: this.countWarlocks(gameResult.players),
      balanceScore: this.calculateGameBalanceScore(gameResult),

      // Timestamps
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract player-level data
   * @param {Object} player - Player object
   * @param {number} gameIndex - Game index
   * @param {number} playerIndex - Player index
   * @param {Object} gameResult - Full game result for context
   * @returns {Object} Player data
   */
  extractPlayerData(player, gameIndex, playerIndex, gameResult) {
    const playerWon = this.determinePlayerWin(player, gameResult.winner);

    return {
      gameId: gameIndex + 1,
      playerId: `${gameIndex + 1}-${playerIndex + 1}`,
      name: player.name,
      race: player.race,
      class: player.class,
      role: this.getPlayerRole(player.class),

      // Status
      alive: player.alive,
      isWarlock: player.isWarlock,
      won: playerWon,

      // Stats
      hp: player.hp,
      maxHp: player.maxHp,
      hpPercent: player.maxHp > 0 ? (player.hp / player.maxHp) * 100 : 0,

      // Performance metrics
      performance: this.calculatePlayerPerformance(player, playerWon),
      survivalValue: player.alive ? 1 : 0,
      winValue: playerWon ? 1 : 0,

      // Game context
      gameWinner: gameResult.winner,
      gameRounds: gameResult.rounds,
      totalPlayersInGame:
        gameResult.totalPlayers || gameResult.players?.length || 0,

      // Team information
      teamSize: gameResult.totalPlayers || gameResult.players?.length || 0,
      teamComposition: this.analyzeTeamComposition(gameResult.players),

      // Timestamps
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract event data
   * @param {Object} event - Event object
   * @param {number} gameIndex - Game index
   * @param {number} eventIndex - Event index
   * @returns {Object} Event data
   */
  extractEventData(event, gameIndex, eventIndex) {
    return {
      gameId: gameIndex + 1,
      eventId: `${gameIndex + 1}-${eventIndex + 1}`,
      round: event.round,
      type: event.type || 'unknown',

      // Event details
      alivePlayers: event.alivePlayers || 0,
      monsterHp: event.monsterHp || 0,
      level: event.level || 1,
      warlocksBefore: event.warlocksBefore || 0,
      warlocksAfter: event.warlocksAfter || 0,
      corruptions: event.corruptions || 0,

      // Calculated
      corruptionOccurred: (event.corruptions || 0) > 0,
      netCorruptions: (event.warlocksAfter || 0) - (event.warlocksBefore || 0),

      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate metadata about the collected data
   * @param {Array} gameResults - Game results
   * @param {Object} options - Collection options
   * @returns {Object} Metadata
   */
  generateMetadata(gameResults, options) {
    const validResults = gameResults.filter((r) => this.isValidGameResult(r));

    return {
      totalGames: validResults.length,
      invalidGames: gameResults.length - validResults.length,
      collectionDate: new Date().toISOString(),
      gameType: options.gameType || this.inferGameType(validResults),
      aiType: options.aiType || this.inferAIType(validResults),

      // Data quality assessment
      dataQuality: this.assessDataQuality(validResults),
      completenessScore: this.calculateCompletenessScore(validResults),

      // Game range info
      dateRange: this.calculateDateRange(validResults),
      roundRange: this.calculateRoundRange(validResults),
      playerCountRange: this.calculatePlayerCountRange(validResults),

      // Collection options
      options: options,

      // Summary stats
      summary: {
        totalPlayers: this.countTotalPlayers(validResults),
        totalRounds: this.countTotalRounds(validResults),
        totalCorruptions: this.countTotalCorruptions(validResults),
        winDistribution: this.calculateWinDistribution(validResults),
      },
    };
  }

  /**
   * Validate if a game result is usable
   * @param {Object} gameResult - Game result to validate
   * @returns {boolean} Whether the result is valid
   */
  isValidGameResult(gameResult) {
    return (
      gameResult &&
      gameResult.winner &&
      typeof gameResult.rounds === 'number' &&
      gameResult.rounds > 0 &&
      (gameResult.players || gameResult.gameSummary?.players)
    );
  }

  /**
   * Count Warlocks in a player array
   * @param {Array} players - Players array
   * @returns {number} Warlock count
   */
  countWarlocks(players) {
    if (!players) return 0;
    return players.filter((p) => p.isWarlock).length;
  }

  /**
   * Count Good players in a player array
   * @param {Array} players - Players array
   * @returns {number} Good player count
   */
  countGoodPlayers(players) {
    if (!players) return 0;
    return players.filter((p) => !p.isWarlock).length;
  }

  /**
   * Count corruption events in events array
   * @param {Array} events - Events array
   * @returns {number} Corruption event count
   */
  countCorruptionEvents(events) {
    if (!events) return 0;
    return events.reduce((sum, event) => sum + (event.corruptions || 0), 0);
  }

  /**
   * Determine if a player won their game
   * @param {Object} player - Player object
   * @param {string} gameWinner - Game winner ('Good', 'Evil', 'Draw')
   * @returns {boolean} Whether player won
   */
  determinePlayerWin(player, gameWinner) {
    if (gameWinner === 'Draw') return false;
    if (gameWinner === 'Good' && !player.isWarlock) return true;
    if (gameWinner === 'Evil' && player.isWarlock) return true;
    return false;
  }

  /**
   * Get player role based on class
   * @param {string} className - Player class
   * @returns {string} Player role
   */
  getPlayerRole(className) {
    const roleMap = {
      Warrior: 'Tank',
      Priest: 'Healer',
      Oracle: 'Utility',
      Pyromancer: 'DPS',
      Wizard: 'DPS',
      Assassin: 'DPS',
      Barbarian: 'DPS',
      Alchemist: 'Utility',
      Shaman: 'Healer',
      Gunslinger: 'DPS',
      Tracker: 'Utility',
      Druid: 'Healer',
    };
    return roleMap[className] || 'Unknown';
  }

  /**
   * Calculate player performance score
   * @param {Object} player - Player object
   * @param {boolean} won - Whether player won
   * @returns {number} Performance score (0-100)
   */
  calculatePlayerPerformance(player, won) {
    let score = 0;

    // Base score for survival
    if (player.alive) score += 40;

    // Base score for winning
    if (won) score += 50;

    // Bonus for high HP
    if (player.maxHp > 0) {
      const hpPercent = player.hp / player.maxHp;
      score += hpPercent * 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Categorize game length
   * @param {number} rounds - Number of rounds
   * @returns {string} Game length category
   */
  categorizeGameLength(rounds) {
    if (rounds <= 5) return 'Very Short';
    if (rounds <= 10) return 'Short';
    if (rounds <= 20) return 'Normal';
    if (rounds <= 30) return 'Long';
    return 'Very Long';
  }

  /**
   * Calculate game balance score
   * @param {Object} gameResult - Game result
   * @returns {number} Balance score (0-100)
   */
  calculateGameBalanceScore(gameResult) {
    const players = gameResult.players || gameResult.gameSummary?.players || [];
    const totalPlayers = players.length;
    const warlocks = this.countWarlocks(players);
    const survivors = gameResult.survivors || 0;

    let score = 50; // Base balanced score

    // Adjust for Warlock ratio (ideal is 1 Warlock per 4-6 players)
    const idealWarlockRatio = totalPlayers <= 4 ? 0.25 : 0.2;
    const actualWarlockRatio = totalPlayers > 0 ? warlocks / totalPlayers : 0;
    const ratioDeviation = Math.abs(actualWarlockRatio - idealWarlockRatio);
    score -= ratioDeviation * 100;

    // Adjust for survival rate (ideal is 25-50% survival)
    const survivalRate = totalPlayers > 0 ? survivors / totalPlayers : 0;
    if (survivalRate < 0.1 || survivalRate > 0.8) {
      score -= 20; // Too many or too few survivors
    }

    // Adjust for game length (ideal is 8-20 rounds)
    if (gameResult.rounds < 5 || gameResult.rounds > 30) {
      score -= 15; // Too short or too long
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Analyze team composition
   * @param {Array} players - Players array
   * @returns {Object} Team composition analysis
   */
  analyzeTeamComposition(players) {
    if (!players) return {};

    const composition = {
      totalPlayers: players.length,
      races: {},
      classes: {},
      roles: { Tank: 0, DPS: 0, Healer: 0, Utility: 0 },
      diversity: {
        raceCount: 0,
        classCount: 0,
        balanced: false,
      },
    };

    players.forEach((player) => {
      // Count races
      composition.races[player.race] =
        (composition.races[player.race] || 0) + 1;

      // Count classes
      composition.classes[player.class] =
        (composition.classes[player.class] || 0) + 1;

      // Count roles
      const role = this.getPlayerRole(player.class);
      composition.roles[role]++;
    });

    // Calculate diversity
    composition.diversity.raceCount = Object.keys(composition.races).length;
    composition.diversity.classCount = Object.keys(composition.classes).length;
    composition.diversity.balanced =
      composition.roles.Tank >= 1 &&
      composition.roles.Healer >= 1 &&
      composition.roles.DPS >= 1;

    return composition;
  }

  /**
   * Infer game type from results
   * @param {Array} results - Game results
   * @returns {string} Inferred game type
   */
  inferGameType(results) {
    if (results.length === 0) return 'unknown';

    const gameTypes = results.map((r) => r.gameType).filter(Boolean);
    if (gameTypes.length === 0) return 'mixed';

    // Return most common game type
    const typeCount = {};
    gameTypes.forEach((type) => {
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0][0];
  }

  /**
   * Infer AI type from results
   * @param {Array} results - Game results
   * @returns {string} Inferred AI type
   */
  inferAIType(results) {
    if (results.length === 0) return 'unknown';

    const aiTypes = results.map((r) => r.aiType).filter(Boolean);
    if (aiTypes.length === 0) return 'mixed';

    // Return most common AI type
    const typeCount = {};
    aiTypes.forEach((type) => {
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    return Object.entries(typeCount).sort(([, a], [, b]) => b - a)[0][0];
  }

  /**
   * Assess overall data quality
   * @param {Array} results - Game results
   * @returns {string} Data quality assessment
   */
  assessDataQuality(results) {
    if (results.length < 10) return 'Limited';
    if (results.length < 30) return 'Fair';
    if (results.length < 100) return 'Good';
    return 'Excellent';
  }

  /**
   * Calculate completeness score
   * @param {Array} results - Game results
   * @returns {number} Completeness score (0-100)
   */
  calculateCompletenessScore(results) {
    if (results.length === 0) return 0;

    let totalScore = 0;
    let maxScore = 0;

    results.forEach((result) => {
      let score = 0;
      maxScore += 10;

      // Basic data
      if (result.winner) score += 2;
      if (result.rounds) score += 2;
      if (result.players || result.gameSummary?.players) score += 3;
      if (result.survivors !== undefined) score += 1;

      // Enhanced data
      if (result.events) score += 1;
      if (result.gameType) score += 0.5;
      if (result.finalLevel) score += 0.5;

      totalScore += score;
    });

    return maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  }

  /**
   * Calculate date range of results
   * @param {Array} results - Game results
   * @returns {Object} Date range
   */
  calculateDateRange(results) {
    if (results.length === 0) return { start: null, end: null, span: 0 };

    // For now, return current date since we don't have timestamps in results
    const now = new Date().toISOString();
    return {
      start: now,
      end: now,
      span: 0,
    };
  }

  /**
   * Calculate round range
   * @param {Array} results - Game results
   * @returns {Object} Round range
   */
  calculateRoundRange(results) {
    if (results.length === 0) return { min: 0, max: 0, avg: 0 };

    const rounds = results
      .map((r) => r.rounds)
      .filter((r) => typeof r === 'number');
    if (rounds.length === 0) return { min: 0, max: 0, avg: 0 };

    return {
      min: Math.min(...rounds),
      max: Math.max(...rounds),
      avg: rounds.reduce((sum, r) => sum + r, 0) / rounds.length,
    };
  }

  /**
   * Calculate player count range
   * @param {Array} results - Game results
   * @returns {Object} Player count range
   */
  calculatePlayerCountRange(results) {
    if (results.length === 0) return { min: 0, max: 0, avg: 0 };

    const playerCounts = results
      .map((r) => r.totalPlayers || r.players?.length || 0)
      .filter((c) => c > 0);

    if (playerCounts.length === 0) return { min: 0, max: 0, avg: 0 };

    return {
      min: Math.min(...playerCounts),
      max: Math.max(...playerCounts),
      avg: playerCounts.reduce((sum, c) => sum + c, 0) / playerCounts.length,
    };
  }

  /**
   * Count total players across all games
   * @param {Array} results - Game results
   * @returns {number} Total player count
   */
  countTotalPlayers(results) {
    return results.reduce((sum, result) => {
      return sum + (result.totalPlayers || result.players?.length || 0);
    }, 0);
  }

  /**
   * Count total rounds across all games
   * @param {Array} results - Game results
   * @returns {number} Total round count
   */
  countTotalRounds(results) {
    return results.reduce((sum, result) => {
      return sum + (result.rounds || 0);
    }, 0);
  }

  /**
   * Count total corruptions across all games
   * @param {Array} results - Game results
   * @returns {number} Total corruption count
   */
  countTotalCorruptions(results) {
    return results.reduce((sum, result) => {
      return sum + this.countCorruptionEvents(result.events);
    }, 0);
  }

  /**
   * Calculate win distribution
   * @param {Array} results - Game results
   * @returns {Object} Win distribution
   */
  calculateWinDistribution(results) {
    const distribution = { Good: 0, Evil: 0, Draw: 0 };

    results.forEach((result) => {
      if (distribution.hasOwnProperty(result.winner)) {
        distribution[result.winner]++;
      }
    });

    const total = distribution.Good + distribution.Evil + distribution.Draw;

    return {
      counts: distribution,
      percentages: {
        Good: total > 0 ? (distribution.Good / total) * 100 : 0,
        Evil: total > 0 ? (distribution.Evil / total) * 100 : 0,
        Draw: total > 0 ? (distribution.Draw / total) * 100 : 0,
      },
      total,
    };
  }

  /**
   * Get summary statistics for collected data
   * @returns {Object} Summary statistics
   */
  getSummary() {
    const games = this.collectedData.games;
    const players = this.collectedData.players;
    const events = this.collectedData.events;

    return {
      games: {
        total: games.length,
        winDistribution: this.calculateWinDistributionFromGames(games),
        averageRounds: this.calculateAverageRounds(games),
        averageSurvivors: this.calculateAverageSurvivors(games),
      },
      players: {
        total: players.length,
        raceDistribution: this.calculateRaceDistribution(players),
        classDistribution: this.calculateClassDistribution(players),
        roleDistribution: this.calculateRoleDistribution(players),
        averagePerformance: this.calculateAveragePerformance(players),
      },
      events: {
        total: events.length,
        corruptionEvents: events.filter((e) => e.corruptionOccurred).length,
        averageCorruptionsPerGame:
          games.length > 0
            ? events.filter((e) => e.corruptionOccurred).length / games.length
            : 0,
      },
      metadata: this.collectedData.metadata,
    };
  }

  // Helper methods for summary calculations
  calculateWinDistributionFromGames(games) {
    const distribution = { Good: 0, Evil: 0, Draw: 0 };
    games.forEach((game) => {
      if (distribution.hasOwnProperty(game.winner)) {
        distribution[game.winner]++;
      }
    });
    return distribution;
  }

  calculateAverageRounds(games) {
    if (games.length === 0) return 0;
    return games.reduce((sum, game) => sum + game.rounds, 0) / games.length;
  }

  calculateAverageSurvivors(games) {
    if (games.length === 0) return 0;
    return games.reduce((sum, game) => sum + game.survivors, 0) / games.length;
  }

  calculateRaceDistribution(players) {
    const distribution = {};
    players.forEach((player) => {
      distribution[player.race] = (distribution[player.race] || 0) + 1;
    });
    return distribution;
  }

  calculateClassDistribution(players) {
    const distribution = {};
    players.forEach((player) => {
      distribution[player.class] = (distribution[player.class] || 0) + 1;
    });
    return distribution;
  }

  calculateRoleDistribution(players) {
    const distribution = {};
    players.forEach((player) => {
      distribution[player.role] = (distribution[player.role] || 0) + 1;
    });
    return distribution;
  }

  calculateAveragePerformance(players) {
    if (players.length === 0) return 0;
    return (
      players.reduce((sum, player) => sum + player.performance, 0) /
      players.length
    );
  }

  /**
   * Export collected data to structured format
   * @returns {Object} Exportable data structure
   */
  exportData() {
    return {
      ...this.collectedData,
      summary: this.getSummary(),
      exportedAt: new Date().toISOString(),
    };
  }
}

module.exports = DataCollector;
