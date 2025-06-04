/**
 * Chart Manager Module
 * Handles creation and management of Chart.js visualizations
 */

class ChartManager {
  constructor() {
    this.charts = new Map();
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
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle: true, padding: 20 },
        },
        tooltip: {
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
   * Create win distribution pie chart
   * @param {string} canvasId - Canvas element ID
   * @param {Object} data - Win data {Good: number, Evil: number, Draw: number}
   * @returns {Chart} Chart.js instance
   */
  async createWinDistributionChart(canvasId, data) {
    return this.createChart(canvasId, {
      type: 'doughnut',
      data: {
        labels: ['Good Team', 'Evil Team', 'Draws'],
        datasets: [
          {
            data: [data.Good || 0, data.Evil || 0, data.Draw || 0],
            backgroundColor: ['#10B981', '#EF4444', '#6B7280'],
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          title: { display: true, text: 'Win Distribution' },
          tooltip: {
            ...this.defaultOptions.plugins.tooltip,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage =
                  total > 0 ? ((context.raw / total) * 100).toFixed(1) : '0.0';
                return `${context.label}: ${context.raw} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create race performance bar chart
   * @param {string} canvasId - Canvas element ID
   * @param {Array} data - Race data array
   * @returns {Chart} Chart.js instance
   */
  async createRacePerformanceChart(canvasId, data) {
    const raceData = data
      .filter((row) => row.Race && row['Win Rate'] !== undefined)
      .sort((a, b) => parseFloat(b['Win Rate']) - parseFloat(a['Win Rate']));

    return this.createChart(canvasId, {
      type: 'bar',
      data: {
        labels: raceData.map((race) => race.Race),
        datasets: [
          {
            label: 'Win Rate (%)',
            data: raceData.map((race) => parseFloat(race['Win Rate']) || 0),
            backgroundColor: '#3B82F6',
            borderColor: '#1D4ED8',
            borderWidth: 1,
          },
          {
            label: 'Survival Rate (%)',
            data: raceData.map(
              (race) => parseFloat(race['Survival Rate']) || 0
            ),
            backgroundColor: '#10B981',
            borderColor: '#059669',
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...this.defaultOptions,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (value) => value + '%' },
          },
        },
        plugins: {
          ...this.defaultOptions.plugins,
          title: { display: true, text: 'Race Performance Comparison' },
        },
      },
    });
  }

  /**
   * Create class radar chart
   * @param {string} canvasId - Canvas element ID
   * @param {Array} data - Class data array
   * @returns {Chart} Chart.js instance
   */
  async createClassRadarChart(canvasId, data) {
    const classData = data
      .filter((row) => row.Class && row['Win Rate'] !== undefined)
      .slice(0, 6);

    return this.createChart(canvasId, {
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
        datasets: classData.map((cls, index) => ({
          label: cls.Class,
          data: [
            parseFloat(cls['Win Rate']) || 0,
            parseFloat(cls['Survival Rate']) || 0,
            parseFloat(cls['Effectiveness Score'] || cls.Effectiveness) || 0,
            Math.min(100, ((parseInt(cls['Sample Size']) || 0) / 50) * 100),
            100 - Math.abs(50 - (parseFloat(cls['Win Rate']) || 0)),
            this.calculateVersatility(cls),
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
        ...this.defaultOptions,
        scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } },
        plugins: {
          ...this.defaultOptions.plugins,
          title: { display: true, text: 'Class Performance Radar' },
        },
      },
    });
  }

  /**
   * Create game length distribution chart
   * @param {string} canvasId - Canvas element ID
   * @param {Array} data - Game flow data
   * @returns {Chart} Chart.js instance
   */
  async createGameLengthChart(canvasId, data) {
    const gameData = data
      .filter((row) => row['Round Length'] && row['Game Count'])
      .map((row) => ({
        length: parseInt(row['Round Length']),
        count: parseInt(row['Game Count']),
        goodWins: parseInt(row['Good Wins']) || 0,
        evilWins: parseInt(row['Evil Wins']) || 0,
      }))
      .sort((a, b) => a.length - b.length);

    return this.createChart(canvasId, {
      type: 'line',
      data: {
        labels: gameData.map((d) => `${d.length} rounds`),
        datasets: [
          {
            label: 'Total Games',
            data: gameData.map((d) => d.count),
            borderColor: '#3B82F6',
            backgroundColor: '#3B82F620',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Good Wins',
            data: gameData.map((d) => d.goodWins),
            borderColor: '#10B981',
            backgroundColor: '#10B98120',
            tension: 0.4,
          },
          {
            label: 'Evil Wins',
            data: gameData.map((d) => d.evilWins),
            borderColor: '#EF4444',
            backgroundColor: '#EF444420',
            tension: 0.4,
          },
        ],
      },
      options: {
        ...this.defaultOptions,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Number of Games' },
          },
          x: { title: { display: true, text: 'Game Length (Rounds)' } },
        },
        plugins: {
          ...this.defaultOptions.plugins,
          title: { display: true, text: 'Game Length Distribution & Outcomes' },
        },
      },
    });
  }

  /**
   * Create a generic chart
   * @param {string} canvasId - Canvas element ID
   * @param {Object} config - Chart.js configuration
   * @returns {Chart} Chart.js instance
   */
  createChart(canvasId, config) {
    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.error(`Canvas element not found: ${canvasId}`);
        return null;
      }

      // Destroy existing chart
      this.destroyChart(canvasId);

      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, config);

      this.charts.set(canvasId, chart);
      console.log(`✅ Created chart: ${canvasId}`);

      return chart;
    } catch (error) {
      console.error(`Failed to create chart ${canvasId}:`, error);
      return null;
    }
  }

  /**
   * Destroy a chart
   * @param {string} canvasId - Canvas element ID
   */
  destroyChart(canvasId) {
    const existingChart = this.charts.get(canvasId);
    if (existingChart) {
      existingChart.destroy();
      this.charts.delete(canvasId);
    }
  }

  /**
   * Resize all charts
   */
  resizeCharts() {
    this.charts.forEach((chart, canvasId) => {
      try {
        chart.resize();
      } catch (error) {
        console.warn(`Failed to resize chart ${canvasId}:`, error);
      }
    });
  }

  /**
   * Update chart data
   * @param {string} canvasId - Canvas element ID
   * @param {Object} newData - New data object
   */
  updateChart(canvasId, newData) {
    const chart = this.charts.get(canvasId);
    if (!chart) return false;

    try {
      chart.data = newData;
      chart.update();
      return true;
    } catch (error) {
      console.error(`Failed to update chart ${canvasId}:`, error);
      return false;
    }
  }

  /**
   * Get chart instance
   * @param {string} canvasId - Canvas element ID
   * @returns {Chart|null} Chart instance
   */
  getChart(canvasId) {
    return this.charts.get(canvasId) || null;
  }

  /**
   * Calculate versatility metric for radar chart
   * @param {Object} classData - Class data row
   * @returns {number} Versatility score
   */
  calculateVersatility(classData) {
    const winRate = parseFloat(classData['Win Rate']) || 0;
    const balance = 100 - Math.abs(50 - winRate);
    const consistency = Math.max(0, 100 - winRate * 0.5);
    return (balance + consistency) / 2;
  }

  /**
   * Destroy all charts
   */
  destroyAllCharts() {
    this.charts.forEach((chart, canvasId) => {
      chart.destroy();
    });
    this.charts.clear();
  }

  /**
   * Get chart statistics
   * @returns {Object} Chart statistics
   */
  getStats() {
    return {
      totalCharts: this.charts.size,
      chartIds: Array.from(this.charts.keys()),
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartManager;
}
