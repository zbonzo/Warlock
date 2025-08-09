/**
 * @fileoverview Individual Status Effect class for the new system
 * Each status effect is its own instance with unique ID and behavior
 */

import { v4 as uuidv4 } from 'uuid';
import config from '../../config/index.js';
// Messages are now accessed through the config system
import logger from '../../utils/logger.js';
import { secureRandomFloat } from '../../utils/secureRandom.js';

interface Entity {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  isWarlock?: boolean;
  race?: string;
  stoneArmorIntact?: boolean;
  hasSubmittedAction?: boolean;
  clearActionSubmission?: () => void;
  processStoneArmorDegradation?: (_damage: number) => void;
  pendingDeath?: boolean;
}

interface StatusEffectParams {
  turns?: number;
  duration?: number;
  strength?: number;
  isPassive?: boolean;
  isPermanent?: boolean;
  priority?: number;
  damage?: number;
  amount?: number;
  healerId?: string;
  healerName?: string;
  damageIncrease?: number;
  damageReduction?: number;
  damageBoost?: number;
  damageResistance?: number;
  armor?: number;
  [key: string]: any;
}

interface ProcessResult {
  shouldRemove: boolean;
  effects: SideEffect[];
  messages?: any[];
}

interface SideEffect {
  type: string;
  cause?: string;
  attacker?: string;
  targetId?: string;
  sourceId?: string;
  message?: string;
}

interface CalculationContribution {
  additive: number;
  multiplicative: number;
  percentage: number;
  priority: number;
}

interface EffectSummary {
  id: string;
  type: string;
  sourceName: string;
  turnsRemaining: number;
  isPassive: boolean;
  isPermanent: boolean;
  params: StatusEffectParams;
  appliedAt: number;
}

/**
 * StatusEffect class representing a single status effect instance
 * Multiple instances of the same effect type can exist simultaneously
 */
class StatusEffect {
  public readonly id: string;
  public readonly type: string;
  public readonly sourceId: string | null;
  public readonly sourceName: string;
  public readonly targetId: string | null;
  public params: StatusEffectParams;
  public turnsRemaining: number;
  public strength: number;
  public readonly appliedAt: number;
  public isActive: boolean;
  public readonly isPassive: boolean;
  public readonly isPermanent: boolean;
  public readonly priority: number;

  /**
   * Create a new status effect instance
   */
  constructor(
    type: string,
    params: StatusEffectParams = {},
    sourceId: string | null = null,
    sourceName: string | null = null,
    targetId: string | null = null
  ) {
    this.id = uuidv4(); // Unique identifier for this effect instance
    this.type = type; // Effect type (poison, vulnerable, etc.)
    this.sourceId = sourceId; // Who applied this effect
    this.sourceName = sourceName || 'Unknown';
    this.targetId = targetId; // Who this effect is on

    // Get defaults from config and merge with provided params
    const defaults = config.getEffectDefaults(type) || {};
    this.params = { ...defaults, ...params };

    // Effect state
    this.turnsRemaining = this.params.turns || this.params.duration || 1;
    this.strength = this.params.strength || 1; // For stacking calculations
    // eslint-disable-next-line no-restricted-syntax
    this.appliedAt = Date.now();
    this.isActive = true;

    // Metadata
    this.isPassive = this.params.isPassive || false; // For racial abilities
    this.isPermanent = this.params.isPermanent || false; // Never expires
    this.priority = this.params.priority || 0; // Processing order

    logger.debug(`StatusEffect created: ${type} (${this.id}) on ${targetId} by ${sourceName}`);
  }

  /**
   * Process this effect for one turn
   */
  processTurn(target: Entity, log: any[] = []): ProcessResult {
    if (!this.isActive || this.isPermanent) {
      return { shouldRemove: false, effects: [] };
    }

    const result: ProcessResult = {
      shouldRemove: false,
      effects: [], // Any side effects or changes caused
      messages: [] // Messages to add to log
    };

    // Process based on effect type
    switch (this.type) {
      case 'poison':
        result.effects.push(...this.processPoison(target, log));
        break;
      case 'bleed':
        // Process bleed similar to poison
        result.effects.push(...this.processBleed(target, log));
        break;
      case 'healingOverTime':
        result.effects.push(...this.processHealingOverTime(target, log));
        break;
      case 'vulnerable':
      case 'weakened':
      case 'enraged':
      case 'shielded':
      case 'invisible':
      case 'stunned':
      case 'stoneArmor':
      case 'spiritGuard':
      case 'sanctuary':
        // These are handled passively during damage/action calculations
        break;
      case 'undying':
      case 'moonbeam':
      case 'lifeBond':
        // These are passive racial effects handled elsewhere
        break;
      default:
        logger.warn(`Unknown status effect type: ${this.type}`);
    }

    // Decrement turns remaining
    if (!this.isPermanent) {
      this.turnsRemaining--;
      if (this.turnsRemaining <= 0) {
        result.shouldRemove = true;
        this.onExpired(target, log);
      }
    }

    return result;
  }

