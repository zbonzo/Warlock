# Warlock Game Simulation & Balance Analysis System

## System Overview

A comprehensive game balance analysis system that runs automated simulations of the Warlock multiplayer deduction game and generates detailed reports with interactive visualizations. The system supports multiple AI strategies, extensive data collection, and both CSV and HTML report generation.

### Core Workflow

1. **Simulation**: Run automated games with configurable AI types and player compositions
2. **Data Collection**: Gather detailed metrics on races, classes, game flow, and balance
3. **Analysis**: Process results through statistical analysis engines
4. **Reporting**: Generate interactive CSV/HTML reports for web viewing
5. **Visualization**: Create charts and interactive dashboards

## Architecture Map

```
simulation/
├── 🎯 ENTRY POINTS
│   ├── generate-report.js          # 🔥 Main CLI for generating CSV reports
│   ├── test-runner.js              # Quick mock data generator for testing
│   ├── diagnose-simulation.js      # Diagnostic tool for troubleshooting
│   └── setup.js                    # Initial setup script
├── ⚙️ SIMULATION ENGINES
│   ├── simple-simulator.js         # 🔥 Basic random AI simulator
│   ├── enhanced-simulation-runner.js # 🔥 Strategic AI with thematic teams
│   ├── random-game-generator.js    # Configurable random game generation
│   ├── runner.js                   # Fixed 6-player baseline testing
│   └── test-strategies.js          # 🔥 AI strategy comparison framework
├── 🤖 AI STRATEGIES
│   ├── strategies/
│   │   ├── strategy-factory.js     # 🔥 Combines class + race strategies
│   │   ├── base-strategy.js        # Abstract base for all AI strategies
│   │   ├── class-strategies.js     # 🔥 12 class-specific AI behaviors
│   │   └── race-strategies.js      # 🔥 6 race-specific AI modifications
├── 📊 REPORTING SYSTEM
│   ├── reporting/
│   │   ├── data-collector.js       # 🔥 Processes raw results into structured data
│   │   ├── data-analyzer.js        # 🔥 Statistical analysis engine
│   │   ├── csv-exporter.js         # 🔥 Exports analysis to CSV format
│   │   ├── chart-builder.js        # Chart.js visualization builder
│   │   └── report-generator.js     # HTML report generator (unused in current flow)
├── 🌐 WEB INTERFACE
│   ├── web-interface/
│   │   ├── index.html              # 🔥 Main dashboard for viewing reports
│   │   ├── assets/
│   │   │   ├── css/main.css        # 🔥 Modern responsive styling
│   │   │   └── js/
│   │   │       ├── app.js          # 🔥 Main application controller
│   │   │       ├── data-loader.js  # CSV loading and parsing
│   │   │       ├── chart-manager.js # Chart.js integration
│   │   │       ├── report-selector.js # Report dropdown management
│   │   │       ├── export-manager.js # Data export utilities
│   │   │       └── ui-components.js # Reusable UI components
│   │   └── reports/                # 🔥 Generated CSV reports directory
├── 📝 CONFIGURATION
│   ├── package.json                # Dependencies and npm scripts
│   ├── .babelrc                    # Babel config for server imports
│   └── module-alias.js             # Path aliases for server imports
└── 📚 DOCUMENTATION
    ├── README.md                   # 🔥 This comprehensive guide
    └── README-reporting.md         # Detailed reporting system docs
```

🔥 = Most frequently modified files

---

## Quick Reference: File Selection Guide

### Running Simulations

| Task                     | Primary Files                   | Supporting Files                                           |
| ------------------------ | ------------------------------- | ---------------------------------------------------------- |
| Generate balance reports | `generate-report.js`            | `reporting/data-collector.js`, `reporting/csv-exporter.js` |
| Test AI strategies       | `test-strategies.js`            | `strategies/strategy-factory.js`, all strategy files       |
| Quick mock data          | `test-runner.js`                | N/A (standalone)                                           |
| Run specific scenarios   | `enhanced-simulation-runner.js` | `strategies/` directory                                    |
| Baseline testing         | `runner.js`                     | `simple-simulator.js`                                      |
| Diagnose issues          | `diagnose-simulation.js`        | N/A (diagnostic)                                           |

### AI Development

