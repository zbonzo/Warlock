/**
 * @fileoverview CSV Exporter - Converts analysis results to CSV format
 * Handles multiple report types with standardized CSV output
 */

const fs = require('fs');
const path = require('path');

class CSVExporter {
  constructor(reportsDir = './reports') {
    this.reportsDir = reportsDir;
    this.ensureReportsDirectory();
  }

  /**
   * Ensure reports directory exists
   */
  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Export balance analysis to CSV
   * @param {Object} analysis - Analysis results
   * @param {Object} options - Export options
   * @returns {Promise<string>} File path
   */
  async exportBalanceReport(analysis, options = {}) {
    const timestamp = this.generateTimestamp();
    const filename = `balance-report-${timestamp}.csv`;
    const filepath = path.join(this.reportsDir, filename);

    const csvData = [
      // Headers
      ['Metric', 'Value', 'Category', 'Target', 'Status', 'Priority'],

      // Overall Balance
      [
        'Good Win Rate',
        `${analysis.balance.goodWinRate.toFixed(1)}%`,
        'Balance',
        '45-55%',
        this.getBalanceStatus(analysis.balance.goodWinRate),
        this.getBalancePriority(analysis.balance.goodWinRate),
      ],
      [
        'Evil Win Rate',
        `${analysis.balance.evilWinRate.toFixed(1)}%`,
        'Balance',
        '45-55%',
        this.getBalanceStatus(analysis.balance.evilWinRate),
        this.getBalancePriority(analysis.balance.evilWinRate),
      ],
      [
        'Balance Score',
        `${analysis.balance.balanceScore.toFixed(1)}%`,
        'Balance',
        '<10%',
        analysis.balance.balanceScore < 10 ? 'Good' : 'Poor',
        analysis.balance.balanceScore > 15 ? 'High' : 'Low',
      ],
      [
        'Balance Rating',
        analysis.balance.balanceRating,
        'Balance',
        'Good+',
        '',
        '',
      ],

      // Game Flow
      [
        'Average Rounds',
        analysis.balance.averageRounds.toFixed(1),
        'Game Flow',
        '8-15',
        '',
        '',
      ],
      [
        'Average Survivors',
        analysis.balance.averageSurvivors.toFixed(1),
        'Game Flow',
        '2-4',
        '',
        '',
      ],
      [
        'Round Variance',
        analysis.balance.roundVariance.toFixed(1),
        'Game Flow',
        '<50',
        '',
        '',
      ],

      // Confidence
      [
        'Sample Size',
        analysis.metadata.totalGames,
        'Statistics',
        '>30',
        analysis.metadata.totalGames >= 30 ? 'Sufficient' : 'Limited',
        analysis.metadata.totalGames < 30 ? 'Medium' : 'Low',
      ],
      [
        'Confidence Lower',
        `${analysis.balance.confidenceInterval.lower.toFixed(1)}%`,
        'Statistics',
        '',
        '',
        '',
      ],
      [
        'Confidence Upper',
        `${analysis.balance.confidenceInterval.upper.toFixed(1)}%`,
        'Statistics',
        '',
        '',
        '',
      ],
      [
        'Margin of Error',
        `${analysis.balance.confidenceInterval.margin.toFixed(1)}%`,
        'Statistics',
        '<5%',
        '',
        '',
      ],
      [
        'Reliability Score',
        `${analysis.statisticalSignificance.reliabilityScore.toFixed(0)}%`,
        'Statistics',
        '>80%',
        '',
        '',
      ],

      // Warlock Performance
      [
        'Warlock Win Rate',
        `${analysis.warlockAnalysis.warlockWinRate.toFixed(1)}%`,
        'Warlocks',
        '45-55%',
        '',
        '',
      ],
      [
        'Avg Corruptions',
        analysis.warlockAnalysis.averageCorruptionsPerGame.toFixed(1),
        'Warlocks',
        '0.5-1.5',
        '',
        '',
      ],
      [
        'Conversion Rate',
        `${analysis.warlockAnalysis.conversionEffectiveness.toFixed(1)}%`,
        'Warlocks',
        '20-40%',
        '',
        '',
      ],

      // High Priority Issues
      [
        'Critical Issues',
        analysis.recommendations.priorityActions?.length || 0,
        'Issues',
        '0',
        '',
        'High',
      ],
      [
        'Total Recommendations',
        analysis.recommendations.detailed?.length || 0,
        'Issues',
        '<5',
        '',
        '',
      ],
    ];

    const csvContent = this.arrayToCSV(csvData);
    await fs.promises.writeFile(filepath, csvContent, 'utf8');

    await this.updateReportsIndex(filename, 'balance', analysis.metadata);
    console.log(`Balance report exported: ${filepath}`);
    return filepath;
  }

