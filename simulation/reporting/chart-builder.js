/**
 * @fileoverview Interactive chart builder using Chart.js
 * Creates beautiful, responsive visualizations for game balance analysis
 */

/**
 * Chart builder class for creating interactive visualizations
 */
class ChartBuilder {
  constructor() {
    this.defaultColors = [
      '#3B82F6',
      '#EF4444',
      '#10B981',
      '#F59E0B',
      '#8B5CF6',
      '#EC4899',
      '#06B6D4',
      '#84CC16',
      '#F97316',
      '#6366F1',
    ];
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
      },
    };
  }

  /**
   * Create win rate distribution pie chart
   * @param {Object} winData - Win distribution data
   * @returns {Object} Chart configuration
   */
  createWinDistributionChart(winData) {
    return {
      type: 'doughnut',
      data: {
        labels: ['Good Team', 'Evil Team', 'Draws'],
        datasets: [
          {
            data: [winData.Good, winData.Evil, winData.Draw],
            backgroundColor: ['#10B981', '#EF4444', '#6B7280'],
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        ...this.chartOptions,
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: 'Win Distribution',
            font: { size: 16, weight: 'bold' },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.raw / total) * 100).toFixed(1);
                return `${context.label}: ${context.raw} (${percentage}%)`;
              },
            },
          },
        },
      },
    };
  }

  /**
   * Create race performance bar chart
   * @param {Array} raceData - Race performance data
   * @returns {Object} Chart configuration
   */
  createRacePerformanceChart(raceData) {
    const sortedRaces = raceData.sort((a, b) => b.winRate - a.winRate);

    return {
      type: 'bar',
      data: {
        labels: sortedRaces.map((race) => race.race),
        datasets: [
          {
            label: 'Win Rate (%)',
            data: sortedRaces.map((race) => race.winRate),
            backgroundColor: '#3B82F6',
            borderColor: '#1D4ED8',
            borderWidth: 1,
          },
          {
            label: 'Survival Rate (%)',
            data: sortedRaces.map((race) => race.survivalRate),
            backgroundColor: '#10B981',
            borderColor: '#059669',
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...this.chartOptions,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => value + '%',
            },
          },
        },
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: 'Race Performance Analysis',
            font: { size: 16, weight: 'bold' },
          },
        },
      },
    };
  }

  /**
   * Create class effectiveness radar chart
   * @param {Array} classData - Class performance data
   * @returns {Object} Chart configuration
   */
  createClassRadarChart(classData) {
    const topClasses = classData.slice(0, 6);

    return {
      type: 'radar',
      data: {
        labels: [
          'Win Rate',
          'Survival',
          'Effectiveness',
          'Sample Size',
          'Balance',
          'Versatility',
        ],
        datasets: topClasses.map((cls, index) => ({
          label: cls.class,
          data: [
            cls.winRate,
            cls.survivalRate,
            cls.effectivenessScore,
            Math.min(100, (cls.sampleSize / 50) * 100), // Normalize sample size
            100 - Math.abs(50 - cls.winRate), // Balance score (closer to 50% = better)
            this.calculateVersatility(cls), // Custom versatility metric
          ],
          backgroundColor: this.defaultColors[index] + '20',
          borderColor: this.defaultColors[index],
          borderWidth: 2,
          pointBackgroundColor: this.defaultColors[index],
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        })),
      },
      options: {
        ...this.chartOptions,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
            },
          },
        },
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: 'Class Performance Radar',
            font: { size: 16, weight: 'bold' },
          },
        },
      },
    };
  }

  /**
   * Create game flow line chart
   * @param {Object} gameFlowData - Game flow analysis data
   * @returns {Object} Chart configuration
   */
  createGameFlowChart(gameFlowData) {
    const roundData = Object.entries(gameFlowData.roundDistribution)
      .map(([rounds, data]) => ({
        x: parseInt(rounds),
        y: data.count,
        goodWins: data.outcomes.Good,
        evilWins: data.outcomes.Evil,
        draws: data.outcomes.Draw,
      }))
      .sort((a, b) => a.x - b.x);

    return {
      type: 'line',
      data: {
        labels: roundData.map((d) => `${d.x} rounds`),
        datasets: [
          {
            label: 'Total Games',
            data: roundData.map((d) => d.y),
            borderColor: '#3B82F6',
            backgroundColor: '#3B82F620',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Good Wins',
            data: roundData.map((d) => d.goodWins),
            borderColor: '#10B981',
            backgroundColor: '#10B98120',
            tension: 0.4,
          },
          {
            label: 'Evil Wins',
            data: roundData.map((d) => d.evilWins),
            borderColor: '#EF4444',
            backgroundColor: '#EF444420',
            tension: 0.4,
          },
        ],
      },
      options: {
        ...this.chartOptions,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Games',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Game Length (Rounds)',
            },
          },
        },
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: 'Game Length Distribution & Outcomes',
            font: { size: 16, weight: 'bold' },
          },
        },
      },
    };
  }

  /**
   * Create survival analysis scatter plot
   * @param {Object} survivalData - Survival analysis data
   * @returns {Object} Chart configuration
   */
  createSurvivalScatterChart(survivalData) {
    const hpData = Object.entries(survivalData.survivalByHpPercent)
      .map(([hp, data]) => ({
        x: parseInt(hp),
        y: data.total > 0 ? (data.survived / data.total) * 100 : 0,
        size: data.total,
      }))
      .sort((a, b) => a.x - b.x);

    return {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Survival Rate by HP',
            data: hpData.map((d) => ({ x: d.x, y: d.y })),
            backgroundColor: '#8B5CF6',
            borderColor: '#7C3AED',
            pointRadius: hpData.map((d) =>
              Math.max(5, Math.min(15, d.size / 2))
            ),
            pointHoverRadius: hpData.map((d) =>
              Math.max(7, Math.min(17, d.size / 2))
            ),
          },
        ],
      },
      options: {
        ...this.chartOptions,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Final HP Percentage',
            },
            min: 0,
            max: 100,
          },
          y: {
            title: {
              display: true,
              text: 'Survival Rate (%)',
            },
            min: 0,
            max: 100,
          },
        },
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: 'Survival Rate vs Final HP',
            font: { size: 16, weight: 'bold' },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const dataPoint = hpData[context.dataIndex];
                return [
                  `HP: ${dataPoint.x}%`,
                  `Survival: ${dataPoint.y.toFixed(1)}%`,
                  `Sample: ${dataPoint.size} players`,
                ];
              },
            },
          },
        },
      },
    };
  }

  /**
   * Create Warlock performance analysis chart
   * @param {Object} warlockData - Warlock analysis data
   * @returns {Object} Chart configuration
   */
  createWarlockAnalysisChart(warlockData) {
    const conversionData = Object.entries(warlockData.conversionsByRound)
      .map(([round, count]) => ({ x: parseInt(round), y: count }))
      .sort((a, b) => a.x - b.x);

    return {
      type: 'bar',
      data: {
        labels: conversionData.map((d) => `Round ${d.x}`),
        datasets: [
          {
            label: 'Corruptions',
            data: conversionData.map((d) => d.y),
            backgroundColor: '#DC2626',
            borderColor: '#B91C1C',
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...this.chartOptions,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Corruptions',
            },
          },
        },
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: 'Corruption Events by Round',
            font: { size: 16, weight: 'bold' },
          },
        },
      },
    };
  }

  /**
   * Create balance timeline chart
   * @param {Array} timelineData - Balance data over time
   * @returns {Object} Chart configuration
   */
  createBalanceTimelineChart(timelineData) {
    return {
      type: 'line',
      data: {
        labels: timelineData.map((_, index) => `Batch ${index + 1}`),
        datasets: [
          {
            label: 'Good Win Rate (%)',
            data: timelineData.map((batch) => batch.goodWinRate),
            borderColor: '#10B981',
            backgroundColor: '#10B98120',
            tension: 0.4,
            fill: false,
          },
          {
            label: 'Target (50%)',
            data: Array(timelineData.length).fill(50),
            borderColor: '#6B7280',
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        ...this.chartOptions,
        scales: {
          y: {
            min: 30,
            max: 70,
            title: {
              display: true,
              text: 'Win Rate (%)',
            },
          },
        },
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: 'Balance Trend Over Time',
            font: { size: 16, weight: 'bold' },
          },
        },
      },
    };
  }

  /**
   * Create ability usage heatmap data
   * @param {Object} abilityData - Ability usage data
   * @returns {Object} Heatmap configuration
   */
  createAbilityHeatmapData(abilityData) {
    // This would be used with a custom heatmap implementation
    // or adapted for a matrix chart
    return {
      type: 'matrix',
      data: {
        datasets: [
          {
            label: 'Ability Effectiveness',
            data: abilityData.effectiveness || [],
            backgroundColor: (ctx) => {
              const value = ctx.parsed.v;
              const alpha = value / 100;
              return `rgba(59, 130, 246, ${alpha})`;
            },
            borderColor: '#1D4ED8',
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...this.chartOptions,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
          },
          y: {
            type: 'linear',
          },
        },
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: 'Ability Effectiveness Matrix',
            font: { size: 16, weight: 'bold' },
          },
        },
      },
    };
  }

  /**
   * Create race-class compatibility matrix
   * @param {Object} compatibilityData - Race-class compatibility data
   * @returns {Object} Chart configuration
   */
  createCompatibilityMatrix(compatibilityData) {
    const races = Object.keys(compatibilityData);
    const classes = [
      ...new Set(Object.values(compatibilityData).flatMap(Object.keys)),
    ];

    const matrixData = [];
    races.forEach((race, raceIndex) => {
      classes.forEach((cls, classIndex) => {
        const effectiveness = compatibilityData[race]?.[cls] || 0;
        matrixData.push({
          x: classIndex,
          y: raceIndex,
          v: effectiveness,
        });
      });
    });

    return {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Compatibility Score',
            data: matrixData,
            backgroundColor: (ctx) => {
              const value = ctx.parsed.v;
              const intensity = value / 100;
              return `rgba(16, 185, 129, ${intensity})`;
            },
            pointRadius: 15,
          },
        ],
      },
      options: {
        ...this.chartOptions,
        scales: {
          x: {
            type: 'linear',
            min: -0.5,
            max: classes.length - 0.5,
            ticks: {
              stepSize: 1,
              callback: (value) => classes[value] || '',
            },
            title: {
              display: true,
              text: 'Classes',
            },
          },
          y: {
            type: 'linear',
            min: -0.5,
            max: races.length - 0.5,
            ticks: {
              stepSize: 1,
              callback: (value) => races[value] || '',
            },
            title: {
              display: true,
              text: 'Races',
            },
          },
        },
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: 'Race-Class Compatibility Matrix',
            font: { size: 16, weight: 'bold' },
          },
        },
      },
    };
  }

  /**
   * Create all charts for the analysis
   * @param {Object} analysisData - Complete analysis data
   * @returns {Object} All chart configurations
   */
  createAllCharts(analysisData) {
    return {
      winDistribution: this.createWinDistributionChart(
        analysisData.balance.winDistribution
      ),
      racePerformance: this.createRacePerformanceChart(
        analysisData.raceAnalysis.raceRankings
      ),
      classRadar: this.createClassRadarChart(
        analysisData.classAnalysis.classRankings
      ),
      gameFlow: this.createGameFlowChart(analysisData.gameFlow),
      survivalScatter: this.createSurvivalScatterChart(
        analysisData.survivalAnalysis
      ),
      warlockAnalysis: this.createWarlockAnalysisChart(
        analysisData.warlockAnalysis
      ),
      compatibilityMatrix: this.createCompatibilityMatrix(
        analysisData.raceAnalysis.raceCompatibility || {}
      ),
    };
  }

  /**
   * Generate chart container HTML
   * @param {string} chartId - Chart container ID
   * @param {string} title - Chart title
   * @param {string} description - Chart description
   * @returns {string} HTML for chart container
   */
  generateChartContainer(chartId, title, description = '') {
    return `
      <div class="chart-container" id="${chartId}-container">
        <div class="chart-header">
          <h3 class="chart-title">${title}</h3>
          ${
            description ? `<p class="chart-description">${description}</p>` : ''
          }
        </div>
        <div class="chart-wrapper">
          <canvas id="${chartId}" width="400" height="300"></canvas>
        </div>
        <div class="chart-controls">
          <button class="chart-btn" onclick="downloadChart('${chartId}')">Download PNG</button>
          <button class="chart-btn" onclick="toggleChartType('${chartId}')">Toggle View</button>
        </div>
      </div>
    `;
  }

  /**
   * Calculate versatility metric for radar chart
   * @param {Object} classData - Class data
   * @returns {number} Versatility score
   */
  calculateVersatility(classData) {
    // Simple versatility calculation based on balanced performance
    const balance = 100 - Math.abs(50 - classData.winRate);
    const consistency = Math.max(0, 100 - classData.winRate * 0.5); // Penalty for being too strong
    return (balance + consistency) / 2;
  }

  /**
   * Create export configuration for charts
   * @param {Object} chart - Chart.js instance
   * @returns {Object} Export configuration
   */
  createExportConfig(chart) {
    return {
      format: 'png',
      quality: 0.92,
      backgroundColor: '#ffffff',
      width: 1200,
      height: 800,
    };
  }
}

// Global chart utilities for the HTML report
if (typeof window !== 'undefined') {
  window.ChartBuilder = ChartBuilder;

  // Global functions for chart interactions
  window.downloadChart = function (chartId) {
    const chart = Chart.getChart(chartId);
    if (chart) {
      const url = chart.toBase64Image('image/png', 0.92);
      const link = document.createElement('a');
      link.download = `${chartId}-chart.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  window.toggleChartType = function (chartId) {
    const chart = Chart.getChart(chartId);
    if (chart) {
      // Simple toggle between chart types where applicable
      if (chart.config.type === 'bar') {
        chart.config.type = 'line';
      } else if (chart.config.type === 'line') {
        chart.config.type = 'bar';
      }
      chart.update();
    }
  };
}

module.exports = ChartBuilder;
