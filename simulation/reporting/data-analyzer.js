/**
 * @fileoverview Advanced statistical analysis engine for simulation results
 * Calculates comprehensive metrics, correlations, and balance insights
 */

/**
 * Main data analyzer class for processing simulation results
 */
class DataAnalyzer {
  constructor() {
    this.confidenceLevel = 0.95;
    this.minSampleSize = 10;
  }

  /**
   * Analyze comprehensive simulation results
   * @param {Array} results - Array of game results
   * @param {Object} options - Analysis options
   * @returns {Object} Complete analysis report
   */
  analyzeResults(results, options = {}) {
    const validResults = this.validateResults(results);

    return {
      metadata: this.generateMetadata(validResults, options),
      balance: this.analyzeBalance(validResults),
      abilityPerformance: this.analyzeAbilityPerformance(validResults),
      raceAnalysis: this.analyzeRacePerformance(validResults),
      classAnalysis: this.analyzeClassPerformance(validResults),
      gameFlow: this.analyzeGameFlow(validResults),
      warlockAnalysis: this.analyzeWarlockPerformance(validResults),
      survivalAnalysis: this.analyzeSurvivalRates(validResults),
      recommendations: this.generateRecommendations(validResults),
      statisticalSignificance:
        this.calculateStatisticalSignificance(validResults),
    };
  }

  /**
   * Validate and clean simulation results
   * @param {Array} results - Raw results
   * @returns {Array} Validated results
   */
  validateResults(results) {
    return results.filter(
      (result) =>
        result &&
        result.winner &&
        result.gameSummary &&
        result.gameSummary.players &&
        result.rounds > 0
    );
  }

  /**
   * Generate analysis metadata
   * @param {Array} results - Validated results
   * @param {Object} options - Analysis options
   * @returns {Object} Metadata
   */
  generateMetadata(results, options) {
    return {
      totalGames: results.length,
      analysisDate: new Date().toISOString(),
      gameType: options.gameType || 'mixed',
      aiType: options.aiType || 'strategic',
      confidenceLevel: this.confidenceLevel,
      dataQuality: this.assessDataQuality(results),
    };
  }

  /**
   * Analyze overall game balance
   * @param {Array} results - Game results
   * @returns {Object} Balance analysis
   */
  analyzeBalance(results) {
    const winCounts = { Good: 0, Evil: 0, Draw: 0 };
    const roundDistribution = [];
    const survivorDistribution = [];

    results.forEach((result) => {
      winCounts[result.winner]++;
      roundDistribution.push(result.rounds);
      survivorDistribution.push(result.survivors);
    });

    const totalCompletedGames = winCounts.Good + winCounts.Evil;
    const goodWinRate =
      totalCompletedGames > 0 ? winCounts.Good / totalCompletedGames : 0;
    const balanceScore = Math.abs(0.5 - goodWinRate);

    return {
      winDistribution: winCounts,
      goodWinRate: goodWinRate * 100,
      evilWinRate: (1 - goodWinRate) * 100,
      balanceScore: balanceScore * 100,
      balanceRating: this.getBalanceRating(balanceScore),
      averageRounds: this.calculateMean(roundDistribution),
      medianRounds: this.calculateMedian(roundDistribution),
      averageSurvivors: this.calculateMean(survivorDistribution),
      roundVariance: this.calculateVariance(roundDistribution),
      confidenceInterval: this.calculateConfidenceInterval(
        goodWinRate,
        totalCompletedGames
      ),
    };
  }

  /**
   * Analyze ability performance across all games
   * @param {Array} results - Game results
   * @returns {Object} Ability analysis
   */
  analyzeAbilityPerformance(results) {
    const abilityStats = {};
    const damageByAbility = {};
    const healingByAbility = {};
    const usageFrequency = {};

    // This would be enhanced with actual ability usage tracking
    // For now, we'll provide a framework and simulate some data

    return {
      mostUsedAbilities: this.getMostUsedAbilities(results),
      mostEffectiveAbilities: this.getMostEffectiveAbilities(results),
      abilityWinCorrelation: this.calculateAbilityWinCorrelation(results),
      cooldownAnalysis: this.analyzeCooldownEffectiveness(results),
      multiTargetEffectiveness: this.analyzeMultiTargetAbilities(results),
    };
  }

