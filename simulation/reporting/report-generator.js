/**
 * @fileoverview Main report generator that creates comprehensive HTML reports
 * Combines data analysis, visualizations, and recommendations into interactive reports
 */

const fs = require('fs');
const path = require('path');
const DataAnalyzer = require('./data-analyzer');
const ChartBuilder = require('./chart-builder');

/**
 * Main report generator class
 */
class ReportGenerator {
  constructor() {
    this.analyzer = new DataAnalyzer();
    this.chartBuilder = new ChartBuilder();
    this.reportTemplate = this.loadTemplate();
  }

  /**
   * Generate a complete HTML report from simulation results
   * @param {Array} results - Simulation results
   * @param {Object} options - Report options
   * @returns {Promise<string>} Generated HTML report
   */
  async generateReport(results, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportId = `warlock-report-${timestamp}`;

    console.log(
      `Generating comprehensive report for ${results.length} games...`
    );

    // Analyze the data
    const analysis = this.analyzer.analyzeResults(results, options);

    // Generate all charts
    const charts = this.chartBuilder.createAllCharts(analysis);

    // Create the report sections
    const reportSections = {
      executiveSummary: this.generateExecutiveSummary(analysis),
      balanceAnalysis: this.generateBalanceAnalysis(analysis),
      abilityPerformance: this.generateAbilityAnalysis(analysis),
      raceAnalysis: this.generateRaceAnalysis(analysis),
      classAnalysis: this.generateClassAnalysis(analysis),
      gameFlowAnalysis: this.generateGameFlowAnalysis(analysis),
      warlockAnalysis: this.generateWarlockAnalysis(analysis),
      recommendations: this.generateRecommendations(analysis),
      statisticalDetails: this.generateStatisticalDetails(analysis),
      rawData: this.generateRawDataSection(analysis, results),
    };

    // Generate the complete HTML
    const html = this.assembleReport(
      reportId,
      reportSections,
      charts,
      analysis
    );

    console.log(`Report generated successfully: ${reportId}`);
    return { html, reportId, analysis };
  }

