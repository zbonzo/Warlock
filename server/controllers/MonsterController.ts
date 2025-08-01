/**
 * @fileoverview TypeScript MonsterController with threat system implementation
 * Phase 5: Controllers & Main Classes Migration
 * Enhanced MonsterController with threat-based targeting system and full type safety
 */

import config from '../config/index.js';
// Messages are now accessed through the config system
import logger from '../utils/logger.js';
import { Player } from '../models/Player.js';
import { BaseController } from './PlayerController.js';
import type { 
  Monster, 
  ActionResult,
  Schemas
} from '../types/generated.js';

export interface ThreatTableEntry {
  playerId: string;
  threatValue: number;
  lastUpdated: number;
}

export interface MonsterAction {
  type: 'attack' | 'special' | 'heal' | 'enrage';
  damage?: number;
  targets: string[];
  effects?: any[];
  message: string;
}

export interface MonsterControllerDependencies {
  monster: Monster;
  players: Map<string, Player>;
  statusEffectManager: any;
  racialAbilitySystem: any;
  gameStateUtils: any;
}

export interface MonsterStats {
  hp: number;
  maxHp: number;
  baseDamage: number;
  age: number;
  level: number;
  threatTableSize: number;
  isAlive: boolean;
}

export interface ThreatConfig {
  damageMultiplier: number;
  healingMultiplier: number;
  abilityThreatBase: number;
  decayRate: number;
  maxHistory: number;
  baseRandomness: number;
}

/**
 * Enhanced MonsterController with threat-based targeting system
 * Manages monster state, behavior, and threat-based target selection
 */
export class MonsterController extends BaseController<Monster, any, Partial<Monster>> {
  protected model: Monster;
  
  private readonly players: Map<string, Player>;
  private readonly statusEffectManager: any;
  private readonly racialAbilitySystem: any;
  private readonly gameStateUtils: any;
  
  // Threat system properties
  private readonly threatTable: Map<string, ThreatTableEntry> = new Map();
  private readonly lastTargets: string[] = [];
  private readonly threatConfig: ThreatConfig;

  constructor(dependencies: MonsterControllerDependencies) {
    super();
    
    const {
      monster,
      players,
      statusEffectManager,
      racialAbilitySystem,
      gameStateUtils
    } = dependencies;

    this.model = monster;
    this.players = players;
    this.statusEffectManager = statusEffectManager;
    this.racialAbilitySystem = racialAbilitySystem;
    this.gameStateUtils = gameStateUtils;

    // Initialize monster state if not set
    this.initializeMonsterStats();

    // Initialize threat system configuration
    this.threatConfig = {
      damageMultiplier: config.gameBalance?.monster?.threat?.damageMultiplier || 1.0,
      healingMultiplier: config.gameBalance?.monster?.threat?.healingMultiplier || 0.5,
      abilityThreatBase: config.gameBalance?.monster?.threat?.abilityThreatBase || 10,
      decayRate: config.gameBalance?.monster?.threat?.decayRate || 0.95,
      maxHistory: config.gameBalance?.monster?.threat?.maxHistory || 3,
      baseRandomness: config.gameBalance?.monster?.threat?.baseRandomness || 0.2
    };

    logger.debug('MonsterController initialized with threat system:', {
      monsterId: this.monster.id,
      initialHp: this.monster.hp,
      threatConfig: this.threatConfig
    });
  }

  /**
   * Initialize monster statistics from config
   */
  private initializeMonsterStats(): void {
    if (!this.monster.hp) {
      this.monster.hp = config.gameBalance?.monster?.baseHp || 100;
    }
    
    if (!this.monster.maxHp) {
      this.monster.maxHp = config.gameBalance?.monster?.baseHp || 100;
    }
    
    if (!this.monster.attackPower) {
      this.monster.attackPower = config.gameBalance?.monster?.baseDamage || 20;
    }
    
    if (!this.monster.level) {
      this.monster.level = 1;
    }

    // Ensure monster is alive initially
    this.monster.isAlive = this.monster.hp > 0;
  }

