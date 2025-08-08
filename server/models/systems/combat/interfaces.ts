/**
 * @fileoverview Combat system interfaces and types
 * Shared interfaces for the modular combat system
 */

import type {
  Monster,
  Player,
  GameRoom,
  PlayerAction
} from '../../../types/generated.js';

/**
 * Combat round result interface
 */
export interface CombatRoundResult {
  success: boolean;
  log: CombatLogEntry[];
  playerActions: Map<string, PlayerAction>;
  monsterAction?: Monster;
  roundSummary: RoundSummary;
  round?: number;
}

/**
 * Combat log entry interface
 */
export interface CombatLogEntry {
  type: string;
  message: string;
  playerId?: string;
  targetId?: string;
  damage?: number;
  healing?: number;
  timestamp: number;
  isPublic: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Round summary interface
 */
export interface RoundSummary {
  totalDamageDealt: number;
  totalDamageToMonster: number;
  totalDamageToPlayers: number;
  totalHealingApplied: number;
  totalHealing: number;
  playersEliminated: string[];
  playersKilled: string[];
  coordinatedActions: number;
  abilitiesUsed: number;
  monsterActionType?: string;
}

/**
 * Combat system dependencies
 */
export interface CombatSystemDependencies {
  gameRoom: GameRoom;
  eventBus?: any;
  config?: any;
}

/**
 * Action validation result
 */
export interface ActionValidationResult {
  isValid: boolean;
  playerId: string;
  action: PlayerAction;
  errors: string[];
  warnings: string[];
}

/**
 * Coordination info interface
 */
export interface CoordinationInfo {
  isActive: boolean;
  participantCount: number;
  participantNames: string[];
  bonusMultiplier: number;
  abilityType: string;
}

/**
 * Combat context for action processing
 */
export interface CombatContext {
  gameRoom: GameRoom;
  currentRound: number;
  activeEffects: Map<string, any>;
  log: CombatLogEntry[];
  roundSummary: RoundSummary;
}

/**
 * Damage calculation result
 */
export interface DamageResult {
  success: boolean;
  finalDamage: number;
  wasCritical: boolean;
  wasBlocked: boolean;
  modifiers: Array<{
    type: string;
    value: number;
    source: string;
  }>;
  error?: string;
}

/**
 * Healing calculation result
 */
export interface HealingResult {
  success: boolean;
  finalHealing: number;
  wasOverhealing: boolean;
  modifiers: Array<{
    type: string;
    value: number;
    source: string;
  }>;
  error?: string;
}
