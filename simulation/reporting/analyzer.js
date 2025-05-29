/**
 * @fileoverview Advanced analytics for simulation results
 * Provides deeper insights into game balance and performance
 */

/**
 * Analyze detailed game results and provide insights
 * @param {Object} aggregatedResults - Results from simulation
 * @returns {Object} Detailed analysis
 */
function analyzeResults(aggregatedResults) {
  const { results, stats } = aggregatedResults;

  const analysis = {
    balance: analyzeBalance(stats),
    performance: analyzePerformance(stats),
    recommendations: generateRecommendations(stats),
    warlock: analyzeWarlockPerformance(results),
    survival: analyzeSurvivalRates(results),
  };

  return analysis;
}

/**
 * Analyze game balance
 * @param {Object} stats - Game statistics
 * @returns {Object} Balance analysis
 */
function analyzeBalance(stats) {
  const goodWinRate =
    stats.winners.Good / (stats.winners.Good + stats.winners.Evil);
  const balanceScore = Math.abs(0.5 - goodWinRate);

  return {
    goodWinRate: (goodWinRate * 100).toFixed(1) + '%',
    evilWinRate: ((1 - goodWinRate) * 100).toFixed(1) + '%',
    balanceScore: balanceScore.toFixed(3),
    balanceRating:
      balanceScore < 0.05
        ? 'Excellent'
        : balanceScore < 0.1
        ? 'Good'
        : balanceScore < 0.15
        ? 'Fair'
        : 'Poor',
    recommendation:
      balanceScore > 0.1
        ? goodWinRate > 0.55
          ? 'Buff Warlocks or Nerf Heroes'
          : 'Buff Heroes or Nerf Warlocks'
        : 'Balance is acceptable',
  };
}

/**
 * Analyze individual class/race performance
 * @param {Object} stats - Game statistics
 * @returns {Object} Performance analysis
 */
function analyzePerformance(stats) {
  const totalGames = Object.values(stats.winners).reduce((a, b) => a + b, 0);

  // Calculate relative performance (compared to 50% baseline)
  const classPerformance = Object.entries(stats.classWinRates)
    .map(([name, data]) => {
      const winRate = data.wins / totalGames;
      return {
        name,
        wins: data.wins,
        winRate: (winRate * 100).toFixed(1) + '%',
        relativePerformance: ((winRate - 0.5) * 100).toFixed(1) + '%',
        tier:
          winRate > 0.65
            ? 'S'
            : winRate > 0.55
            ? 'A'
            : winRate > 0.45
            ? 'B'
            : 'C',
      };
    })
    .sort((a, b) => b.wins - a.wins);

  const racePerformance = Object.entries(stats.raceWinRates)
    .map(([name, data]) => {
      const winRate = data.wins / totalGames;
      return {
        name,
        wins: data.wins,
        winRate: (winRate * 100).toFixed(1) + '%',
        relativePerformance: ((winRate - 0.5) * 100).toFixed(1) + '%',
        tier:
          winRate > 0.65
            ? 'S'
            : winRate > 0.55
            ? 'A'
            : winRate > 0.45
            ? 'B'
            : 'C',
      };
    })
    .sort((a, b) => b.wins - a.wins);

  return {
    classes: classPerformance,
    races: racePerformance,
    powerLevel: {
      strongest: classPerformance[0],
      weakest: classPerformance[classPerformance.length - 1],
      gap:
        (
          parseFloat(classPerformance[0].relativePerformance) -
          parseFloat(
            classPerformance[classPerformance.length - 1].relativePerformance
          )
        ).toFixed(1) + '%',
    },
  };
}

/**
 * Generate balance recommendations
 * @param {Object} stats - Game statistics
 * @returns {Array} List of recommendations
 */
