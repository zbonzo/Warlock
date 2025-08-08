import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  GameBalanceConfig,
  MonsterConfig,
  PlayerConfig,
  WarlockConfig,
  CombatConfig,
  validateGameBalanceConfig,
  safeValidateGameBalanceConfig
} from '../schemas/gameBalance.schema.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BalanceCalculationContext {
  level?: number;
  playerCount?: number;
  warlockCount?: number;
  age?: number;
  armor?: number;
  isGoodPlayer?: boolean;
  comebackActive?: boolean;
  [key: string]: any;
}

export class GameBalanceLoader {
  private balanceConfig: GameBalanceConfig;
  private dataPath: string;
  private lastModified: number = 0;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(__dirname, '../data/gameBalance.json');
    this.balanceConfig = {} as GameBalanceConfig;
    this.loadBalance();
  }

  /**
   * Load balance config from JSON file with validation
   */
  private loadBalance(): void {
    try {
      // Check if file exists
      if (!fs.existsSync(this.dataPath)) {
        throw new Error(`Game balance data file not found at: ${this.dataPath}`);
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
      const validationResult = safeValidateGameBalanceConfig(parsedData);
      if (!validationResult.success) {
        throw new Error(`Invalid game balance data: ${validationResult.error.message}`);
      }

      this.balanceConfig = validationResult.data;
      this.lastModified = stats.mtimeMs;

      console.log('Loaded game balance configuration from config');
    } catch (error) {
      console.error('Failed to load game balance:', error);
      throw error;
    }
  }

  /**
   * Hot reload balance config if file has changed
   */
  public reloadIfChanged(): boolean {
    try {
      const stats = fs.statSync(this.dataPath);
      if (stats.mtimeMs > this.lastModified) {
        this.loadBalance();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking for balance config changes:', error);
      return false;
    }
  }

  /**
   * Get monster configuration
   */
  public getMonsterConfig(): MonsterConfig {
    this.reloadIfChanged();
    return { ...this.balanceConfig.monster };
  }

  /**
   * Get player configuration
   */
  public getPlayerConfig(): PlayerConfig {
    this.reloadIfChanged();
    return { ...this.balanceConfig.player };
  }

  /**
   * Get warlock configuration
   */
  public getWarlockConfig(): WarlockConfig {
    this.reloadIfChanged();
    return { ...this.balanceConfig.warlock };
  }

  /**
   * Get combat configuration
   */
  public getCombatConfig(): CombatConfig {
    this.reloadIfChanged();
    return { ...this.balanceConfig.combat };
  }

  /**
   * Calculate monster HP for a given level
   */
  public calculateMonsterHp(level: number): number {
    this.reloadIfChanged();
    const monster = this.balanceConfig.monster;

    if (monster.useExponentialScaling) {
      // Exponential formula: baseHp * (level^1.3) + (level-1) * hpPerLevel
      return Math.floor(
        monster.baseHp * Math.pow(level, 1.3) + (level - 1) * monster.hpPerLevel
      );
    }
    // Fallback to linear scaling
    return monster.baseHp + (level - 1) * monster.hpPerLevel;
  }

  /**
   * Calculate monster damage based on age
   */
  public calculateMonsterDamage(age: number): number {
    this.reloadIfChanged();
    const monster = this.balanceConfig.monster;

    return monster.baseDamage * (age + monster.damageScaling.ageMultiplier);
  }

  /**
   * Calculate damage reduction from armor
   */
  public calculateDamageReduction(armor: number): number {
    this.reloadIfChanged();
    const armorConfig = this.balanceConfig.player.armor;

    if (armor <= 0) {
      // Negative armor increases damage taken
      return Math.max(-2.0, armor * armorConfig.reductionRate); // Cap at -200% (3x damage)
    }

    // Positive armor reduces damage
    return Math.min(
      armorConfig.maxReduction,
      armor * armorConfig.reductionRate
    );
  }

  /**
   * Calculate warlock conversion chance with limits and detection penalties
   */
  public calculateConversionChance(
    warlockCount: number,
    totalPlayers: number,
    modifier: number = 1.0,
    limitChecks: {
      roundLimitReached?: boolean;
      playerLimitReached?: boolean;
      playerOnCooldown?: boolean;
    } = {},
    recentlyDetected: boolean = false
  ): number {
    this.reloadIfChanged();
    const warlock = this.balanceConfig.warlock;

    // Check corruption limits first
    if (
      limitChecks.roundLimitReached ||
      limitChecks.playerLimitReached ||
      limitChecks.playerOnCooldown
    ) {
      return 0.0; // No conversion possible
    }

    // Check if corruption is blocked by recent detection
    if (recentlyDetected && !warlock.corruption.canCorruptWhenDetected) {
      return 0.0; // Cannot corrupt when recently detected
    }

    const baseChance = warlock.conversion.baseChance;
    const scalingFactor = warlock.conversion.scalingFactor;
    const maxChance = warlock.conversion.maxChance;

    const rawChance = Math.min(
      maxChance,
      baseChance + (warlockCount / totalPlayers) * scalingFactor
    );
    return rawChance * modifier;
  }

  /**
   * Calculate the number of warlocks needed based on player count
   */
  public calculateWarlockCount(playerCount: number): number {
    this.reloadIfChanged();
    const scalingConfig = this.balanceConfig.warlock.scaling;

    if (!scalingConfig.enabled) {
      return scalingConfig.minimumWarlocks;
    }

    let warlockCount: number;

    switch (scalingConfig.scalingMethod) {
      case 'linear':
        // Linear scaling: every X players adds 1 warlock
        warlockCount =
          Math.floor((playerCount - 1) / scalingConfig.playersPerWarlock) + 1;
        break;

      case 'exponential':
        // Exponential scaling
        warlockCount = Math.floor(Math.sqrt(playerCount)) + 1;
        break;

      case 'custom':
        // Custom scaling table
        warlockCount = scalingConfig.minimumWarlocks;
        for (const [threshold, count] of Object.entries(scalingConfig.customScaling)) {
          if (playerCount >= parseInt(threshold)) {
            warlockCount = count;
          }
        }
        break;

      default:
        warlockCount = scalingConfig.minimumWarlocks;
    }

    // Apply min/max constraints
    warlockCount = Math.max(scalingConfig.minimumWarlocks, warlockCount);
    warlockCount = Math.min(scalingConfig.maximumWarlocks, warlockCount);

    return warlockCount;
  }

  /**
   * Calculate threat generation
   */
  public calculateThreatGeneration(
    damageToMonster: number = 0,
    totalDamageDealt: number = 0,
    healingDone: number = 0,
    playerArmor: number = 0
  ): number {
    this.reloadIfChanged();
    const threatConfig = this.balanceConfig.monster.threat;

    if (!threatConfig.enabled) return 0;

    const armorThreat =
      playerArmor * damageToMonster * threatConfig.armorMultiplier;
    const damageThreat = totalDamageDealt * threatConfig.damageMultiplier;
    const healThreat = healingDone * threatConfig.healingMultiplier;

    return armorThreat + damageThreat + healThreat;
  }

  /**
   * Calculate coordination bonus for damage/healing
   */
  public calculateCoordinationBonus(
    baseAmount: number,
    coordinatingPlayers: number,
    type: 'damage' | 'healing' = 'damage'
  ): number {
    this.reloadIfChanged();
    const coordinationBonus = this.balanceConfig.coordinationBonus;

    if (!coordinationBonus.enabled || coordinatingPlayers <= 0) {
      return baseAmount;
    }

    const maxCoordinators = Math.min(
      coordinatingPlayers,
      coordinationBonus.maxBonusTargets - 1
    );

    let bonusPercent = 0;
    if (type === 'healing') {
      bonusPercent = coordinationBonus.healingBonus;
    } else {
      bonusPercent = coordinationBonus.damageBonus;
    }

    const totalBonus = maxCoordinators * bonusPercent;
    return Math.floor(baseAmount * (1 + totalBonus / 100));
  }

  /**
   * Check if comeback mechanics should be active
   */
  public shouldActiveComebackMechanics(
    goodPlayersRemaining: number,
    totalPlayersRemaining: number
  ): boolean {
    this.reloadIfChanged();
    const comebackMechanics = this.balanceConfig.comebackMechanics;

    if (!comebackMechanics.enabled || totalPlayersRemaining === 0) {
      return false;
    }

    const goodPlayerPercent =
      (goodPlayersRemaining / totalPlayersRemaining) * 100;
    return goodPlayerPercent <= comebackMechanics.threshold;
  }

  /**
   * Apply comeback bonuses to damage/healing/armor
   */
  public applyComebackBonus(
    baseAmount: number,
    type: 'damage' | 'healing' | 'armor',
    isGoodPlayer: boolean,
    comebackActive: boolean
  ): number {
    if (!comebackActive || !isGoodPlayer) {
      return baseAmount;
    }

    this.reloadIfChanged();
    const comebackMechanics = this.balanceConfig.comebackMechanics;

    switch (type) {
      case 'damage':
        return Math.floor(
          baseAmount * (1 + comebackMechanics.damageIncrease / 100)
        );
      case 'healing':
        return Math.floor(
          baseAmount * (1 + comebackMechanics.healingIncrease / 100)
        );
      case 'armor':
        return baseAmount + comebackMechanics.armorIncrease;
      default:
        return baseAmount;
    }
  }

  /**
   * Get game balance statistics
   */
  public getBalanceStats(): {
    monsterScaling: {
      exponential: boolean;
      multiplier: number;
    };
    playerBalance: {
      maxArmorReduction: number;
      levelUpHpIncrease: number;
    };
    warlockBalance: {
      baseConversionChance: number;
      maxConversionChance: number;
      scalingEnabled: boolean;
    };
    systemsEnabled: {
      threatSystem: boolean;
      coordinationBonus: boolean;
      comebackMechanics: boolean;
    };
  } {
    this.reloadIfChanged();

    return {
      monsterScaling: {
        exponential: this.balanceConfig.monster.useExponentialScaling,
        multiplier: this.balanceConfig.monster.hpScalingMultiplier,
      },
      playerBalance: {
        maxArmorReduction: this.balanceConfig.player.armor.maxReduction,
        levelUpHpIncrease: this.balanceConfig.player.levelUp.hpIncrease,
      },
      warlockBalance: {
        baseConversionChance: this.balanceConfig.warlock.conversion.baseChance,
        maxConversionChance: this.balanceConfig.warlock.conversion.maxChance,
        scalingEnabled: this.balanceConfig.warlock.scaling.enabled,
      },
      systemsEnabled: {
        threatSystem: this.balanceConfig.monster.threat.enabled,
        coordinationBonus: this.balanceConfig.coordinationBonus.enabled,
        comebackMechanics: this.balanceConfig.comebackMechanics.enabled,
      },
    };
  }

  /**
   * Get action order for ability type
   */
  public getDefaultActionOrder(type: 'attack' | 'defense' | 'heal' | 'special'): number {
    this.reloadIfChanged();
    return this.balanceConfig.combat.defaultOrders[type];
  }

  /**
   * Get rate limiting configuration
   */
  public getRateLimitConfig(): {
    defaultLimit: number;
    defaultTimeWindow: number;
    actionLimits: Record<string, { limit: number; window: number }>;
  } {
    this.reloadIfChanged();
    return { ...this.balanceConfig.rateLimiting };
  }

  /**
   * Validate balance configuration coherence
   */
  public validateBalanceCoherence(): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    this.reloadIfChanged();

    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for potential balance issues
    if (this.balanceConfig.warlock.conversion.baseChance > 0.6) {
      warnings.push('Base warlock conversion chance is very high (>60%)');
    }

    if (this.balanceConfig.player.armor.maxReduction > 0.9) {
      warnings.push('Maximum armor reduction is very high (>90%)');
    }

    if (this.balanceConfig.comebackMechanics.threshold > 50) {
      warnings.push('Comeback mechanics activate at high threshold (>50%)');
    }

    // Check for configuration errors
    if (this.balanceConfig.monster.baseHp <= 0) {
      errors.push('Monster base HP must be positive');
    }

    if (this.balanceConfig.gameCode.maxValue < this.balanceConfig.gameCode.minValue) {
      errors.push('Game code max value must be >= min value');
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Get all balance data (backwards compatibility)
   */
  public getAllBalanceData(): GameBalanceConfig {
    this.reloadIfChanged();
    return JSON.parse(JSON.stringify(this.balanceConfig));
  }
}

// Export a default instance
export const gameBalanceLoader = new GameBalanceLoader();
