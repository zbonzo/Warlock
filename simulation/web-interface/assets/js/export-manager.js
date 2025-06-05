/**
 * Export Manager Module
 * Handles data export functionality for the web interface
 */

class ExportManager {
  constructor() {
    this.supportedFormats = ['csv', 'json', 'txt', 'html'];
    this.maxFileSize = 50 * 1024 * 1024; // 50MB limit
  }

  /**
   * Export data to CSV format
   * @param {Array} data - Data array to export
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  exportToCSV(data, filename = 'export.csv', options = {}) {
    try {
      const {
        includeHeaders = true,
        delimiter = ',',
        quote = '"',
        encoding = 'utf-8',
      } = options;

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No data to export');
      }

      let csvContent = '';

      // Add BOM for UTF-8 if specified
      if (encoding === 'utf-8-bom') {
        csvContent = '\ufeff';
      }

      // Add headers
      if (includeHeaders && data.length > 0) {
        const headers = Object.keys(data[0]);
        csvContent += this.formatCSVRow(headers, delimiter, quote) + '\n';
      }

      // Add data rows
      data.forEach((row) => {
        const values = Object.values(row);
        csvContent += this.formatCSVRow(values, delimiter, quote) + '\n';
      });

      // Create and download file
      this.downloadFile(csvContent, filename, 'text/csv');

      // Show success notification
      if (window.UI) {
        window.UI.createToast(
          `Exported ${data.length} rows to ${filename}`,
          'success'
        );
      }

      console.log(`✅ Exported ${data.length} rows to ${filename}`);
    } catch (error) {
      console.error('❌ CSV export failed:', error);
      if (window.UI) {
        window.UI.createToast(`Export failed: ${error.message}`, 'error');
      }
      throw error;
    }
  }

  /**
   * Format a single CSV row
   * @param {Array} values - Row values
   * @param {string} delimiter - Field delimiter
   * @param {string} quote - Quote character
   * @returns {string} Formatted CSV row
   */
  formatCSVRow(values, delimiter, quote) {
    return values
      .map((value) => {
        // Convert to string
        let str = String(value ?? '');

        // Escape quotes
        if (str.includes(quote)) {
          str = str.replace(new RegExp(quote, 'g'), quote + quote);
        }

        // Quote if contains delimiter, quote, or newline
        if (
          str.includes(delimiter) ||
          str.includes(quote) ||
          str.includes('\n') ||
          str.includes('\r')
        ) {
          str = quote + str + quote;
        }

        return str;
      })
      .join(delimiter);
  }

