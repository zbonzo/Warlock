/**
 * @fileoverview AI module exports
 * Entry point for all AI-related functionality
 */

const AIPlayer = require('./ai-player');
const WarlockStrategy = require('./warlock-strategy');
const GoodTeamStrategy = require('./good-strategy');
const TargetingSystem = require('./targeting');

module.exports = {
  AIPlayer,
  WarlockStrategy,
  GoodTeamStrategy,
  TargetingSystem
};