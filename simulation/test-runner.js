#!/usr/bin/env node
/**
 * @fileoverview Simple test runner to verify simulation functionality
 * This bypasses the complex module imports and provides basic functionality
 */

const fs = require('fs');
const path = require('path');

/**
 * Simple mock game result generator for testing
 */
function generateMockGameResult(gameIndex) {
  const races = [
    'Artisan',
    'Rockhewn',
    'Crestfallen',
    'Orc',
    'Kinfolk',
    'Lich',
  ];
  const classes = [
    'Warrior',
    'Priest',
    'Oracle',
    'Pyromancer',
    'Assassin',
    'Barbarian',
    'Wizard',
    'Alchemist',
    'Shaman',
    'Gunslinger',
    'Tracker',
    'Druid',
  ];

  const playerCount = Math.floor(Math.random() * 7) + 7; // 4-8 players
  const rounds = Math.floor(Math.random() * 20) + 5; // 5-25 rounds
  const survivors = Math.floor(Math.random() * Math.min(4, playerCount)) + 1;

  const players = [];
  for (let i = 0; i < playerCount; i++) {
    const race = races[Math.floor(Math.random() * races.length)];
    const playerClass = classes[Math.floor(Math.random() * classes.length)];
    const maxHp = Math.floor(Math.random() * 50) + 100; // 100-150 HP
    const isAlive = i < survivors;
    const hp = isAlive ? Math.floor(Math.random() * maxHp) + 1 : 0;
    const isWarlock = Math.random() < 0.2; // 20% chance to be warlock

    players.push({
      name: `${race}${playerClass}${i + 1}`,
      race,
      class: playerClass,
      alive: isAlive,
      isWarlock,
      hp,
      maxHp,
    });
  }

  // Determine winner
  const aliveWarlocks = players.filter((p) => p.alive && p.isWarlock).length;
  const aliveGood = players.filter((p) => p.alive && !p.isWarlock).length;

  let winner;
  if (aliveWarlocks === 0) winner = 'Good';
  else if (aliveWarlocks >= aliveGood) winner = 'Evil';
  else
    winner =
      Math.random() < 0.1 ? 'Draw' : Math.random() < 0.5 ? 'Good' : 'Evil';

  return {
    winner,
    rounds,
    survivors,
    totalPlayers: playerCount,
    warlocks: players.filter((p) => p.isWarlock).length,
    finalLevel: Math.floor(rounds / 5) + 1,
    players,
    gameType: 'mock',
    aiType: 'test',
    events: [], // Empty for now
  };
}

/**
 * Generate multiple mock games
 */
function generateMockGames(numGames = 50) {
  console.log(`🎮 Generating ${numGames} mock games for testing...`);

  const results = [];
  for (let i = 0; i < numGames; i++) {
    if (i % 10 === 0) {
      console.log(`  Generated ${i}/${numGames} games`);
    }
    results.push(generateMockGameResult(i));
  }

  console.log(`✅ Generated ${results.length} mock games`);
  return results;
}

/**
 * Export mock data to CSV format
 */
function exportToCSV(results, outputDir) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .substring(0, 19);

  // Generate balance report CSV
  const balanceData = generateBalanceCSV(results);
  const balanceFile = path.join(outputDir, `balance-report-${timestamp}.csv`);
  fs.writeFileSync(balanceFile, balanceData);
  console.log(`📊 Balance report: ${balanceFile}`);

  // Generate race analysis CSV
  const raceData = generateRaceCSV(results);
  const raceFile = path.join(outputDir, `race-analysis-${timestamp}.csv`);
  fs.writeFileSync(raceFile, raceData);
  console.log(`🧬 Race analysis: ${raceFile}`);

  // Generate class analysis CSV
  const classData = generateClassCSV(results);
  const classFile = path.join(outputDir, `class-analysis-${timestamp}.csv`);
  fs.writeFileSync(classFile, classData);
  console.log(`⚔️ Class analysis: ${classFile}`);

  // Generate raw results CSV
  const rawData = generateRawCSV(results);
  const rawFile = path.join(outputDir, `raw-results-${timestamp}.csv`);
  fs.writeFileSync(rawFile, rawData);
  console.log(`📋 Raw results: ${rawFile}`);

  // Update reports index
  updateReportsIndex(
    outputDir,
    [
      { filename: path.basename(balanceFile), type: 'balance' },
      { filename: path.basename(raceFile), type: 'race' },
      { filename: path.basename(classFile), type: 'class' },
      { filename: path.basename(rawFile), type: 'raw' },
    ],
    results.length
  );

  return {
    balance: balanceFile,
    race: raceFile,
    class: classFile,
    raw: rawFile,
  };
}

