/**
 * @fileoverview Entry point for character configuration
 * Exports all character-related configuration with new ability system
 */
const races = require('./races');
const classes = require('./classes');
const abilities = require('./abilities');
const playerSettings = require('./playerSettings');

/**
 * Character configuration module
 * Exports all race, class, ability, and player configuration in a single object
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
  classAbilityProgression: classes.classAbilityProgression,
  
  // Ability-related exports
  abilities: abilities.abilities,
  getAbility: abilities.getAbility,
  getAbilities: abilities.getAbilities,
  getAbilitiesByTag: abilities.getAbilitiesByTag,
  getAbilitiesByCategory: abilities.getAbilitiesByCategory,
  getAllAbilityIds: abilities.getAllAbilityIds,
  
  // Compatibility mappings
  classRaceCompatibility: races.classRaceCompatibility,
  
  // Player settings
  player: playerSettings,
  
  // Helper methods
  getRacialAbility: races.getRacialAbility,
  getClassAbilities: classes.getClassAbilities,
  getAllClassAbilities: classes.getAllClassAbilities,
  getClassAbilityForLevel: classes.getClassAbilityForLevel,
  validateClassAbilities: classes.validateClassAbilities,
  isValidCombination: races.isValidCombination,
  
  // Legacy compatibility - maintains old interface
  get classAbilities() {
    console.warn('Accessing classAbilities directly is deprecated. Use getClassAbilities() instead.');
    return classes.classAbilities;
  }
};