  /**
   * Analyze race performance and balance
   * @param {Array} results - Game results
   * @returns {Object} Race analysis
   */
  analyzeRacePerformance(results) {
    const raceStats = {};
    const raceSurvival = {};
    const raceByTeamSize = {};

    results.forEach((result) => {
      result.gameSummary.players.forEach((player) => {
        if (!raceStats[player.race]) {
          raceStats[player.race] = {
            total: 0,
            wins: 0,
            asWarlock: 0,
            warlockWins: 0,
            totalHp: 0,
            finalHp: 0,
            deaths: 0,
          };
        }

        const stats = raceStats[player.race];
        stats.total++;
        stats.totalHp += player.maxHp;
        stats.finalHp += player.hp;

        if (!player.alive) stats.deaths++;
        if (player.isWarlock) stats.asWarlock++;

        const playerWon =
          (result.winner === 'Good' && !player.isWarlock) ||
          (result.winner === 'Evil' && player.isWarlock);

        if (playerWon) {
          stats.wins++;
          if (player.isWarlock) stats.warlockWins++;
        }

        // Track by team size
        const teamSize = result.gameSummary.players.length;
        if (!raceByTeamSize[player.race]) raceByTeamSize[player.race] = {};
        if (!raceByTeamSize[player.race][teamSize]) {
          raceByTeamSize[player.race][teamSize] = { games: 0, wins: 0 };
        }
        raceByTeamSize[player.race][teamSize].games++;
        if (playerWon) raceByTeamSize[player.race][teamSize].wins++;
      });
    });

    // Calculate rates and rankings
    const raceRankings = Object.entries(raceStats)
      .map(([race, stats]) => ({
        race,
        winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
        survivalRate:
          stats.total > 0
            ? ((stats.total - stats.deaths) / stats.total) * 100
            : 0,
        averageHp: stats.total > 0 ? stats.totalHp / stats.total : 0,
        averageFinalHp: stats.total > 0 ? stats.finalHp / stats.total : 0,
        warlockConversionRate:
          stats.total > 0 ? (stats.asWarlock / stats.total) * 100 : 0,
        warlockSuccessRate:
          stats.asWarlock > 0 ? (stats.warlockWins / stats.asWarlock) * 100 : 0,
        sampleSize: stats.total,
        tier: this.calculateTier(stats.wins / Math.max(1, stats.total)),
      }))
      .sort((a, b) => b.winRate - a.winRate);

    return {
      raceRankings,
      raceByTeamSize,
      racialAbilityImpact: this.analyzeRacialAbilityImpact(results),
      raceCompatibility: this.analyzeRaceClassCompatibility(results),
      survivalByRace: this.calculateSurvivalByRace(raceStats),
    };
  }

  /**
   * Analyze class performance and balance
   * @param {Array} results - Game results
   * @returns {Object} Class analysis
   */
  analyzeClassPerformance(results) {
    const classStats = {};
    const roleEffectiveness = { Tank: [], DPS: [], Healer: [], Utility: [] };

    results.forEach((result) => {
      result.gameSummary.players.forEach((player) => {
        if (!classStats[player.class]) {
          classStats[player.class] = {
            total: 0,
            wins: 0,
            deaths: 0,
            damageDealt: 0,
            healingDone: 0,
            damageReceived: 0,
            asWarlock: 0,
          };
        }

        const stats = classStats[player.class];
        stats.total++;
        if (!player.alive) stats.deaths++;
        if (player.isWarlock) stats.asWarlock++;

        const playerWon =
          (result.winner === 'Good' && !player.isWarlock) ||
          (result.winner === 'Evil' && player.isWarlock);
        if (playerWon) stats.wins++;

        // Classify into roles for analysis
        const role = this.classifyRole(player.class);
        roleEffectiveness[role].push({
          won: playerWon,
          survived: player.alive,
          hp: player.hp,
          maxHp: player.maxHp,
          rounds: result.rounds,
        });
      });
    });

    const classRankings = Object.entries(classStats)
      .map(([className, stats]) => ({
        class: className,
        winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
        survivalRate:
          stats.total > 0
            ? ((stats.total - stats.deaths) / stats.total) * 100
            : 0,
        warlockRate:
          stats.total > 0 ? (stats.asWarlock / stats.total) * 100 : 0,
        effectivenessScore: this.calculateClassEffectiveness(stats),
        sampleSize: stats.total,
        tier: this.calculateTier(stats.wins / Math.max(1, stats.total)),
      }))
      .sort((a, b) => b.winRate - a.winRate);

    return {
      classRankings,
      roleEffectiveness: this.calculateRoleEffectiveness(roleEffectiveness),
      classSynergy: this.analyzeClassSynergy(results),
      damageToHealingRatio: this.analyzeDamageHealingBalance(classStats),
    };
  }