  /**
   * Export race analysis to CSV
   * @param {Object} analysis - Analysis results
   * @returns {Promise<string>} File path
   */
  async exportRaceAnalysis(analysis) {
    const timestamp = this.generateTimestamp();
    const filename = `race-analysis-${timestamp}.csv`;
    const filepath = path.join(this.reportsDir, filename);

    const csvData = [
      [
        'Race',
        'Win Rate',
        'Survival Rate',
        'Avg Final HP',
        'Warlock Win Rate',
        'Good Win Rate',
        'Sample Size',
        'Tier',
        'Assessment',
        'Priority',
      ],
    ];

    analysis.raceAnalysis.raceRankings.forEach((race, index) => {
      csvData.push([
        race.race,
        race.winRate.toFixed(1),
        race.survivalRate.toFixed(1),
        race.averageFinalHp.toFixed(0),
        race.warlockSuccessRate?.toFixed(1) || 'N/A',
        (race.winRate - (race.warlockSuccessRate || 0) || race.winRate).toFixed(
          1
        ),
        race.sampleSize,
        race.tier,
        this.getRaceAssessment(race.winRate),
        this.getRacePriority(race.winRate, race.sampleSize),
      ]);
    });

    const csvContent = this.arrayToCSV(csvData);
    await fs.promises.writeFile(filepath, csvContent, 'utf8');

    await this.updateReportsIndex(filename, 'race', analysis.metadata);
    console.log(`Race analysis exported: ${filepath}`);
    return filepath;
  }

  /**
   * Export class analysis to CSV
   * @param {Object} analysis - Analysis results
   * @returns {Promise<string>} File path
   */
  async exportClassAnalysis(analysis) {
    const timestamp = this.generateTimestamp();
    const filename = `class-analysis-${timestamp}.csv`;
    const filepath = path.join(this.reportsDir, filename);

    const csvData = [
      [
        'Class',
        'Role',
        'Win Rate',
        'Survival Rate',
        'Effectiveness Score',
        'Sample Size',
        'Tier',
        'Assessment',
        'Priority',
      ],
    ];

    analysis.classAnalysis.classRankings.forEach((cls) => {
      csvData.push([
        cls.class,
        this.getClassRole(cls.class),
        cls.winRate.toFixed(1),
        cls.survivalRate.toFixed(1),
        cls.effectivenessScore.toFixed(1),
        cls.sampleSize,
        cls.tier,
        this.getClassAssessment(cls.winRate),
        this.getClassPriority(cls.winRate, cls.sampleSize),
      ]);
    });

    const csvContent = this.arrayToCSV(csvData);
    await fs.promises.writeFile(filepath, csvContent, 'utf8');

    await this.updateReportsIndex(filename, 'class', analysis.metadata);
    console.log(`Class analysis exported: ${filepath}`);
    return filepath;
  }