  /**
   * Process monster action for the current round
   */
  async processMonsterAction(alivePlayers: Player[], log: any[]): Promise<MonsterAction | null> {
    if (!this.monster.isAlive || alivePlayers.length === 0) {
      return null;
    }

    try {
      // Update threat table with current player states
      this.updateThreatTable(alivePlayers);
      
      // Determine monster action type
      const actionType = this.determineActionType();
      
      // Execute the action
      let action: MonsterAction;
      
      switch (actionType) {
        case 'attack':
          action = await this.executeAttack(alivePlayers, log);
          break;
        case 'special':
          action = await this.executeSpecialAbility(alivePlayers, log);
          break;
        case 'heal':
          action = await this.executeHealingAction(log);
          break;
        case 'enrage':
          action = await this.executeEnrageAction(alivePlayers, log);
          break;
        default:
          action = await this.executeAttack(alivePlayers, log);
      }

      // Update last targets history
      this.updateTargetHistory(action.targets);
      
      logger.debug('Monster action processed:', {
        monsterId: this.monster.id,
        actionType: action.type,
        targets: action.targets,
        damage: action.damage
      });

      return action;

    } catch (error) {
      logger.error('Error processing monster action:', error);
      return null;
    }
  }

  /**
   * Add threat for a player based on their actions
   */
  addThreat(playerId: string, threatAmount: number, reason: string = 'action'): void {
    const currentThreat = this.threatTable.get(playerId) || {
      playerId,
      threatValue: 0,
      lastUpdated: Date.now()
    };

    currentThreat.threatValue += threatAmount;
    currentThreat.lastUpdated = Date.now();
    
    this.threatTable.set(playerId, currentThreat);

    logger.debug('Threat added:', {
      playerId,
      threatAmount,
      newTotal: currentThreat.threatValue,
      reason
    });
  }

  /**
   * Add threat based on damage dealt to monster
   */
  addDamageThreat(playerId: string, damage: number): void {
    const threatAmount = damage * this.threatConfig.damageMultiplier;
    this.addThreat(playerId, threatAmount, 'damage');
  }

  /**
   * Add threat based on healing done
   */
  addHealingThreat(playerId: string, healing: number): void {
    const threatAmount = healing * this.threatConfig.healingMultiplier;
    this.addThreat(playerId, threatAmount, 'healing');
  }

  /**
   * Add threat based on ability use
   */
  addAbilityThreat(playerId: string, abilityType: string): void {
    const threatAmount = this.threatConfig.abilityThreatBase;
    this.addThreat(playerId, threatAmount, `ability:${abilityType}`);
  }

  /**
   * Apply damage to the monster
   */
  takeDamage(damage: number, sourcePlayerId?: string): number {
    const finalDamage = Math.max(1, Math.floor(damage));
    const oldHp = this.monster.hp;
    
    this.monster.hp = Math.max(0, this.monster.hp - finalDamage);
    
    if (this.monster.hp <= 0) {
      this.monster.isAlive = false;
    }

    // Add threat for damage dealer
    if (sourcePlayerId) {
      this.addDamageThreat(sourcePlayerId, finalDamage);
    }

    logger.debug('Monster took damage:', {
      damage: finalDamage,
      oldHp,
      newHp: this.monster.hp,
      sourcePlayerId,
      isAlive: this.monster.isAlive
    });

    return finalDamage;
  }

  /**
   * Heal the monster
   */
  heal(amount: number): number {
    const oldHp = this.monster.hp;
    this.monster.hp = Math.min(this.monster.maxHp, this.monster.hp + amount);
    const actualHealing = this.monster.hp - oldHp;

    logger.debug('Monster healed:', {
      healAmount: amount,
      actualHealing,
      oldHp,
      newHp: this.monster.hp
    });

    return actualHealing;
  }

  /**
   * Update threat table based on current player states
   */
  private updateThreatTable(alivePlayers: Player[]): void {
    // Apply threat decay
    for (const entry of this.threatTable.values()) {
      entry.threatValue *= this.threatConfig.decayRate;
    }

    // Remove players who are no longer alive or in game
    const alivePlayerIds = new Set(alivePlayers.map(p => p.id));
    for (const playerId of this.threatTable.keys()) {
      if (!alivePlayerIds.has(playerId)) {
        this.threatTable.delete(playerId);
      }
    }

    // Ensure all alive players have threat entries
    for (const player of alivePlayers) {
      if (!this.threatTable.has(player.id)) {
        this.threatTable.set(player.id, {
          playerId: player.id,
          threatValue: 1, // Minimum threat for alive players
          lastUpdated: Date.now()
        });
      }
    }
  }