  /**
   * Analyze game flow patterns
   * @param {Array} results - Game results
   * @returns {Object} Game flow analysis
   */
  analyzeGameFlow(results) {
    const roundProgression = {};
    const levelProgression = {};
    const monsterScaling = {};

    results.forEach((result) => {
      // Round-by-round analysis
      if (!roundProgression[result.rounds]) {
        roundProgression[result.rounds] = {
          count: 0,
          outcomes: { Good: 0, Evil: 0, Draw: 0 },
        };
      }
      roundProgression[result.rounds].count++;
      roundProgression[result.rounds].outcomes[result.winner]++;

      // Level progression
      if (!levelProgression[result.finalLevel]) {
        levelProgression[result.finalLevel] = {
          count: 0,
          avgRounds: 0,
          avgSurvivors: 0,
        };
      }
      levelProgression[result.finalLevel].count++;
      levelProgression[result.finalLevel].avgRounds += result.rounds;
      levelProgression[result.finalLevel].avgSurvivors += result.survivors;
    });

    // Calculate averages
    Object.values(levelProgression).forEach((level) => {
      if (level.count > 0) {
        level.avgRounds /= level.count;
        level.avgSurvivors /= level.count;
      }
    });

    return {
      roundDistribution: roundProgression,
      levelProgression,
      averageGameLength: this.calculateMean(results.map((r) => r.rounds)),
      gameEndingPatterns: this.analyzeGameEndingPatterns(results),
      corruptionTimings: this.analyzeCorruptionTimings(results),
      monsterEffectiveness: this.analyzeMonsterScaling(results),
    };
  }

  /**
   * Analyze Warlock-specific performance and mechanics
   * @param {Array} results - Game results
   * @returns {Object} Warlock analysis
   */
  analyzeWarlockPerformance(results) {
    let totalCorruptions = 0;
    let warlockWins = 0;
    let totalWarlocks = 0;
    const conversionsByRound = {};
    const warlockSurvival = {};

    results.forEach((result) => {
      if (result.winner === 'Evil') warlockWins++;

      result.gameSummary.players.forEach((player) => {
        if (player.isWarlock) {
          totalWarlocks++;
          if (!warlockSurvival[player.race]) {
            warlockSurvival[player.race] = { total: 0, survived: 0 };
          }
          warlockSurvival[player.race].total++;
          if (player.alive) warlockSurvival[player.race].survived++;
        }
      });

      // Track corruptions if available in game events
      if (result.events) {
        result.events.forEach((event) => {
          if (event.corruptions > 0) {
            totalCorruptions += event.corruptions;
            if (!conversionsByRound[event.round]) {
              conversionsByRound[event.round] = 0;
            }
            conversionsByRound[event.round] += event.corruptions;
          }
        });
      }
    });

    return {
      warlockWinRate:
        results.length > 0 ? (warlockWins / results.length) * 100 : 0,
      averageCorruptionsPerGame:
        results.length > 0 ? totalCorruptions / results.length : 0,
      conversionsByRound,
      warlockSurvivalByRace: warlockSurvival,
      conversionEffectiveness: this.calculateConversionEffectiveness(results),
      optimalWarlockCount: this.calculateOptimalWarlockCount(results),
    };
  }

