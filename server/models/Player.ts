/**
 * @fileoverview TypeScript refactored Player model using composition with domain models
 * Phase 5: Controllers & Main Classes Migration
 * Uses PlayerStats, PlayerAbilities, and PlayerEffects for better separation of concerns
 */

import config from '../config/index.js';
import logger from '../utils/logger.js';
// Messages are now accessed through the config system
import { PlayerStats } from './player/PlayerStats.js';
import { PlayerAbilities } from './player/PlayerAbilities.js';
import { PlayerEffects } from './player/PlayerEffects.js';
import { 
  Player as PlayerType, 
  PlayerClass, 
  PlayerRace, 
  PlayerRole,
  PlayerStatus,
  HealthPoints,
  StatusEffect,
  Ability,
  ActionResult,
  Monster,
  ValidationResult,
  PlayerAction,
  Schemas
} from '../types/generated.js';

export interface PlayerConstructorOptions {
  id: string;
  name: string;
  race?: PlayerRace;
  class?: PlayerClass;
  hp?: HealthPoints;
  maxHp?: HealthPoints;
  armor?: number;
  level?: number;
  isWarlock?: boolean;
}

export interface DamageOptions {
  source?: string;
  type?: 'physical' | 'magical' | 'true';
  bypassArmor?: boolean;
}

export interface ClientDataOptions {
  includePrivate?: boolean;
  requestingPlayerId?: string;
}

export interface SubmissionStatus {
  hasSubmitted: boolean;
  actionType?: string;
  targetId?: string;
  submissionTime?: number;
  isValid?: boolean;
  validationReason?: string;
}

/**
 * Player class representing a single player in the game
 * Now uses composition with domain models for better organization
 */
export class Player {
  // Core player identity
  public readonly id: string;
  public name: string;
  public socketIds: string[];
  
  // Basic game state
  public race: PlayerRace | null = null;
  public class: PlayerClass | null = null;
  public hp: HealthPoints = 100;
  public maxHp: HealthPoints = 100;
  public armor: number = 0;
  public damageMod: number = 1.0;
  public level: number = 1;
  public isWarlock: boolean = false;
  public isAlive: boolean = true;
  public isReady: boolean = false;

  // Composed domain models
  public readonly playerStats: PlayerStats;
  public readonly playerAbilities: PlayerAbilities;
  public readonly playerEffects: PlayerEffects;

  constructor(options: PlayerConstructorOptions | string, nameParam?: string) {
    // Handle legacy constructor signature (id, name) or new options object
    if (typeof options === 'string') {
      this.id = options;
      this.name = nameParam || '';
    } else {
      this.id = options.id;
      this.name = options.name;
      this.race = options.race || null;
      this.class = options.class || null;
      this.hp = options.hp || ((config.gameBalance as any)?.['baseHp'] || 100);
      this.maxHp = options.maxHp || ((config.gameBalance as any)?.['baseHp'] || 100);
      this.armor = options.armor || 0;
      this.level = options.level || 1;
      this.isWarlock = options.isWarlock || false;
    }

    this.socketIds = [this.id];
    
    // Set default HP if not provided
    if (!this.hp) {
      this.hp = (config.gameBalance as any)?.['baseHp'] || 100;
      this.maxHp = (config.gameBalance as any)?.['baseHp'] || 100;
    }

    // Initialize composed domain models
    this.playerStats = new PlayerStats(this.name);
    this.playerAbilities = new PlayerAbilities(this.id, this.name);
    this.playerEffects = new PlayerEffects(this.id, this.name);

    // Setup compatibility properties for backward compatibility
    this.setupCompatibilityProperties();
  }

