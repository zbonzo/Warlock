# Warlock Game Balance Reporting System

A comprehensive analytics and reporting system that generates detailed HTML reports with interactive visualizations for Warlock game balance analysis.

## 🚀 Quick Start

```bash
# Generate a quick report with default settings
npm run report:quick

# Generate comprehensive thematic AI report
npm run report:deep

# Focus on race balance analysis
npm run report:races

# Compare AI strategies
npm run report:compare
```

## 📊 Features

### Interactive HTML Reports

- **Self-contained** - No external dependencies, works offline
- **Mobile responsive** - Optimized for desktop and mobile viewing
- **Print-friendly** - Clean layouts for PDF export
- **Interactive charts** - Built with Chart.js for rich visualizations

### Advanced Analytics

- **Statistical significance testing** - Confidence intervals and sample size analysis
- **Balance recommendations** - Data-driven suggestions with priority levels
- **Comprehensive metrics** - Win rates, survival analysis, performance tiers
- **Correlation analysis** - Identify relationships between game mechanics

### Multiple Report Sections

1. **📋 Executive Summary** - High-level overview and key findings
2. **⚖️ Balance Analysis** - Win rate analysis and statistical significance
3. **🔥 Ability Performance** - Damage, healing, and utility effectiveness
4. **🧬 Race Analysis** - Racial ability impact and performance rankings
5. **⚔️ Class Analysis** - Role effectiveness and class tier rankings
6. **🎮 Game Flow** - Round progression and timing analysis
7. **👹 Warlock Analysis** - Corruption mechanics and Evil team performance
8. **💡 Recommendations** - Prioritized balance suggestions
9. **💾 Raw Data** - Full dataset export and statistical details

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Create reports directory
npm run setup

# Test the system
npm run test:report
```

## 📝 Usage

### Basic Commands

```bash
# Generate default report
node generate-report.js

# Specify number of games and mode
node generate-report.js --games 100 --mode thematic

# Focus on specific analysis
node generate-report.js --focus races --games 50

# Generate with custom output
node generate-report.js --output my-analysis.html
```

### Command Line Options

| Option          | Description                       | Example                           |
| --------------- | --------------------------------- | --------------------------------- |
| `--games, -g`   | Number of games to simulate       | `--games 100`                     |
| `--mode, -m`    | Simulation mode                   | `--mode thematic`                 |
| `--focus, -f`   | Analysis focus area               | `--focus races`                   |
| `--classes`     | Specific classes to analyze       | `--classes Warrior,Priest,Oracle` |
| `--races`       | Specific races to analyze         | `--races Artisan,Rockhewn,Lich`   |
| `--output, -o`  | Custom output file path           | `--output balance-report.html`    |
| `--verbose, -v` | Detailed output during generation | `--verbose`                       |
| `--compare-ai`  | Compare different AI strategies   | `--compare-ai`                    |
| `--help, -h`    | Show help information             | `--help`                          |

### Simulation Modes

| Mode         | Description                    | AI Type   | Use Case                    |
| ------------ | ------------------------------ | --------- | --------------------------- |
| `fixed`      | Fixed 6-player configuration   | Basic     | Baseline testing            |
| `random`     | Random race/class combinations | Basic     | Broad balance assessment    |
| `thematic`   | Enhanced AI strategies         | Strategic | Realistic gameplay analysis |
| `comparison` | Compare multiple AI types      | Mixed     | AI effectiveness evaluation |

### Focus Areas

| Focus       | Description                     | Key Metrics                                |
| ----------- | ------------------------------- | ------------------------------------------ |
| `races`     | Race balance and synergy        | Win rates, racial ability impact           |
| `classes`   | Class performance and roles     | Role effectiveness, tier rankings          |
| `abilities` | Ability usage and effectiveness | Damage/healing output, cooldown analysis   |
| `balance`   | Overall game balance            | Win distribution, statistical significance |
| `warlocks`  | Warlock mechanics               | Corruption rates, Evil team performance    |

## 📊 Report Sections Explained

### Executive Summary

- **Key metrics at a glance** - Balance score, win rates, critical issues
- **Priority recommendations** - High-impact fixes with rationale
- **Data reliability assessment** - Sample size and confidence levels

### Balance Analysis

- **Win rate distribution** - Good vs Evil team performance
- **Confidence intervals** - Statistical uncertainty bounds
- **Game length patterns** - Round distribution and variance
- **Balance rating** - Overall assessment (Excellent/Good/Fair/Poor)

### Race Analysis

- **Performance rankings** - Tier-based race effectiveness
- **Racial ability impact** - How traits affect gameplay
- **Team size effects** - Performance across different game sizes
- **Synergy analysis** - Race-class combination effectiveness

### Class Analysis

- **Role effectiveness** - Tank/DPS/Healer/Utility performance
- **Multi-dimensional radar** - Win rate, survival, effectiveness metrics
- **Class synergy** - How classes work together
- **Tier rankings** - S/A/B/C/D performance tiers

### Recommendations

- **Priority levels** - High/Medium/Low impact classifications
- **Specific suggestions** - Actionable balance changes
- **Rationale** - Data-driven reasoning for each recommendation
- **Confidence levels** - Statistical backing for suggestions

## 🎨 Visualization Types

### Interactive Charts

- **📊 Bar Charts** - Race/class performance comparisons
- **🥧 Pie Charts** - Win distribution and team composition
- **📈 Line Charts** - Game flow and progression analysis
- **🕸️ Radar Charts** - Multi-dimensional performance metrics
- **📍 Scatter Plots** - Correlation and survival analysis
- **🔥 Heatmaps** - Ability effectiveness matrices

### Chart Features

- **Hover tooltips** - Detailed information on data points
- **Export functionality** - Download charts as PNG images
- **Responsive design** - Adapts to screen size
- **Print optimization** - Clean layouts for PDF export

## 📁 File Structure

```
simulation/
├── reporting/
│   ├── data-analyzer.js          # Core statistical analysis
│   ├── chart-builder.js          # Chart.js visualization builder
│   ├── report-generator.js       # Main HTML report generator
│   └── templates/
│       └── report-template.html  # Base HTML template
├── reports/                      # Generated reports (auto-created)
│   └── warlock-report-*.html    # Timestamped report files
├── generate-report.js            # CLI interface
├── package.json                  # Dependencies and scripts
└── README-reporting.md          # This documentation
```

## 🔧 Configuration

### Environment Variables

```bash
# Default simulation settings
export WARLOCK_DEFAULT_GAMES=50
export WARLOCK_DEFAULT_MODE=thematic
export WARLOCK_REPORTS_DIR=./reports