  /**
   * Analyze survival rates and patterns
   * @param {Array} results - Game results
   * @returns {Object} Survival analysis
   */
  analyzeSurvivalRates(results) {
    const survivalByHp = {};
    const survivalByRounds = {};
    const survivalFactors = [];

    results.forEach((result) => {
      result.gameSummary.players.forEach((player) => {
        const hpPercent =
          Math.floor(((player.hp / player.maxHp) * 100) / 10) * 10;
        if (!survivalByHp[hpPercent])
          survivalByHp[hpPercent] = { total: 0, survived: 0 };
        survivalByHp[hpPercent].total++;
        if (player.alive) survivalByHp[hpPercent].survived++;

        survivalFactors.push({
          survived: player.alive,
          race: player.race,
          class: player.class,
          isWarlock: player.isWarlock,
          rounds: result.rounds,
          finalHp: player.hp,
          maxHp: player.maxHp,
          gameWinner: result.winner,
        });
      });

      const roundBucket = Math.floor(result.rounds / 5) * 5;
      if (!survivalByRounds[roundBucket]) {
        survivalByRounds[roundBucket] = { total: 0, avgSurvivors: 0 };
      }
      survivalByRounds[roundBucket].total++;
      survivalByRounds[roundBucket].avgSurvivors += result.survivors;
    });

    return {
      survivalByHpPercent: survivalByHp,
      survivalByGameLength: survivalByRounds,
      survivalFactorAnalysis: this.analyzeSurvivalFactors(survivalFactors),
      deadliestRounds: this.identifyDeadliestRounds(results),
      survivalStrategies: this.identifySurvivalStrategies(survivalFactors),
    };
  }

  /**
   * Generate balance recommendations
   * @param {Array} results - Game results
   * @returns {Object} Recommendations
   */
  generateRecommendations(results) {
    const analysis = {
      balance: this.analyzeBalance(results),
      races: this.analyzeRacePerformance(results),
      classes: this.analyzeClassPerformance(results),
      warlocks: this.analyzeWarlockPerformance(results),
    };

    const recommendations = [];

    // Balance recommendations
    if (analysis.balance.balanceScore > 15) {
      if (analysis.balance.goodWinRate > 60) {
        recommendations.push({
          type: 'BALANCE',
          priority: 'HIGH',
          target: 'Evil Team',
          issue: `Good team too strong (${analysis.balance.goodWinRate.toFixed(
            1
          )}% win rate)`,
          suggestions: [
            'Increase Warlock corruption chances',
            'Buff Warlock abilities or survivability',
            'Reduce Good team coordination bonuses',
          ],
        });
      } else {
        recommendations.push({
          type: 'BALANCE',
          priority: 'HIGH',
          target: 'Good Team',
          issue: `Evil team too strong (${analysis.balance.evilWinRate.toFixed(
            1
          )}% win rate)`,
          suggestions: [
            'Reduce Warlock corruption chances',
            'Buff Good team detection abilities',
            'Increase monster threat to Warlocks',
          ],
        });
      }
    }

    // Race recommendations
    const weakRaces = analysis.races.raceRankings.filter(
      (race) => race.winRate < 40 && race.sampleSize >= this.minSampleSize
    );
    weakRaces.forEach((race) => {
      recommendations.push({
        type: 'BUFF',
        priority: race.winRate < 30 ? 'HIGH' : 'MEDIUM',
        target: race.race,
        issue: `${race.race} underperforming (${race.winRate.toFixed(
          1
        )}% win rate)`,
        suggestions: this.generateRaceBuffSuggestions(race.race),
      });
    });

    const strongRaces = analysis.races.raceRankings.filter(
      (race) => race.winRate > 70 && race.sampleSize >= this.minSampleSize
    );
    strongRaces.forEach((race) => {
      recommendations.push({
        type: 'NERF',
        priority: race.winRate > 80 ? 'HIGH' : 'MEDIUM',
        target: race.race,
        issue: `${race.race} overperforming (${race.winRate.toFixed(
          1
        )}% win rate)`,
        suggestions: this.generateRaceNerfSuggestions(race.race),
      });
    });

    // Class recommendations
    const weakClasses = analysis.classes.classRankings.filter(
      (cls) => cls.winRate < 40 && cls.sampleSize >= this.minSampleSize
    );
    weakClasses.forEach((cls) => {
      recommendations.push({
        type: 'BUFF',
        priority: cls.winRate < 30 ? 'HIGH' : 'MEDIUM',
        target: cls.class,
        issue: `${cls.class} underperforming (${cls.winRate.toFixed(
          1
        )}% win rate)`,
        suggestions: this.generateClassBuffSuggestions(cls.class),
      });
    });

    return {
      summary: this.generateRecommendationSummary(recommendations),
      detailed: recommendations,
      priorityActions: recommendations.filter((r) => r.priority === 'HIGH'),
      balanceScore: analysis.balance.balanceScore,
      confidenceLevel: this.confidenceLevel,
    };
  }