  /**
   * Setup compatibility properties that delegate to domain models
   * This allows existing code to continue working while we migrate
   */
  private setupCompatibilityProperties(): void {
    // Stats compatibility
    Object.defineProperty(this, 'stats', {
      get: () => this.playerStats.getStats(),
      enumerable: true
    });

    // Abilities compatibility - delegate to playerAbilities
    Object.defineProperty(this, 'abilities', {
      get: () => this.playerAbilities.getAbilities(),
      set: (value: Ability[]) => this.playerAbilities.setAbilities(value),
      enumerable: true
    });

    Object.defineProperty(this, 'unlocked', {
      get: () => this.playerAbilities.getUnlockedAbilities(),
      set: (value: Ability[]) => this.playerAbilities.setUnlockedAbilities(value),
      enumerable: true
    });

    Object.defineProperty(this, 'abilityCooldowns', {
      get: () => (this.playerAbilities as any)['abilityCooldowns'],
      set: (value: Record<string, number>) => (this.playerAbilities as any)['abilityCooldowns'] = value,
      enumerable: true
    });

    Object.defineProperty(this, 'hasSubmittedAction', {
      get: () => this.playerAbilities.getHasSubmittedAction(),
      enumerable: true
    });

    Object.defineProperty(this, 'submittedAction', {
      get: () => this.playerAbilities.getSubmittedAction(),
      enumerable: true
    });

    Object.defineProperty(this, 'actionValidationState', {
      get: () => (this.playerAbilities as any)['actionValidationState'],
      set: (value: any) => (this.playerAbilities as any)['actionValidationState'] = value,
      enumerable: true
    });

    Object.defineProperty(this, 'actionSubmissionTime', {
      get: () => (this.playerAbilities as any)['actionSubmissionTime'],
      set: (value: number) => (this.playerAbilities as any)['actionSubmissionTime'] = value,
      enumerable: true
    });

    Object.defineProperty(this, 'lastValidAction', {
      get: () => (this.playerAbilities as any)['lastValidAction'],
      set: (value: any) => (this.playerAbilities as any)['lastValidAction'] = value,
      enumerable: true
    });

    Object.defineProperty(this, 'racialAbility', {
      get: () => (this.playerAbilities as any)['racialAbility'],
      set: (value: any) => (this.playerAbilities as any)['racialAbility'] = value,
      enumerable: true
    });

    Object.defineProperty(this, 'racialUsesLeft', {
      get: () => (this.playerAbilities as any)['racialUsesLeft'],
      set: (value: number) => (this.playerAbilities as any)['racialUsesLeft'] = value,
      enumerable: true
    });

    Object.defineProperty(this, 'racialCooldown', {
      get: () => (this.playerAbilities as any)['racialCooldown'],
      set: (value: number) => (this.playerAbilities as any)['racialCooldown'] = value,
      enumerable: true
    });

    // Effects compatibility - delegate to playerEffects
    Object.defineProperty(this, 'statusEffects', {
      get: () => this.playerEffects.getStatusEffects(),
      set: (value: StatusEffect[]) => (this.playerEffects as any)['statusEffects'] = value,
      enumerable: true
    });

    Object.defineProperty(this, 'isVulnerable', {
      get: () => this.playerEffects.isVulnerable,
      set: (value: boolean) => this.playerEffects.isVulnerable = value,
      enumerable: true
    });

    Object.defineProperty(this, 'vulnerabilityIncrease', {
      get: () => this.playerEffects.vulnerabilityIncrease,
      set: (value: number) => this.playerEffects.vulnerabilityIncrease = value,
      enumerable: true
    });

    Object.defineProperty(this, 'stoneArmorIntact', {
      get: () => (this.playerEffects as any)['stoneArmorIntact'],
      set: (value: boolean) => (this.playerEffects as any)['stoneArmorIntact'] = value,
      enumerable: true
    });

    Object.defineProperty(this, 'stoneArmorValue', {
      get: () => (this.playerEffects as any)['stoneArmorValue'],
      set: (value: number) => (this.playerEffects as any)['stoneArmorValue'] = value,
      enumerable: true
    });

    Object.defineProperty(this, 'classEffects', {
      get: () => this.playerEffects.getClassEffects(),
      set: (value: StatusEffect[]) => this.playerEffects.setClassEffects(value),
      enumerable: true
    });

    Object.defineProperty(this, 'racialEffects', {
      get: () => this.playerEffects.getRacialEffects(),
      set: (value: StatusEffect[]) => this.playerEffects.setRacialEffects(value),
      enumerable: true
    });
  }

