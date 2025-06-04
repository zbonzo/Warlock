/**
 * Data Loader Module
 * Handles loading and parsing CSV files for the web interface
 */

class DataLoader {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Load and parse a CSV file
   * @param {string} url - URL to the CSV file
   * @param {Object} options - Loading options
   * @returns {Promise<Array>} Parsed CSV data
   */
  async loadCSV(url, options = {}) {
    const { useCache = true, timeout = 10000, retries = 3 } = options;

    // Check cache first
    if (useCache && this.cache.has(url)) {
      console.log(`📦 Loading ${url} from cache`);
      return this.cache.get(url);
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      console.log(`⏳ Waiting for ${url} to finish loading`);
      return this.loadingPromises.get(url);
    }

    // Start loading
    const loadingPromise = this._loadCSVWithRetry(url, timeout, retries);
    this.loadingPromises.set(url, loadingPromise);

    try {
      const data = await loadingPromise;

      // Cache the result
      if (useCache) {
        this.cache.set(url, data);
      }

      return data;
    } finally {
      // Clean up loading promise
      this.loadingPromises.delete(url);
    }
  }

  /**
   * Load CSV with retry logic
   * @param {string} url - URL to load
   * @param {number} timeout - Request timeout
   * @param {number} retries - Number of retries
   * @returns {Promise<Array>} Parsed data
   */
  async _loadCSVWithRetry(url, timeout, retries) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry ${attempt}/${retries} for ${url}`);
          await this._delay(1000 * attempt); // Exponential backoff
        }

        return await this._loadCSVSingle(url, timeout);
      } catch (error) {
        lastError = error;
        console.warn(
          `⚠️ Attempt ${attempt + 1} failed for ${url}:`,
          error.message
        );
      }
    }

    throw new Error(
      `Failed to load ${url} after ${retries + 1} attempts: ${
        lastError.message
      }`
    );
  }

  /**
   * Single CSV load attempt
   * @param {string} url - URL to load
   * @param {number} timeout - Request timeout
   * @returns {Promise<Array>} Parsed data
   */
  async _loadCSVSingle(url, timeout) {
    console.log(`📊 Loading CSV: ${url}`);

    // Create fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          Accept: 'text/csv,text/plain,*/*',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();

      if (!csvText.trim()) {
        throw new Error('Empty CSV file');
      }

      return this._parseCSV(csvText);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Parse CSV text into structured data
   * @param {string} csvText - Raw CSV text
   * @returns {Array} Parsed data
   */
  _parseCSV(csvText) {
    try {
      const result = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        trimHeaders: true,
        transformHeader: (header) => {
          // Clean up header names
          return header.trim().replace(/[^\w\s%]/g, '');
        },
        transform: (value, field) => {
          // Clean up cell values
          if (typeof value === 'string') {
            value = value.trim();

            // Convert percentage strings to numbers
            if (value.endsWith('%') && !isNaN(parseFloat(value))) {
              return parseFloat(value);
            }

            // Convert numeric strings
            if (!isNaN(value) && value !== '') {
              return parseFloat(value);
            }
          }

          return value;
        },
      });

      if (result.errors.length > 0) {
        console.warn('CSV parsing warnings:', result.errors);
      }

      if (!result.data || result.data.length === 0) {
        throw new Error('No data found in CSV');
      }

      console.log(
        `✅ Parsed CSV: ${result.data.length} rows, ${
          Object.keys(result.data[0]).length
        } columns`
      );

      return result.data;
    } catch (error) {
      throw new Error(`CSV parsing failed: ${error.message}`);
    }
  }

  /**
   * Load the reports index
   * @returns {Promise<Object>} Reports index
   */
  async loadReportsIndex() {
    try {
      const response = await fetch('reports/reports-index.json', {
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const index = await response.json();

      if (!index.reports || !Array.isArray(index.reports)) {
        throw new Error('Invalid reports index format');
      }

      console.log(`📋 Loaded reports index: ${index.reports.length} reports`);
      return index;
    } catch (error) {
      console.warn('Could not load reports index:', error.message);

      // Fallback: try to discover reports by common naming patterns
      return await this._discoverReports();
    }
  }

  /**
   * Discover reports when index is unavailable
   * @returns {Promise<Object>} Discovered reports
   */
  async _discoverReports() {
    console.log('🔍 Attempting to discover reports...');

    const commonPatterns = [
      'balance-report-',
      'race-analysis-',
      'class-analysis-',
      'game-flow-',
      'recommendations-',
      'raw-results-',
    ];

    const discoveredReports = [];
    const now = new Date();

    // Try to find reports from the last few days
    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().substring(0, 10);

      for (const pattern of commonPatterns) {
        try {
          const filename = `${pattern}${dateStr}.csv`;
          const response = await fetch(`reports/${filename}`, {
            method: 'HEAD',
            cache: 'no-cache',
          });

          if (response.ok) {
            discoveredReports.push({
              filename,
              type: pattern.replace('-', '').replace('_', ''),
              timestamp: date.toISOString(),
              metadata: {
                totalGames: 0,
                gameType: 'unknown',
                aiType: 'unknown',
              },
            });
          }
        } catch (error) {
          // Ignore individual failures
        }
      }
    }

    console.log(`🔍 Discovered ${discoveredReports.length} reports`);

    return {
      reports: discoveredReports,
      lastUpdated: now.toISOString(),
      discoveryMethod: 'pattern-matching',
    };
  }

  /**
   * Preload multiple CSV files
   * @param {Array<string>} urls - URLs to preload
   * @returns {Promise<Map>} Map of URL to data
   */
  async preloadCSVs(urls) {
    console.log(`🚀 Preloading ${urls.length} CSV files...`);

    const results = new Map();
    const promises = urls.map(async (url) => {
      try {
        const data = await this.loadCSV(url);
        results.set(url, data);
        return { url, success: true };
      } catch (error) {
        console.error(`Failed to preload ${url}:`, error.message);
        return { url, success: false, error: error.message };
      }
    });

    const outcomes = await Promise.allSettled(promises);
    const successful = outcomes.filter(
      (o) => o.status === 'fulfilled' && o.value.success
    ).length;

    console.log(`✅ Preloaded ${successful}/${urls.length} CSV files`);
    return results;
  }

  /**
   * Clear cache
   * @param {string} pattern - Optional pattern to match URLs to clear
   */
  clearCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [url] of this.cache) {
        if (regex.test(url)) {
          this.cache.delete(url);
        }
      }
      console.log(`🗑️ Cleared cache entries matching: ${pattern}`);
    } else {
      this.cache.clear();
      console.log('🗑️ Cleared all cache');
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    let totalSize = 0;
    let totalRows = 0;

    for (const [url, data] of this.cache) {
      if (Array.isArray(data)) {
        totalRows += data.length;
        totalSize += JSON.stringify(data).length;
      }
    }

    return {
      entries: this.cache.size,
      totalRows,
      estimatedSize: totalSize,
      urls: Array.from(this.cache.keys()),
    };
  }

  /**
   * Validate CSV data structure
   * @param {Array} data - CSV data to validate
   * @param {Object} expectedSchema - Expected data schema
   * @returns {Object} Validation result
   */
  validateData(data, expectedSchema = {}) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      stats: {},
    };

    if (!Array.isArray(data) || data.length === 0) {
      result.valid = false;
      result.errors.push('Data is not a valid array or is empty');
      return result;
    }

    const firstRow = data[0];
    const headers = Object.keys(firstRow);

    result.stats = {
      rows: data.length,
      columns: headers.length,
      headers: headers,
    };

    // Check for required columns
    if (expectedSchema.requiredColumns) {
      for (const required of expectedSchema.requiredColumns) {
        if (!headers.includes(required)) {
          result.errors.push(`Missing required column: ${required}`);
          result.valid = false;
        }
      }
    }

    // Check data types
    if (expectedSchema.columnTypes) {
      for (const [column, expectedType] of Object.entries(
        expectedSchema.columnTypes
      )) {
        if (headers.includes(column)) {
          const sampleValue = data[0][column];
          const actualType = typeof sampleValue;

          if (actualType !== expectedType) {
            result.warnings.push(
              `Column ${column} expected ${expectedType}, got ${actualType}`
            );
          }
        }
      }
    }

    // Check for empty rows
    const emptyRows = data.filter((row) =>
      Object.values(row).every(
        (value) => value === null || value === undefined || value === ''
      )
    );

    if (emptyRows.length > 0) {
      result.warnings.push(`Found ${emptyRows.length} empty rows`);
    }

    return result;
  }

  /**
   * Transform CSV data for specific chart types
   * @param {Array} data - CSV data
   * @param {string} chartType - Type of chart to transform for
   * @returns {Object} Transformed data
   */
  transformForChart(data, chartType) {
    switch (chartType) {
      case 'winDistribution':
        return this._transformForWinDistribution(data);
      case 'racePerformance':
        return this._transformForRacePerformance(data);
      case 'classRadar':
        return this._transformForClassRadar(data);
      case 'gameLength':
        return this._transformForGameLength(data);
      default:
        return data;
    }
  }

  // Transform methods for specific chart types
  _transformForWinDistribution(data) {
    // Look for balance report data
    const goodWinRate = data.find((row) => row.Metric === 'Good Win Rate');
    const evilWinRate = data.find((row) => row.Metric === 'Evil Win Rate');

    if (goodWinRate && evilWinRate) {
      const good = parseFloat(goodWinRate.Value) || 0;
      const evil = parseFloat(evilWinRate.Value) || 0;
      const draw = Math.max(0, 100 - good - evil);

      return { Good: good, Evil: evil, Draw: draw };
    }

    return { Good: 50, Evil: 50, Draw: 0 }; // Default fallback
  }

  _transformForRacePerformance(data) {
    // Transform race analysis data for chart
    return data
      .filter((row) => row.Race && row['Win Rate'] !== undefined)
      .map((row) => ({
        race: row.Race,
        winRate: parseFloat(row['Win Rate']) || 0,
        survivalRate: parseFloat(row['Survival Rate']) || 0,
        sampleSize: parseInt(row['Sample Size']) || 0,
      }));
  }

  _transformForClassRadar(data) {
    // Transform class analysis data for radar chart
    return data
      .filter((row) => row.Class && row['Win Rate'] !== undefined)
      .slice(0, 6) // Limit to top 6 classes for readability
      .map((row) => ({
        class: row.Class,
        winRate: parseFloat(row['Win Rate']) || 0,
        survivalRate: parseFloat(row['Survival Rate']) || 0,
        effectiveness:
          parseFloat(row['Effectiveness Score'] || row.Effectiveness) || 0,
      }));
  }

  _transformForGameLength(data) {
    // Transform game flow data for length distribution chart
    return data
      .filter((row) => row['Round Length'] && row['Game Count'])
      .map((row) => ({
        length: parseInt(row['Round Length']),
        count: parseInt(row['Game Count']),
        goodWins: parseInt(row['Good Wins']) || 0,
        evilWins: parseInt(row['Evil Wins']) || 0,
        category: row.Category || 'Normal',
      }))
      .sort((a, b) => a.length - b.length);
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLoader;
}