  /**
   * Export data to JSON format
   * @param {any} data - Data to export
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  exportToJSON(data, filename = 'export.json', options = {}) {
    try {
      const { indent = 2, includeMetadata = true, pretty = true } = options;

      if (data === undefined || data === null) {
        throw new Error('No data to export');
      }

      let exportData = data;

      // Add metadata if requested
      if (includeMetadata) {
        exportData = {
          metadata: {
            exportDate: new Date().toISOString(),
            exportVersion: '1.0.0',
            recordCount: Array.isArray(data) ? data.length : 1,
            dataType: Array.isArray(data) ? 'array' : typeof data,
          },
          data: data,
        };
      }

      // Convert to JSON
      const jsonContent = pretty
        ? JSON.stringify(exportData, null, indent)
        : JSON.stringify(exportData);

      // Create and download file
      this.downloadFile(jsonContent, filename, 'application/json');

      // Show success notification
      if (window.UI) {
        const count = Array.isArray(data) ? data.length : 1;
        window.UI.createToast(
          `Exported ${count} records to ${filename}`,
          'success'
        );
      }

      console.log(`✅ Exported JSON data to ${filename}`);
    } catch (error) {
      console.error('❌ JSON export failed:', error);
      if (window.UI) {
        window.UI.createToast(`Export failed: ${error.message}`, 'error');
      }
      throw error;
    }
  }

  /**
   * Export data to plain text format
   * @param {string|Array} data - Data to export
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  exportToText(data, filename = 'export.txt', options = {}) {
    try {
      const {
        separator = '\n',
        includeHeaders = false,
        encoding = 'utf-8',
      } = options;

      let textContent = '';

      // Add BOM for UTF-8 if specified
      if (encoding === 'utf-8-bom') {
        textContent = '\ufeff';
      }

      if (typeof data === 'string') {
        textContent += data;
      } else if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object') {
          // Handle array of objects
          if (includeHeaders) {
            textContent += Object.keys(data[0]).join('\t') + separator;
          }

          data.forEach((row) => {
            textContent += Object.values(row).join('\t') + separator;
          });
        } else {
          // Handle array of primitives
          textContent += data.join(separator);
        }
      } else {
        // Handle other data types
        textContent += String(data);
      }

      // Create and download file
      this.downloadFile(textContent, filename, 'text/plain');

      // Show success notification
      if (window.UI) {
        window.UI.createToast(`Exported text data to ${filename}`, 'success');
      }

      console.log(`✅ Exported text data to ${filename}`);
    } catch (error) {
      console.error('❌ Text export failed:', error);
      if (window.UI) {
        window.UI.createToast(`Export failed: ${error.message}`, 'error');
      }
      throw error;
    }
  }

  /**
   * Export current page as HTML
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  exportToHTML(filename = 'report.html', options = {}) {
    try {
      const {
        includeStyles = true,
        includeScripts = false,
        selector = null,
        title = 'Warlock Game Report',
      } = options;

      let htmlContent = '';

      if (selector) {
        // Export specific element
        const element = document.querySelector(selector);
        if (!element) {
          throw new Error(`Element not found: ${selector}`);
        }
        htmlContent = this.generateHTMLPage(
          element.innerHTML,
          title,
          includeStyles,
          includeScripts
        );
      } else {
        // Export entire page
        htmlContent = this.generateFullPageHTML(
          title,
          includeStyles,
          includeScripts
        );
      }

      // Create and download file
      this.downloadFile(htmlContent, filename, 'text/html');

      // Show success notification
      if (window.UI) {
        window.UI.createToast(`Exported HTML report to ${filename}`, 'success');
      }

      console.log(`✅ Exported HTML to ${filename}`);
    } catch (error) {
      console.error('❌ HTML export failed:', error);
      if (window.UI) {
        window.UI.createToast(`Export failed: ${error.message}`, 'error');
      }
      throw error;
    }
  }

  /**
   * Generate a complete HTML page
   * @param {string} content - Page content
   * @param {string} title - Page title
   * @param {boolean} includeStyles - Include CSS styles
   * @param {boolean} includeScripts - Include JavaScript
   * @returns {string} Complete HTML document
   */
  generateHTMLPage(content, title, includeStyles, includeScripts) {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>`;

    if (includeStyles) {
      html += this.extractStyles();
    }

    html += `
</head>
<body>
    <div class="export-container">
        ${content}
    </div>`;

    if (includeScripts) {
      html += this.extractScripts();
    }

    html += `
    <footer style="margin-top: 2rem; padding: 1rem; text-align: center; color: #666; border-top: 1px solid #eee;">
        <p>Exported on ${new Date().toLocaleString()}</p>
        <p>Warlock Game Balance Analysis System</p>
    </footer>
</body>
</html>`;

    return html;
  }

  /**
   * Generate full page HTML export
   * @param {string} title - Page title
   * @param {boolean} includeStyles - Include CSS styles
   * @param {boolean} includeScripts - Include JavaScript
   * @returns {string} Complete HTML document
   */
  generateFullPageHTML(title, includeStyles, includeScripts) {
    // Clone the document to avoid modifying the original
    const docClone = document.cloneNode(true);

    // Remove scripts and interactive elements if not included
    if (!includeScripts) {
      docClone.querySelectorAll('script').forEach((el) => el.remove());
      docClone.querySelectorAll('button').forEach((el) => (el.disabled = true));
    }

    // Clean up for print
    docClone.querySelectorAll('.nav-tab').forEach((el) => el.remove());
    docClone
      .querySelectorAll('.tab-panel')
      .forEach((el) => (el.style.display = 'block'));

    return docClone.documentElement.outerHTML;
  }

  /**
   * Extract CSS styles from the page
   * @returns {string} CSS styles
   */
  extractStyles() {
    let styles = '<style>';

    // Include external stylesheets content (if accessible)
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      // Note: This won't work for external stylesheets due to CORS
      // but we can include the reference
      styles += `@import url("${link.href}");`;
    });

    // Include inline styles
    document.querySelectorAll('style').forEach((styleEl) => {
      styles += styleEl.textContent;
    });

    // Add export-specific styles
    styles += `
      .export-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .nav-tabs { display: none; }
      .tab-panel { display: block !important; margin-bottom: 2rem; }
      @media print { 
        .export-container { max-width: none; margin: 0; padding: 10px; }
        .chart-container { page-break-inside: avoid; }
      }
    `;

    styles += '</style>';
    return styles;
  }

  /**
   * Extract JavaScript from the page
   * @returns {string} JavaScript code
   */
  extractScripts() {
    let scripts = '';

    // Include inline scripts
    document.querySelectorAll('script:not([src])').forEach((scriptEl) => {
      scripts += `<script>${scriptEl.textContent}</script>`;
    });

    return scripts;
  }

  /**
   * Export chart as image
   * @param {string} chartId - Chart canvas ID
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  exportChartAsImage(chartId, filename = 'chart.png', options = {}) {
    try {
      const {
        format = 'png',
        quality = 0.92,
        backgroundColor = '#ffffff',
        width = null,
        height = null,
      } = options;

      const canvas = document.getElementById(chartId);
      if (!canvas || canvas.tagName !== 'CANVAS') {
        throw new Error(`Chart canvas not found: ${chartId}`);
      }

      // Create a new canvas with background if needed
      let exportCanvas = canvas;
      if (backgroundColor && backgroundColor !== 'transparent') {
        exportCanvas = document.createElement('canvas');
        exportCanvas.width = width || canvas.width;
        exportCanvas.height = height || canvas.height;

        const ctx = exportCanvas.getContext('2d');
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(canvas, 0, 0);
      }

      // Convert to data URL
      const dataURL = exportCanvas.toDataURL(`image/${format}`, quality);

      // Download the image
      this.downloadDataURL(dataURL, filename);

      // Show success notification
      if (window.UI) {
        window.UI.createToast(`Exported chart to ${filename}`, 'success');
      }

      console.log(`✅ Exported chart ${chartId} to ${filename}`);
    } catch (error) {
      console.error('❌ Chart export failed:', error);
      if (window.UI) {
        window.UI.createToast(`Chart export failed: ${error.message}`, 'error');
      }
      throw error;
    }
  }

  /**
   * Export table data to various formats
   * @param {string} tableId - Table element ID
   * @param {string} format - Export format ('csv', 'json', 'html')
   * @param {string} filename - Output filename
   */
  exportTable(tableId, format = 'csv', filename = null) {
    try {
      const table = document.getElementById(tableId);
      if (!table) {
        throw new Error(`Table not found: ${tableId}`);
      }

      const data = this.extractTableData(table);

      if (!filename) {
        filename = `${tableId}_export.${format}`;
      }

      switch (format.toLowerCase()) {
        case 'csv':
          this.exportToCSV(data, filename);
          break;
        case 'json':
          this.exportToJSON(data, filename);
          break;
        case 'html':
          this.exportToHTML(filename, { selector: `#${tableId}` });
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error('❌ Table export failed:', error);
      if (window.UI) {
        window.UI.createToast(`Table export failed: ${error.message}`, 'error');
      }
      throw error;
    }
  }

  /**
   * Extract data from a table element
   * @param {HTMLElement} table - Table element
   * @returns {Array} Table data
   */
  extractTableData(table) {
    const data = [];
    const rows = table.querySelectorAll('tbody tr');
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
      th.textContent.trim()
    );

    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      const rowData = {};

      cells.forEach((cell, index) => {
        const header = headers[index] || `Column_${index + 1}`;
        rowData[header] = cell.textContent.trim();
      });

      data.push(rowData);
    });

    return data;
  }

  /**
   * Batch export multiple data sets
   * @param {Array} exports - Array of export configurations
   * @param {Object} options - Batch options
   */
  async batchExport(exports, options = {}) {
    const { showProgress = true, delay = 100, onProgress = null } = options;

    let progressBar = null;

    if (showProgress && window.UI) {
      progressBar = window.UI.createProgressBar(0, 'Preparing exports...');
      document.body.appendChild(progressBar);
    }

    try {
      for (let i = 0; i < exports.length; i++) {
        const exportConfig = exports[i];
        const progress = ((i + 1) / exports.length) * 100;

        if (progressBar) {
          window.UI.updateProgressBar(
            progressBar,
            progress,
            `Exporting ${exportConfig.filename}...`
          );
        }

        if (onProgress) {
          onProgress(progress, exportConfig);
        }

        // Perform the export
        await this.performExport(exportConfig);

        // Small delay to prevent UI blocking
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (window.UI) {
        window.UI.createToast(
          `Successfully exported ${exports.length} files`,
          'success'
        );
      }
    } catch (error) {
      console.error('❌ Batch export failed:', error);
      if (window.UI) {
        window.UI.createToast(`Batch export failed: ${error.message}`, 'error');
      }
    } finally {
      if (progressBar) {
        setTimeout(() => progressBar.remove(), 2000);
      }
    }
  }

  /**
   * Perform a single export based on configuration
   * @param {Object} config - Export configuration
   */
  async performExport(config) {
    const { type, data, filename, options = {} } = config;

    switch (type) {
      case 'csv':
        this.exportToCSV(data, filename, options);
        break;
      case 'json':
        this.exportToJSON(data, filename, options);
        break;
      case 'text':
        this.exportToText(data, filename, options);
        break;
      case 'html':
        this.exportToHTML(filename, options);
        break;
      case 'chart':
        this.exportChartAsImage(data, filename, options);
        break;
      default:
        throw new Error(`Unknown export type: ${type}`);
    }
  }

  /**
   * Create and trigger file download
   * @param {string} content - File content
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   */
  downloadFile(content, filename, mimeType) {
    // Check file size
    const size = new Blob([content]).size;
    if (size > this.maxFileSize) {
      throw new Error(
        `File too large: ${(size / 1024 / 1024).toFixed(1)}MB (max: ${
          this.maxFileSize / 1024 / 1024
        }MB)`
      );
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Download from data URL
   * @param {string} dataURL - Data URL
   * @param {string} filename - Filename
   */
  downloadDataURL(dataURL, filename) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Get supported export formats
   * @returns {Array} Supported formats
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Check if format is supported
   * @param {string} format - Format to check
   * @returns {boolean} Whether format is supported
   */
  isFormatSupported(format) {
    return this.supportedFormats.includes(format.toLowerCase());
  }

  /**
   * Get export statistics
   * @returns {Object} Export statistics
   */
  getStats() {
    return {
      supportedFormats: this.supportedFormats.length,
      maxFileSize: this.maxFileSize,
      maxFileSizeMB: Math.round(this.maxFileSize / 1024 / 1024),
    };
  }
}

// Global export utilities
const ExportUtil = new ExportManager();

// Global functions for HTML onclick handlers
function exportCurrentReport() {
  if (window.app && window.app.currentReportData) {
    const timestamp = new Date().toISOString().substring(0, 10);
    ExportUtil.exportToCSV(
      window.app.currentReportData,
      `warlock_report_${timestamp}.csv`
    );
  } else {
    if (window.UI) {
      window.UI.createToast('No report data available to export', 'warning');
    }
  }
}

function exportRecommendations() {
  if (window.app && window.app.currentReportData) {
    // Filter for recommendations if it's a recommendations report
    const data = window.app.currentReportData;
    const timestamp = new Date().toISOString().substring(0, 10);

    ExportUtil.exportToCSV(data, `warlock_recommendations_${timestamp}.csv`);
  } else {
    if (window.UI) {
      window.UI.createToast('No recommendations data available', 'warning');
    }
  }
}

function downloadCSV() {
  exportCurrentReport();
}

function exportChartImage(chartId) {
  const timestamp = new Date().toISOString().substring(0, 10);
  ExportUtil.exportChartAsImage(
    chartId,
    `warlock_chart_${chartId}_${timestamp}.png`
  );
}

function exportTableData(tableId, format = 'csv') {
  const timestamp = new Date().toISOString().substring(0, 10);
  ExportUtil.exportTable(
    tableId,
    format,
    `warlock_${tableId}_${timestamp}.${format}`
  );
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportManager;
}
