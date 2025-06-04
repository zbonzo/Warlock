/**
 * Report Selector Module
 * Handles loading and managing the report dropdown
 */

class ReportSelector {
  constructor() {
    this.reports = [];
    this.currentReport = null;
    this.selectElement = null;
    this.infoElement = null;
  }

  /**
   * Initialize the report selector
   */
  init() {
    this.selectElement = document.getElementById('reportSelect');
    this.infoElement = document.getElementById('reportInfo');

    if (!this.selectElement) {
      console.error('Report select element not found');
      return false;
    }

    // Set up event listeners
    this.selectElement.addEventListener('change', (e) => {
      this.handleReportChange(e.target.value);
    });

    return true;
  }

  /**
   * Load available reports from the server
   * @returns {Promise<Array>} Array of report objects
   */
  async loadReports() {
    try {
      console.log('📋 Loading available reports...');

      // Try to load the reports index
      const response = await fetch('reports/reports-index.json', {
        cache: 'no-cache',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load reports index: ${response.status}`);
      }

      const index = await response.json();

      if (!index.reports || !Array.isArray(index.reports)) {
        throw new Error('Invalid reports index format');
      }

      // Filter out duplicate reports and sort by timestamp
      this.reports = this.deduplicateReports(index.reports).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      console.log(`✅ Loaded ${this.reports.length} reports`);

      // Populate the dropdown
      this.populateSelector();

      return this.reports;
    } catch (error) {
      console.error('❌ Failed to load reports:', error);
      this.showError(
        'Could not load reports. Check that reports directory is accessible.'
      );
      return [];
    }
  }

  /**
   * Remove duplicate reports (keep most recent)
   * @param {Array} reports - Array of report objects
   * @returns {Array} Deduplicated reports
   */
  deduplicateReports(reports) {
    const seen = new Map();

    for (const report of reports) {
      const key = report.filename;
      if (
        !seen.has(key) ||
        new Date(report.timestamp) > new Date(seen.get(key).timestamp)
      ) {
        seen.set(key, report);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Populate the select dropdown with reports
   */
  populateSelector() {
    if (!this.selectElement) return;

    // Clear existing options except the first (placeholder)
    this.selectElement.innerHTML =
      '<option value="">Select a report...</option>';

    if (this.reports.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No reports available';
      option.disabled = true;
      this.selectElement.appendChild(option);
      return;
    }

    // Add report options
    this.reports.forEach((report) => {
      const option = document.createElement('option');
      option.value = `${report.filename}`;
      option.textContent = this.formatReportName(report);

      // Store metadata in data attributes
      option.dataset.type = report.type;
      option.dataset.games = report.metadata.totalGames;
      option.dataset.gameType = report.metadata.gameType;
      option.dataset.aiType = report.metadata.aiType;
      option.dataset.quality = report.metadata.dataQuality;
      option.dataset.timestamp = report.timestamp;

      this.selectElement.appendChild(option);
    });

    console.log(`📊 Populated dropdown with ${this.reports.length} reports`);
  }

  /**
   * Format report name for display in dropdown
   * @param {Object} report - Report object
   * @returns {string} Formatted display name
   */
  formatReportName(report) {
    const date = new Date(report.timestamp);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const type = this.capitalizeFirst(report.type);
    const games = report.metadata.totalGames;
    const quality = report.metadata.dataQuality;

    // Format: "Balance Analysis - 100 games (Good) - 12/4/2025 2:30 PM"
    return `${type} Analysis - ${games} games (${quality}) - ${dateStr} ${timeStr}`;
  }

  /**
   * Handle report selection change
   * @param {string} filename - Selected report filename
   */
  handleReportChange(filename) {
    if (!filename) {
      this.currentReport = null;
      this.hideReportInfo();
      return;
    }

    // Find the selected report
    const report = this.reports.find((r) => r.filename === filename);
    if (!report) {
      console.error(`Report not found: ${filename}`);
      return;
    }

    this.currentReport = report;
    this.showReportInfo(report);

    // Trigger report loading event
    this.dispatchReportSelected(report);
  }

  /**
   * Show report information below the selector
   * @param {Object} report - Report object
   */
  showReportInfo(report) {
    if (!this.infoElement) return;

    const date = new Date(report.timestamp);
    const formattedDate = date.toLocaleString();

    // Update info elements
    const dateElement = document.getElementById('reportDate');
    const gamesElement = document.getElementById('reportGames');
    const typeElement = document.getElementById('reportType');

    if (dateElement) dateElement.textContent = formattedDate;
    if (gamesElement)
      gamesElement.textContent = `${report.metadata.totalGames} games`;
    if (typeElement) {
      const typeText = `${this.capitalizeFirst(report.type)} (${
        report.metadata.gameType
      }, ${report.metadata.aiType})`;
      typeElement.textContent = typeText;
    }

    // Show the info container
    this.infoElement.style.display = 'flex';

    // Add quality indicator
    this.updateQualityIndicator(report.metadata.dataQuality);
  }

  /**
   * Hide report information
   */
  hideReportInfo() {
    if (this.infoElement) {
      this.infoElement.style.display = 'none';
    }
  }

  /**
   * Update quality indicator styling
   * @param {string} quality - Data quality level
   */
  updateQualityIndicator(quality) {
    const gamesElement = document.getElementById('reportGames');
    if (!gamesElement) return;

    // Remove existing quality classes
    gamesElement.classList.remove(
      'quality-excellent',
      'quality-good',
      'quality-fair',
      'quality-limited'
    );

    // Add appropriate quality class
    const qualityClass = `quality-${quality.toLowerCase()}`;
    gamesElement.classList.add(qualityClass);
  }

  /**
   * Dispatch report selected event
   * @param {Object} report - Selected report
   */
  dispatchReportSelected(report) {
    const event = new CustomEvent('reportSelected', {
      detail: { report, filename: `${report.filename}` },
    });
    document.dispatchEvent(event);
  }

  /**
   * Get currently selected report
   * @returns {Object|null} Current report object
   */
  getCurrentReport() {
    return this.currentReport;
  }

  /**
   * Set selected report programmatically
   * @param {string} filename - Report filename to select
   * @returns {boolean} Success
   */
  selectReport(filename) {
    if (!this.selectElement) return false;

    const option = this.selectElement.querySelector(
      `option[value="${filename}"]`
    );
    if (!option) {
      console.warn(`Report not found in selector: ${filename}`);
      return false;
    }

    this.selectElement.value = filename;
    this.handleReportChange(filename);
    return true;
  }

  /**
   * Refresh reports list
   * @returns {Promise<Array>} Updated reports list
   */
  async refresh() {
    console.log('🔄 Refreshing reports list...');

    // Store current selection
    const currentSelection = this.selectElement?.value;

    // Reload reports
    const reports = await this.loadReports();

    // Try to restore selection if it still exists
    if (
      currentSelection &&
      this.reports.find((r) => r.filename === currentSelection)
    ) {
      this.selectReport(currentSelection);
    }

    return reports;
  }

  /**
   * Show error message in selector
   * @param {string} message - Error message
   */
  showError(message) {
    if (!this.selectElement) return;

    this.selectElement.innerHTML = `
            <option value="" disabled selected>Error: ${message}</option>
        `;

    this.hideReportInfo();
  }

  /**
   * Filter reports by type
   * @param {string} type - Report type to filter by
   * @returns {Array} Filtered reports
   */
  filterByType(type) {
    return this.reports.filter((report) => !type || report.type === type);
  }

  /**
   * Filter reports by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Filtered reports
   */
  filterByDateRange(startDate, endDate) {
    return this.reports.filter((report) => {
      const reportDate = new Date(report.timestamp);
      return reportDate >= startDate && reportDate <= endDate;
    });
  }

  /**
   * Get reports grouped by type
   * @returns {Object} Reports grouped by type
   */
  getReportsByType() {
    const groups = {};

    this.reports.forEach((report) => {
      if (!groups[report.type]) {
        groups[report.type] = [];
      }
      groups[report.type].push(report);
    });

    return groups;
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary stats
   */
  getStats() {
    const stats = {
      total: this.reports.length,
      byType: {},
      byQuality: {},
      totalGames: 0,
      dateRange: { earliest: null, latest: null },
    };

    this.reports.forEach((report) => {
      // Count by type
      stats.byType[report.type] = (stats.byType[report.type] || 0) + 1;

      // Count by quality
      const quality = report.metadata.dataQuality;
      stats.byQuality[quality] = (stats.byQuality[quality] || 0) + 1;

      // Sum total games
      stats.totalGames += report.metadata.totalGames || 0;

      // Track date range
      const date = new Date(report.timestamp);
      if (!stats.dateRange.earliest || date < stats.dateRange.earliest) {
        stats.dateRange.earliest = date;
      }
      if (!stats.dateRange.latest || date > stats.dateRange.latest) {
        stats.dateRange.latest = date;
      }
    });

    return stats;
  }

  /**
   * Capitalize first letter of string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportSelector;
}