function generateRecommendations(stats) {
  const recommendations = [];
  const totalGames = Object.values(stats.winners).reduce((a, b) => a + b, 0);

  // Analyze class balance
  Object.entries(stats.classWinRates).forEach(([className, data]) => {
    const winRate = data.wins / totalGames;

    if (winRate > 0.7) {
      recommendations.push({
        type: 'NERF',
        target: className,
        severity: 'HIGH',
        reason: `${className} has ${(winRate * 100).toFixed(
          1
        )}% win rate - significantly overpowered`,
        suggestions: getClassNerfSuggestions(className),
      });
    } else if (winRate < 0.4) {
      recommendations.push({
        type: 'BUFF',
        target: className,
        severity: 'HIGH',
        reason: `${className} has ${(winRate * 100).toFixed(
          1
        )}% win rate - significantly underpowered`,
        suggestions: getClassBuffSuggestions(className),
      });
    } else if (winRate > 0.6) {
      recommendations.push({
        type: 'NERF',
        target: className,
        severity: 'MEDIUM',
        reason: `${className} has ${(winRate * 100).toFixed(
          1
        )}% win rate - slightly overpowered`,
        suggestions: getClassNerfSuggestions(className),
      });
    } else if (winRate < 0.45) {
      recommendations.push({
        type: 'BUFF',
        target: className,
        severity: 'MEDIUM',
        reason: `${className} has ${(winRate * 100).toFixed(
          1
        )}% win rate - slightly underpowered`,
        suggestions: getClassBuffSuggestions(className),
      });
    }
  });

  return recommendations.sort((a, b) => {
    const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

/**
 * Get nerf suggestions for a class
 * @param {string} className - Class name
 * @returns {Array} Nerf suggestions
 */
function getClassNerfSuggestions(className) {
  const suggestions = {
    Priest: [
      'Reduce healing amounts by 10-20%',
      'Add cooldowns to healing abilities',
      'Reduce Dwarf stone armor initial value',
    ],
    Oracle: [
      'Increase mana cost for detection abilities',
      'Reduce Satyr life bond healing percentage',
      'Add failure chance to warlock detection',
    ],
    Warrior: [
      'Reduce armor values from shield abilities',
      'Increase cooldowns on defensive abilities',
      'Reduce Human adaptability power',
    ],
  };

  return (
    suggestions[className] || [
      'Review ability damage/healing values',
      'Consider adding cooldowns',
      'Reduce stat bonuses',
    ]
  );
}

/**
 * Get buff suggestions for a class
 * @param {string} className - Class name
 * @returns {Array} Buff suggestions
 */
function getClassBuffSuggestions(className) {
  const suggestions = {
    Barbarian: [
      'Reduce self-damage from abilities',
      'Add lifesteal to attacks',
      'Improve Orc blood rage effectiveness',
      'Give AI better strategy (attack players sometimes)',
    ],
    Pyromancer: [
      'Increase fire damage values',
      'Add more area-of-effect abilities',
      'Improve Skeleton undying reliability',
    ],
    Wizard: [
      'Increase spell damage',
      'Reduce mana costs',
      'Improve Elf moonbeam detection rate',
    ],
  };

  return (
    suggestions[className] || [
      'Increase ability damage/healing values',
      'Reduce cooldowns',
      'Improve stat bonuses',
    ]
  );
}

/**
 * Analyze warlock-specific performance
 * @param {Array} results - Individual game results
 * @returns {Object} Warlock analysis
 */
function analyzeWarlockPerformance(results) {
  // This would require more detailed game data
  // For now, return basic analysis
  return {
    conversionRate: 'Unknown - need more detailed logging',
    averageCorruptions: 'Unknown - need more detailed logging',
    mostEffectiveWarlocks: 'Unknown - need more detailed logging',
    note: 'Enhanced warlock analytics require more detailed game logging',
  };
}

/**
 * Analyze survival rates
 * @param {Array} results - Individual game results
 * @returns {Object} Survival analysis
 */
function analyzeSurvivalRates(results) {
  const totalGames = results.length;
  const averageSurvivors =
    results.reduce((sum, r) => sum + r.survivors, 0) / totalGames;

  return {
    averageSurvivors: averageSurvivors.toFixed(1),
    survivalRate: ((averageSurvivors / 6) * 100).toFixed(1) + '%',
    deadlyGame: averageSurvivors < 2,
    analysis:
      averageSurvivors < 1.5
        ? 'Very deadly - most players die'
        : averageSurvivors < 2.5
        ? 'Moderately deadly - about half survive'
        : 'Low lethality - most players survive',
  };
}

/**
 * Generate a comprehensive report
 * @param {Object} aggregatedResults - Results from simulation
 * @returns {string} Formatted report
 */
function generateReport(aggregatedResults) {
  const analysis = analyzeResults(aggregatedResults);

  let report = '\n' + '='.repeat(60) + '\n';
  report += 'WARLOCK GAME BALANCE ANALYSIS\n';
  report += '='.repeat(60) + '\n';

  // Balance Analysis
  report += '\nBALANCE OVERVIEW:\n';
  report += `  Good vs Evil: ${analysis.balance.goodWinRate} vs ${analysis.balance.evilWinRate}\n`;
  report += `  Balance Rating: ${analysis.balance.balanceRating}\n`;
  report += `  Recommendation: ${analysis.balance.recommendation}\n`;

  // Performance Tiers
  report += '\nCLASS PERFORMANCE TIERS:\n';
  analysis.performance.classes.forEach((cls) => {
    report += `  ${cls.tier}-Tier: ${cls.name} (${cls.winRate}, ${cls.relativePerformance})\n`;
  });

  // Power Gap
  report += '\nPOWER GAP ANALYSIS:\n';
  report += `  Strongest: ${analysis.performance.powerLevel.strongest.name} (${analysis.performance.powerLevel.strongest.winRate})\n`;
  report += `  Weakest: ${analysis.performance.powerLevel.weakest.name} (${analysis.performance.powerLevel.weakest.winRate})\n`;
  report += `  Gap: ${analysis.performance.powerLevel.gap} difference\n`;

  // Recommendations
  report += '\nBALANCE RECOMMENDATIONS:\n';
  analysis.recommendations.forEach((rec, i) => {
    report += `  ${i + 1}. ${rec.type} ${rec.target} (${
      rec.severity
    } priority)\n`;
    report += `     Reason: ${rec.reason}\n`;
    report += `     Suggestions:\n`;
    rec.suggestions.forEach((suggestion) => {
      report += `       - ${suggestion}\n`;
    });
    report += '\n';
  });

  report += '='.repeat(60) + '\n';

  return report;
}

module.exports = {
  analyzeResults,
  generateReport,
};
