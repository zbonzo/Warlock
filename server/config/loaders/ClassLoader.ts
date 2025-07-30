import fs from 'fs';
import path from 'path';
import { 
  ClassesConfig, 
  ClassAttributes,
  AbilityProgression,
  ClassCategory,
  validateClassesConfig,
  safeValidateClassesConfig 
} from '../schemas/class.schema';
import { abilityLoader } from './AbilityLoader';
import { Ability } from '../schemas/ability.schema';

export interface ClassWithAbilities {
  name: string;
  category: ClassCategory;
  attributes: ClassAttributes;
  abilities: Array<Ability & { unlockAt: number; type: string }>;
}

export interface ClassBalanceContext {
  level?: number;
  baseHp?: number;
  baseArmor?: number;
  baseDamage?: number;
  [key: string]: any;
}

export class ClassLoader {
  private classesConfig: ClassesConfig;
  private dataPath: string;
  private lastModified: number = 0;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(__dirname, '../data/classes.json');
    this.classesConfig = {
      availableClasses: [],
      classCategories: {},
      classAttributes: {},
      classAbilityProgression: {}
    };
    this.loadClasses();
  }

  /**
   * Load classes from JSON file with validation
   */
  private loadClasses(): void {
    try {
      // Check if file exists
      if (!fs.existsSync(this.dataPath)) {
        throw new Error(`Classes data file not found at: ${this.dataPath}`);
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
      const validationResult = safeValidateClassesConfig(parsedData);
      if (!validationResult.success) {
        throw new Error(`Invalid classes data: ${validationResult.error.message}`);
      }

      this.classesConfig = validationResult.data;
      this.lastModified = stats.mtimeMs;

      console.log(`Loaded ${this.classesConfig.availableClasses.length} classes from config`);
    } catch (error) {
      console.error('Failed to load classes:', error);
      throw error;
    }
  }

  /**
   * Hot reload classes if file has changed
   */
  public reloadIfChanged(): boolean {
    try {
      const stats = fs.statSync(this.dataPath);
      if (stats.mtimeMs > this.lastModified) {
        this.loadClasses();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking for class config changes:', error);
      return false;
    }
  }

  /**
   * Get available class names
   */
  public getAvailableClasses(): string[] {
    this.reloadIfChanged();
    return [...this.classesConfig.availableClasses];
  }

  /**
   * Get class categories
   */
  public getClassCategories(): Record<string, string[]> {
    this.reloadIfChanged();
    return { ...this.classesConfig.classCategories };
  }

  /**
   * Get classes by category
   */
  public getClassesByCategory(category: ClassCategory): string[] {
    this.reloadIfChanged();
    return this.classesConfig.classCategories[category] || [];
  }

  /**
   * Get class attributes
   */
  public getClassAttributes(className: string): ClassAttributes | null {
    this.reloadIfChanged();
    return this.classesConfig.classAttributes[className] || null;
  }

  /**
   * Get class ability progression
   */
  public getClassAbilityProgression(className: string): AbilityProgression | null {
    this.reloadIfChanged();
    return this.classesConfig.classAbilityProgression[className] || null;
  }

  /**
   * Get class abilities by level (backwards compatible)
   */
  public getClassAbilities(className: string, maxLevel: number = 4): Array<Ability & { unlockAt: number; type: string }> {
    const progression = this.getClassAbilityProgression(className);
    if (!progression) {
      return [];
    }

    const abilities: Array<Ability & { unlockAt: number; type: string }> = [];
    
    for (let level = 1; level <= Math.min(maxLevel, 4); level++) {
      const abilityId = progression[`level${level}` as keyof AbilityProgression];
      if (abilityId) {
        const ability = abilityLoader.getAbility(abilityId);
        if (ability) {
          abilities.push({
            ...ability,
            unlockAt: level,
            type: ability.id // Maintain compatibility with existing code
          });
        }
      }
    }

    return abilities;
  }

  /**
   * Get all abilities for a class (levels 1-4)
   */
  public getAllClassAbilities(className: string): Array<Ability & { unlockAt: number; type: string }> {
    return this.getClassAbilities(className, 4);
  }

  /**
   * Get ability ID for a specific class level
   */
  public getClassAbilityForLevel(className: string, level: number): string | null {
    const progression = this.getClassAbilityProgression(className);
    if (!progression || level < 1 || level > 4) {
      return null;
    }
    return progression[`level${level}` as keyof AbilityProgression] || null;
  }

  /**
   * Get complete class information with abilities
   */
  public getClassInfo(className: string): ClassWithAbilities | null {
    const attributes = this.getClassAttributes(className);
    if (!attributes) {
      return null;
    }

    const category = this.getClassCategory(className);
    const abilities = this.getAllClassAbilities(className);

    return {
      name: className,
      category: category || 'Melee', // Default fallback
      attributes,
      abilities
    };
  }

  /**
   * Get class category for a specific class
   */
  public getClassCategory(className: string): ClassCategory | null {
    this.reloadIfChanged();
    
    for (const [category, classes] of Object.entries(this.classesConfig.classCategories)) {
      if (classes.includes(className)) {
        return category as ClassCategory;
      }
    }
    return null;
  }

  /**
   * Calculate modified stats based on class attributes
   */
  public calculateClassStats(className: string, context: ClassBalanceContext = {}): {
    hp: number;
    armor: number;
    damage: number;
  } {
    const attributes = this.getClassAttributes(className);
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
   * Validate that all referenced abilities exist
   */
  public validateClassAbilities(): {
    isValid: boolean;
    missing: string[];
    warnings: string[];
  } {
    this.reloadIfChanged();
    
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const [className, progression] of Object.entries(this.classesConfig.classAbilityProgression)) {
      for (let level = 1; level <= 4; level++) {
        const abilityId = progression[`level${level}` as keyof AbilityProgression];
        if (!abilityId) {
          warnings.push(`${className} missing ability for level ${level}`);
          continue;
        }
        
        const ability = abilityLoader.getAbility(abilityId);
        if (!ability) {
          missing.push(`${className} level ${level}: ability '${abilityId}' not found`);
        }
      }
    }

    return {
      isValid: missing.length === 0,
      missing,
      warnings
    };
  }

  /**
   * Get class balance statistics
   */
  public getClassBalanceStats(): {
    classes: number;
    categories: Record<string, number>;
    averageModifiers: {
      hp: number;
      armor: number;
      damage: number;
    };
    extremes: {
      highestHp: { class: string; value: number };
      lowestHp: { class: string; value: number };
      highestDamage: { class: string; value: number };
      lowestDamage: { class: string; value: number };
    };
  } {
    this.reloadIfChanged();
    
    const classes = this.classesConfig.availableClasses;
    const categories: Record<string, number> = {};
    
    let totalHp = 0;
    let totalArmor = 0;
    let totalDamage = 0;
    
    let highestHp = { class: '', value: 0 };
    let lowestHp = { class: '', value: Infinity };
    let highestDamage = { class: '', value: 0 };
    let lowestDamage = { class: '', value: Infinity };

    // Count categories
    Object.entries(this.classesConfig.classCategories).forEach(([category, classNames]) => {
      categories[category] = classNames.length;
    });

    // Calculate averages and extremes
    classes.forEach(className => {
      const attributes = this.classesConfig.classAttributes[className];
      if (attributes) {
        totalHp += attributes.hpModifier;
        totalArmor += attributes.armorModifier;
        totalDamage += attributes.damageModifier;

        if (attributes.hpModifier > highestHp.value) {
          highestHp = { class: className, value: attributes.hpModifier };
        }
        if (attributes.hpModifier < lowestHp.value) {
          lowestHp = { class: className, value: attributes.hpModifier };
        }
        if (attributes.damageModifier > highestDamage.value) {
          highestDamage = { class: className, value: attributes.damageModifier };
        }
        if (attributes.damageModifier < lowestDamage.value) {
          lowestDamage = { class: className, value: attributes.damageModifier };
        }
      }
    });

    return {
      classes: classes.length,
      categories,
      averageModifiers: {
        hp: totalHp / classes.length,
        armor: totalArmor / classes.length,
        damage: totalDamage / classes.length
      },
      extremes: {
        highestHp,
        lowestHp,
        highestDamage,
        lowestDamage
      }
    };
  }

  /**
   * Check if a class name is valid
   */
  public isValidClass(className: string): boolean {
    this.reloadIfChanged();
    return this.classesConfig.availableClasses.includes(className);
  }

  /**
   * Get all class data (backwards compatibility)
   */
  public getAllClassData(): ClassesConfig {
    this.reloadIfChanged();
    return {
      availableClasses: [...this.classesConfig.availableClasses],
      classCategories: { ...this.classesConfig.classCategories },
      classAttributes: { ...this.classesConfig.classAttributes },
      classAbilityProgression: { ...this.classesConfig.classAbilityProgression }
    };
  }
}

// Export a default instance
export const classLoader = new ClassLoader();