  // ==================== STATS METHODS ====================
  addDamageDealt(damage: number): void {
    this.playerStats.addDamageDealt(damage);
  }

  addDamageTaken(damage: number): void {
    this.playerStats.addDamageTaken(damage);
  }

  addHealingDone(healing: number): void {
    this.playerStats.addHealingDone(healing);
  }

  addCorruption(): void {
    this.playerStats.addCorruption();
  }

  addAbilityUse(): void {
    this.playerStats.addAbilityUse();
  }

  addDeath(): void {
    this.playerStats.addDeath();
  }

  addMonsterKill(): void {
    this.playerStats.addMonsterKill();
  }

  addSelfHeal(healing: number): void {
    this.playerStats.addSelfHeal(healing);
  }

  getStats(): import('./player/PlayerStats.js').PlayerStatsData {
    return this.playerStats.getStats();
  }

  // ==================== ABILITY METHODS ====================
  submitAction(actionType: string, targetId?: string, additionalData: Record<string, any> = {}): ActionResult {
    // Check if player is alive first
    if (!this.isAlive) {
      return {
        success: false,
        reason: (config as any).getError('playerDeadCannotAct') || 'Player is dead and cannot act',
        data: null,
      };
    }

    const result = this.playerAbilities.submitAction(actionType, targetId || '', additionalData);
    return {
      success: result.success,
      reason: result.reason || undefined,
      data: result.action,
    };
  }

  validateSubmittedAction(alivePlayers: Player[], monster?: Monster): ValidationResult {
    const result = this.playerAbilities.validateSubmittedAction(alivePlayers, monster || null);
    return {
      valid: result.isValid,
      errors: result.reason ? [result.reason] : [],
      warnings: [],
      metadata: undefined,
      score: undefined
    };
  }

  invalidateAction(reason: string): void {
    this.playerAbilities.invalidateAction(reason);
  }

  clearActionSubmission(): void {
    this.playerAbilities.clearActionSubmission();
    this.isReady = false;
  }

  isAbilityOnCooldown(abilityType: string): boolean {
    return this.playerAbilities.isAbilityOnCooldown(abilityType);
  }

  getAbilityCooldown(abilityType: string): number {
    return this.playerAbilities.getAbilityCooldown(abilityType);
  }

  putAbilityOnCooldown(abilityType: string, cooldownTurns: number): void {
    this.playerAbilities.putAbilityOnCooldown(abilityType, cooldownTurns);
  }

  canUseAbility(abilityType: string): boolean {
    return this.playerAbilities.canUseAbility(abilityType);
  }

  processAbilityCooldowns(): void {
    this.playerAbilities.processAbilityCooldowns();
  }

  getAvailableAbilities(): Ability[] {
    return this.playerAbilities.getAvailableAbilities();
  }

  canUseRacialAbility(): boolean {
    return this.playerAbilities.canUseRacialAbility();
  }

  useRacialAbility(): ActionResult {
    const result = this.playerAbilities.useRacialAbility();
    if (typeof result === 'boolean') {
      return {
        success: result,
        reason: result ? undefined : 'Racial ability use failed',
        data: null,
      };
    }
    return result;
  }

  processRacialCooldowns(): void {
    this.playerAbilities.processRacialCooldowns();
  }

  setRacialAbility(abilityData: Ability): void {
    // Convert Ability type to RacialAbility type expected by PlayerAbilities
    const racialAbility = {
      id: abilityData.id,
      name: abilityData.name,
      description: abilityData.description,
      usageLimit: (abilityData as any).usageLimit || 'perGame' as const,
      maxUses: (abilityData as any).maxUses,
      cooldown: abilityData.cooldown,
      effects: (abilityData as any).effects,
    };
    this.playerAbilities.setRacialAbility(racialAbility);
    
    // Handle special racial effects setup
    if (abilityData.id === 'undying') {
      this.playerEffects.initializeUndying((abilityData as any)['params']?.resurrectedHp || 1);
    } else if (abilityData.id === 'stoneArmor') {
      this.playerEffects.initializeStoneArmor(
        (abilityData as any)['params']?.initialArmor || config.gameBalance?.stoneArmor?.initialValue || 5
      );
    }
  }