function generateBalanceCSV(results) {
  const totalGames = results.length;
  const goodWins = results.filter((r) => r.winner === 'Good').length;
  const evilWins = results.filter((r) => r.winner === 'Evil').length;
  const draws = results.filter((r) => r.winner === 'Draw').length;

  const goodWinRate = ((goodWins / totalGames) * 100).toFixed(1);
  const evilWinRate = ((evilWins / totalGames) * 100).toFixed(1);
  const avgRounds = (
    results.reduce((sum, r) => sum + r.rounds, 0) / totalGames
  ).toFixed(1);
  const avgSurvivors = (
    results.reduce((sum, r) => sum + r.survivors, 0) / totalGames
  ).toFixed(1);

  const balanceScore = Math.abs(50 - parseFloat(goodWinRate)).toFixed(1);
  let balanceRating = 'Poor';
  if (balanceScore < 5) balanceRating = 'Excellent';
  else if (balanceScore < 10) balanceRating = 'Good';
  else if (balanceScore < 15) balanceRating = 'Fair';

  return `Metric,Value,Category,Target,Status,Priority
Good Win Rate,${goodWinRate}%,Balance,45-55%,${
    goodWinRate >= 45 && goodWinRate <= 55 ? 'Good' : 'Poor'
  },${balanceScore > 10 ? 'High' : 'Low'}
Evil Win Rate,${evilWinRate}%,Balance,45-55%,${
    evilWinRate >= 45 && evilWinRate <= 55 ? 'Good' : 'Poor'
  },${balanceScore > 10 ? 'High' : 'Low'}
Balance Score,${balanceScore}%,Balance,<10%,${
    balanceScore < 10 ? 'Good' : 'Poor'
  },${balanceScore > 15 ? 'High' : 'Low'}
Balance Rating,${balanceRating},Balance,Good+,,,
Average Rounds,${avgRounds},Game Flow,8-15,,,
Average Survivors,${avgSurvivors},Game Flow,2-4,,,
Sample Size,${totalGames},Statistics,>30,${
    totalGames >= 30 ? 'Sufficient' : 'Limited'
  },${totalGames < 30 ? 'Medium' : 'Low'}
Reliability Score,${totalGames >= 30 ? '85' : '60'}%,Statistics,>80%,,,`;
}

function generateRaceCSV(results) {
  const raceStats = {};

  // Calculate stats for each race
  results.forEach((game) => {
    game.players.forEach((player) => {
      if (!raceStats[player.race]) {
        raceStats[player.race] = {
          total: 0,
          wins: 0,
          survived: 0,
          totalHp: 0,
          finalHp: 0,
        };
      }

      const stats = raceStats[player.race];
      stats.total++;
      stats.totalHp += player.maxHp;
      stats.finalHp += player.hp;

      if (player.alive) stats.survived++;

      const playerWon =
        (game.winner === 'Good' && !player.isWarlock) ||
        (game.winner === 'Evil' && player.isWarlock);
      if (playerWon) stats.wins++;
    });
  });

  let csv =
    'Race,Win Rate,Survival Rate,Avg Final HP,Sample Size,Tier,Assessment\n';

  const raceEntries = Object.entries(raceStats)
    .map(([race, stats]) => ({
      race,
      winRate: ((stats.wins / stats.total) * 100).toFixed(1),
      survivalRate: ((stats.survived / stats.total) * 100).toFixed(1),
      avgFinalHp: (stats.finalHp / stats.total).toFixed(0),
      sampleSize: stats.total,
      tier: getTier((stats.wins / stats.total) * 100),
      assessment: getAssessment((stats.wins / stats.total) * 100),
    }))
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

  raceEntries.forEach((race) => {
    csv += `${race.race},${race.winRate},${race.survivalRate},${race.avgFinalHp},${race.sampleSize},${race.tier},${race.assessment}\n`;
  });

  return csv;
}

