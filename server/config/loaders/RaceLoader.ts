import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { 
  RacesConfig, 
  RaceAttributes,
  RacialAbility,
  UsageLimit,
  validateRacesConfig,
  safeValidateRacesConfig 
} from '../schemas/race.schema.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RaceBalanceContext {
  level?: number;
  baseHp?: number;
  baseArmor?: number;
  baseDamage?: number;
  [key: string]: any;
}

export interface ClassRaceCompatibility {
  [className: string]: string[];
}

export class RaceLoader {
  private racesConfig: RacesConfig;
  private dataPath: string;
  private lastModified: number = 0;
  private classRaceCompatibility: ClassRaceCompatibility = {};

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(__dirname, '../data/races.json');
    this.racesConfig = {
      availableRaces: [],
      raceAttributes: {},
      racialAbilities: {}
    };
    this.loadRaces();
  }

  /**
   * Load races from JSON file with validation
   */
  private loadRaces(): void {
    try {
      // Check if file exists
      if (!fs.existsSync(this.dataPath)) {
        throw new Error(`Races data file not found at: ${this.dataPath}`);
      }

      // Check if file has been modified
      const stats = fs.statSync(this.dataPath);
      if (stats.mtimeMs <= this.lastModified) {
        return; // No need to reload
      }

      // Read and parse JSON
      const rawData = fs.readFileSync(this.dataPath, 'utf-8');
      const parsedData = JSON.parse(rawData);

      // Validate data structure
      const validationResult = safeValidateRacesConfig(parsedData);
      if (!validationResult.success) {
        throw new Error(`Invalid races data: ${validationResult.error.message}`);
      }

      this.racesConfig = validationResult.data;
      this.lastModified = stats.mtimeMs;
      this.buildClassRaceCompatibility();

      console.log(`Loaded ${this.racesConfig.availableRaces.length} races from config`);
    } catch (error) {
      console.error('Failed to load races:', error);
      throw error;
    }
  }

  /**
   * Build reverse mapping of class to compatible races
   */
  private buildClassRaceCompatibility(): void {
    const mapping: ClassRaceCompatibility = {};

    for (const [race, attributes] of Object.entries(this.racesConfig.raceAttributes)) {
      for (const className of attributes.compatibleClasses) {
        if (!mapping[className]) {
          mapping[className] = [];
        }
        mapping[className].push(race);
      }
    }

    this.classRaceCompatibility = mapping;
  }

  /**
   * Hot reload races if file has changed
   */
  public reloadIfChanged(): boolean {
    try {
      const stats = fs.statSync(this.dataPath);
      if (stats.mtimeMs > this.lastModified) {
        this.loadRaces();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking for race config changes:', error);
      return false;
    }
  }

  /**
   * Get available race names
   */
  public getAvailableRaces(): string[] {
    this.reloadIfChanged();
    return [...this.racesConfig.availableRaces];
  }

  /**
   * Get race attributes
   */
  public getRaceAttributes(raceName: string): RaceAttributes | null {
    this.reloadIfChanged();
    return this.racesConfig.raceAttributes[raceName] || null;
  }

  /**
   * Get racial ability
   */
  public getRacialAbility(raceName: string): RacialAbility | null {
    this.reloadIfChanged();
    return this.racesConfig.racialAbilities[raceName] || null;
  }

  /**
   * Get compatible classes for a race
   */
  public getCompatibleClasses(raceName: string): string[] {
    const attributes = this.getRaceAttributes(raceName);
    return attributes?.compatibleClasses || [];
  }

  /**
   * Get compatible races for a class
   */
  public getCompatibleRaces(className: string): string[] {
    this.reloadIfChanged();
    return this.classRaceCompatibility[className] || [];
  }

  /**
   * Check if a race-class combination is valid
   */
  public isValidCombination(raceName: string, className: string): boolean {
    const attributes = this.getRaceAttributes(raceName);
    return attributes?.compatibleClasses.includes(className) || false;
  }

  /**
   * Calculate modified stats based on race attributes
   */
  public calculateRaceStats(raceName: string, context: RaceBalanceContext = {}): {
    hp: number;
    armor: number;
    damage: number;
  } {
    const attributes = this.getRaceAttributes(raceName);
    if (!attributes) {
      return {
        hp: context.baseHp || 100,
        armor: context.baseArmor || 10,
        damage: context.baseDamage || 25
      };
    }

    return {
      hp: Math.floor((context.baseHp || 100) * attributes.hpModifier),
      armor: Math.floor((context.baseArmor || 10) * attributes.armorModifier),
      damage: Math.floor((context.baseDamage || 25) * attributes.damageModifier)
    };
  }

  /**
   * Get racial ability usage information
   */
  public getRacialAbilityUsage(raceName: string): {
    isPassive: boolean;
    maxUses: number;
    cooldown: number;
    usageLimit: UsageLimit;
  } | null {
    const ability = this.getRacialAbility(raceName);
    if (!ability) {
      return null;
    }

    return {
      isPassive: ability.usageLimit === 'passive',
      maxUses: ability.maxUses,
      cooldown: ability.cooldown,
      usageLimit: ability.usageLimit
    };
  }

  /**
   * Get races by usage limit type
   */
  public getRacesByUsageLimit(usageLimit: UsageLimit): string[] {
    this.reloadIfChanged();
    
    return this.racesConfig.availableRaces.filter(raceName => {
      const ability = this.racesConfig.racialAbilities[raceName];
      return ability && ability.usageLimit === usageLimit;
    });
  }

  /**
   * Get race balance statistics
   */
  public getRaceBalanceStats(): {
    races: number;
    averageModifiers: {
      hp: number;
      armor: number;
      damage: number;
    };
    compatibilityMatrix: {
      [raceName: string]: number; // Number of compatible classes
    };
    abilityTypes: {
      passive: number;
      perGame: number;
      perRound: number;
      perTurn: number;
    };
    extremes: {
      highestHp: { race: string; value: number };
      lowestHp: { race: string; value: number };
      highestDamage: { race: string; value: number };
      lowestDamage: { race: string; value: number };
    };
  } {
    this.reloadIfChanged();
    
    const races = this.racesConfig.availableRaces;
    let totalHp = 0;
    let totalArmor = 0;
    let totalDamage = 0;
    
    let highestHp = { race: '', value: 0 };
    let lowestHp = { race: '', value: Infinity };
    let highestDamage = { race: '', value: 0 };
    let lowestDamage = { race: '', value: Infinity };

    const compatibilityMatrix: { [raceName: string]: number } = {};
    const abilityTypes = { passive: 0, perGame: 0, perRound: 0, perTurn: 0 };

    races.forEach(raceName => {
      const attributes = this.racesConfig.raceAttributes[raceName];
      const ability = this.racesConfig.racialAbilities[raceName];
      
      if (attributes) {
        totalHp += attributes.hpModifier;
        totalArmor += attributes.armorModifier;
        totalDamage += attributes.damageModifier;

        // Track extremes
        if (attributes.hpModifier > highestHp.value) {
          highestHp = { race: raceName, value: attributes.hpModifier };
        }
        if (attributes.hpModifier < lowestHp.value) {
          lowestHp = { race: raceName, value: attributes.hpModifier };
        }
        if (attributes.damageModifier > highestDamage.value) {
          highestDamage = { race: raceName, value: attributes.damageModifier };
        }
        if (attributes.damageModifier < lowestDamage.value) {
          lowestDamage = { race: raceName, value: attributes.damageModifier };
        }

        // Track compatibility
        compatibilityMatrix[raceName] = attributes.compatibleClasses.length;
      }

      if (ability) {
        abilityTypes[ability.usageLimit]++;
      }
    });

    return {
      races: races.length,
      averageModifiers: {
        hp: totalHp / races.length,
        armor: totalArmor / races.length,
        damage: totalDamage / races.length
      },
      compatibilityMatrix,
      abilityTypes,
      extremes: {
        highestHp,
        lowestHp,
        highestDamage,
        lowestDamage
      }
    };
  }

  /**
   * Validate race-class compatibility matrix
   */
  public validateCompatibility(): {
    isValid: boolean;
    orphanedClasses: string[]; // Classes with no compatible races
    orphanedRaces: string[]; // Races with no compatible classes
    warnings: string[];
  } {
    this.reloadIfChanged();

    // Get all unique classes mentioned across all races
    const allMentionedClasses = new Set<string>();
    Object.values(this.racesConfig.raceAttributes).forEach(attributes => {
      attributes.compatibleClasses.forEach(className => {
        allMentionedClasses.add(className);
      });
    });

    // Find orphaned classes (classes with very few race options)
    const classRaceCounts: { [className: string]: number } = {};
    Array.from(allMentionedClasses).forEach(className => {
      classRaceCounts[className] = this.getCompatibleRaces(className).length;
    });

    const orphanedClasses = Object.entries(classRaceCounts)
      .filter(([_, count]) => count === 0)
      .map(([className]) => className);

    // Find races with no compatible classes (shouldn't happen with current schema)
    const orphanedRaces = this.racesConfig.availableRaces.filter(raceName => {
      const attributes = this.getRaceAttributes(raceName);
      return !attributes || attributes.compatibleClasses.length === 0;
    });

    // Generate warnings for classes with few options
    const warnings: string[] = [];
    Object.entries(classRaceCounts).forEach(([className, count]) => {
      if (count === 1) {
        warnings.push(`Class '${className}' only has 1 compatible race`);
      } else if (count === 2) {
        warnings.push(`Class '${className}' only has 2 compatible races`);
      }
    });

    return {
      isValid: orphanedClasses.length === 0 && orphanedRaces.length === 0,
      orphanedClasses,
      orphanedRaces,
      warnings
    };
  }

  /**
   * Check if a race name is valid
   */
  public isValidRace(raceName: string): boolean {
    this.reloadIfChanged();
    return this.racesConfig.availableRaces.includes(raceName);
  }

  /**
   * Get all race data (backwards compatibility)
   */
  public getAllRaceData(): RacesConfig & { classRaceCompatibility: ClassRaceCompatibility } {
    this.reloadIfChanged();
    return {
      availableRaces: [...this.racesConfig.availableRaces],
      raceAttributes: { ...this.racesConfig.raceAttributes },
      racialAbilities: { ...this.racesConfig.racialAbilities },
      classRaceCompatibility: { ...this.classRaceCompatibility }
    };
  }

  /**
   * Get class race compatibility mapping (backwards compatibility)
   */
  public getClassRaceCompatibility(): ClassRaceCompatibility {
    this.reloadIfChanged();
    return { ...this.classRaceCompatibility };
  }
}

// Export a default instance
export const raceLoader = new RaceLoader();