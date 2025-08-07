import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { 
  StatusEffectsConfig, 
  StatusEffect,
  ProcessingOrder,
  GlobalSettings,
  EffectDefaults,
  validateStatusEffectsConfig,
  safeValidateStatusEffectsConfig 
} from '../schemas/statusEffects.schema.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EffectMessageContext {
  playerName?: string;
  attackerName?: string;
  damage?: number;
  armor?: number;
  turns?: number;
  amount?: number;
  damageIncrease?: number;
  damageReduction?: number;
  healingPercent?: number;
  healthThreshold?: number;
  [key: string]: any;
}

export class StatusEffectsLoader {
  private effectsConfig: StatusEffectsConfig;
  private dataPath: string;
  private lastModified: number = 0;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(__dirname, '../data/statusEffects.json');
    this.effectsConfig = {
      effects: {},
      processingOrder: {},
      global: {} as GlobalSettings
    };
    this.loadStatusEffects();
  }

  /**
   * Load status effects from JSON file with validation
   */
  private loadStatusEffects(): void {
    try {
      // Check if file exists
      if (!fs.existsSync(this.dataPath)) {
        throw new Error(`Status effects data file not found at: ${this.dataPath}`);
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
      const validationResult = safeValidateStatusEffectsConfig(parsedData);
      if (!validationResult.success) {
        throw new Error(`Invalid status effects data: ${validationResult.error.message}`);
      }

      this.effectsConfig = validationResult.data;
      this.lastModified = stats.mtimeMs;

      console.log(`Loaded ${Object.keys(this.effectsConfig.effects).length} status effects from config`);
    } catch (error) {
      console.error('Failed to load status effects:', error);
      throw error;
    }
  }

  /**
   * Hot reload status effects if file has changed
   */
  public reloadIfChanged(): boolean {
    try {
      const stats = fs.statSync(this.dataPath);
      if (stats.mtimeMs > this.lastModified) {
        this.loadStatusEffects();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking for status effects config changes:', error);
      return false;
    }
  }

  /**
   * Get effect defaults by name
   */
  public getEffectDefaults(effectName: string): EffectDefaults | null {
    this.reloadIfChanged();
    return this.effectsConfig.effects[effectName]?.default || null;
  }

  /**
   * Get complete effect configuration
   */
  public getEffect(effectName: string): StatusEffect | null {
    this.reloadIfChanged();
    return this.effectsConfig.effects[effectName] || null;
  }

  /**
   * Check if effect is stackable
   */
  public isEffectStackable(effectName: string): boolean {
    this.reloadIfChanged();
    return this.effectsConfig.effects[effectName]?.stackable || false;
  }

  /**
   * Check if effect is refreshable
   */
  public isEffectRefreshable(effectName: string): boolean {
    this.reloadIfChanged();
    return this.effectsConfig.effects[effectName]?.refreshable || false;
  }

  /**
   * Get processing order for all effects
   */
  public getProcessingOrder(): ProcessingOrder {
    this.reloadIfChanged();
    return { ...this.effectsConfig.processingOrder };
  }

  /**
   * Get processing order for specific effect
   */
  public getEffectProcessingOrder(effectName: string): number {
    this.reloadIfChanged();
    return this.effectsConfig.processingOrder[effectName] || 999; // Default to very late
  }

  /**
   * Get global settings
   */
  public getGlobalSettings(): GlobalSettings {
    this.reloadIfChanged();
    return { ...this.effectsConfig.global };
  }

  /**
   * Get effect message template
   */
  public getEffectMessage(effectName: string, messageType: string, context: EffectMessageContext = {}): string {
    this.reloadIfChanged();
    
    const effect = this.effectsConfig.effects[effectName];
    const template = effect?.messages[messageType];

    if (!template) {
      // Fallback messages
      if (messageType === 'applied') {
        return `${context.playerName} is affected by ${effectName}.`;
      } else if (messageType === 'refreshed') {
        return `${context.playerName}'s ${effectName} effect is refreshed.`;
      } else if (messageType === 'expired') {
        return `The ${effectName} effect on ${context.playerName} has worn off.`;
      }
      return '';
    }

    return this.formatEffectMessage(template, context);
  }

  /**
   * Format effect message template with context data
   */
  public formatEffectMessage(template: string, context: EffectMessageContext = {}): string {
    if (!template) return '';

    return template.replace(/{(\w+)}/g, (match, key) => {
      return String(context[key] || match);
    });
  }

  /**
   * Get effects by category/property
   */
  public getEffectsByProperty(property: string, value: any): string[] {
    this.reloadIfChanged();
    
    return Object.entries(this.effectsConfig.effects)
      .filter(([_, effect]) => (effect as any)[property] === value)
      .map(([effectName]) => effectName);
  }

  /**
   * Get stackable effects
   */
  public getStackableEffects(): string[] {
    return this.getEffectsByProperty('stackable', true);
  }

  /**
   * Get permanent effects
   */
  public getPermanentEffects(): string[] {
    this.reloadIfChanged();
    
    return Object.entries(this.effectsConfig.effects)
      .filter(([_, effect]) => (effect as any).isPermanent === true)
      .map(([effectName]) => effectName);
  }

  /**
   * Get passive effects
   */
  public getPassiveEffects(): string[] {
    this.reloadIfChanged();
    
    return Object.entries(this.effectsConfig.effects)
      .filter(([_, effect]) => (effect as any).isPassive === true)
      .map(([effectName]) => effectName);
  }

  /**
   * Get effects that affect damage calculation
   */
  public getDamageModifyingEffects(): string[] {
    return this.getEffectsByProperty('affectsDamageCalculation', true);
  }

  /**
   * Get effects that prevent actions
   */
  public getActionPreventingEffects(): string[] {
    return this.getEffectsByProperty('preventsActions', true);
  }

  /**
   * Get effects ordered by processing priority
   */
  public getEffectsInProcessingOrder(): string[] {
    this.reloadIfChanged();
    
    return Object.entries(this.effectsConfig.processingOrder)
      .sort(([, a], [, b]) => a - b)
      .map(([effectName]) => effectName);
  }

  /**
   * Validate effect configuration integrity
   */
  public validateEffectIntegrity(): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    this.reloadIfChanged();
    
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for effects with missing processing order
    const effectsWithoutOrder = Object.keys(this.effectsConfig.effects).filter(
      effectName => !this.effectsConfig.processingOrder[effectName]
    );
    
    if (effectsWithoutOrder.length > 0) {
      warnings.push(`Effects without processing order: ${effectsWithoutOrder.join(', ')}`);
    }

    // Check for effects with suspicious default values
    Object.entries(this.effectsConfig.effects).forEach(([effectName, effect]) => {
      const defaults = effect.default;
      
      // Check for negative damage values
      if (defaults.damage && typeof defaults.damage === 'number' && defaults.damage < 0) {
        warnings.push(`Effect '${effectName}' has negative damage: ${defaults.damage}`);
      }
      
      // Check for excessive turn duration
      if (defaults.turns && typeof defaults.turns === 'number' && defaults.turns > 10 && defaults.turns !== -1) {
        warnings.push(`Effect '${effectName}' has very long duration: ${defaults.turns} turns`);
      }
      
      // Check for missing required message types
      const requiredMessages = ['applied', 'expired'];
      const missingMessages = requiredMessages.filter(
        msgType => !effect.messages[msgType]
      );
      
      if (missingMessages.length > 0) {
        warnings.push(`Effect '${effectName}' missing messages: ${missingMessages.join(', ')}`);
      }
    });

    // Check global settings consistency
    const global = this.effectsConfig.global;
    if (global.maxTurns < global.minTurns) {
      errors.push('maxTurns must be >= minTurns in global settings');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Get effect statistics
   */
  public getEffectStats(): {
    totalEffects: number;
    stackableEffects: number;
    permanentEffects: number;
    passiveEffects: number;
    damageEffects: number;
    protectionEffects: number;
    averageProcessingOrder: number;
    effectCategories: {
      damage: number;
      protection: number;
      control: number;
      passive: number;
      other: number;
    };
  } {
    this.reloadIfChanged();
    
    const effects = Object.values(this.effectsConfig.effects);
    const totalEffects = effects.length;
    
    let stackableCount = 0;
    let permanentCount = 0;
    let passiveCount = 0;
    let damageCount = 0;
    let protectionCount = 0;
    
    const categories = {
      damage: 0,
      protection: 0,
      control: 0,
      passive: 0,
      other: 0
    };

    effects.forEach(effect => {
      if (effect.stackable) stackableCount++;
      if ((effect as any).isPermanent) permanentCount++;
      if ((effect as any).isPassive) passiveCount++;
      if (effect.default.damage) damageCount++;
      if (effect.default.armor) protectionCount++;
      
      // Categorize effects
      if (effect.default.damage || (effect as any).damagePerTurn) {
        categories.damage++;
      } else if (effect.default.armor || (effect as any).armorStacks) {
        categories.protection++;
      } else if ((effect as any).preventsActions || (effect as any).preventsTargeting) {
        categories.control++;
      } else if ((effect as any).isPassive) {
        categories.passive++;
      } else {
        categories.other++;
      }
    });

    const processingOrders = Object.values(this.effectsConfig.processingOrder);
    const averageProcessingOrder = processingOrders.reduce((sum, order) => sum + order, 0) / processingOrders.length;

    return {
      totalEffects,
      stackableEffects: stackableCount,
      permanentEffects: permanentCount,
      passiveEffects: passiveCount,
      damageEffects: damageCount,
      protectionEffects: protectionCount,
      averageProcessingOrder,
      effectCategories: categories
    };
  }

  /**
   * Check if effect name is valid
   */
  public isValidEffect(effectName: string): boolean {
    this.reloadIfChanged();
    return effectName in this.effectsConfig.effects;
  }

  /**
   * Get all effect names
   */
  public getAllEffectNames(): string[] {
    this.reloadIfChanged();
    return Object.keys(this.effectsConfig.effects);
  }

  /**
   * Get all status effects data (backwards compatibility)
   */
  public getAllStatusEffectsData(): StatusEffectsConfig {
    this.reloadIfChanged();
    return JSON.parse(JSON.stringify(this.effectsConfig));
  }
}

// Export a default instance
export const statusEffectsLoader = new StatusEffectsLoader();