| Task                  | Primary Files                    | Supporting Files                |
| --------------------- | -------------------------------- | ------------------------------- |
| Modify class behavior | `strategies/class-strategies.js` | `strategies/base-strategy.js`   |
| Modify race behavior  | `strategies/race-strategies.js`  | `strategies/base-strategy.js`   |
| Create new AI type    | `strategies/strategy-factory.js` | All strategy files              |
| Test AI effectiveness | `test-strategies.js`             | `enhanced-simulation-runner.js` |

### Report Generation & Analysis

| Task                      | Primary Files                 | Supporting Files              |
| ------------------------- | ----------------------------- | ----------------------------- |
| Modify analysis metrics   | `reporting/data-analyzer.js`  | `reporting/data-collector.js` |
| Change CSV export format  | `reporting/csv-exporter.js`   | `reporting/data-analyzer.js`  |
| Add new report types      | `generate-report.js`          | `reporting/` directory        |
| Customize data collection | `reporting/data-collector.js` | Simulation engines            |

### Web Interface

| Task                | Primary Files                                                   | Supporting Files                 |
| ------------------- | --------------------------------------------------------------- | -------------------------------- |
| Modify dashboard UI | `web-interface/index.html`, `web-interface/assets/css/main.css` | All JS files                     |
| Add new chart types | `web-interface/assets/js/chart-manager.js`                      | `web-interface/assets/js/app.js` |
| Fix data loading    | `web-interface/assets/js/data-loader.js`                        | `web-interface/assets/js/app.js` |
| Add export options  | `web-interface/assets/js/export-manager.js`                     | `web-interface/assets/js/app.js` |

### Configuration & Setup

| Task                  | Primary Files                 | Supporting Files     |
| --------------------- | ----------------------------- | -------------------- |
| Install/setup system  | `setup.js`, `package.json`    | N/A                  |
| Fix module imports    | `.babelrc`, `module-alias.js` | All simulation files |
| Configure npm scripts | `package.json`                | N/A                  |

---

## Human Guide: Understanding the System

### Simulation Flow

**Data Flow**: Raw game results → Data Collector → Statistical Analyzer → CSV Exporter → Web Interface

**AI Types Available**:

- **Random AI**: Makes completely random decisions (baseline)
- **Strategic AI**: Class-specific intelligent decision making
- **Thematic AI**: Strategic + race behaviors + realistic team compositions
- **Hybrid AI**: Mix of random and strategic for comparison testing

### Key Components Deep Dive

**Data Collector (`reporting/data-collector.js`)**:

- Processes raw simulation results into structured format
- Extracts game-level, player-level, and event-level data
- Calculates derived metrics (performance scores, team composition analysis)
- Validates data quality and completeness

**Statistical Analyzer (`reporting/data-analyzer.js`)**:

- Performs comprehensive statistical analysis
- Calculates win rates, confidence intervals, balance scores
- Generates race/class performance rankings with tier assignments
- Produces actionable balance recommendations with priority levels

**CSV Exporter (`reporting/csv-exporter.js`)**:

- Exports analysis to multiple CSV report types:
  - Balance reports (overall game balance metrics)
  - Race analysis (race performance and synergy)
  - Class analysis (class effectiveness by role)
  - Game flow analysis (round distribution and patterns)
  - Recommendations (prioritized balance suggestions)
  - Raw results (complete game data)

**Strategic AI System**:

- **Base Strategy**: Common game state analysis and utility methods
- **Class Strategies**: 12 class-specific behaviors (Warrior tanks, Priest heals, etc.)
- **Race Strategies**: 6 race-specific modifications (Orc blood rage timing, etc.)
- **Strategy Factory**: Combines class + race into complete AI personalities

### Report Types & Metrics

**Balance Analysis**:

- Good vs Evil win rates with confidence intervals
- Balance score (deviation from ideal 50/50)
- Game length variance and survivor rates
- Statistical significance assessment

**Race Performance**:

- Win rates and survival rates by race
- Performance as Warlock vs Good player
- Tier rankings (S/A/B/C/D)
- Racial ability impact analysis

**Class Performance**:

- Effectiveness by role (Tank/DPS/Healer/Utility)
- Multi-dimensional performance metrics
- Class synergy analysis
- Meta health assessment

**Game Flow**:

