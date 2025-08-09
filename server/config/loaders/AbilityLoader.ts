import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  AbilitiesMap,
  Ability,
  safeValidateAbilitiesMap
} from '../schemas/ability.schema.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CombatContext {
  attacker?: any;
  target?: any;
  level?: number;
  currentHp?: number;
  maxHp?: number;
  [key: string]: any;
}

export class AbilityLoader {
  private abilities: AbilitiesMap;
  private dataPath: string;
  private lastModified: number = 0;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(__dirname, '../data/abilities.json');
    this.abilities = {};
    this.loadAbilities();
  }

  /**
   * Load abilities from JSON file with validation
   */
  private loadAbilities(): void {
    try {
      // Check if file exists
      if (!fs.existsSync(this.dataPath)) {
        throw new Error(`Abilities data file not found at: ${this.dataPath}`);
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
      const validationResult = safeValidateAbilitiesMap(parsedData);
      if (!validationResult.success) {
        throw new Error(`Invalid abilities data: ${validationResult.error.message}`);
      }

      this.abilities = validationResult.data;
      this.lastModified = stats.mtimeMs;

      console.log(`Loaded ${Object.keys(this.abilities).length} abilities from config`);
    } catch (error) {
      console.error('Failed to load abilities:', error);
      throw error;
    }
  }

  /**
   * Hot reload abilities if file has changed
   */
  public reloadIfChanged(): boolean {
    try {
      const stats = fs.statSync(this.dataPath);
      if (stats.mtimeMs > this.lastModified) {
        this.loadAbilities();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking for ability config changes:', error);
      return false;
    }
  }

  /**
   * Get ability by ID
   */
  public getAbility(abilityId: string): Ability | null {
    this.reloadIfChanged(); // Hot reload check
    return this.abilities[abilityId] || null;
  }

  /**
   * Get multiple abilities by IDs
   */
  public getAbilities(abilityIds: string[]): Ability[] {
    return abilityIds
      .map(id => this.getAbility(id))
      .filter((ability): ability is Ability => ability !== null);
  }

  /**
   * Get abilities by tag
   */
  public getAbilitiesByTag(tag: string): Ability[] {
    this.reloadIfChanged();
    return Object.values(this.abilities).filter(ability =>
      ability.tags && ability.tags.includes(tag)
    );
  }

  /**
   * Get abilities by category
   */
  public getAbilitiesByCategory(category: Ability['category']): Ability[] {
    this.reloadIfChanged();
    return Object.values(this.abilities).filter(ability => ability.category === category);
  }

  /**
   * Get all ability IDs
   */
  public getAllAbilityIds(): string[] {
    this.reloadIfChanged();
    return Object.keys(this.abilities);
  }

  /**
   * Get button text for an ability
   */
  public getAbilityButtonText(abilityId: string): { ready: string; submitted: string } | null {
    const ability = this.getAbility(abilityId);
    return ability?.buttonText || null;
  }

  /**
   * Check if ability is available (not on cooldown, meets requirements, etc.)
   */
  public isAbilityAvailable(abilityId: string, context: CombatContext = {}): boolean {
    const ability = this.getAbility(abilityId);
    if (!ability) return false;

    // Add business logic for availability checking
    // This could include cooldown checks, resource requirements, etc.

    // Example: Check if ability is hidden and player has access
    if (ability.tags.includes('hidden')) {
      return context['hasHiddenAccess'] === true;
    }

    return true;
  }

  /**
   * Calculate ability damage with context
   */
  public calculateDamage(ability: Ability, context: CombatContext = {}): number {
    if (!ability.params['damage'] || typeof ability.params['damage'] !== 'number') {
      return 0;
    }

    let damage = ability.params['damage'] as number;

    // Apply level scaling for certain abilities
    if (context.level && ability.tags.includes('scaling')) {
      const levelMultiplier = 1 + ((context.level - 1) * 0.1); // 10% per level
      damage = Math.floor(damage * levelMultiplier);
    }

    // Apply berserker rage scaling
    if (ability.id === 'bloodFrenzy' && context.currentHp && context.maxHp) {
      const hpMissing = context.maxHp - context.currentHp;
      const damageBonus = hpMissing * (ability.params['damageIncreasePerHpMissing'] as number);
      damage += damageBonus;
    }

    // Apply multi-hit calculations
    if (ability.params['hits'] && typeof ability.params['hits'] === 'number') {
      damage = damage * (ability.params['hits'] as number);
    }

    return Math.floor(damage);
  }

  /**
   * Get ability cooldown information
   */
  public getCooldownInfo(abilityId: string): { baseCooldown: number; canReduce: boolean } {
    const ability = this.getAbility(abilityId);
    if (!ability) {
      return { baseCooldown: 0, canReduce: false };
    }

    return {
      baseCooldown: ability.cooldown,
      canReduce: !ability.tags.includes('passive')
    };
  }

  /**
   * Get abilities sorted by execution order
   */
  public getAbilitiesByOrder(): Ability[] {
    this.reloadIfChanged();
    return Object.values(this.abilities).sort((a, b) => a.order - b.order);
  }

  /**
   * Validate ability parameters
   */
  public validateAbilityParams(abilityId: string, params: Record<string, any>): boolean {
    const ability = this.getAbility(abilityId);
    if (!ability) return false;

    // Add validation logic for ability-specific parameters
    // This could check required parameters, value ranges, etc.

    // Example: Validate target requirements
    if (ability.target === 'Single' && !params['targetId']) {
      return false;
    }

    if (ability.target === 'Multi' && params['targetId']) {
      return false; // Multi-target abilities shouldn't have specific targets
    }

    return true;
  }

  /**
   * Get ability effect information
   */
  public getEffectInfo(abilityId: string): {
    hasEffect: boolean;
    effectType: string | null;
    effectParams: Record<string, any>
  } {
    const ability = this.getAbility(abilityId);
    if (!ability) {
      return { hasEffect: false, effectType: null, effectParams: {} };
    }

    const effectParams: Record<string, any> = {};

    // Extract effect-specific parameters
    if (ability.effect === 'poison' && ability.params['poison']) {
      effectParams['poison'] = ability.params['poison'];
    }
    if (ability.effect === 'bleed' && ability.params['bleed']) {
      effectParams['bleed'] = ability.params['bleed'];
    }
    if (ability.effect === 'vulnerable' && ability.params['vulnerability']) {
      effectParams['vulnerability'] = ability.params['vulnerability'];
    }

    return {
      hasEffect: ability.effect !== null,
      effectType: ability.effect,
      effectParams
    };
  }

  /**
   * Get all abilities as the original format for backwards compatibility
   */
  public getAllAbilities(): AbilitiesMap {
    this.reloadIfChanged();
    return { ...this.abilities }; // Return a copy to prevent mutation
  }

  /**
   * Get ability statistics
   */
  public getAbilityStats(): {
    total: number;
    byCategory: Record<string, number>;
    byTags: Record<string, number>;
    averageDamage: number;
    averageCooldown: number;
  } {
    this.reloadIfChanged();
    const abilities = Object.values(this.abilities);

    const byCategory: Record<string, number> = {};
    const byTags: Record<string, number> = {};
    let totalDamage = 0;
    let damageAbilities = 0;
    let totalCooldown = 0;

    abilities.forEach(ability => {
      // Count by category
      byCategory[ability.category] = (byCategory[ability.category] || 0) + 1;

      // Count by tags
      ability.tags.forEach(tag => {
        byTags[tag] = (byTags[tag] || 0) + 1;
      });

      // Calculate damage averages
      if (typeof ability.params['damage'] === 'number') {
        totalDamage += ability.params['damage'] as number;
        damageAbilities++;
      }

      totalCooldown += ability.cooldown;
    });

    return {
      total: abilities.length,
      byCategory,
      byTags,
      averageDamage: damageAbilities > 0 ? totalDamage / damageAbilities : 0,
      averageCooldown: abilities.length > 0 ? totalCooldown / abilities.length : 0
    };
  }
}

// Export a default instance
export const abilityLoader = new AbilityLoader();