  /**
   * Determine what type of action the monster should take
   */
  private determineActionType(): 'attack' | 'special' | 'heal' | 'enrage' {
    const healthPercent = this.monster.hp / this.monster.maxHp;
    const random = Math.random();

    // Low health - more likely to heal or enrage
    if (healthPercent < 0.3) {
      if (random < 0.3) return 'heal';
      if (random < 0.5) return 'enrage';
    }

    // Medium health - occasionally use special abilities
    if (healthPercent < 0.7 && random < 0.2) {
      return 'special';
    }

    // Default to attack
    return 'attack';
  }

  /**
   * Execute a basic attack action
   */
  private async executeAttack(alivePlayers: Player[], log: any[]): Promise<MonsterAction> {
    const target = this.selectTargetByThreat(alivePlayers);
    if (!target) {
      return {
        type: 'attack',
        targets: [],
        message: 'Monster looks around but finds no targets.'
      };
    }

    const baseDamage = this.monster.attackPower || 20;
    const damage = this.calculateDamage(baseDamage, target);
    const finalDamage = target.takeDamage(damage, 'monster');

    // Add combat log entry
    log.push({
      type: 'monster_attack',
      message: config.formatMessage(
        'monsterAttacksPlayer',
        { 
          playerName: target.name, 
          damage: finalDamage,
          monsterName: this.monster.name || 'Monster'
        }
      ),
      targetId: target.id,
      damage: finalDamage,
      public: true
    });

    return {
      type: 'attack',
      damage: finalDamage,
      targets: [target.id],
      message: `Monster attacks ${target.name} for ${finalDamage} damage!`
    };
  }

  /**
   * Execute a special ability
   */
  private async executeSpecialAbility(alivePlayers: Player[], log: any[]): Promise<MonsterAction> {
    // Example special ability: Area attack
    const targets = this.selectMultipleTargets(alivePlayers, 2);
    const baseDamage = Math.floor((this.monster.attackPower || 20) * 0.75);
    let totalDamage = 0;

    for (const target of targets) {
      const damage = this.calculateDamage(baseDamage, target);
      const finalDamage = target.takeDamage(damage, 'monster');
      totalDamage += finalDamage;
    }

    log.push({
      type: 'monster_special',
      message: config.formatMessage(
        'monsterUsesSpecialAbility',
        {
          targets: targets.map(t => t.name).join(', '),
          damage: Math.floor(totalDamage / targets.length)
        }
      ),
      targets: targets.map(t => t.id),
      damage: totalDamage,
      public: true
    });

    return {
      type: 'special',
      damage: totalDamage,
      targets: targets.map(t => t.id),
      message: `Monster uses Cleave against ${targets.length} players!`
    };
  }

  /**
   * Execute a healing action
   */
  private async executeHealingAction(log: any[]): Promise<MonsterAction> {
    const healAmount = Math.floor(this.monster.maxHp * 0.15);
    const actualHealing = this.heal(healAmount);

    log.push({
      type: 'monster_heal',
      message: config.formatMessage(
        'monsterHeals',
        { 
          healAmount: actualHealing,
          monsterName: this.monster.name || 'Monster'
        }
      ),
      healing: actualHealing,
      public: true
    });

    return {
      type: 'heal',
      targets: [],
      message: `Monster heals for ${actualHealing} HP!`
    };
  }