  // Statistical helper methods
  calculateMean(values) {
    return values.length > 0
      ? values.reduce((sum, val) => sum + val, 0) / values.length
      : 0;
  }

  calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    return (
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length
    );
  }

  calculateConfidenceInterval(proportion, sampleSize) {
    if (sampleSize < 10) return { lower: 0, upper: 1, margin: 1 };

    const z = 1.96; // 95% confidence level
    const margin = z * Math.sqrt((proportion * (1 - proportion)) / sampleSize);

    return {
      lower: Math.max(0, proportion - margin) * 100,
      upper: Math.min(1, proportion + margin) * 100,
      margin: margin * 100,
    };
  }

  calculateStatisticalSignificance(results) {
    const sampleSize = results.length;
    const balanceAnalysis = this.analyzeBalance(results);

    return {
      sampleSize,
      sufficientSample: sampleSize >= this.minSampleSize,
      confidenceInterval: balanceAnalysis.confidenceInterval,
      marginOfError: balanceAnalysis.confidenceInterval.margin,
      reliabilityScore: this.calculateReliabilityScore(sampleSize),
      recommendations: this.getStatisticalRecommendations(sampleSize),
    };
  }

  // Helper methods for specific analyses
  getBalanceRating(balanceScore) {
    if (balanceScore < 0.05) return 'Excellent';
    if (balanceScore < 0.1) return 'Good';
    if (balanceScore < 0.15) return 'Fair';
    return 'Poor';
  }

  calculateTier(winRate) {
    if (winRate > 0.65) return 'S';
    if (winRate > 0.55) return 'A';
    if (winRate > 0.45) return 'B';
    if (winRate > 0.35) return 'C';
    return 'D';
  }

  classifyRole(className) {
    const roles = {
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
    return roles[className] || 'Utility';
  }

  // Placeholder implementations for complex analyses
  getMostUsedAbilities(results) {
    return [];
  }
  getMostEffectiveAbilities(results) {
    return [];
  }
  calculateAbilityWinCorrelation(results) {
    return {};
  }
  analyzeCooldownEffectiveness(results) {
    return {};
  }
  analyzeMultiTargetAbilities(results) {
    return {};
  }
  analyzeRacialAbilityImpact(results) {
    return {};
  }
  analyzeRaceClassCompatibility(results) {
    return {};
  }
  calculateSurvivalByRace(raceStats) {
    return {};
  }
  calculateRoleEffectiveness(roleData) {
    return {};
  }
  analyzeClassSynergy(results) {
    return {};
  }
  analyzeDamageHealingBalance(classStats) {
    return {};
  }
  calculateClassEffectiveness(stats) {
    return (stats.wins / Math.max(1, stats.total)) * 100;
  }
  analyzeGameEndingPatterns(results) {
    return {};
  }
  analyzeCorruptionTimings(results) {
    return {};
  }
  analyzeMonsterScaling(results) {
    return {};
  }
  calculateConversionEffectiveness(results) {
    return 0;
  }
  calculateOptimalWarlockCount(results) {
    return 1;
  }
  analyzeSurvivalFactors(factors) {
    return {};
  }
  identifyDeadliestRounds(results) {
    return [];
  }
  identifySurvivalStrategies(factors) {
    return [];
  }
  generateRaceBuffSuggestions(race) {
    return [`Improve ${race} racial ability`];
  }
  generateRaceNerfSuggestions(race) {
    return [`Tone down ${race} racial ability`];
  }
  generateClassBuffSuggestions(className) {
    return [`Increase ${className} damage/healing`];
  }
  generateRecommendationSummary(recommendations) {
    return `${recommendations.length} recommendations generated`;
  }
  assessDataQuality(results) {
    return results.length >= this.minSampleSize ? 'Good' : 'Limited';
  }
  calculateReliabilityScore(sampleSize) {
    return Math.min(1, sampleSize / 50) * 100;
  }
  getStatisticalRecommendations(sampleSize) {
    return sampleSize < 30
      ? ['Increase sample size for better confidence']
      : [];
  }
}

module.exports = DataAnalyzer;