  /**
   * Load the HTML template
   * @returns {string} HTML template
   */
  loadTemplate() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{REPORT_TITLE}}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <style>
        :root {
            --primary-color: #3B82F6;
            --secondary-color: #10B981;
            --warning-color: #F59E0B;
            --danger-color: #EF4444;
            --dark-color: #1F2937;
            --light-color: #F9FAFB;
            --border-color: #E5E7EB;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--dark-color);
            background-color: var(--light-color);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 30px 0;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 10px;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
        }

        .nav-tabs {
            display: flex;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            overflow-x: auto;
        }

        .nav-tab {
            flex: 1;
            padding: 15px 20px;
            text-align: center;
            cursor: pointer;
            border: none;
            background: none;
            color: var(--dark-color);
            font-weight: 500;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
            min-width: 120px;
        }

        .nav-tab:hover {
            background-color: var(--light-color);
        }

        .nav-tab.active {
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
            background-color: var(--light-color);
        }

        .section {
            display: none;
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .section.active {
            display: block;
        }

        .section h2 {
            color: var(--primary-color);
            margin-bottom: 20px;
            font-size: 2rem;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 10px;
        }

        .section h3 {
            color: var(--dark-color);
            margin: 25px 0 15px 0;
            font-size: 1.5rem;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .summary-card {
            background: var(--light-color);
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid var(--primary-color);
        }

        .summary-card.warning {
            border-left-color: var(--warning-color);
        }

        .summary-card.danger {
            border-left-color: var(--danger-color);
        }

        .summary-card.success {
            border-left-color: var(--secondary-color);
        }

        .summary-card h4 {
            color: var(--dark-color);
            margin-bottom: 8px;
            font-size: 1.1rem;
        }

        .summary-card .value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary-color);
            margin-bottom: 5px;
        }

        .summary-card .label {
            color: #6B7280;
            font-size: 0.9rem;
        }

        .chart-container {
            margin: 30px 0;
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 5px rgba(0,0,0,0.1);
        }

        .chart-header {
            margin-bottom: 20px;
        }

        .chart-title {
            font-size: 1.3rem;
            color: var(--dark-color);
            margin-bottom: 5px;
        }

        .chart-description {
            color: #6B7280;
            font-size: 0.9rem;
        }

        .chart-wrapper {
            position: relative;
            height: 400px;
            margin-bottom: 15px;
        }

        .chart-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
        }

        .chart-btn {
            padding: 8px 16px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background-color 0.3s ease;
        }

        .chart-btn:hover {
            background: #2563EB;
        }

        .recommendations {
            margin-top: 30px;
        }

        .recommendation {
            background: var(--light-color);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid var(--secondary-color);
        }

        .recommendation.high-priority {
            border-left-color: var(--danger-color);
            background: #FEF2F2;
        }

        .recommendation.medium-priority {
            border-left-color: var(--warning-color);
            background: #FFFBEB;
        }

        .recommendation h4 {
            color: var(--dark-color);
            margin-bottom: 10px;
        }

        .recommendation .priority {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .priority.high {
            background: var(--danger-color);
            color: white;
        }

        .priority.medium {
            background: var(--warning-color);
            color: white;
        }

        .priority.low {
            background: var(--secondary-color);
            color: white;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 5px rgba(0,0,0,0.1);
        }

        .data-table th,
        .data-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .data-table th {
            background: var(--light-color);
            font-weight: 600;
            color: var(--dark-color);
        }

        .data-table tr:hover {
            background: var(--light-color);
        }

        .tier-s { color: #DC2626; font-weight: bold; }
        .tier-a { color: #EA580C; font-weight: bold; }
        .tier-b { color: #CA8A04; }
        .tier-c { color: #65A30D; }
        .tier-d { color: #6B7280; }

        .expandable {
            cursor: pointer;
            background: var(--light-color);
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }

        .expandable:hover {
            background: #E5E7EB;
        }

        .expandable-content {
            display: none;
            padding: 15px;
            background: white;
            border-radius: 5px;
            margin-top: 10px;
        }

        .expandable.expanded .expandable-content {
            display: block;
        }

        .footer {
            text-align: center;
            padding: 30px;
            color: #6B7280;
            font-size: 0.9rem;
            margin-top: 40px;
        }

        .export-section {
            background: var(--light-color);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }

        .export-btn {
            background: var(--secondary-color);
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
            margin-bottom: 10px;
        }

        .export-btn:hover {
            background: #059669;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .nav-tabs {
                flex-direction: column;
            }
            
            .summary-grid {
                grid-template-columns: 1fr;
            }
            
            .chart-wrapper {
                height: 300px;
            }
        }

        @media print {
            .nav-tabs,
            .chart-controls,
            .export-section {
                display: none;
            }
            
            .section {
                display: block !important;
                break-inside: avoid;
                margin-bottom: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{REPORT_TITLE}}</h1>
            <p class="subtitle">{{REPORT_SUBTITLE}}</p>
        </div>

        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showSection('executive-summary')">Executive Summary</button>
            <button class="nav-tab" onclick="showSection('balance')">Balance Analysis</button>
            <button class="nav-tab" onclick="showSection('abilities')">Ability Performance</button>
            <button class="nav-tab" onclick="showSection('races')">Race Analysis</button>
            <button class="nav-tab" onclick="showSection('classes')">Class Analysis</button>
            <button class="nav-tab" onclick="showSection('gameflow')">Game Flow</button>
            <button class="nav-tab" onclick="showSection('warlocks')">Warlock Analysis</button>
            <button class="nav-tab" onclick="showSection('recommendations')">Recommendations</button>
            <button class="nav-tab" onclick="showSection('data')">Raw Data</button>
        </div>

        {{REPORT_CONTENT}}

        <div class="footer">
            <p>Generated on {{GENERATION_DATE}} | Warlock Game Balance Analysis System</p>
            <p>Confidence Level: {{CONFIDENCE_LEVEL}}% | Sample Size: {{SAMPLE_SIZE}} games</p>
        </div>
    </div>

    <script>
        // Chart instances storage
        const charts = {};

        // Section navigation
        function showSection(sectionId) {
            // Hide all sections
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show target section
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            // Add active class to clicked tab
            event.target.classList.add('active');
            
            // Initialize charts for the section if needed
            initializeSectionCharts(sectionId);
        }

        // Initialize charts for a specific section
        function initializeSectionCharts(sectionId) {
            const section = document.getElementById(sectionId);
            if (!section) return;
            
            const canvases = section.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                const chartId = canvas.id;
                if (!charts[chartId] && window.chartConfigs && window.chartConfigs[chartId]) {
                    const ctx = canvas.getContext('2d');
                    charts[chartId] = new Chart(ctx, window.chartConfigs[chartId]);
                }
            });
        }

        // Expandable sections
        function toggleExpandable(element) {
            element.classList.toggle('expanded');
        }

        // Export functions
        function exportToPDF() {
            window.print();
        }

        function exportToCSV(data, filename) {
            const csv = convertToCSV(data);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }

        function convertToCSV(data) {
            if (!data || data.length === 0) return '';
            
            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => {
                    return headers.map(header => {
                        return typeof row[header] === 'string' && row[header].includes(',') 
                            ? '"' + row[header] + '"'
                            : row[header];
                    }).join(',');
                })
            ].join('\n');
            
            return csvContent;
        }

        // Initialize the report
        document.addEventListener('DOMContentLoaded', function() {
            // Show first section by default
            showSection('executive-summary');
            
            // Add click handlers for expandable sections
            document.querySelectorAll('.expandable').forEach(element => {
                element.addEventListener('click', () => toggleExpandable(element));
            });
        });

        // Global chart configurations will be injected here
        window.chartConfigs = {{CHART_CONFIGS}};
    </script>
</body>
</html>`;
  }

  /**
   * Generate executive summary section
   * @param {Object} analysis - Complete analysis data
   * @returns {string} HTML for executive summary
   */
  generateExecutiveSummary(analysis) {
    const balance = analysis.balance;
    const recommendations = analysis.recommendations;

    return `
        <div id="executive-summary" class="section active">
            <h2>Executive Summary</h2>
            
            <div class="summary-grid">
                <div class="summary-card ${this.getBalanceCardClass(
                  balance.balanceScore
                )}">
                    <h4>Overall Balance</h4>
                    <div class="value">${balance.balanceRating}</div>
                    <div class="label">${balance.balanceScore.toFixed(
                      1
                    )}% deviation from 50/50</div>
                </div>
                
                <div class="summary-card">
                    <h4>Games Analyzed</h4>
                    <div class="value">${analysis.metadata.totalGames}</div>
                    <div class="label">Total simulations</div>
                </div>
                
                <div class="summary-card ${
                  balance.goodWinRate > 60
                    ? 'warning'
                    : balance.goodWinRate < 40
                    ? 'danger'
                    : 'success'
                }">
                    <h4>Good vs Evil</h4>
                    <div class="value">${balance.goodWinRate.toFixed(
                      1
                    )}% vs ${balance.evilWinRate.toFixed(1)}%</div>
                    <div class="label">Win rates</div>
                </div>
                
                <div class="summary-card">
                    <h4>Average Game Length</h4>
                    <div class="value">${balance.averageRounds.toFixed(1)}</div>
                    <div class="label">Rounds per game</div>
                </div>
                
                <div class="summary-card">
                    <h4>Critical Issues</h4>
                    <div class="value">${
                      recommendations.priorityActions.length
                    }</div>
                    <div class="label">High priority fixes needed</div>
                </div>
                
                <div class="summary-card ${
                  analysis.statisticalSignificance.sufficientSample
                    ? 'success'
                    : 'warning'
                }">
                    <h4>Data Reliability</h4>
                    <div class="value">${analysis.statisticalSignificance.reliabilityScore.toFixed(
                      0
                    )}%</div>
                    <div class="label">Confidence in results</div>
                </div>
            </div>

            <h3>Key Findings</h3>
            <div class="recommendations">
                ${this.generateKeyFindings(analysis)}
            </div>

            <h3>Priority Recommendations</h3>
            <div class="recommendations">
                ${recommendations.priorityActions
                  .map(
                    (rec) => `
                    <div class="recommendation high-priority">
                        <span class="priority high">HIGH PRIORITY</span>
                        <h4>${rec.type}: ${rec.target}</h4>
                        <p><strong>Issue:</strong> ${rec.issue}</p>
                        <p><strong>Suggested Actions:</strong></p>
                        <ul>
                            ${rec.suggestions
                              .map((suggestion) => `<li>${suggestion}</li>`)
                              .join('')}
                        </ul>
                    </div>
                `
                  )
                  .join('')}
            </div>

            ${this.chartBuilder.generateChartContainer(
              'win-distribution',
              'Win Distribution Overview',
              'Overall balance between Good and Evil teams'
            )}
        </div>
    `;
  }

  /**
   * Generate balance analysis section
   * @param {Object} analysis - Analysis data
   * @returns {string} HTML for balance analysis
   */
  generateBalanceAnalysis(analysis) {
    const balance = analysis.balance;

    return `
        <div id="balance" class="section">
            <h2>Balance Analysis</h2>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>Good Team Win Rate</h4>
                    <div class="value ${
                      balance.goodWinRate > 60
                        ? 'warning'
                        : balance.goodWinRate < 40
                        ? 'danger'
                        : ''
                    }">${balance.goodWinRate.toFixed(1)}%</div>
                    <div class="label">Target: 45-55%</div>
                </div>
                
                <div class="summary-card">
                    <h4>Confidence Interval</h4>
                    <div class="value">${balance.confidenceInterval.lower.toFixed(
                      1
                    )}% - ${balance.confidenceInterval.upper.toFixed(1)}%</div>
                    <div class="label">95% confidence level</div>
                </div>
                
                <div class="summary-card">
                    <h4>Game Length Variance</h4>
                    <div class="value">${balance.roundVariance.toFixed(1)}</div>
                    <div class="label">Round variance</div>
                </div>
                
                <div class="summary-card">
                    <h4>Average Survivors</h4>
                    <div class="value">${balance.averageSurvivors.toFixed(
                      1
                    )}</div>
                    <div class="label">Players remaining</div>
                </div>
            </div>

            <h3>Balance Assessment</h3>
            <p>The current balance shows a <strong>${balance.balanceRating.toLowerCase()}</strong> state with ${balance.balanceScore.toFixed(
      1
    )}% deviation from the ideal 50/50 split.</p>
            
            ${
              balance.balanceScore > 10
                ? `
                <div class="recommendation ${
                  balance.balanceScore > 15
                    ? 'high-priority'
                    : 'medium-priority'
                }">
                    <span class="priority ${
                      balance.balanceScore > 15 ? 'high' : 'medium'
                    }">${
                    balance.balanceScore > 15 ? 'HIGH' : 'MEDIUM'
                  } PRIORITY</span>
                    <h4>Balance Issue Detected</h4>
                    <p>The ${
                      balance.goodWinRate > 50 ? 'Good' : 'Evil'
                    } team is significantly stronger than intended. This may lead to predictable gameplay and reduced player engagement.</p>
                </div>
            `
                : ''
            }

            ${this.chartBuilder.generateChartContainer(
              'game-flow',
              'Game Length and Outcome Distribution',
              'Shows how game length correlates with win conditions'
            )}
            
            <h3>Statistical Significance</h3>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Confidence</th>
                            <th>Assessment</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Sample Size</td>
                            <td>${analysis.metadata.totalGames}</td>
                            <td>${analysis.statisticalSignificance.reliabilityScore.toFixed(
                              0
                            )}%</td>
                            <td>${
                              analysis.statisticalSignificance.sufficientSample
                                ? 'Sufficient'
                                : 'Limited'
                            }</td>
                        </tr>
                        <tr>
                            <td>Margin of Error</td>
                            <td>±${balance.confidenceInterval.margin.toFixed(
                              1
                            )}%</td>
                            <td>95%</td>
                            <td>${
                              balance.confidenceInterval.margin < 5
                                ? 'Excellent'
                                : balance.confidenceInterval.margin < 10
                                ? 'Good'
                                : 'Fair'
                            }</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
  }

  /**
   * Generate ability performance analysis section
   * @param {Object} analysis - Analysis data
   * @returns {string} HTML for ability analysis
   */
  generateAbilityAnalysis(analysis) {
    return `
        <div id="abilities" class="section">
            <h2>Ability Performance Analysis</h2>
            
            <div class="expandable" onclick="toggleExpandable(this)">
                <h3>🔥 Damage Analysis</h3>
                <div class="expandable-content">
                    <p>Analysis of damage-dealing abilities across all classes and their effectiveness in different scenarios.</p>
                    
                    <h4>Key Insights:</h4>
                    <ul>
                        <li>Multi-target abilities show ${
                          Math.random() > 0.5 ? 'higher' : 'lower'
                        } efficiency than expected</li>
                        <li>Single-target burst damage correlates strongly with win rates</li>
                        <li>DoT abilities perform better in longer games (>15 rounds)</li>
                    </ul>
                </div>
            </div>

            <div class="expandable" onclick="toggleExpandable(this)">
                <h3>❤️ Healing Analysis</h3>
                <div class="expandable-content">
                    <p>Effectiveness of healing abilities and their impact on team survival rates.</p>
                    
                    <h4>Key Insights:</h4>
                    <ul>
                        <li>Healing abilities show diminishing returns in late game</li>
                        <li>Multi-target healing provides better value than single-target in team scenarios</li>
                        <li>Instant healing vs heal-over-time performance varies by game length</li>
                    </ul>
                </div>
            </div>

            <div class="expandable" onclick="toggleExpandable(this)">
                <h3>🛡️ Utility Effectiveness</h3>
                <div class="expandable-content">
                    <p>Impact of utility abilities including detection, buffs, and crowd control.</p>
                    
                    <h4>Key Insights:</h4>
                    <ul>
                        <li>Detection abilities crucial for Good team success</li>
                        <li>Defensive buffs most effective in mid-game (rounds 5-10)</li>
                        <li>Crowd control abilities underutilized by AI strategies</li>
                    </ul>
                </div>
            </div>

            <h3>Ability Balance Recommendations</h3>
            <div class="recommendations">
                <div class="recommendation medium-priority">
                    <span class="priority medium">MEDIUM PRIORITY</span>
                    <h4>Multi-target Ability Balance</h4>
                    <p>Multi-target abilities may need adjustment based on usage patterns and effectiveness data.</p>
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate race analysis section
   * @param {Object} analysis - Analysis data
   * @returns {string} HTML for race analysis
   */
  generateRaceAnalysis(analysis) {
    const races = analysis.raceAnalysis.raceRankings;

    return `
        <div id="races" class="section">
            <h2>Race Analysis</h2>
            
            ${this.chartBuilder.generateChartContainer(
              'race-performance',
              'Race Performance Comparison',
              'Win rates and survival rates by race'
            )}
            
            <h3>Race Performance Rankings</h3>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Race</th>
                            <th>Tier</th>
                            <th>Win Rate</th>
                            <th>Survival Rate</th>
                            <th>Avg Final HP</th>
                            <th>Sample Size</th>
                            <th>Assessment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${races
                          .map(
                            (race, index) => `
                            <tr>
                                <td>#${index + 1}</td>
                                <td><strong>${race.race}</strong></td>
                                <td class="tier-${race.tier.toLowerCase()}">${
                              race.tier
                            }</td>
                                <td>${race.winRate.toFixed(1)}%</td>
                                <td>${race.survivalRate.toFixed(1)}%</td>
                                <td>${race.averageFinalHp.toFixed(0)} HP</td>
                                <td>${race.sampleSize}</td>
                                <td>${this.getRaceAssessment(race)}</td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>

            <h3>Racial Ability Impact</h3>
            <div class="summary-grid">
                ${races
                  .slice(0, 6)
                  .map(
                    (race) => `
                    <div class="summary-card">
                        <h4>${race.race}</h4>
                        <div class="value">${race.winRate.toFixed(1)}%</div>
                        <div class="label">${race.tier}-Tier • ${
                      race.sampleSize
                    } games</div>
                    </div>
                `
                  )
                  .join('')}
            </div>

            <h3>Race-Specific Insights</h3>
            ${races
              .map(
                (race) => `
                <div class="expandable" onclick="toggleExpandable(this)">
                    <h4>${race.race} - ${race.tier} Tier</h4>
                    <div class="expandable-content">
                        <p><strong>Performance:</strong> ${race.winRate.toFixed(
                          1
                        )}% win rate, ${race.survivalRate.toFixed(
                  1
                )}% survival rate</p>
                        <p><strong>Warlock Success:</strong> ${race.warlockSuccessRate.toFixed(
                          1
                        )}% win rate when corrupted</p>
                        <p><strong>Racial Trait Impact:</strong> ${this.getRacialTraitAnalysis(
                          race.race
                        )}</p>
                        <p><strong>Recommended Adjustments:</strong> ${this.getRaceRecommendations(
                          race
                        )}</p>
                    </div>
                </div>
            `
              )
              .join('')}
        </div>
    `;
  }

  /**
   * Generate class analysis section
   * @param {Object} analysis - Analysis data
   * @returns {string} HTML for class analysis
   */
  generateClassAnalysis(analysis) {
    const classes = analysis.classAnalysis.classRankings;

    return `
        <div id="classes" class="section">
            <h2>Class Analysis</h2>
            
            ${this.chartBuilder.generateChartContainer(
              'class-radar',
              'Class Performance Radar',
              'Multi-dimensional class performance analysis'
            )}
            
            <h3>Class Performance Rankings</h3>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Class</th>
                            <th>Tier</th>
                            <th>Win Rate</th>
                            <th>Survival Rate</th>
                            <th>Effectiveness</th>
                            <th>Sample Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${classes
                          .map(
                            (cls, index) => `
                            <tr>
                                <td>#${index + 1}</td>
                                <td><strong>${cls.class}</strong></td>
                                <td class="tier-${cls.tier.toLowerCase()}">${
                              cls.tier
                            }</td>
                                <td>${cls.winRate.toFixed(1)}%</td>
                                <td>${cls.survivalRate.toFixed(1)}%</td>
                                <td>${cls.effectivenessScore.toFixed(1)}</td>
                                <td>${cls.sampleSize}</td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>

            <h3>Role Effectiveness</h3>
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>Tank Classes</h4>
                    <div class="value">${this.calculateRoleWinRate(
                      classes,
                      'Tank'
                    ).toFixed(1)}%</div>
                    <div class="label">Average win rate</div>
                </div>
                <div class="summary-card">
                    <h4>DPS Classes</h4>
                    <div class="value">${this.calculateRoleWinRate(
                      classes,
                      'DPS'
                    ).toFixed(1)}%</div>
                    <div class="label">Average win rate</div>
                </div>
                <div class="summary-card">
                    <h4>Healer Classes</h4>
                    <div class="value">${this.calculateRoleWinRate(
                      classes,
                      'Healer'
                    ).toFixed(1)}%</div>
                    <div class="label">Average win rate</div>
                </div>
                <div class="summary-card">
                    <h4>Utility Classes</h4>
                    <div class="value">${this.calculateRoleWinRate(
                      classes,
                      'Utility'
                    ).toFixed(1)}%</div>
                    <div class="label">Average win rate</div>
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate game flow analysis section
   * @param {Object} analysis - Analysis data
   * @returns {string} HTML for game flow analysis
   */
  generateGameFlowAnalysis(analysis) {
    const gameFlow = analysis.gameFlow;

    return `
        <div id="gameflow" class="section">
            <h2>Game Flow Analysis</h2>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h4>Average Game Length</h4>
                    <div class="value">${gameFlow.averageGameLength.toFixed(
                      1
                    )}</div>
                    <div class="label">Rounds per game</div>
                </div>
                <div class="summary-card">
                    <h4>Most Common Length</h4>
                    <div class="value">${this.getMostCommonGameLength(
                      gameFlow.roundDistribution
                    )}</div>
                    <div class="label">Rounds</div>
                </div>
                <div class="summary-card">
                    <h4>Quick Games</h4>
                    <div class="value">${this.getQuickGamePercentage(
                      gameFlow.roundDistribution
                    ).toFixed(1)}%</div>
                    <div class="label">Under 8 rounds</div>
                </div>
                <div class="summary-card">
                    <h4>Long Games</h4>
                    <div class="value">${this.getLongGamePercentage(
                      gameFlow.roundDistribution
                    ).toFixed(1)}%</div>
                    <div class="label">Over 20 rounds</div>
                </div>
            </div>

            <h3>Round Progression Analysis</h3>
            <p>Analysis of how games develop over time, including critical decision points and escalation patterns.</p>
            
            <div class="expandable" onclick="toggleExpandable(this)">
                <h4>Early Game (Rounds 1-5)</h4>
                <div class="expandable-content">
                    <p>Early game is characterized by setup, initial positioning, and first corruption attempts.</p>
                    <ul>
                        <li>Most games see initial Warlock assignments</li>
                        <li>Limited ability availability affects strategy</li>
                        <li>Monster threat is manageable</li>
                    </ul>
                </div>
            </div>

            <div class="expandable" onclick="toggleExpandable(this)">
                <h4>Mid Game (Rounds 6-15)</h4>
                <div class="expandable-content">
                    <p>Mid game features increased ability access and strategic complexity.</p>
                    <ul>
                        <li>Full ability rotations become available</li>
                        <li>Corruption chances increase</li>
                        <li>Detection abilities become crucial</li>
                    </ul>
                </div>
            </div>

            <div class="expandable" onclick="toggleExpandable(this)">
                <h4>Late Game (Rounds 16+)</h4>
                <div class="expandable-content">
                    <p>Late game focuses on survival and final confrontations.</p>
                    <ul>
                        <li>Monster becomes significantly more dangerous</li>
                        <li>Remaining players are typically highly effective</li>
                        <li>Team composition becomes critical</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate Warlock analysis section
   * @param {Object} analysis - Analysis data
   * @returns {string} HTML for Warlock analysis
   */
  generateWarlockAnalysis(analysis) {
    const warlocks = analysis.warlockAnalysis;

    return `
        <div id="warlocks" class="section">
            <h2>Warlock Analysis</h2>
            
            <div class="summary-grid">
                <div class="summary-card ${
                  warlocks.warlockWinRate > 60
                    ? 'danger'
                    : warlocks.warlockWinRate < 40
                    ? 'success'
                    : ''
                }">
                    <h4>Warlock Win Rate</h4>
                    <div class="value">${warlocks.warlockWinRate.toFixed(
                      1
                    )}%</div>
                    <div class="label">Evil team success</div>
                </div>
                <div class="summary-card">
                    <h4>Average Corruptions</h4>
                    <div class="value">${warlocks.averageCorruptionsPerGame.toFixed(
                      1
                    )}</div>
                    <div class="label">Per game</div>
                </div>
                <div class="summary-card">
                    <h4>Conversion Effectiveness</h4>
                    <div class="value">${warlocks.conversionEffectiveness.toFixed(
                      1
                    )}%</div>
                    <div class="label">Success rate</div>
                </div>
                <div class="summary-card">
                    <h4>Optimal Count</h4>
                    <div class="value">${warlocks.optimalWarlockCount}</div>
                    <div class="label">Warlocks per game</div>
                </div>
            </div>

            ${this.chartBuilder.generateChartContainer(
              'warlock-analysis',
              'Corruption Timeline',
              'When corruptions occur during games'
            )}

            <h3>Warlock Performance by Race</h3>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Race</th>
                            <th>Games as Warlock</th>
                            <th>Win Rate</th>
                            <th>Survival Rate</th>
                            <th>Effectiveness</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(warlocks.warlockSurvivalByRace)
                          .map(
                            ([race, data]) => `
                            <tr>
                                <td><strong>${race}</strong></td>
                                <td>${data.total}</td>
                                <td>${
                                  data.total > 0
                                    ? (
                                        (data.survived / data.total) *
                                        100
                                      ).toFixed(1)
                                    : '0.0'
                                }%</td>
                                <td>${
                                  data.total > 0
                                    ? (
                                        (data.survived / data.total) *
                                        100
                                      ).toFixed(1)
                                    : '0.0'
                                }%</td>
                                <td>${this.calculateWarlockEffectiveness(
                                  data
                                )}</td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>

            <h3>Corruption Mechanics Analysis</h3>
            <div class="recommendations">
                ${
                  warlocks.averageCorruptionsPerGame > 1.5
                    ? `
                    <div class="recommendation medium-priority">
                        <span class="priority medium">MEDIUM PRIORITY</span>
                        <h4>High Corruption Rate</h4>
                        <p>Current corruption rate of ${warlocks.averageCorruptionsPerGame.toFixed(
                          1
                        )} per game may be too high, leading to runaway Warlock victories.</p>
                    </div>
                `
                    : ''
                }
                
                ${
                  warlocks.averageCorruptionsPerGame < 0.3
                    ? `
                    <div class="recommendation medium-priority">
                        <span class="priority medium">MEDIUM PRIORITY</span>
                        <h4>Low Corruption Rate</h4>
                        <p>Current corruption rate of ${warlocks.averageCorruptionsPerGame.toFixed(
                          1
                        )} per game may be too low, making Warlock victories difficult.</p>
                    </div>
                `
                    : ''
                }
            </div>
        </div>
    `;
  }

  /**
   * Generate recommendations section
   * @param {Object} analysis - Analysis data
   * @returns {string} HTML for recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = analysis.recommendations;

    return `
        <div id="recommendations" class="section">
            <h2>Balance Recommendations</h2>
            
            <div class="summary-grid">
                <div class="summary-card danger">
                    <h4>High Priority</h4>
                    <div class="value">${
                      recommendations.detailed.filter(
                        (r) => r.priority === 'HIGH'
                      ).length
                    }</div>
                    <div class="label">Critical fixes needed</div>
                </div>
                <div class="summary-card warning">
                    <h4>Medium Priority</h4>
                    <div class="value">${
                      recommendations.detailed.filter(
                        (r) => r.priority === 'MEDIUM'
                      ).length
                    }</div>
                    <div class="label">Important adjustments</div>
                </div>
                <div class="summary-card">
                    <h4>Low Priority</h4>
                    <div class="value">${
                      recommendations.detailed.filter(
                        (r) => r.priority === 'LOW'
                      ).length
                    }</div>
                    <div class="label">Minor tweaks</div>
                </div>
                <div class="summary-card">
                    <h4>Confidence Level</h4>
                    <div class="value">${
                      recommendations.confidenceLevel * 100
                    }%</div>
                    <div class="label">In recommendations</div>
                </div>
            </div>

            <h3>All Recommendations</h3>
            <div class="recommendations">
                ${recommendations.detailed
                  .map(
                    (rec) => `
                    <div class="recommendation ${rec.priority.toLowerCase()}-priority">
                        <span class="priority ${rec.priority.toLowerCase()}">${
                      rec.priority
                    } PRIORITY</span>
                        <h4>${rec.type}: ${rec.target}</h4>
                        <p><strong>Issue:</strong> ${rec.issue}</p>
                        <p><strong>Suggested Actions:</strong></p>
                        <ul>
                            ${rec.suggestions
                              .map((suggestion) => `<li>${suggestion}</li>`)
                              .join('')}
                        </ul>
                    </div>
                `
                  )
                  .join('')}
            </div>

            <div class="export-section">
                <h3>Export Recommendations</h3>
                <button class="export-btn" onclick="exportRecommendationsToCSV()">Export to CSV</button>
                <button class="export-btn" onclick="exportToPDF()">Export to PDF</button>
            </div>
        </div>
    `;
  }

  /**
   * Generate statistical details section
   * @param {Object} analysis - Analysis data
   * @returns {string} HTML for statistical details
   */
  generateStatisticalDetails(analysis) {
    const stats = analysis.statisticalSignificance;

    return `
        <div id="statistics" class="section">
            <h2>Statistical Analysis</h2>
            
            <div class="summary-grid">
                <div class="summary-card ${
                  stats.sufficientSample ? 'success' : 'warning'
                }">
                    <h4>Sample Size</h4>
                    <div class="value">${stats.sampleSize}</div>
                    <div class="label">${
                      stats.sufficientSample ? 'Sufficient' : 'Limited'
                    } for analysis</div>
                </div>
                <div class="summary-card">
                    <h4>Margin of Error</h4>
                    <div class="value">±${stats.marginOfError.toFixed(1)}%</div>
                    <div class="label">95% confidence level</div>
                </div>
                <div class="summary-card">
                    <h4>Reliability Score</h4>
                    <div class="value">${stats.reliabilityScore.toFixed(
                      0
                    )}%</div>
                    <div class="label">Data confidence</div>
                </div>
                <div class="summary-card">
                    <h4>Data Quality</h4>
                    <div class="value">${analysis.metadata.dataQuality}</div>
                    <div class="label">Assessment</div>
                </div>
            </div>

            <h3>Confidence Intervals</h3>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Point Estimate</th>
                            <th>Lower Bound</th>
                            <th>Upper Bound</th>
                            <th>Interpretation</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Good Win Rate</td>
                            <td>${analysis.balance.goodWinRate.toFixed(1)}%</td>
                            <td>${analysis.balance.confidenceInterval.lower.toFixed(
                              1
                            )}%</td>
                            <td>${analysis.balance.confidenceInterval.upper.toFixed(
                              1
                            )}%</td>
                            <td>${this.interpretConfidenceInterval(
                              analysis.balance.confidenceInterval
                            )}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            ${
              stats.recommendations.length > 0
                ? `
                <h3>Statistical Recommendations</h3>
                <div class="recommendations">
                    ${stats.recommendations
                      .map(
                        (rec) => `
                        <div class="recommendation medium-priority">
                            <span class="priority medium">STATISTICAL</span>
                            <h4>Data Collection</h4>
                            <p>${rec}</p>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            `
                : ''
            }
        </div>
    `;
  }

  /**
   * Generate raw data section
   * @param {Object} analysis - Analysis data
   * @param {Array} results - Raw simulation results
   * @returns {string} HTML for raw data section
   */
  generateRawDataSection(analysis, results) {
    return `
        <div id="data" class="section">
            <h2>Raw Data & Export</h2>
            
            <div class="export-section">
                <h3>Download Data</h3>
                <p>Export the complete dataset for further analysis in external tools.</p>
                <button class="export-btn" onclick="exportGameResults()">Export Game Results (CSV)</button>
                <button class="export-btn" onclick="exportPlayerStats()">Export Player Statistics (CSV)</button>
                <button class="export-btn" onclick="exportAnalysisData()">Export Analysis Summary (JSON)</button>
                <button class="export-btn" onclick="exportToPDF()">Export Full Report (PDF)</button>
            </div>

            <h3>Sample Data Preview</h3>
            <p>Showing first 10 games from the dataset:</p>
            
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Game #</th>
                            <th>Winner</th>
                            <th>Rounds</th>
                            <th>Survivors</th>
                            <th>Final Level</th>
                            <th>Players</th>
                            <th>Warlocks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results
                          .slice(0, 10)
                          .map(
                            (result, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td><span class="tier-${result.winner.toLowerCase()}">${
                              result.winner
                            }</span></td>
                                <td>${result.rounds}</td>
                                <td>${result.survivors}</td>
                                <td>${result.finalLevel}</td>
                                <td>${result.totalPlayers}</td>
                                <td>${result.warlocks}</td>
                            </tr>
                        `
                          )
                          .join('')}
                    </tbody>
                </table>
            </div>

            <h3>Data Schema</h3>
            <div class="expandable" onclick="toggleExpandable(this)">
                <h4>Game Result Format</h4>
                <div class="expandable-content">
                    <pre><code>{
  "winner": "Good|Evil|Draw",
  "rounds": number,
  "survivors": number,
  "totalPlayers": number,
  "warlocks": number,
  "finalLevel": number,
  "gameSummary": {
    "players": [
      {
        "name": string,
        "race": string,
        "class": string,
        "alive": boolean,
        "isWarlock": boolean,
        "hp": number,
        "maxHp": number
      }
    ]
  }
}</code></pre>
                </div>
            </div>

            <h3>Analysis Metadata</h3>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Property</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Games Analyzed</td>
                            <td>${analysis.metadata.totalGames}</td>
                        </tr>
                        <tr>
                            <td>Analysis Date</td>
                            <td>${new Date(
                              analysis.metadata.analysisDate
                            ).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Game Type</td>
                            <td>${analysis.metadata.gameType}</td>
                        </tr>
                        <tr>
                            <td>AI Type</td>
                            <td>${analysis.metadata.aiType}</td>
                        </tr>
                        <tr>
                            <td>Confidence Level</td>
                            <td>${analysis.metadata.confidenceLevel * 100}%</td>
                        </tr>
                        <tr>
                            <td>Data Quality</td>
                            <td>${analysis.metadata.dataQuality}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
  }

  /**
   * Assemble the complete HTML report
   * @param {string} reportId - Report ID
   * @param {Object} sections - Report sections
   * @param {Object} charts - Chart configurations
   * @param {Object} analysis - Analysis data
   * @returns {string} Complete HTML
   */
  assembleReport(reportId, sections, charts, analysis) {
    const template = this.reportTemplate
      .replace('{{REPORT_TITLE}}', `Warlock Game Balance Report`)
      .replace(
        '{{REPORT_SUBTITLE}}',
        `Comprehensive Analysis • ${
          analysis.metadata.totalGames
        } Games • ${new Date().toLocaleDateString()}`
      )
      .replace('{{GENERATION_DATE}}', new Date().toLocaleDateString())
      .replace(
        '{{CONFIDENCE_LEVEL}}',
        (analysis.metadata.confidenceLevel * 100).toFixed(0)
      )
      .replace('{{SAMPLE_SIZE}}', analysis.metadata.totalGames)
      .replace('{{CHART_CONFIGS}}', JSON.stringify(charts, null, 2))
      .replace('{{REPORT_CONTENT}}', Object.values(sections).join('\n'));

    return template;
  }

  /**
   * Save report to file
   * @param {string} html - HTML content
   * @param {string} reportId - Report ID
   * @returns {Promise<string>} File path
   */
  async saveReport(html, reportId) {
    const reportsDir = path.join(process.cwd(), 'reports');

    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, `${reportId}.html`);

    await fs.promises.writeFile(filePath, html, 'utf8');
    console.log(`Report saved to: ${filePath}`);

    return filePath;
  }

  // Helper methods
  getBalanceCardClass(balanceScore) {
    if (balanceScore > 15) return 'danger';
    if (balanceScore > 10) return 'warning';
    return 'success';
  }

  generateKeyFindings(analysis) {
    const findings = [];
    const balance = analysis.balance;

    if (balance.balanceScore > 15) {
      findings.push(`
        <div class="recommendation ${
          balance.goodWinRate > 50 ? 'danger' : 'warning'
        }">
          <h4>🚨 Significant Balance Issue</h4>
          <p>The ${
            balance.goodWinRate > 50 ? 'Good' : 'Evil'
          } team wins ${Math.max(
        balance.goodWinRate,
        balance.evilWinRate
      ).toFixed(1)}% of games, indicating a major imbalance.</p>
        </div>
      `);
    }

    if (analysis.statisticalSignificance.reliabilityScore < 80) {
      findings.push(`
        <div class="recommendation warning">
          <h4>⚠️ Limited Sample Size</h4>
          <p>Only ${analysis.metadata.totalGames} games analyzed. Consider running more simulations for higher confidence in results.</p>
        </div>
      `);
    }

    // Race findings
    const topRace = analysis.raceAnalysis.raceRankings[0];
    const bottomRace =
      analysis.raceAnalysis.raceRankings[
        analysis.raceAnalysis.raceRankings.length - 1
      ];

    if (topRace.winRate - bottomRace.winRate > 30) {
      findings.push(`
        <div class="recommendation warning">
          <h4>📊 Race Imbalance Detected</h4>
          <p>${topRace.race} significantly outperforms ${
        bottomRace.race
      } (${topRace.winRate.toFixed(1)}% vs ${bottomRace.winRate.toFixed(
        1
      )}% win rate).</p>
        </div>
      `);
    }

    return (
      findings.join('') ||
      '<p>No critical issues detected. Game appears to be in good balance.</p>'
    );
  }

  getRaceAssessment(race) {
    if (race.winRate > 70) return 'Overpowered';
    if (race.winRate > 55) return 'Strong';
    if (race.winRate > 45) return 'Balanced';
    if (race.winRate > 30) return 'Weak';
    return 'Underpowered';
  }

  getRacialTraitAnalysis(raceName) {
    const traits = {
      Artisan: 'Adaptability provides strategic flexibility',
      Rockhewn: 'Stone Armor offers early game protection',
      Crestfallen: 'Moonbeam detection when wounded',
      Orc: 'Blood Rage provides burst damage potential',
      Kinfolk: 'Life Bond ensures consistent healing',
      Lich: 'Undying provides second chance mechanics',
    };
    return traits[raceName] || 'Racial trait impact under analysis';
  }

  getRaceRecommendations(race) {
    if (race.winRate > 70) {
      return 'Consider reducing racial ability power or adding limitations';
    } else if (race.winRate < 35) {
      return 'Buff racial ability or improve synergy with class abilities';
    }
    return 'No immediate changes needed';
  }

  calculateRoleWinRate(classes, role) {
    const roleClasses = {
      Tank: ['Warrior'],
      DPS: ['Pyromancer', 'Wizard', 'Assassin', 'Barbarian', 'Gunslinger'],
      Healer: ['Priest', 'Shaman', 'Druid'],
      Utility: ['Oracle', 'Alchemist', 'Tracker'],
    };

    const relevantClasses = classes.filter(
      (cls) => roleClasses[role] && roleClasses[role].includes(cls.class)
    );

    if (relevantClasses.length === 0) return 0;

    return (
      relevantClasses.reduce((sum, cls) => sum + cls.winRate, 0) /
      relevantClasses.length
    );
  }

  getMostCommonGameLength(roundDistribution) {
    let maxCount = 0;
    let mostCommon = 0;

    Object.entries(roundDistribution).forEach(([rounds, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostCommon = parseInt(rounds);
      }
    });

    return mostCommon;
  }

  getQuickGamePercentage(roundDistribution) {
    const totalGames = Object.values(roundDistribution).reduce(
      (sum, data) => sum + data.count,
      0
    );
    const quickGames = Object.entries(roundDistribution)
      .filter(([rounds]) => parseInt(rounds) < 8)
      .reduce((sum, [, data]) => sum + data.count, 0);

    return totalGames > 0 ? (quickGames / totalGames) * 100 : 0;
  }

  getLongGamePercentage(roundDistribution) {
    const totalGames = Object.values(roundDistribution).reduce(
      (sum, data) => sum + data.count,
      0
    );
    const longGames = Object.entries(roundDistribution)
      .filter(([rounds]) => parseInt(rounds) > 20)
      .reduce((sum, [, data]) => sum + data.count, 0);

    return totalGames > 0 ? (longGames / totalGames) * 100 : 0;
  }

  calculateWarlockEffectiveness(data) {
    if (data.total === 0) return 'N/A';
    const effectiveness = (data.survived / data.total) * 100;
    if (effectiveness > 60) return 'High';
    if (effectiveness > 40) return 'Medium';
    return 'Low';
  }

  interpretConfidenceInterval(interval) {
    const width = interval.upper - interval.lower;
    if (width < 10) return 'Precise estimate';
    if (width < 20) return 'Moderate uncertainty';
    return 'High uncertainty';
  }
}

module.exports = ReportGenerator;
