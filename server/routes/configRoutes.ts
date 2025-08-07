/**
 * @fileoverview API routes for exposing game configuration to the client - TypeScript version
 * Phase 9: TypeScript Migration - Converted from configRoutes.js
 */

import express, { Request, Response, Router } from 'express';
import logger from '../utils/logger.js';
import config from '../config/index.js';

const router: Router = express.Router();

/**
 * Configuration response interfaces
 */
interface BasicConfigResponse {
  minPlayers: number;
  maxPlayers: number;
  version: string;
}

interface RaceConfigResponse {
  races: string[];
  raceAttributes: Record<string, any>;
  racialAbilities: Record<string, any>;
}

interface ClassConfigResponse {
  classes: string[];
  classAttributes: Record<string, any>;
  classRaceCompatibility: Record<string, string[]>;
}

interface CompatibilityResponse {
  classToRaces: Record<string, string[]>;
  racesToClasses: Record<string, string[]>;
}

interface AbilityResponse {
  className: string;
  abilities: any[];
}

interface WarlockScalingResponse {
  enabled: boolean;
  playersPerWarlock: number;
  minimumWarlocks: number;
  maximumWarlocks: number;
  scalingMethod: string;
  examples: Record<number, number>;
}

/**
 * GET /api/config
 * Returns basic configuration information
 */
router.get('/', (req: Request, res: Response) => {
  logger.debug('ConfigApiRequest', { path: '/', type: 'basic' });

  // Return only what the client needs from the main config
  const response: BasicConfigResponse = {
    minPlayers: config.minPlayers,
    maxPlayers: config.maxPlayers,
    version: process.env['npm_package_version'] || '1.0.0',
  };

  res.json(response);
});

/**
 * GET /api/config/races
 * Returns available races and their attributes
 */
router.get('/races', (req: Request, res: Response) => {
  const response: RaceConfigResponse = {
    races: config.races,
    raceAttributes: config.raceAttributes,
    racialAbilities: config.racialAbilities,
  };

  res.json(response);
});

/**
 * GET /api/config/classes
 * Returns available classes and their attributes
 */
router.get('/classes', (req: Request, res: Response) => {
  const response: ClassConfigResponse = {
    classes: config.classes,
    classAttributes: config.classAttributes,
    classRaceCompatibility: config.classRaceCompatibility,
  };

  res.json(response);
});

/**
 * GET /api/config/compatibility
 * Returns race-class compatibility mappings
 */
router.get('/compatibility', (req: Request, res: Response) => {
  // Build inverse mapping if not already available in config
  const racesToClasses: Record<string, string[]> = Object.entries(config.classRaceCompatibility as Record<string, string[]>).reduce(
    (acc: Record<string, string[]>, [cls, races]: [string, string[]]) => {
      races.forEach((race: string) => {
        if (!acc[race]) acc[race] = [];
        acc[race].push(cls);
      });
      return acc;
    },
    {}
  );

  const response: CompatibilityResponse = {
    classToRaces: config.classRaceCompatibility,
    racesToClasses,
  };

  res.json(response);
});

/**
 * GET /api/config/abilities/:className
 * Returns abilities for a specific class
 */
router.get('/abilities/:className', (req: Request, res: Response): void => {
  const { className } = req.params;

  if (!className || !config.classes.includes(className)) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }

  const abilities = config.getClassAbilities(className) || [];

  const response: AbilityResponse = {
    className,
    abilities,
  };

  res.json(response);
});

/**
 * GET /api/config/racial-abilities
 * Returns all racial abilities
 */
router.get('/racial-abilities', (req: Request, res: Response) => {
  // Create a mapping of race to racial ability
  const racialAbilities: Record<string, any> = {};
  config.races.forEach((race: string) => {
    racialAbilities[race] = config.getRacialAbility(race);
  });

  res.json(racialAbilities);
});

/**
 * GET /api/config/warlock-scaling
 * Returns warlock scaling configuration for UI
 */
router.get('/warlock-scaling', (req: Request, res: Response) => {
  const scalingConfig = config.gameBalance.warlock.scaling;

  const response: WarlockScalingResponse = {
    enabled: scalingConfig.enabled,
    playersPerWarlock: scalingConfig.playersPerWarlock,
    minimumWarlocks: scalingConfig.minimumWarlocks,
    maximumWarlocks: scalingConfig.maximumWarlocks,
    scalingMethod: scalingConfig.scalingMethod,
    // Include examples of warlock counts for different player counts
    examples: {
      4: config.calculateWarlockCount(4),
      8: config.calculateWarlockCount(8),
      12: config.calculateWarlockCount(12),
      16: config.calculateWarlockCount(16),
      20: config.calculateWarlockCount(20),
    },
  };

  res.json(response);
});

export default router;