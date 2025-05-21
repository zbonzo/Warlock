/**
 * @fileoverview Utility functions for ability registration
 * Provides helper methods for dynamic ability registration
 */
const config = require('@config');

/**
 * Helper to register all abilities of a specific category
 * @param {AbilityRegistry} registry - Ability registry to register with
 * @param {string} category - Category to match ('Attack', 'Defense', 'Heal', 'Special')
 * @param {Function} handler - Handler function to use
 * @returns {Array} Array of registered ability types
 */
function registerAbilitiesByCategory(registry, category, handler) {
  // Get all abilities for all classes
  const allAbilities = [];
  
  // Iterate through all class abilities
  Object.values(config.classAbilities || {}).forEach(classAbilities => {
    classAbilities.forEach(ability => {
      if (ability.category === category && !registry.hasClassAbility(ability.type)) {
        allAbilities.push(ability.type);
      }
    });
  });
  
  // Register all abilities with this category
  if (allAbilities.length > 0) {
    registry.registerClassAbilities(allAbilities, handler);
  }
  
  return allAbilities;
}

/**
 * Helper to register all abilities with a specific effect and target type
 * @param {AbilityRegistry} registry - Ability registry to register with
 * @param {string|null} effect - Effect to match ('poison', 'protected', etc.) or null
 * @param {string} target - Target to match ('Single', 'Self', 'Multi')
 * @param {Function} handler - Handler function to use
 * @param {Array} [excludeTypes=[]] - Ability types to exclude from registration
 * @returns {Array} Array of registered ability types
 */
function registerAbilitiesByEffectAndTarget(registry, effect, target, handler, excludeTypes = []) {
  // Get all abilities for all classes
  const allAbilities = [];
  
  // Iterate through all class abilities
  Object.values(config.classAbilities || {}).forEach(classAbilities => {
    classAbilities.forEach(ability => {
      if (ability.effect === effect && 
          ability.target === target && 
          !registry.hasClassAbility(ability.type) &&
          !excludeTypes.includes(ability.type)) {
        allAbilities.push(ability.type);
      }
    });
  });
  
  // Register all abilities with this effect and target
  if (allAbilities.length > 0) {
    registry.registerClassAbilities(allAbilities, handler);
  }
  
  return allAbilities;
}

/**
 * Helper to register abilities based on multiple criteria
 * @param {AbilityRegistry} registry - Ability registry to register with
 * @param {Object} criteria - Object containing criteria to match
 * @param {Function} handler - Handler function to use
 * @param {Array} [excludeTypes=[]] - Ability types to exclude from registration
 * @returns {Array} Array of registered ability types
 */
function registerAbilitiesByCriteria(registry, criteria, handler, excludeTypes = []) {
  // Get all abilities for all classes
  const allAbilities = [];
  
  // Iterate through all class abilities
  Object.values(config.classAbilities || {}).forEach(classAbilities => {
    classAbilities.forEach(ability => {
      // Skip already registered abilities and excluded types
      if (registry.hasClassAbility(ability.type) || excludeTypes.includes(ability.type)) {
        return;
      }
      
      // Check all criteria
      let matchesCriteria = true;
      for (const [key, value] of Object.entries(criteria)) {
        if (ability[key] !== value) {
          matchesCriteria = false;
          break;
        }
      }
      
      if (matchesCriteria) {
        allAbilities.push(ability.type);
      }
    });
  });
  
  // Register all abilities matching the criteria
  if (allAbilities.length > 0) {
    registry.registerClassAbilities(allAbilities, handler);
  }
  
  return allAbilities;
}

/**
 * Find all abilities with a specific type pattern
 * @param {string} pattern - String pattern to match in ability type
 * @returns {Array} Array of ability types matching the pattern
 */
function findAbilitiesByTypePattern(pattern) {
  const allAbilities = [];
  
  Object.values(config.classAbilities || {}).forEach(classAbilities => {
    classAbilities.forEach(ability => {
      if (ability.type.includes(pattern)) {
        allAbilities.push(ability.type);
      }
    });
  });
  
  return allAbilities;
}

/**
 * Get all abilities for testing and debugging
 * @returns {Object} Object with all class abilities 
 */
function getAllAbilities() {
  const abilities = {
    byCategory: {
      Attack: [],
      Defense: [],
      Heal: [],
      Special: []
    },
    byEffect: {},
    byTarget: {
      Single: [],
      Self: [],
      Multi: []
    },
    all: []
  };
  
  Object.values(config.classAbilities || {}).forEach(classAbilities => {
    classAbilities.forEach(ability => {
      // Add to category
      if (ability.category) {
        abilities.byCategory[ability.category] = abilities.byCategory[ability.category] || [];
        abilities.byCategory[ability.category].push(ability.type);
      }
      
      // Add to effect
      if (ability.effect) {
        abilities.byEffect[ability.effect] = abilities.byEffect[ability.effect] || [];
        abilities.byEffect[ability.effect].push(ability.type);
      }
      
      // Add to target
      if (ability.target) {
        abilities.byTarget[ability.target] = abilities.byTarget[ability.target] || [];
        abilities.byTarget[ability.target].push(ability.type);
      }
      
      // Add to all
      abilities.all.push(ability.type);
    });
  });
  
  return abilities;
}

module.exports = {
  registerAbilitiesByCategory,
  registerAbilitiesByEffectAndTarget,
  registerAbilitiesByCriteria,
  findAbilitiesByTypePattern,
  getAllAbilities
};