/**
 * API routes for exposing game configuration to the client
 */
const express = require('express');
const router = express.Router();
const logger = require('@utils/logger');
const config = require('@config');

/**
 * GET /api/config
 * Returns basic configuration information
 */
router.get('/', (req, res) => {
  logger.info('Config API: Basic configuration requested');

  // Return only what the client needs from the main config
  res.json({
    minPlayers: config.minPlayers,
    maxPlayers: config.maxPlayers,
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * GET /api/config/races
 * Returns available races and their attributes
 */
router.get('/races', (req, res) => {
  logger.info('Config API: Races configuration requested');

  res.json({
    races: config.races,
    raceAttributes: config.raceAttributes,
    racialAbilities: config.racialAbilities,
  });
});

/**
 * GET /api/config/classes
 * Returns available classes and their attributes
 */
router.get('/classes', (req, res) => {
  logger.info('Config API: Classes configuration requested');

  res.json({
    classes: config.classes,
    classAttributes: config.classAttributes,
    classRaceCompatibility: config.classRaceCompatibility,
  });
});

/**
 * GET /api/config/compatibility
 * Returns race-class compatibility mappings
 */
router.get('/compatibility', (req, res) => {
  logger.info('Config API: Compatibility mappings requested');

  res.json({
    classToRaces: config.classRaceCompatibility,
    // Build inverse mapping if not already available in config
    racesToClasses: Object.entries(config.classRaceCompatibility).reduce(
      (acc, [cls, races]) => {
        races.forEach((race) => {
          if (!acc[race]) acc[race] = [];
          acc[race].push(cls);
        });
        return acc;
      },
      {}
    ),
  });
});

/**
 * GET /api/config/abilities/:className
 * Returns abilities for a specific class
 */
router.get('/abilities/:className', (req, res) => {
  const { className } = req.params;
  logger.info(`Config API: Abilities requested for class ${className}`);

  if (!config.classes.includes(className)) {
    return res.status(404).json({ error: 'Class not found' });
  }

  const abilities = config.getClassAbilities(className);

  res.json({
    className,
    abilities,
  });
});

/**
 * GET /api/config/racial-abilities
 * Returns all racial abilities
 */
router.get('/racial-abilities', (req, res) => {
  logger.info('Config API: Racial abilities requested');

  // Create a mapping of race to racial ability
  const racialAbilities = {};
  config.races.forEach((race) => {
    racialAbilities[race] = config.getRacialAbility(race);
  });

  res.json(racialAbilities);
});

module.exports = router;