  /**
   * Export game flow analysis to CSV
   * @param {Object} analysis - Analysis results
   * @returns {Promise<string>} File path
   */
  async exportGameFlowAnalysis(analysis) {
    const timestamp = this.generateTimestamp();
    const filename = `game-flow-${timestamp}.csv`;
    const filepath = path.join(this.reportsDir, filename);

    const csvData = [
      [
        'Round Length',
        'Game Count',
        'Good Wins',
        'Evil Wins',
        'Draws',
        'Good Win Rate',
        'Avg Survivors',
        'Category',
      ],
    ];

    Object.entries(analysis.gameFlow.roundDistribution).forEach(
      ([rounds, data]) => {
        const totalGames = data.count;
        const goodWins = data.outcomes?.Good || 0;
        const evilWins = data.outcomes?.Evil || 0;
        const draws = data.outcomes?.Draw || 0;
        const goodWinRate =
          totalGames > 0 ? ((goodWins / totalGames) * 100).toFixed(1) : '0.0';
        const category = this.categorizeGameLength(parseInt(rounds));

        csvData.push([
          rounds,
          totalGames,
          goodWins,
          evilWins,
          draws,
          goodWinRate,
          (data.avgSurvivors || 0).toFixed(1),
          category,
        ]);
      }
    );

    const csvContent = this.arrayToCSV(csvData);
    await fs.promises.writeFile(filepath, csvContent, 'utf8');

    await this.updateReportsIndex(filename, 'gameflow', analysis.metadata);
    console.log(`Game flow analysis exported: ${filepath}`);
    return filepath;
  }

  /**
   * Export recommendations to CSV
   * @param {Object} analysis - Analysis results
   * @returns {Promise<string>} File path
   */
  async exportRecommendations(analysis) {
    const timestamp = this.generateTimestamp();
    const filename = `recommendations-${timestamp}.csv`;
    const filepath = path.join(this.reportsDir, filename);

    const csvData = [
      ['Priority', 'Type', 'Target', 'Issue', 'Suggestions', 'Confidence'],
    ];

    if (analysis.recommendations.detailed) {
      analysis.recommendations.detailed.forEach((rec) => {
        csvData.push([
          rec.priority,
          rec.type,
          rec.target,
          rec.issue,
          rec.suggestions.join('; '),
          `${(analysis.recommendations.confidenceLevel * 100).toFixed(0)}%`,
        ]);
      });
    }

    const csvContent = this.arrayToCSV(csvData);
    await fs.promises.writeFile(filepath, csvContent, 'utf8');

    await this.updateReportsIndex(
      filename,
      'recommendations',
      analysis.metadata
    );
    console.log(`Recommendations exported: ${filepath}`);
    return filepath;
  }

  /**
   * Export raw game results to CSV
   * @param {Array} results - Raw game results
   * @param {Object} metadata - Metadata about the results
   * @returns {Promise<string>} File path
   */
  async exportRawResults(results, metadata = {}) {
    const timestamp = this.generateTimestamp();
    const filename = `raw-results-${timestamp}.csv`;
    const filepath = path.join(this.reportsDir, filename);

    const csvData = [
      [
        'Game',
        'Winner',
        'Rounds',
        'Survivors',
        'Total Players',
        'Warlocks',
        'Final Level',
        'Game Type',
        'Configuration',
      ],
    ];

    results.forEach((result, index) => {
      csvData.push([
        index + 1,
        result.winner,
        result.rounds,
        result.survivors,
        result.totalPlayers || result.players?.length || 'N/A',
        result.warlocks || 'N/A',
        result.finalLevel || 'N/A',
        result.gameType || metadata.gameType || 'Unknown',
        result.configuration || result.setupType || 'N/A',
      ]);
    });

    const csvContent = this.arrayToCSV(csvData);
    await fs.promises.writeFile(filepath, csvContent, 'utf8');

    await this.updateReportsIndex(filename, 'raw', metadata);
    console.log(`Raw results exported: ${filepath}`);
    return filepath;
  }

  /**
   * Export comprehensive analysis (all data in one file)
   * @param {Object} analysis - Complete analysis results
   * @param {Array} rawResults - Raw game results
   * @returns {Promise<Object>} Exported file paths
   */
  async exportComprehensiveAnalysis(analysis, rawResults = []) {
    console.log('Exporting comprehensive analysis to CSV files...');

    const exportedFiles = {
      balance: await this.exportBalanceReport(analysis),
      race: await this.exportRaceAnalysis(analysis),
      class: await this.exportClassAnalysis(analysis),
      gameflow: await this.exportGameFlowAnalysis(analysis),
      recommendations: await this.exportRecommendations(analysis),
    };

    if (rawResults.length > 0) {
      exportedFiles.raw = await this.exportRawResults(
        rawResults,
        analysis.metadata
      );
    }

    console.log(`Exported ${Object.keys(exportedFiles).length} CSV files`);
    return exportedFiles;
  }