  resetRacialPerRoundUses(): void {
    this.playerAbilities.resetRacialPerRoundUses();
  }

  getSubmissionStatus(): SubmissionStatus {
    const status = this.playerAbilities.getSubmissionStatus();
    return {
      hasSubmitted: status.hasSubmitted,
      actionType: status.action?.type,
      targetId: status.action?.target,
      submissionTime: status.submissionTime || undefined,
      isValid: status.isValid,
      validationReason: status.action?.invalidationReason,
    };
  }

  getAbilityDamageDisplay(ability: Ability): string {
    const display = this.playerAbilities.getAbilityDamageDisplay(ability, this.damageMod);
    return display?.displayText || `${(ability as any)['damage'] || 0}`;
  }

  // ==================== EFFECTS METHODS ====================
  hasStatusEffect(effectName: string): boolean {
    return this.playerEffects.hasStatusEffect(effectName);
  }

  applyStatusEffect(effectName: string, data?: StatusEffect): void {
    this.playerEffects.applyStatusEffect(effectName, data);
  }

  removeStatusEffect(effectName: string): void {
    this.playerEffects.removeStatusEffect(effectName);
  }

  processVulnerability(): void {
    this.playerEffects.processVulnerability();
  }

  applyVulnerability(damageIncrease: number, turns: number): void {
    this.playerEffects.applyVulnerability(damageIncrease, turns);
  }

  getEffectiveArmor(): number {
    return this.playerEffects.getEffectiveArmor(this.armor);
  }

  processStoneArmorDegradation(damage: number): void {
    this.playerEffects.processStoneArmorDegradation(damage);
  }

  processClassEffects(): void {
    this.playerEffects.processClassEffects(this.maxHp);
  }

  updateRelentlessFuryLevel(newLevel: number): void {
    this.level = newLevel;
    if (this.class) {
      this.playerEffects.updateRelentlessFuryLevel(newLevel, this.class);
    }
  }

  processThirstyBladeLifeSteal(damageDealt: number): number {
    const result = this.playerEffects.processThirstyBladeLifeSteal(
      damageDealt, this.class || 'Paladin', this.hp, this.maxHp
    );
    if (result.healed > 0) {
      this.hp = result.newHp;
    }
    return result.healed;
  }

  refreshThirstyBladeOnKill(): void {
    if (this.class) {
      this.playerEffects.refreshThirstyBladeOnKill(this.class);
    }
  }

  getSweepingStrikeParams(): { damage: number; targets: Player[] } | null {
    const params = this.playerEffects.getSweepingStrikeParams(this.class || 'Paladin');
    if (!params) return null;
    
    // Convert SweepingStrikeParams to expected return type
    // Note: damage and targets would need to be computed elsewhere
    // This is a type mismatch that needs architectural fix
    return null; // TODO: Fix this to return actual damage and targets
  }

  getRelentlessFuryVulnerability(baseDamage: number): number {
    return this.playerEffects.getRelentlessFuryVulnerability(baseDamage, this.class || 'Paladin');
  }

  calculateDamageWithVulnerability(baseDamage: number): number {
    return this.playerEffects.calculateDamageWithVulnerability(baseDamage);
  }

  // ==================== CORE METHODS ====================
  
  /**
   * Calculate damage reduction from armor
   */
  calculateDamageReduction(damage: number): number {
    const totalArmor = this.getEffectiveArmor();
    const reductionRate = (config.gameBalance as any)?.player?.armor?.reductionRate || 0.1;
    const maxReduction = (config.gameBalance as any)?.player?.armor?.maxReduction || 0.9;

    let reductionPercent: number;
    if (totalArmor <= 0) {
      // Negative armor increases damage taken
      reductionPercent = Math.max(-2.0, totalArmor * reductionRate);
    } else {
      // Positive armor reduces damage
      reductionPercent = Math.min(maxReduction, totalArmor * reductionRate);
    }

    // Apply the reduction and return final damage
    const finalDamage = Math.floor(damage * (1 - reductionPercent));
    return Math.max(1, finalDamage); // Always deal at least 1 damage
  }

