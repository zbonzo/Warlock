/**
 * @fileoverview Ability management for Player class
 * Handles ability unlocking, cooldowns, and usage tracking
 */

import config from '../../config/index.js';
import logger from '../../utils/logger.js';
import type { 
  Ability, 
  Player as PlayerType,
  PlayerClass 
} from '../../types/generated.js';

interface Player {
  id: string;
  isAlive: boolean;
}

interface AbilitySummaryItem {
  type: string;
  name: string;
  unlocked: boolean;
  cooldown: number;
  description?: string;
}

interface RacialAbilitySummary {
  name: string;
  used: boolean;
  canUse: boolean;
}

interface AbilitySummary {
  abilities: AbilitySummaryItem[];
  racialAbility: RacialAbilitySummary | null;
}

interface SerializedAbilityState {
  abilities: Ability[];
  unlockedAbilities: Ability[];
  cooldowns: Record<string, number>;
  racialAbility: Ability | null;
  racialAbilityUsed: boolean;
}

/**
 * AbilityManager handles all ability-related operations for a player
 */
class AbilityManager {
  private player: Player;
  private abilities: Ability[] = [];
  private unlockedAbilities: Ability[] = [];
  private abilityCooldowns: Map<string, number> = new Map();
  private racialAbility: Ability | null = null;
  private racialAbilityUsed: boolean = false;

  constructor(player: Player) {
    this.player = player;
  }

  /**
   * Initialize abilities based on class
   */
  initializeAbilities(className: PlayerClass): void {
    const classAbilities = config.getClassAbilities(className);
    if (classAbilities && classAbilities.length > 0) {
      this.abilities = classAbilities as any;
      this.unlockedAbilities = (classAbilities as any).filter(
        (ability: any) => (ability['unlockAt'] as number ?? 1) <= 1
      );
    }
  }

  /**
   * Set racial ability
   */
  setRacialAbility(racialAbility: Ability): void {
    this.racialAbility = racialAbility;
    this.racialAbilityUsed = false;
  }

  /**
   * Get an ability by type
   */
  getAbility(abilityType: string): Ability | null {
    return this.abilities.find(a => a.type === abilityType) || null;
  }

  /**
   * Check if an ability is unlocked
   */
  isAbilityUnlocked(abilityType: string): boolean {
    return this.unlockedAbilities.some(a => a.type === abilityType);
  }

  /**
   * Check if an ability is on cooldown
   */
  isAbilityOnCooldown(abilityType: string): boolean {
    return this.abilityCooldowns.has(abilityType) && 
           (this.abilityCooldowns.get(abilityType) || 0) > 0;
  }

  /**
   * Get remaining cooldown for an ability
   */
  getAbilityCooldown(abilityType: string): number {
    return this.abilityCooldowns.get(abilityType) || 0;
  }

  /**
   * Apply cooldown to an ability
   */
  applyCooldown(abilityType: string, rounds: number): void {
    if (rounds > 0) {
      this.abilityCooldowns.set(abilityType, rounds);
      logger.debug(`Applied ${rounds} round cooldown to ${abilityType} for player ${this.player.id}`);
    }
  }

  /**
   * Reduce cooldowns by one round
   */
  reduceCooldowns(): void {
    for (const [ability, cooldown] of this.abilityCooldowns.entries()) {
      if (cooldown > 0) {
        this.abilityCooldowns.set(ability, cooldown - 1);
        if (cooldown - 1 === 0) {
          logger.debug(`${ability} cooldown expired for player ${this.player.id}`);
        }
      }
    }
  }

  /**
   * Reset all cooldowns
   */
  resetCooldowns(): void {
    this.abilityCooldowns.clear();
  }

  /**
   * Get list of available abilities (unlocked and not on cooldown)
   */
  getAvailableAbilities(): Ability[] {
    return this.unlockedAbilities.filter(ability => 
      !this.isAbilityOnCooldown(ability.type)
    );
  }

  /**
   * Unlock abilities up to a certain level
   */
  unlockAbilitiesForLevel(level: number): Ability[] {
    const newlyUnlocked: Ability[] = [];
    
    for (const ability of this.abilities) {
      const alreadyUnlocked = this.unlockedAbilities.some(
        a => a.type === ability.type
      );
      
      if ((ability['unlockAt'] as number ?? 1) <= level && !alreadyUnlocked) {
        this.unlockedAbilities.push(ability);
        newlyUnlocked.push(ability);
      }
    }
    
    return newlyUnlocked;
  }

  /**
   * Check if player can use racial ability
   */
  canUseRacialAbility(): boolean {
    return this.racialAbility !== null && 
           !this.racialAbilityUsed && 
           this.player.isAlive;
  }

  /**
   * Mark racial ability as used
   */
  markRacialAbilityUsed(): void {
    this.racialAbilityUsed = true;
  }

  /**
   * Reset racial ability usage for new round
   */
  resetRacialAbility(): void {
    this.racialAbilityUsed = false;
  }

  /**
   * Get ability summary for client
   */
  getAbilitySummary(): AbilitySummary {
    return {
      abilities: this.abilities.map(a => ({
        type: a.type,
        name: a.name,
        unlocked: this.isAbilityUnlocked(a.type),
        cooldown: this.getAbilityCooldown(a.type),
        description: a.description
      })),
      racialAbility: this.racialAbility ? {
        name: this.racialAbility.name,
        used: this.racialAbilityUsed,
        canUse: this.canUseRacialAbility()
      } : null
    };
  }

  /**
   * Serialize ability state
   */
  serialize(): SerializedAbilityState {
    return {
      abilities: this.abilities,
      unlockedAbilities: this.unlockedAbilities,
      cooldowns: Object.fromEntries(this.abilityCooldowns),
      racialAbility: this.racialAbility,
      racialAbilityUsed: this.racialAbilityUsed
    };
  }

  /**
   * Deserialize ability state
   */
  deserialize(data: Partial<SerializedAbilityState>): void {
    if (data.abilities) this.abilities = data.abilities;
    if (data.unlockedAbilities) this.unlockedAbilities = data.unlockedAbilities;
    if (data.cooldowns) {
      this.abilityCooldowns = new Map(Object.entries(data.cooldowns));
    }
    if (data.racialAbility) this.racialAbility = data.racialAbility;
    if (data.racialAbilityUsed !== undefined) {
      this.racialAbilityUsed = data.racialAbilityUsed;
    }
  }
}

export default AbilityManager;