  /**
   * Execute an enrage action
   */
  private async executeEnrageAction(alivePlayers: Player[], log: any[]): Promise<MonsterAction> {
    // Temporary damage boost
    const damageBoost = Math.floor(this.monster.attackPower * 0.5);
    this.monster.attackPower += damageBoost;

    // Attack highest threat target
    const target = this.selectTargetByThreat(alivePlayers);
    if (!target) {
      return {
        type: 'enrage',
        targets: [],
        message: 'Monster enrages but finds no targets!'
      };
    }

    const damage = this.calculateDamage(this.monster.attackPower, target);
    const finalDamage = target.takeDamage(damage, 'monster');

    // Remove damage boost after attack
    this.monster.attackPower -= damageBoost;

    log.push({
      type: 'monster_enrage',
      message: config.formatMessage(
        'monsterEnrages',
        {
          playerName: target.name,
          damage: finalDamage
        }
      ),
      targetId: target.id,
      damage: finalDamage,
      public: true
    });

    return {
      type: 'enrage',
      damage: finalDamage,
      targets: [target.id],
      message: `Monster enrages and strikes ${target.name} for ${finalDamage} damage!`
    };
  }

  /**
   * Select target based on threat values
   */
  private selectTargetByThreat(alivePlayers: Player[]): Player | null {
    if (alivePlayers.length === 0) return null;

    const threatEntries = Array.from(this.threatTable.values())
      .filter(entry => alivePlayers.some(p => p.id === entry.playerId));

    if (threatEntries.length === 0) {
      // Fallback to random selection
      return alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    }

    // Calculate selection weights based on threat
    const weights = threatEntries.map(entry => {
      const baseThreat = Math.max(1, entry.threatValue);
      const randomness = this.threatConfig.baseRandomness;
      return baseThreat * (1 + (Math.random() - 0.5) * randomness);
    });

    // Select based on weighted random
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < threatEntries.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        const selectedPlayerId = threatEntries[i].playerId;
        return alivePlayers.find(p => p.id === selectedPlayerId) || null;
      }
    }

    // Fallback
    return alivePlayers[0];
  }

  /**
   * Select multiple targets for area abilities
   */
  private selectMultipleTargets(alivePlayers: Player[], count: number): Player[] {
    const targets: Player[] = [];
    const available = [...alivePlayers];

    for (let i = 0; i < Math.min(count, available.length); i++) {
      const target = this.selectTargetByThreat(available);
      if (target) {
        targets.push(target);
        const index = available.findIndex(p => p.id === target.id);
        if (index >= 0) {
          available.splice(index, 1);
        }
      }
    }

    return targets;
  }

  /**
   * Calculate final damage to a target
   */
  private calculateDamage(baseDamage: number, target: Player): number {
    // Apply target's damage reduction
    return target.calculateDamageWithVulnerability(baseDamage);
  }

  /**
   * Update target history for threat calculations
   */
  private updateTargetHistory(targets: string[]): void {
    this.lastTargets.push(...targets);
    
    // Keep only recent history
    if (this.lastTargets.length > this.threatConfig.maxHistory) {
      this.lastTargets.splice(0, this.lastTargets.length - this.threatConfig.maxHistory);
    }
  }

  /**
   * Get current monster statistics
   */
  getMonsterStats(): MonsterStats {
    return {
      hp: this.monster.hp,
      maxHp: this.monster.maxHp,
      baseDamage: this.monster.attackPower,
      age: 0, // Legacy property
      level: this.monster.level,
      threatTableSize: this.threatTable.size,
      isAlive: this.monster.isAlive
    };
  }

  /**
   * Get threat table for debugging/admin
   */
  getThreatTable(): ThreatTableEntry[] {
    return Array.from(this.threatTable.values())
      .sort((a, b) => b.threatValue - a.threatValue);
  }

  /**
   * Type-safe serialization
   */
  toJSON(): Monster {
    return {
      ...this.monster,
      metadata: {
        threatTable: Object.fromEntries(this.threatTable),
        lastTargets: this.lastTargets
      }
    };
  }

  // Required abstract method implementations
  async create(input: any): Promise<Monster> {
    throw new Error('Use constructor to create MonsterController');
  }

  async update(id: string, input: Partial<Monster>): Promise<Monster> {
    Object.assign(this.monster, input);
    return this.monster;
  }

  async findById(id: string): Promise<Monster | null> {
    return this.monster.id === id ? this.monster : null;
  }

  async delete(id: string): Promise<boolean> {
    // Monsters are typically not deleted, just set to not alive
    this.monster.isAlive = false;
    return true;
  }

  // Getter for the monster property to maintain compatibility
  get monster(): Monster {
    return this.model;
  }

  set monster(value: Monster) {
    this.model = value;
  }
}

export default MonsterController;