  /**
   * Process poison damage
   */
  private processPoison(target: Entity, log: any[]): SideEffect[] {
    const damage = this.params.damage || 0;
    if (damage <= 0) return [];

    const oldHp = target.hp;
    target.hp = Math.max(0, target.hp - damage);
    const actualDamage = oldHp - target.hp;

    // Log poison damage
    const poisonMessage = config.getEvent('poisonDamage', {
      playerName: target.name || 'Monster',
      damage: actualDamage,
    });
    log.push(poisonMessage);

    // Check if poison killed the target
    const effects: SideEffect[] = [];
    if (target.hp <= 0) {
      target.isAlive = false;
      target.pendingDeath = true;
      (target as any).deathAttacker = this.sourceName || 'Poison';
      effects.push({ type: 'death', cause: 'poison', attacker: this.sourceName });
    }

    // Process stone armor degradation for Rockhewn
    if (target.race === 'Rockhewn' && target.stoneArmorIntact && actualDamage > 0) {
      if (target.processStoneArmorDegradation) {
        target.processStoneArmorDegradation(actualDamage);
      }
    }

    return effects;
  }

  /**
   * Process bleed damage (similar to poison)
   */
  private processBleed(target: Entity, log: any[]): SideEffect[] {
    const damage = this.params.damage || 0;
    if (damage <= 0) return [];

    const oldHp = target.hp;
    target.hp = Math.max(0, target.hp - damage);
    const actualDamage = oldHp - target.hp;

    // Log bleed damage
    const bleedMessage = config.formatEffectMessage(
      config.getEffectMessage('bleed', 'damage'),
      {
        playerName: target.name || 'Monster',
        damage: actualDamage,
      }
    );
    log.push({
      type: 'bleed_damage',
      public: true,
      targetId: target.id,
      damage: actualDamage,
      message: bleedMessage,
    });

    // Check if bleed killed the target
    const effects: SideEffect[] = [];
    if (target.hp <= 0) {
      target.isAlive = false;
      target.pendingDeath = true;
      (target as any).deathAttacker = this.sourceName || 'Bleed';
      effects.push({ type: 'death', cause: 'bleed', attacker: this.sourceName });
    }

    // Process stone armor degradation for Rockhewn
    if (target.race === 'Rockhewn' && target.stoneArmorIntact && actualDamage > 0) {
      if (target.processStoneArmorDegradation) {
        target.processStoneArmorDegradation(actualDamage);
      }
    }

    return effects;
  }

  /**
   * Process healing over time
   */
  private processHealingOverTime(target: Entity, log: any[]): SideEffect[] {
    const healAmount = this.params.amount || 0;
    if (healAmount <= 0) return [];

    // Calculate actual healing received
    const actualHeal = Math.min(healAmount, target.maxHp - target.hp);
    if (actualHeal <= 0) return [];

    target.hp += actualHeal;

    // Log the healing
    const healMessage = config.getAbilityMessage('abilities.healing', 'heal');
    log.push(config.formatMessage(healMessage || '{playerName} healed for {amount} HP', {
      playerName: target.name || 'Monster',
      amount: actualHeal,
    }));

    // Warlock detection for healing over time
    const effects: SideEffect[] = [];
    if (target.isWarlock && actualHeal > 0 && this.sourceId) {
      const detectionChance = config.gameBalance?.player?.healing?.antiDetection?.detectionChance || 0.05;
      if (secureRandomFloat() < detectionChance) {
        effects.push({
          type: 'warlock_detection',
          targetId: target.id,
          sourceId: this.sourceId,
          message: `The healing over time on ${target.name} reveals they are a Warlock!`
        });
      }
    }

    return effects;
  }

