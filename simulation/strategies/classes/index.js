/**
 * @fileoverview Class Strategies Index - Exports all class strategies
 */

const WarriorStrategy = require('./warrior-strategy');
const PriestStrategy = require('./priest-strategy');
const OracleStrategy = require('./oracle-strategy');
const PyromancerStrategy = require('./pyromancer-strategy');
const AssassinStrategy = require('./assassin-strategy');
const BarbarianStrategy = require('./barbarian-strategy');
const WizardStrategy = require('./wizard-strategy');
const AlchemistStrategy = require('./alchemist-strategy');
const ShamanStrategy = require('./shaman-strategy');
const GunslingerStrategy = require('./gunslinger-strategy');
const TrackerStrategy = require('./tracker-strategy');
const DruidStrategy = require('./druid-strategy');

/**
 * Factory function to create class strategies
 * @param {string} className - Class name
 * @param {string} playerName - Player name
 * @returns {BaseStrategy} Appropriate strategy instance
 */
function createClassStrategy(className, playerName) {
  switch (className) {
    case 'Warrior':
      return new WarriorStrategy(playerName);
    case 'Priest':
      return new PriestStrategy(playerName);
    case 'Oracle':
      return new OracleStrategy(playerName);
    case 'Pyromancer':
      return new PyromancerStrategy(playerName);
    case 'Assassin':
      return new AssassinStrategy(playerName);
    case 'Barbarian':
      return new BarbarianStrategy(playerName);
    case 'Wizard':
      return new WizardStrategy(playerName);
    case 'Alchemist':
      return new AlchemistStrategy(playerName);
    case 'Shaman':
      return new ShamanStrategy(playerName);
    case 'Gunslinger':
      return new GunslingerStrategy(playerName);
    case 'Tracker':
      return new TrackerStrategy(playerName);
    case 'Druid':
      return new DruidStrategy(playerName);
    default:
      const BaseStrategy = require('../base/base-strategy');
      return new BaseStrategy(playerName);
  }
}

module.exports = {
  WarriorStrategy,
  PriestStrategy,
  OracleStrategy,
  PyromancerStrategy,
  AssassinStrategy,
  BarbarianStrategy,
  WizardStrategy,
  AlchemistStrategy,
  ShamanStrategy,
  GunslingerStrategy,
  TrackerStrategy,
  DruidStrategy,
  createClassStrategy,
};