  /**
   * Apply damage modifiers from effects and class
   */
  modifyDamage(rawDamage: number): number {
    // First apply the normal damage modifier (level progression)
    let modifiedDamage = Math.floor(rawDamage * (this.damageMod || 1.0));

    // Apply effects-based modifiers
    modifiedDamage = this.playerEffects.applyDamageModifiers(
      modifiedDamage, this.class || 'Paladin', this.level, this.hp, this.maxHp
    );

    return modifiedDamage;
  }

  /**
   * Take damage with proper armor calculation
   */
  takeDamage(amount: number): number {
    // Apply damage resistance from effects
    let modifiedDamage = this.playerEffects.applyDamageResistance(amount, this.class || 'Paladin');

    // Apply armor reduction using the calculation
    const finalDamage = this.calculateDamageReduction(modifiedDamage);

    // Apply the damage
    this.hp = Math.max(0, this.hp - finalDamage);

    // Check if died
    if (this.hp <= 0) {
      this.isAlive = false;
    }

    return finalDamage;
  }

  /**
   * Heal the player
   */
  heal(amount: number): number {
    const beforeHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - beforeHp;
  }

  /**
   * Calculate healing modifier (inverse of damage modifier)
   */
  getHealingModifier(): number {
    // Get class base damage modifier
    const classDamageModifier =
      this.class && (config as any).classAttributes && (config as any).classAttributes[this.class]
        ? (config as any).classAttributes[this.class].damageModifier || 1.0
        : 1.0;

    // Calculate pure level scaling (removing class modifier influence)
    const levelMultiplier = (this.damageMod || 1.0) / classDamageModifier;

    // Healing scales directly with level progression
    return levelMultiplier;
  }

  /**
   * Check if Crestfallen moonbeam is active (wounded condition)
   */
  isMoonbeamActive(): boolean {
    if ((this.race as any) !== 'Crestfallen' || !this.isAlive) return false;
    return this.hp <= this.maxHp * 0.5;
  }

  /**
   * Process Kinfolk life bond healing
   */
  processLifeBondHealing(monsterHp: number, log: ActionResult[] = []): number {
    if ((this.race as any) !== 'Kinfolk' || !this.isAlive || monsterHp <= 0) return 0;

    const racialAbility = (this as any).racialAbility;
    const healAmount = Math.floor(
      monsterHp * (racialAbility?.params?.healingPercent || 0)
    );
    const actualHeal = Math.min(healAmount, this.maxHp - this.hp);

    if (actualHeal > 0) {
      this.hp += actualHeal;

      const healLog: ActionResult = {
        success: true,
        data: {
          type: 'life_bond_healing',
          public: false,
          targetId: this.id,
          message: config.formatMessage(
            config.getEvent('kinfolkLifebondPublic'),
            { playerName: this.name, healAmount: actualHeal }
          ),
          privateMessage: (config as any).formatMessage(
            (config as any).privateMessages?.['kinfolkLifebondPrivate'] || '',
            { healAmount: actualHeal }
          ),
          attackerMessage: '',
        }
      };
      log.push(healLog);
    }

    return actualHeal;
  }

  /**
   * Add a new socket ID for reconnection tracking
   */
  addSocketId(socketId: string): void {
    if (!this.socketIds.includes(socketId)) {
      this.socketIds.push(socketId);
      logger.debug(`Added socket ID ${socketId} for player ${this.name}. Total socket IDs: ${this.socketIds.length}`);
    }
    // Note: We don't change this.id for TypeScript readonly property
    
    // Update references in domain models
    (this.playerAbilities as any).playerId = socketId;
    (this.playerEffects as any).playerId = socketId;
  }