  /**
   * Called when this effect expires
   */
  private onExpired(target: Entity, log: any[]): void {
    this.isActive = false;

    // Handle special expiration effects
    if (this.type === 'stunned') {
      // Clear action submission when stun expires
      if (target.hasSubmittedAction && target.clearActionSubmission) {
        target.clearActionSubmission();
      }

      const stunExpiredMessage = `${target.name || 'Monster'} is no longer stunned and can act again.`;
      log.push({
        type: 'stun_expired',
        public: true,
        targetId: target.id,
        message: stunExpiredMessage,
        privateMessage: 'You are no longer stunned and can act again!',
        attackerMessage: stunExpiredMessage,
      });
    } else if (this.type === 'vulnerable') {
      // Reset vulnerability flags
      const targetAny = target as any;
      if (targetAny.isVulnerable !== undefined) {
        targetAny.isVulnerable = false;
        targetAny.vulnerabilityIncrease = 0;
      }
    }

    // Log expiration message
    const expirationMessage = config.getEffectMessage(
      this.type,
      'expired',
      {
        playerName: target.name || 'Monster',
        ...this.params
      }
    );

    if (expirationMessage) {
      log.push({
        type: 'status_effect_expired',
        public: true,
        targetId: target.id,
        message: expirationMessage,
        privateMessage: '',
        attackerMessage: '',
      });
    }

    logger.debug(`StatusEffect expired: ${this.type} (${this.id}) on ${target.name || target.id}`);
  }

  /**
   * Refresh this effect (extend duration or increase strength)
   */
  refresh(newParams: StatusEffectParams = {}, stackStrength: boolean = false): void {
    // Refresh duration
    if (newParams.turns || newParams.duration) {
      this.turnsRemaining = Math.max(this.turnsRemaining, newParams.turns || newParams.duration || 0);
    }

    // Handle strength stacking for effects like poison
    if (stackStrength && newParams.damage) {
      this.params.damage = (this.params.damage || 0) + newParams.damage;
      this.strength += newParams.strength || 1;
    }

    // Update other parameters
    this.params = { ...this.params, ...newParams };

    logger.debug(`StatusEffect refreshed: ${this.type} (${this.id}), turns: ${this.turnsRemaining}, strength: ${this.strength}`);
  }

  /**
   * Get the contribution of this effect to a calculation
   */
  getCalculationContribution(calculationType: string): CalculationContribution {
    const contribution: CalculationContribution = {
      additive: 0, // Flat value to add
      multiplicative: 1, // Multiplier to apply
      percentage: 0, // Percentage change (additive with other percentages)
      priority: this.priority
    };

    switch (this.type) {
      case 'vulnerable':
        if (calculationType === 'damageTaken') {
          contribution.percentage = this.params.damageIncrease || 25;
        }
        break;

      case 'weakened':
        if (calculationType === 'damageDealt') {
          contribution.percentage = -(this.params.damageReduction || 0) * 100 || -25;
        }
        break;

      case 'enraged':
        if (calculationType === 'damageDealt') {
          contribution.percentage = ((this.params.damageBoost || 1) - 1) * 100 || 50;
        } else if (calculationType === 'damageTaken') {
          contribution.percentage = -((this.params.damageResistance || 0) * 100) || -30;
        }
        break;

      case 'shielded':
        if (calculationType === 'armor') {
          contribution.additive = this.params.armor || 0;
        }
        break;
    }

    return contribution;
  }

  /**
   * Check if this effect prevents a certain action
   */
  preventsAction(actionType: string): boolean {
    if (!this.isActive) return false;

    switch (this.type) {
      case 'stunned':
        return ['ability', 'racial'].includes(actionType);
      case 'invisible':
        return actionType === 'beingTargeted';
      default:
        return false;
    }
  }

  /**
   * Get a summary of this effect for display
   */
  getSummary(): EffectSummary {
    return {
      id: this.id,
      type: this.type,
      sourceName: this.sourceName,
      turnsRemaining: this.turnsRemaining,
      isPassive: this.isPassive,
      isPermanent: this.isPermanent,
      params: { ...this.params },
      appliedAt: this.appliedAt
    };
  }

  /**
   * Create a status effect for a racial ability
   */
  static createRacialEffect(racialType: string, targetId: string, params: StatusEffectParams = {}): StatusEffect {
    const racialParams: StatusEffectParams = {
      ...params,
      isPassive: true,
      isPermanent: true,
      priority: -1000 // Process racial effects first
    };

    return new StatusEffect(racialType, racialParams, targetId, 'Racial Ability', targetId);
  }
}

export default StatusEffect;
