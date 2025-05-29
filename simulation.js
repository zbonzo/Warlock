/**
 * @fileoverview Main entry point for the Game Balance Simulation System
 * Provides the primary API for running simulations
 */

const SimulationRunner = require('./simulation/runner');
const ConfigManager = require('./simulation/config');
const { createReport } = require('./simulation/reporting');

/**
 * Run a game balance simulation with the provided configuration
 * @param {Object} userConfig - User configuration options (optional)
 * @returns {Promise<Object>} Simulation results
 */
async function runSimulation(userConfig = {}) {
  try {
    // Initialize configuration
    const config = ConfigManager.createConfig(userConfig);
    
    // Create and run the simulation
    const runner = new SimulationRunner(config);
    const results = await runner.run();
    
    // Generate the final report
    const report = createReport(results, config);
    
    return {
      summary: report.getSummary(),
      detailed: results,
      report
    };
  } catch (error) {
    console.error('Error running simulation:', error);
    throw error;
  }
}

/**
 * Run a simulation and output results to console
 * @param {Object} userConfig - User configuration options (optional)
 * @returns {Promise<Object>} Simulation results
 */
async function runAndReport(userConfig = {}) {
  const { summary, report } = await runSimulation(userConfig);
  
  // Output the summary to console
  report.printToConsole();
  
  return summary;
}

module.exports = {
  runSimulation,
  runAndReport,
  SimulationRunner,
  ConfigManager
};