  /**
   * Check if this player has used a specific socket ID
   */
  hasUsedSocketId(socketId: string): boolean {
    return this.socketIds.includes(socketId);
  }

  /**
   * Update player name and propagate to domain models
   */
  setName(newName: string): void {
    this.name = newName;
    this.playerStats.setPlayerName(newName);
    this.playerAbilities.setPlayerName(newName);
    this.playerEffects.setPlayerName(newName);
  }

  /**
   * Prepare player data for client transmission
   */
  toClientData(options: ClientDataOptions = {}): Partial<Player> {
    const { includePrivate = false, requestingPlayerId = null } = options;
    
    const data = {
      id: this.id,
      name: this.name,
      race: this.race,
      class: this.class,
      hp: this.hp,
      maxHp: this.maxHp,
      armor: this.armor,
      effectiveArmor: this.getEffectiveArmor(),
      isAlive: this.isAlive,
      isReady: this.isReady,
      hasSubmittedAction: (this as any).hasSubmittedAction,
      statusEffects: (this as any).statusEffects,
      level: this.level,
    };

    // Include private data for the player themselves or when specifically requested
    if (includePrivate || requestingPlayerId === this.id) {
      Object.assign(data, {
        isWarlock: this.isWarlock,
        unlocked: (this as any).unlocked,
        abilityCooldowns: (this as any).abilityCooldowns,
        racialAbility: (this as any).racialAbility,
        racialUsesLeft: (this as any).racialUsesLeft,
        racialCooldown: (this as any).racialCooldown,
        submissionStatus: this.getSubmissionStatus(),
        damageMod: this.damageMod,
        abilitiesWithDamage: ((this as any).unlocked || []).map((ability: Ability) => ({
          ...ability,
          damageDisplay: this.getAbilityDamageDisplay(ability),
        })),
      });
    }

    return data;
  }

  /**
   * Type-safe serialization for Zod validation
   */
  toJSON(): Partial<PlayerType> {
    const playerData = {
      id: this.id,
      name: this.name,
      class: this.class,
      race: this.race,
      role: this.isWarlock ? 'Warlock' as PlayerRole : 'Good' as PlayerRole,
      status: this.isAlive ? 'alive' as PlayerStatus : 'dead' as PlayerStatus,
      stats: {
        hp: this.hp,
        maxHp: this.maxHp,
        level: this.level,
        experience: 0,
        gold: 0,
        attackPower: Math.floor(10 * this.damageMod),
        defensePower: this.armor,
        magicPower: 0,
        luck: 50
      },
      abilities: (this as any).abilities || [],
      statusEffects: (this as any).statusEffects || [],
      actionThisRound: (this as any).hasSubmittedAction || false,
      position: undefined,
      socketId: this.id,
      isReady: this.isReady,
      metadata: {
        socketIds: this.socketIds,
        damageMod: this.damageMod
      }
    };

    // Validate with Zod schema
    const validation = Schemas.PlayerSchemas.player.safeParse(playerData);
    if (!validation.success) {
      logger.warn(`Player serialization validation failed for ${this.name}:`, validation.error);
    }

    return playerData;
  }

  /**
   * Create a Player instance from validated data
   */
  static fromJSON(data: PlayerType): Player {
    const player = new Player({
      id: data.id,
      name: data.name,
      race: data.race,
      class: data.class,
      hp: data.stats.hp,
      maxHp: data.stats.maxHp,
      armor: data.stats.defensePower,
      level: data.stats.level,
      isWarlock: data.role === 'Warlock'
    });

    // Restore additional state
    player.isAlive = data.status === 'alive';
    player.isReady = data.isReady;
    
    if (data.metadata?.socketIds) {
      player.socketIds = data.metadata.socketIds as string[];
    }
    
    if (data.metadata?.damageMod) {
      player.damageMod = data.metadata.damageMod as number;
    }

    // Restore abilities and effects
    if (data.abilities) {
      (player as any).abilities = data.abilities;
    }
    
    if (data.statusEffects) {
      (player as any).statusEffects = data.statusEffects;
    }

    return player;
  }
}

export default Player;