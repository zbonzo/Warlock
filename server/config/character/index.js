/**
 * @fileoverview Entry point for character configuration
 * Exports all character-related configuration for easy access
 */
const races = require('./races');
const classes = require('./classes');
const playerSettings = require('./playerSettings');

/**
 * Character configuration module
 * Exports all race, class, and player configuration in a single object
 */
module.exports = {
  // Race-related exports
  races: races.availableRaces,
  raceAttributes: races.raceAttributes,
  racialAbilities: races.racialAbilities,
  
  // Class-related exports
  classes: classes.availableClasses,
  classCategories: classes.classCategories,
  classAttributes: classes.classAttributes,
  classAbilities: classes.classAbilities,
  
  // Compatibility mappings
  classRaceCompatibility: races.classRaceCompatibility,
  
  // Player settings
  player: playerSettings,
  
  // Helper methods
  getRacialAbility: races.getRacialAbility,
  getClassAbilities: classes.getClassAbilities,
  getClassAbilitiesByLevel: classes.getClassAbilitiesByLevel,
  isValidCombination: races.isValidCombination
};