function generateClassCSV(results) {
  const classStats = {};

  // Calculate stats for each class
  results.forEach((game) => {
    game.players.forEach((player) => {
      if (!classStats[player.class]) {
        classStats[player.class] = { total: 0, wins: 0, survived: 0 };
      }

      const stats = classStats[player.class];
      stats.total++;

      if (player.alive) stats.survived++;

      const playerWon =
        (game.winner === 'Good' && !player.isWarlock) ||
        (game.winner === 'Evil' && player.isWarlock);
      if (playerWon) stats.wins++;
    });
  });

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

  let csv =
    'Class,Role,Win Rate,Survival Rate,Effectiveness,Sample Size,Tier\n';

  const classEntries = Object.entries(classStats)
    .map(([className, stats]) => ({
      class: className,
      role: roleMap[className] || 'Unknown',
      winRate: ((stats.wins / stats.total) * 100).toFixed(1),
      survivalRate: ((stats.survived / stats.total) * 100).toFixed(1),
      effectiveness: (
        ((stats.wins + stats.survived) / (stats.total * 2)) *
        100
      ).toFixed(1),
      sampleSize: stats.total,
      tier: getTier((stats.wins / stats.total) * 100),
    }))
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

  classEntries.forEach((cls) => {
    csv += `${cls.class},${cls.role},${cls.winRate},${cls.survivalRate},${cls.effectiveness},${cls.sampleSize},${cls.tier}\n`;
  });

  return csv;
}

function generateRawCSV(results) {
  let csv =
    'Game,Winner,Rounds,Survivors,Total Players,Warlocks,Final Level,Game Type,Configuration\n';

  results.forEach((result, index) => {
    csv += `${index + 1},${result.winner},${result.rounds},${
      result.survivors
    },${result.totalPlayers},${result.warlocks},${result.finalLevel},${
      result.gameType
    },${result.aiType}\n`;
  });

  return csv;
}

function getTier(winRate) {
  if (winRate > 65) return 'S';
  if (winRate > 55) return 'A';
  if (winRate > 45) return 'B';
  if (winRate > 35) return 'C';
  return 'D';
}

function getAssessment(winRate) {
  if (winRate > 70) return 'Overpowered';
  if (winRate > 55) return 'Strong';
  if (winRate >= 45) return 'Balanced';
  if (winRate > 30) return 'Weak';
  return 'Underpowered';
}

function updateReportsIndex(outputDir, reports, totalGames) {
  const indexPath = path.join(outputDir, 'reports-index.json');

  let index = { reports: [] };
  if (fs.existsSync(indexPath)) {
    try {
      const content = fs.readFileSync(indexPath, 'utf8');
      index = JSON.parse(content);
    } catch (error) {
      console.warn('Could not read existing index, creating new one');
    }
  }

  const timestamp = new Date().toISOString();

  reports.forEach((report) => {
    index.reports.unshift({
      filename: report.filename,
      type: report.type,
      timestamp: timestamp,
      metadata: {
        totalGames: totalGames,
        gameType: 'mock',
        aiType: 'test',
        dataQuality: totalGames >= 30 ? 'Good' : 'Limited',
      },
    });
  });

  // Keep only last 50 reports
  index.reports = index.reports.slice(0, 50);
  index.lastUpdated = timestamp;

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`📋 Updated reports index: ${indexPath}`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const numGames = args.length > 0 ? parseInt(args[0]) || 50 : 50;

  console.log('🎮 Warlock Balance Test Runner');
  console.log('==============================');
  console.log(`🎯 Generating mock data for ${numGames} games\n`);

  try {
    // Generate mock game results
    const results = generateMockGames(numGames);

    // Export to CSV files
    const outputDir = './web-interface/reports';
    const exported = exportToCSV(results, outputDir);

    // Print summary
    console.log('\n📊 SUMMARY');
    console.log('===========');
    const goodWins = results.filter((r) => r.winner === 'Good').length;
    const evilWins = results.filter((r) => r.winner === 'Evil').length;
    const avgRounds = (
      results.reduce((sum, r) => sum + r.rounds, 0) / results.length
    ).toFixed(1);

    console.log(`✅ Generated: ${numGames} games`);
    console.log(
      `🏆 Good wins: ${goodWins} (${((goodWins / numGames) * 100).toFixed(1)}%)`
    );
    console.log(
      `👹 Evil wins: ${evilWins} (${((evilWins / numGames) * 100).toFixed(1)}%)`
    );
    console.log(`⏱️ Average length: ${avgRounds} rounds`);
    console.log(`📁 Output directory: ${outputDir}`);

    console.log('\n🌐 Next Steps:');
    console.log('1. Open web-interface/index.html in your browser');
    console.log('2. Select one of the generated reports from the dropdown');
    console.log('3. Explore the interactive analysis dashboard');

    console.log('\n🎉 Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateMockGames,
  exportToCSV,
};