- Round length distribution and outcomes
- Quick vs long game patterns
- Corruption timing analysis
- Monster effectiveness scaling

### Web Interface Features

**Interactive Dashboard**:

- Report selector with metadata display
- Tabbed interface for different analysis types
- Responsive design for desktop and mobile
- Real-time chart generation with Chart.js

**Data Visualization**:

- Win distribution pie charts
- Race performance bar charts
- Class effectiveness radar charts
- Game length trend lines
- All charts exportable as PNG

**Export Capabilities**:

- CSV data export
- PDF report generation
- Individual chart image export
- Print-optimized layouts

### Development Patterns

**Adding New Simulation Types**:

1. Create new simulation runner in root directory
2. Ensure it outputs results in standard format
3. Add to `generate-report.js` command options
4. Update web interface to handle new report type

**Modifying AI Behavior**:

1. **Class changes**: Edit specific class in `strategies/class-strategies.js`
2. **Race changes**: Edit specific race in `strategies/race-strategies.js`
3. **New strategy types**: Extend `strategies/base-strategy.js`
4. **Testing**: Use `test-strategies.js` for comparison analysis

**Adding New Metrics**:

1. Update `reporting/data-collector.js` to collect new data
2. Add analysis logic to `reporting/data-analyzer.js`
3. Modify CSV export in `reporting/csv-exporter.js`
4. Update web interface to display new metrics

**Troubleshooting**:

- **Import errors**: Check `.babelrc` and `module-alias.js` configuration
- **Simulation crashes**: Use `diagnose-simulation.js` for systematic debugging
- **Missing reports**: Verify `web-interface/reports/` directory exists and is writable
- **Chart issues**: Check Chart.js loading and canvas element availability

### Common Commands

```bash
# Quick test with mock data
npm run test:report
node test-runner.js 25

# Generate comprehensive analysis
npm run report:deep
node generate-report.js --mode thematic --games 100 --verbose

# Focus on specific analysis
npm run report:races
node generate-report.js --focus races --games 75

# Compare AI strategies
node test-strategies.js comparison 30

# Setup system
npm run setup
node setup.js

# Diagnose issues
node diagnose-simulation.js
```

### File Dependencies

**Core Dependencies**:

- `module-alias`: Enables server code imports
- `papaparse`: CSV parsing in web interface
- Chart.js: Data visualization
- Babel: ES6+ transpilation for server imports

**Import Chain**:

```
generate-report.js
├── reporting/data-collector.js
├── reporting/data-analyzer.js
├── reporting/csv-exporter.js
├── enhanced-simulation-runner.js
│   ├── strategies/strategy-factory.js
│   │   ├── strategies/class-strategies.js
│   │   │   └── strategies/base-strategy.js
│   │   └── strategies/race-strategies.js
│   └── simple-simulator.js
│       └── ../server/models/GameRoom.js (via module alias)
└── web-interface/ (for output)
```

### Error Patterns & Solutions

**"Module not found" errors**:

- Check server code exists in `../server/` directory
- Verify `.babelrc` and module aliases are correct
- Run `npm install` to ensure dependencies

**"No valid simulation results"**:

- Usually indicates server integration issues
- Use `test-runner.js` to generate mock data as workaround
- Check `diagnose-simulation.js` output for specific problems

**Web interface not loading reports**:

- Verify CSV files exist in `web-interface/reports/`
- Check `reports-index.json` is valid
- Ensure web server can access files (no CORS issues)

**Charts not displaying**:

- Verify Chart.js is loaded
- Check canvas elements exist with correct IDs
- Ensure data format matches expected chart input

---

## Testing & Development Workflow

**Quick Development Cycle**:

1. `node test-runner.js 25` - Generate mock data
2. Open `web-interface/index.html` - View in browser
3. Iterate on analysis or UI changes
4. Test with real simulation when stable

**Full Testing Cycle**:

1. `node test-strategies.js comparison 20` - Test AI effectiveness
2. `node generate-report.js --mode thematic --games 50` - Generate comprehensive report
3. Review reports in web interface
4. Iterate on balance or AI improvements

**Production Analysis**:

1. `npm run report:deep` - Generate large-scale analysis
2. Review all report types for insights
3. Export recommendations for game balance team
4. Archive reports with timestamp for tracking changes