  /**
   * Update the reports index file
   * @param {string} filename - Report filename
   * @param {string} type - Report type
   * @param {Object} metadata - Report metadata
   */
  async updateReportsIndex(filename, type, metadata) {
    const indexPath = path.join(this.reportsDir, 'reports-index.json');

    let index = { reports: [] };
    if (fs.existsSync(indexPath)) {
      try {
        const indexContent = await fs.promises.readFile(indexPath, 'utf8');
        index = JSON.parse(indexContent);
      } catch (error) {
        console.warn('Could not read reports index, creating new one');
      }
    }

    const reportEntry = {
      filename,
      type,
      timestamp: new Date().toISOString(),
      metadata: {
        totalGames: metadata.totalGames || 0,
        gameType: metadata.gameType || 'unknown',
        aiType: metadata.aiType || 'unknown',
        dataQuality: metadata.dataQuality || 'unknown',
      },
    };

    index.reports.unshift(reportEntry); // Add to beginning
    index.reports = index.reports.slice(0, 50); // Keep only last 50 reports
    index.lastUpdated = new Date().toISOString();

    await fs.promises.writeFile(
      indexPath,
      JSON.stringify(index, null, 2),
      'utf8'
    );
  }

  /**
   * Convert 2D array to CSV string
   * @param {Array} data - 2D array of data
   * @returns {string} CSV content
   */
  arrayToCSV(data) {
    return data
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            // Escape cells that contain commas, quotes, or newlines
            if (
              cellStr.includes(',') ||
              cellStr.includes('"') ||
              cellStr.includes('\n')
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(',')
      )
      .join('\n');
  }

  /**
   * Generate timestamp for filenames
   * @returns {string} Timestamp string
   */
  generateTimestamp() {
    const now = new Date();
    return now
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '-')
      .substring(0, 19);
  }

  // Helper methods for status and priority assessment
  getBalanceStatus(winRate) {
    if (winRate >= 45 && winRate <= 55) return 'Good';
    if (winRate >= 40 && winRate <= 60) return 'Fair';
    return 'Poor';
  }

  getBalancePriority(winRate) {
    if (winRate < 35 || winRate > 65) return 'High';
    if (winRate < 40 || winRate > 60) return 'Medium';
    return 'Low';
  }

  getRaceAssessment(winRate) {
    if (winRate > 70) return 'Overpowered';
    if (winRate > 55) return 'Strong';
    if (winRate >= 45) return 'Balanced';
    if (winRate > 30) return 'Weak';
    return 'Underpowered';
  }

  getRacePriority(winRate, sampleSize) {
    if (sampleSize < 10) return 'Low'; // Insufficient data
    if (winRate < 30 || winRate > 70) return 'High';
    if (winRate < 40 || winRate > 60) return 'Medium';
    return 'Low';
  }

  getClassAssessment(winRate) {
    if (winRate > 65) return 'Overpowered';
    if (winRate > 55) return 'Strong';
    if (winRate >= 45) return 'Balanced';
    if (winRate > 35) return 'Weak';
    return 'Underpowered';
  }

  getClassPriority(winRate, sampleSize) {
    if (sampleSize < 5) return 'Low';
    if (winRate < 35 || winRate > 65) return 'High';
    if (winRate < 45 || winRate > 55) return 'Medium';
    return 'Low';
  }

  getClassRole(className) {
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
    return roles[className] || 'Unknown';
  }

  categorizeGameLength(rounds) {
    if (rounds <= 5) return 'Very Short';
    if (rounds <= 10) return 'Short';
    if (rounds <= 20) return 'Normal';
    if (rounds <= 30) return 'Long';
    return 'Very Long';
  }
}

module.exports = CSVExporter;
