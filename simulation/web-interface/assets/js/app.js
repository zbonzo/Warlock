/**
 * Main Application JavaScript
 * Orchestrates the report viewing interface
 */

class WarlockReportApp {
  constructor() {
    this.currentReport = null;
    this.currentReportData = null;
    this.charts = new Map();
    this.dataLoader = new DataLoader();
    this.chartManager = new ChartManager();
    this.reportSelector = new ReportSelector();
    //this.exportManager = new ExportManager();

    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log('🎮 Initializing Warlock Report App...');

    try {
      // Set up event listeners
      this.setupEventListeners();

      // Load available reports
      await this.loadAvailableReports();

      // Update last updated timestamp
      this.updateLastUpdated();

      console.log('✅ App initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      this.showError('Failed to initialize application', error.message);
    }
  }

  /**
   * Set up global event listeners
   */
  setupEventListeners() {
    // Window resize handler for chart responsiveness
    window.addEventListener(
      'resize',
      this.debounce(() => {
        this.resizeCharts();
      }, 250)
    );

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r':
            e.preventDefault();
            this.refreshReports();
            break;
          case 'p':
            e.preventDefault();
            window.print();
            break;
          case 'e':
            e.preventDefault();
            this.exportCurrentReport();
            break;
        }
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.report) {
        this.loadReport(e.state.report, false);
      }
    });
  }

  /**
   * Load available reports from the server
   */
  async loadAvailableReports() {
    try {
      console.log('attempting to load reports');
      if (!this.reportSelector.selectElement) {
        this.reportSelector.init();
      }
      const reports = await this.reportSelector.loadReports();
      this.populateReportSelector(reports);

      // Auto-load the most recent report if available
      if (reports.length > 0) {
        await this.loadReport(reports[0].filename);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      this.showError(
        'Failed to load reports',
        'Could not connect to reports directory'
      );
    }
  }

  /**
   * Populate the report selector dropdown
   */
  populateReportSelector(reports) {
    const select = document.getElementById('reportSelect');

    // Clear existing options
    select.innerHTML = '<option value="">Select a report...</option>';

    // Add report options
    reports.forEach((report) => {
      const option = document.createElement('option');
      option.value = report.filename;
      option.textContent = this.formatReportName(report);
      option.dataset.type = report.type;
      option.dataset.games = report.metadata.totalGames;
      option.dataset.date = report.timestamp;
      select.appendChild(option);
    });
  }

  /**
   * Format report name for display
   */
  formatReportName(report) {
    const date = new Date(report.timestamp).toLocaleDateString();
    const time = new Date(report.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const type = this.capitalizeFirst(report.type);
    const games = report.metadata.totalGames;

    return `${type} Analysis - ${games} games (${date} ${time})`;
  }

  /**
   * Load and display a specific report
   */
  async loadReport(filename, updateHistory = true) {
    if (!filename) {
      this.hideReport();
      return;
    }

    this.showLoading();

    try {
      console.log(`📊 Loading report: ${filename}`);

      // Load the CSV data
      const data = await this.dataLoader.loadCSV(`reports/${filename}`);

      // Store current report info
      this.currentReport = filename;
      this.currentReportData = data;

      // Update URL without page reload
      if (updateHistory) {
        const url = new URL(window.location);
        url.searchParams.set('report', filename);
        window.history.pushState({ report: filename }, '', url);
      }

      // Update report info display
      this.updateReportInfo(filename);

      // Render the report based on its type
      await this.renderReport(data, filename);

      // Show the report content
      this.showReport();

      console.log(`✅ Report loaded successfully: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to load report ${filename}:`, error);
      this.showError('Failed to load report', error.message);
    }
  }

  /**
   * Render report content based on data type
   */
  async renderReport(data, filename) {
    // Determine report type from filename
    const type = this.getReportType(filename);

    switch (type) {
      case 'balance':
        await this.renderBalanceReport(data);
        break;
      case 'race':
        await this.renderRaceReport(data);
        break;
      case 'class':
        await this.renderClassReport(data);
        break;
      case 'gameflow':
        await this.renderGameFlowReport(data);
        break;
      case 'recommendations':
        await this.renderRecommendationsReport(data);
        break;
      case 'raw':
        await this.renderRawDataReport(data);
        break;
      default:
        await this.renderGenericReport(data);
    }

    // Always populate the raw data tab
    this.populateRawDataTab(data);
  }

  /**
   * Render balance report
   */
  async renderBalanceReport(data) {
    // Update overview tab
    this.updateOverviewSummary({
      'Overall Balance':
        data.find((row) => row.Metric === 'Balance Rating')?.Value || 'Unknown',
      'Good Win Rate':
        data.find((row) => row.Metric === 'Good Win Rate')?.Value || '0%',
      'Evil Win Rate':
        data.find((row) => row.Metric === 'Evil Win Rate')?.Value || '0%',
      'Average Rounds':
        data.find((row) => row.Metric === 'Average Rounds')?.Value || '0',
      'Sample Size':
        data.find((row) => row.Metric === 'Sample Size')?.Value || '0',
      Reliability:
        data.find((row) => row.Metric === 'Reliability Score')?.Value || '0%',
    });

    // Create win distribution chart
    const goodWinRate =
      parseFloat(data.find((row) => row.Metric === 'Good Win Rate')?.Value) ||
      0;
    const evilWinRate =
      parseFloat(data.find((row) => row.Metric === 'Evil Win Rate')?.Value) ||
      0;
    const drawRate = Math.max(0, 100 - goodWinRate - evilWinRate);

    await this.chartManager.createWinDistributionChart('winDistributionChart', {
      Good: goodWinRate,
      Evil: evilWinRate,
      Draw: drawRate,
    });

    // Update balance tab
    this.updateBalanceMetrics(data);
  }

  /**
   * Render race analysis report
   */
  async renderRaceReport(data) {
    // Update race table
    this.populateRaceTable(data);

    // Create race performance chart
    await this.chartManager.createRacePerformanceChart(
      'racePerformanceChart',
      data
    );

    // Update overview with race-specific summary
    const topRace = data[1]; // First data row (skip header)
    const averageWinRate = this.calculateAverageWinRate(data);

    this.updateOverviewSummary({
      'Top Race': topRace?.Race || 'Unknown',
      'Top Win Rate': topRace?.['Win Rate'] ? `${topRace['Win Rate']}%` : '0%',
      'Races Analyzed': (data.length - 1).toString(),
      'Average Win Rate': `${averageWinRate.toFixed(1)}%`,
      'Balance Status': this.getBalanceStatus(averageWinRate),
      'Sample Quality': this.assessSampleQuality(data),
    });
  }

  /**
   * Render class analysis report
   */
  async renderClassReport(data) {
    // Update class table
    this.populateClassTable(data);

    // Create class radar chart
    await this.chartManager.createClassRadarChart('classRadarChart', data);

    // Update overview
    const topClass = data[1];
    this.updateOverviewSummary({
      'Top Class': topClass?.Class || 'Unknown',
      'Top Win Rate': topClass?.['Win Rate']
        ? `${topClass['Win Rate']}%`
        : '0%',
      'Classes Analyzed': (data.length - 1).toString(),
      'Avg Effectiveness': this.calculateAverageEffectiveness(data).toFixed(1),
      'Role Balance': this.assessRoleBalance(data),
      'Meta Health': this.assessMetaHealth(data),
    });
  }

  /**
   * Render game flow report
   */
  async renderGameFlowReport(data) {
    // Update game flow summary
    this.updateGameFlowSummary(data);

    // Create game length chart
    await this.chartManager.createGameLengthChart('gameLengthChart', data);
  }

  /**
   * Render recommendations report
   */
  async renderRecommendationsReport(data) {
    // Update recommendations summary
    this.updateRecommendationsSummary(data);

    // Populate recommendations list
    this.populateRecommendationsList(data);
  }

  /**
   * Render raw data report
   */
  async renderRawDataReport(data) {
    this.populateRawDataTab(data);

    // Show raw data tab by default for raw reports
    this.showTab('data');
  }

  /**
   * Render generic report (fallback)
   */
  async renderGenericReport(data) {
    // Basic overview
    this.updateOverviewSummary({
      'Data Points': (data.length - 1).toString(),
      Columns: Object.keys(data[0] || {}).length.toString(),
      'Report Type': this.getReportType(this.currentReport),
      Status: 'Loaded',
      Format: 'CSV',
      Size: `${data.length} rows`,
    });

    // Show raw data
    this.populateRawDataTab(data);
  }

  /**
   * Update overview summary cards
   */
  updateOverviewSummary(summaryData) {
    const container = document.getElementById('overviewSummary');
    container.innerHTML = '';

    Object.entries(summaryData).forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'summary-card';

      // Add status class based on value
      if (label.includes('Rate') && value.includes('%')) {
        const rate = parseFloat(value);
        if (rate > 60 || rate < 40) card.classList.add('warning');
      }

      card.innerHTML = `
                <h4>${label}</h4>
                <div class="value">${value}</div>
                <div class="label">${this.getValueDescription(
                  label,
                  value
                )}</div>
            `;

      container.appendChild(card);
    });
  }

  /**
   * Update balance metrics in balance tab
   */
  updateBalanceMetrics(data) {
    const container = document.getElementById('balanceMetrics');
    if (!container) return;

    container.innerHTML = '';

    // Filter balance-related metrics
    const balanceMetrics = data.filter(
      (row) => row.Category === 'Balance' || row.Category === 'Statistics'
    );

    balanceMetrics.forEach((metric) => {
      const card = document.createElement('div');
      card.className = 'summary-card';

      // Add status class based on metric status
      if (metric.Status === 'Poor') card.classList.add('danger');
      else if (metric.Status === 'Fair') card.classList.add('warning');
      else if (metric.Status === 'Good') card.classList.add('success');

      card.innerHTML = `
                <h4>${metric.Metric}</h4>
                <div class="value">${metric.Value}</div>
                <div class="label">Target: ${metric.Target || 'N/A'} | ${
        metric.Status || 'Unknown'
      }</div>
            `;

      container.appendChild(card);
    });
  }

  /**
   * Populate race table
   */
  populateRaceTable(data) {
    const tbody = document.querySelector('#raceTable tbody');
    tbody.innerHTML = '';

    // Skip header row
    data.slice(1).forEach((race) => {
      const row = document.createElement('tr');
      row.innerHTML = `
                <td><strong>${race.Race}</strong></td>
                <td>${race['Win Rate']}%</td>
                <td>${race['Survival Rate']}%</td>
                <td>${race['Avg Final HP']}</td>
                <td>${race['Sample Size']}</td>
                <td><span class="tier-${(race.Tier || 'd').toLowerCase()}">${
        race.Tier || 'D'
      }</span></td>
                <td>${race.Assessment || 'Unknown'}</td>
            `;
      tbody.appendChild(row);
    });
  }

  /**
   * Populate class table
   */
  populateClassTable(data) {
    const tbody = document.querySelector('#classTable tbody');
    tbody.innerHTML = '';

    data.slice(1).forEach((cls) => {
      const row = document.createElement('tr');
      row.innerHTML = `
                <td><strong>${cls.Class}</strong></td>
                <td>${cls.Role || 'Unknown'}</td>
                <td>${cls['Win Rate']}%</td>
                <td>${cls['Survival Rate']}%</td>
                <td>${
                  cls['Effectiveness Score'] || cls.Effectiveness || 'N/A'
                }</td>
                <td>${cls['Sample Size']}</td>
                <td><span class="tier-${(cls.Tier || 'd').toLowerCase()}">${
        cls.Tier || 'D'
      }</span></td>
            `;
      tbody.appendChild(row);
    });
  }

  /**
   * Update game flow summary
   */
  updateGameFlowSummary(data) {
    const container = document.getElementById('gameflowSummary');
    if (!container) return;

    // Calculate summary statistics from game flow data
    const totalGames = data
      .slice(1)
      .reduce((sum, row) => sum + parseInt(row['Game Count'] || 0), 0);
    const avgLength = this.calculateWeightedAverage(
      data,
      'Round Length',
      'Game Count'
    );
    const quickGames = data
      .slice(1)
      .filter((row) => parseInt(row['Round Length']) < 8);
    const longGames = data
      .slice(1)
      .filter((row) => parseInt(row['Round Length']) > 20);

    const summary = {
      'Total Games': totalGames.toString(),
      'Average Length': `${avgLength.toFixed(1)} rounds`,
      'Quick Games': `${quickGames.length} (${(
        (quickGames.length / totalGames) *
        100
      ).toFixed(1)}%)`,
      'Long Games': `${longGames.length} (${(
        (longGames.length / totalGames) *
        100
      ).toFixed(1)}%)`,
      'Most Common': this.getMostCommonGameLength(data),
      Balance: this.getGameLengthBalance(data),
    };

    this.updateOverviewSummary(summary);
  }

  /**
   * Update recommendations summary
   */
  updateRecommendationsSummary(data) {
    const container = document.getElementById('recommendationsSummary');
    if (!container) return;

    const priorities = { High: 0, Medium: 0, Low: 0 };
    const types = {};

    data.slice(1).forEach((rec) => {
      const priority = rec.Priority;
      const type = rec.Type;

      if (priorities.hasOwnProperty(priority)) {
        priorities[priority]++;
      }

      types[type] = (types[type] || 0) + 1;
    });

    container.innerHTML = '';

    // Priority summary
    Object.entries(priorities).forEach(([priority, count]) => {
      const card = document.createElement('div');
      card.className = `summary-card ${
        priority.toLowerCase() === 'high'
          ? 'danger'
          : priority.toLowerCase() === 'medium'
          ? 'warning'
          : 'success'
      }`;
      card.innerHTML = `
                <h4>${priority} Priority</h4>
                <div class="value">${count}</div>
                <div class="label">Recommendations</div>
            `;
      container.appendChild(card);
    });
  }

  /**
   * Populate recommendations list
   */
  populateRecommendationsList(data) {
    const container = document.getElementById('recommendationsList');
    container.innerHTML = '';

    data.slice(1).forEach((rec) => {
      const item = document.createElement('div');
      item.className = `recommendation ${rec.Priority.toLowerCase()}-priority`;

      const suggestions = rec.Suggestions.split(';').map((s) => s.trim());

      item.innerHTML = `
                <span class="priority ${rec.Priority.toLowerCase()}">${
        rec.Priority
      } PRIORITY</span>
                <h4>${rec.Type}: ${rec.Target}</h4>
                <p><strong>Issue:</strong> ${rec.Issue}</p>
                <p><strong>Suggested Actions:</strong></p>
                <ul>
                    ${suggestions
                      .map((suggestion) => `<li>${suggestion}</li>`)
                      .join('')}
                </ul>
                <p><strong>Confidence:</strong> ${rec.Confidence}</p>
            `;

      container.appendChild(item);
    });
  }

  /**
   * Populate raw data tab
   */
  populateRawDataTab(data) {
    if (!data || data.length === 0) return;

    const headers = document.getElementById('rawDataHeaders');
    const tbody = document.getElementById('rawDataBody');

    // Clear existing content
    headers.innerHTML = '';
    tbody.innerHTML = '';

    // Create headers
    const headerRow = document.createElement('tr');
    Object.keys(data[0]).forEach((key) => {
      const th = document.createElement('th');
      th.textContent = key;
      headerRow.appendChild(th);
    });
    headers.appendChild(headerRow);

    // Create data rows (limit to first 100 rows for performance)
    const displayData = data.slice(1, 101);
    displayData.forEach((row) => {
      const tr = document.createElement('tr');
      Object.values(row).forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Add pagination if needed
    if (data.length > 101) {
      this.setupPagination(data.length - 1, 100);
    }
  }

  /**
   * Setup pagination for large datasets
   */
  setupPagination(totalRows, rowsPerPage) {
    const container = document.getElementById('dataPagination');
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let paginationHTML = `
            <button class="pagination-btn" onclick="app.changePage(1)" ${
              this.currentPage === 1 ? 'disabled' : ''
            }>First</button>
            <button class="pagination-btn" onclick="app.changePage(${
              this.currentPage - 1
            })" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>
        `;

    // Show page numbers around current page
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
                <button class="pagination-btn ${
                  i === this.currentPage ? 'active' : ''
                }" 
                        onclick="app.changePage(${i})">${i}</button>
            `;
    }

    paginationHTML += `
            <button class="pagination-btn" onclick="app.changePage(${
              this.currentPage + 1
            })" ${
      this.currentPage === totalPages ? 'disabled' : ''
    }>Next</button>
            <button class="pagination-btn" onclick="app.changePage(${totalPages})" ${
      this.currentPage === totalPages ? 'disabled' : ''
    }>Last</button>
        `;

    container.innerHTML = paginationHTML;
  }

  /**
   * Change pagination page
   */
  changePage(page) {
    this.currentPage = page;
    // Re-populate data for the new page
    // This would require storing the full dataset and slicing it appropriately
    // Implementation would depend on specific data structure
  }

  /**
   * Show specific tab
   */
  showTab(tabId) {
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.remove('active');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.classList.remove('active');
    });

    // Show target tab panel
    const targetPanel = document.getElementById(`${tabId}-tab`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // Add active class to clicked tab
    const targetTab = Array.from(document.querySelectorAll('.nav-tab')).find(
      (tab) => tab.onclick.toString().includes(tabId)
    );
    if (targetTab) {
      targetTab.classList.add('active');
    }

    // Resize charts when tab becomes visible
    setTimeout(() => this.resizeCharts(), 100);
  }

  /**
   * Show loading state
   */
  showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('reportContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
  }

  /**
   * Show report content
   */
  showReport() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('reportContent').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
  }

  /**
   * Hide report content
   */
  hideReport() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('reportContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('reportInfo').style.display = 'none';
  }

  /**
   * Show error state
   */
  showError(title, message) {
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('reportContent').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';

    document.querySelector('#errorState h3').textContent = title;
    document.getElementById('errorMessage').textContent = message;
  }

  /**
   * Hide error state
   */
  hideError() {
    document.getElementById('errorState').style.display = 'none';
  }

  /**
   * Update report info display
   */
  updateReportInfo(filename) {
    const select = document.getElementById('reportSelect');
    const option = select.querySelector(`option[value="${filename}"]`);

    if (option) {
      const date = new Date(option.dataset.date).toLocaleString();
      const games = option.dataset.games;
      const type = this.capitalizeFirst(option.dataset.type);

      document.getElementById('reportDate').textContent = date;
      document.getElementById('reportGames').textContent = `${games} games`;
      document.getElementById('reportType').textContent = type;
      document.getElementById('reportInfo').style.display = 'flex';
    }
  }

  /**
   * Refresh reports list
   */
  async refreshReports() {
    console.log('🔄 Refreshing reports...');
    await this.loadAvailableReports();
  }

  /**
   * Export current report
   */
  exportCurrentReport() {
    if (!this.currentReportData) {
      alert('No report loaded to export');
      return;
    }

    this.exportManager.exportToCSV(
      this.currentReportData,
      `${this.currentReport.replace('.csv', '')}_export.csv`
    );
  }

  /**
   * Resize all charts
   */
  resizeCharts() {
    this.charts.forEach((chart) => {
      if (chart && typeof chart.resize === 'function') {
        chart.resize();
      }
    });
  }

  /**
   * Update last updated timestamp
   */
  updateLastUpdated() {
    document.getElementById('lastUpdated').textContent =
      new Date().toLocaleString();
  }

  // Utility methods
  getReportType(filename) {
    if (filename.includes('balance')) return 'balance';
    if (filename.includes('race')) return 'race';
    if (filename.includes('class')) return 'class';
    if (filename.includes('gameflow') || filename.includes('game-flow'))
      return 'gameflow';
    if (filename.includes('recommendations')) return 'recommendations';
    if (filename.includes('raw')) return 'raw';
    return 'generic';
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getValueDescription(label, value) {
    if (label.includes('Rate') && value.includes('%')) {
      const rate = parseFloat(value);
      if (rate > 60) return 'Above average';
      if (rate < 40) return 'Below average';
      return 'Balanced';
    }
    if (label.includes('Size') || label.includes('Count')) {
      const num = parseInt(value);
      if (num > 100) return 'Large sample';
      if (num > 30) return 'Good sample';
      return 'Limited sample';
    }
    return '';
  }

  calculateAverageWinRate(data) {
    const rates = data.slice(1).map((row) => parseFloat(row['Win Rate']) || 0);
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  }

  calculateAverageEffectiveness(data) {
    const effectiveness = data
      .slice(1)
      .map(
        (row) =>
          parseFloat(row['Effectiveness Score'] || row.Effectiveness) || 0
      );
    return (
      effectiveness.reduce((sum, eff) => sum + eff, 0) / effectiveness.length
    );
  }

  getBalanceStatus(averageRate) {
    if (averageRate >= 45 && averageRate <= 55) return 'Balanced';
    if (averageRate >= 40 && averageRate <= 60) return 'Fair';
    return 'Imbalanced';
  }

  assessSampleQuality(data) {
    const samples = data
      .slice(1)
      .map((row) => parseInt(row['Sample Size']) || 0);
    const avgSample = samples.reduce((sum, s) => sum + s, 0) / samples.length;
    if (avgSample > 50) return 'Excellent';
    if (avgSample > 20) return 'Good';
    return 'Limited';
  }

  assessRoleBalance(data) {
    const roles = data
      .slice(1)
      .map((row) => row.Role)
      .filter(Boolean);
    const roleSet = new Set(roles);
    return roleSet.size >= 4 ? 'Diverse' : 'Limited';
  }

  assessMetaHealth(data) {
    const tiers = data
      .slice(1)
      .map((row) => row.Tier)
      .filter(Boolean);
    const sTier = tiers.filter((t) => t === 'S').length;
    const dTier = tiers.filter((t) => t === 'D').length;

    if (sTier <= 2 && dTier <= 2) return 'Healthy';
    if (sTier <= 3 && dTier <= 3) return 'Fair';
    return 'Unbalanced';
  }

  calculateWeightedAverage(data, valueCol, weightCol) {
    let totalValue = 0;
    let totalWeight = 0;

    data.slice(1).forEach((row) => {
      const value = parseFloat(row[valueCol]) || 0;
      const weight = parseFloat(row[weightCol]) || 0;
      totalValue += value * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? totalValue / totalWeight : 0;
  }

  getMostCommonGameLength(data) {
    let maxCount = 0;
    let mostCommon = '';

    data.slice(1).forEach((row) => {
      const count = parseInt(row['Game Count']) || 0;
      if (count > maxCount) {
        maxCount = count;
        mostCommon = `${row['Round Length']} rounds`;
      }
    });

    return mostCommon;
  }

  getGameLengthBalance(data) {
    const quick = data
      .slice(1)
      .filter((row) => parseInt(row['Round Length']) < 8).length;
    const normal = data.slice(1).filter((row) => {
      const length = parseInt(row['Round Length']);
      return length >= 8 && length <= 20;
    }).length;
    const long = data
      .slice(1)
      .filter((row) => parseInt(row['Round Length']) > 20).length;

    if (normal > quick && normal > long) return 'Good';
    if (Math.abs(quick - long) <= 2) return 'Balanced';
    return 'Skewed';
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Global functions for HTML onclick handlers
function loadSelectedReport() {
  const select = document.getElementById('reportSelect');
  if (window.app && select.value) {
    window.app.loadReport(select.value);
  }
}

function showTab(tabId) {
  if (window.app) {
    window.app.showTab(tabId);
  }
}

function refreshReports() {
  if (window.app) {
    window.app.refreshReports();
  }
}

function hideError() {
  if (window.app) {
    window.app.hideError();
  }
}

function exportCurrentReport() {
  if (window.app) {
    window.app.exportCurrentReport();
  }
}

function exportRecommendations() {
  if (window.app && window.app.currentReportData) {
    window.app.exportManager.exportToCSV(
      window.app.currentReportData,
      'recommendations_export.csv'
    );
  }
}

function showRawData() {
  showTab('data');
}

function downloadCSV() {
  exportCurrentReport();
}

function filterData() {
  const searchTerm = document.getElementById('dataSearch').value.toLowerCase();
  const rows = document.querySelectorAll('#rawDataBody tr');

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new WarlockReportApp();
});