# Chart appearance
export WARLOCK_CHART_THEME=blue
export WARLOCK_CHART_ANIMATION=true
```

### Custom Player Configurations

```javascript
// For thematic mode with specific setups
const customConfig = [
  { name: 'TankWarrior', race: 'Rockhewn', class: 'Warrior' },
  { name: 'HealerPriest', race: 'Artisan', class: 'Priest' },
  { name: 'DPSPyromancer', race: 'Lich', class: 'Pyromancer' },
  // ... more configurations
];
```

## 📈 Understanding the Analytics

### Statistical Significance

- **Sample size requirements** - Minimum 30 games for reliable results
- **Confidence intervals** - 95% confidence level calculations
- **Margin of error** - Statistical uncertainty bounds
- **Reliability scores** - Data quality assessment

### Balance Metrics

- **Balance score** - Deviation from ideal 50/50 win rate
- **Win rate analysis** - Team performance with confidence intervals
- **Performance tiers** - S/A/B/C/D rankings based on effectiveness
- **Correlation analysis** - Relationships between game mechanics

### Recommendation Priority

- **High Priority** - Critical imbalances requiring immediate attention
- **Medium Priority** - Noticeable issues that should be addressed
- **Low Priority** - Minor tweaks for optimization

## 🚨 Troubleshooting

### Common Issues

**"No valid simulation results"**

```bash
# Check simulation dependencies
npm install
# Verify game runner is available
node -e "console.log(require('./runner'))"
```

**"Chart.js not loading"**

- Reports are self-contained but require JavaScript enabled
- Try opening in a different browser
- Check browser console for errors

**"Memory issues with large datasets"**

```bash
# Reduce game count
node generate-report.js --games 25

# Use more efficient mode
node generate-report.js --mode fixed
```

**"Report generation fails"**

```bash
# Use verbose mode for debugging
node generate-report.js --verbose

# Check reports directory permissions
mkdir -p reports && chmod 755 reports
```

### Performance Optimization

**For large datasets (>500 games):**

- Use `--mode fixed` for faster simulation
- Consider batch processing multiple smaller reports
- Ensure sufficient system memory (4GB+ recommended)

**For detailed analysis:**

- Use `--mode thematic` for realistic AI behavior
- Focus analysis with `--focus` parameter
- Generate reports incrementally for iterative development

## 🔄 Integration with Development Workflow

### Continuous Integration

```yaml
# Example GitHub Actions workflow
- name: Generate Balance Report
  run: |
    npm install
    npm run report:quick
    # Upload report as artifact
```

### Pre-commit Hooks

```bash
# Generate quick report before major changes
npm run test:report
```

### Development Cycles

1. **Make balance changes** to game configuration
2. **Run focused analysis** on affected areas
3. **Review recommendations** and statistical significance
4. **Iterate based on data** until balanced

## 📚 Advanced Usage

### Custom Analysis Scripts

```javascript
const ReportGenerator = require('./reporting/report-generator');
const DataAnalyzer = require('./reporting/data-analyzer');

// Custom analysis workflow
const analyzer = new DataAnalyzer();
const results = await runCustomSimulation();
const analysis = analyzer.analyzeResults(results, {
  focus: 'custom-metric',
  confidenceLevel: 0.99,
});
```

### Batch Report Generation

```bash
# Generate multiple focused reports
for focus in races classes abilities balance warlocks; do
  node generate-report.js --focus $focus --games 50 --output ${focus}-analysis.html
done
```

### Data Export and External Analysis

```javascript
// Export raw data for external tools
const data = processResults(simulationResults);
exportToCSV(data, 'simulation-data.csv');
exportToJSON(analysis, 'analysis-summary.json');
```

## 🤝 Contributing

### Adding New Analytics

1. **Extend DataAnalyzer** - Add new analysis methods
2. **Update ChartBuilder** - Create visualization for new metrics
3. **Modify ReportGenerator** - Add new sections to HTML template
4. **Update CLI** - Add command line options for new features

### Testing Reports

```bash
# Test with minimal dataset
npm run test:report

# Validate HTML output
npm run lint:html

# Check chart functionality
npm run test:charts
```

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: Check the wiki for detailed guides
- **Community**: Join the Discord for development discussions

---

_Generate comprehensive, data-driven balance reports to perfect your Warlock game! 🎮📊_
