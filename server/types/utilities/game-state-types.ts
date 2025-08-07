/**
 * @fileoverview Game state types and discriminated unions
 * Complex game state types with discriminated unions for type safety
 */

import type { 
  GamePhase, 
  PlayerAction, 
  GameRoom,
  Player
} from '../generated.js';

import type { ValidationResult } from './validation-types.js';

/**
 * Game room settings type
 */
export interface GameRoomSettings {
  gameCode: string;
  isActive: boolean;
  isPrivate?: boolean;
  maxPlayers?: number;
  timeLimit?: number;
}

/**
 * Enhanced player state with discriminated union
 */
export type PlayerState = 
  | { status: 'alive'; hp: number; maxHp: number; lastDamageTime?: number; lastHealTime?: number }
  | { status: 'dead'; deathTime: number; killedBy?: string; causeOfDeath: string; canBeRevived: boolean }
  | { status: 'revived'; revivedTime: number; revivedBy: string; revivedAt: number; reviveCount: number }
  | { status: 'spectating'; leftGameTime: number; reason: 'quit' | 'kicked' | 'connection_lost' };

/**
 * Enhanced game phase with discriminated union
 */
export type GamePhaseState =
  | { phase: 'lobby'; players: string[]; readyCount: number; settings: GameRoomSettings; hostId: string }
  | { phase: 'setup'; assignments: Record<string, string>; timeRemaining: number; setupComplete: boolean; warlocksAssigned: boolean }
  | { phase: 'action'; round: number; turn: number; activePlayer?: string; timeRemaining: number; actionsSubmitted: number; totalPlayers: number }
  | { phase: 'results'; winner: 'good' | 'evil' | 'draw'; summary: string; playerStats: Record<string, any>; gameEndTime: number }
  | { phase: 'ended'; finalState: any; timestamp: number; duration: number; cleanupComplete: boolean };

/**
 * Log entry interface
 */
export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'action' | 'damage' | 'heal' | 'status' | 'phase' | 'system';
  source: string;
  target?: string;
  message: string;
  details?: Record<string, any>;
  isPublic: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Damage modifier interface
 */
export interface DamageModifier {
  type: 'armor' | 'resistance' | 'vulnerability' | 'critical' | 'coordination';
  value: number;
  source: string;
  description: string;
}

/**
 * Healing modifier interface
 */
export interface HealingModifier {
  type: 'bonus' | 'penalty' | 'amplification' | 'reduction';
  value: number;
  source: string;
  description: string;
  affectsOvertime?: boolean;
}

/**
 * Ability execution result with enhanced typing
 */
export type AbilityResult<T = any> =
  | { success: true; data: T; logs: LogEntry[]; metadata: { executionTime: number; coordinated: boolean; targetCount: number } }
  | { success: false; error: string; code: string; logs?: LogEntry[]; metadata?: { attemptedAt: number; failureReason: string } };

/**
 * Enhanced player action states
 */
export type PlayerActionState =
  | { state: 'waiting'; timeRemaining: number; hasSubmitted: false }
  | { state: 'submitted'; submittedAt: number; action: PlayerAction; hasSubmitted: true; canModify: boolean }
  | { state: 'validated'; action: PlayerAction; validationResult: ValidationResult<any>; hasSubmitted: true }
  | { state: 'executed'; action: PlayerAction; result: AbilityResult; executedAt: number; hasSubmitted: true }
  | { state: 'skipped'; reason: 'timeout' | 'stunned' | 'dead' | 'disconnected'; skipTime: number; hasSubmitted: false };

/**
 * Monster state discriminated union
 */
export type MonsterState =
  | { state: 'spawning'; level: number; spawnTime: number; abilities: string[] }
  | { state: 'active'; level: number; hp: number; maxHp: number; age: number; lastAction?: number; isControlled: boolean; controllerId?: string }
  | { state: 'defeated'; defeatedTime: number; killedBy: string[]; finalDamage: number; age: number }
  | { state: 'evolved'; previousLevel: number; newLevel: number; evolutionTime: number; newAbilities: string[] };

/**
 * Game room states with detailed metadata
 */
export type GameRoomState =
  | { 
      state: 'created'; 
      createdAt: number; 
      hostId: string; 
      gameCode: string; 
      settings: GameRoomSettings; 
      isPrivate: boolean 
    }
  | { 
      state: 'waiting_for_players'; 
      playerCount: number; 
      minPlayers: number; 
      maxPlayers: number; 
      readyPlayers: string[]; 
      canStart: boolean 
    }
  | { 
      state: 'starting'; 
      countdown: number; 
      playersReady: number; 
      totalPlayers: number; 
      startTime?: number 
    }
  | { 
      state: 'in_progress'; 
      currentPhase: GamePhaseState; 
      round: number; 
      turn: number; 
      startedAt: number; 
      estimatedEndTime?: number 
    }
  | { 
      state: 'paused'; 
      pausedAt: number; 
      pauseReason: string; 
      pausedBy: string; 
      canResume: boolean 
    }
  | { 
      state: 'finished'; 
      winner: 'good' | 'evil' | 'draw'; 
      endedAt: number; 
      duration: number; 
      finalStats: Record<string, any> 
    }
  | { 
      state: 'terminated'; 
      terminatedAt: number; 
      reason: 'host_left' | 'all_players_left' | 'error' | 'admin_action'; 
      lastPhase?: GamePhaseState 
    };

/**
 * Ability cooldown states
 */
export type AbilityCooldownState =
  | { state: 'ready'; canUse: true; remainingCooldown: 0 }
  | { state: 'cooling_down'; canUse: false; remainingCooldown: number; totalCooldown: number; usedAt: number }
  | { state: 'locked'; canUse: false; lockReason: 'not_unlocked' | 'insufficient_level' | 'stunned' | 'disabled'; unlockCondition?: string };

/**
 * Status effect states with enhanced metadata
 */
export type StatusEffectState =
  | { 
      state: 'active'; 
      type: string; 
      remainingDuration: number; 
      totalDuration: number; 
      appliedAt: number; 
      sourceId: string; 
      params: Record<string, any>;
      stacks?: number;
      canStack: boolean;
    }
  | { 
      state: 'expired'; 
      type: string; 
      expiredAt: number; 
      totalDuration: number; 
      sourceId: string; 
      expiredNaturally: boolean;
    }
  | { 
      state: 'dispelled'; 
      type: string; 
      dispelledAt: number; 
      dispelledBy: string; 
      remainingDuration: number; 
      sourceId: string;
    }
  | { 
      state: 'replaced'; 
      type: string; 
      replacedAt: number; 
      replacedBy: string; 
      newEffectId: string; 
      sourceId: string;
    };

/**
 * Player role assignments with enhanced data
 */
export type PlayerRoleState =
  | { role: 'good'; team: 'town'; assignedAt: number; specialRole?: string; hasWon: boolean }
  | { role: 'evil'; team: 'mafia'; assignedAt: number; specialRole?: string; hasWon: boolean; corrupted?: boolean; corruptedAt?: number }
  | { role: 'warlock'; team: 'warlock'; assignedAt: number; isInitialWarlock: boolean; hasWon: boolean; corruptionCount: number; detectionCount: number }
  | { role: 'neutral'; team: 'neutral'; assignedAt: number; specialRole: string; hasWon: boolean; winCondition: string };

/**
 * Combat interaction results
 */
export type CombatResult =
  | { 
      type: 'damage_dealt'; 
      attacker: string; 
      target: string; 
      damage: number; 
      damageType: 'physical' | 'magical' | 'true'; 
      wasCritical: boolean; 
      wasBlocked: boolean;
      modifiers: DamageModifier[];
    }
  | { 
      type: 'healing_applied'; 
      healer: string; 
      target: string; 
      healing: number; 
      healingType: 'direct' | 'overtime' | 'instant'; 
      wasOverhealing: boolean;
      modifiers: HealingModifier[];
    }
  | { 
      type: 'status_applied'; 
      source: string; 
      target: string; 
      statusEffect: string; 
      duration: number; 
      wasResisted: boolean; 
      replacedExisting?: boolean;
    }
  | { 
      type: 'ability_triggered'; 
      source: string; 
      abilityId: string; 
      targets: string[]; 
      wasSuccessful: boolean; 
      coordinationBonus: number;
    };

/**
 * Player connection states
 */
export type PlayerConnectionState =
  | { status: 'connected'; connectedAt: number; socketId: string; lastActivity: number; latency?: number }
  | { status: 'disconnected'; disconnectedAt: number; lastSocketId?: string; reason: 'network' | 'client_close' | 'timeout' | 'kicked' }
  | { status: 'reconnecting'; disconnectedAt: number; reconnectAttempts: number; maxAttempts: number; timeoutAt: number };

/**
 * Turn timer states
 */
export type TurnTimerState =
  | { state: 'waiting'; timeRemaining: number; totalTime: number; startedAt: number; canPause: boolean }
  | { state: 'paused'; pausedAt: number; pauseReason: string; timeWhenPaused: number; canResume: boolean }
  | { state: 'expired'; expiredAt: number; totalTime: number; gracePeriod: number; forceEnd: boolean };

/**
 * Coordination system states
 */
export type CoordinationState =
  | { state: 'inactive'; lastCoordination?: number; eligiblePlayers: string[]; minPlayersRequired: number }
  | { state: 'forming'; participants: string[]; timeRemaining: number; requiredParticipants: number; bonusMultiplier: number }
  | { state: 'active'; participants: string[]; activatedAt: number; bonusMultiplier: number; duration: number; abilityUsed: string };

/**
 * Game state transition type
 */
export type GameStateTransition<
  TCurrentState extends GamePhaseState,
  TAction extends string
> = TCurrentState extends { phase: 'lobby' } ?
  TAction extends 'start_game' ? GamePhaseState & { phase: 'setup' } : TCurrentState :
  TCurrentState extends { phase: 'setup' } ?
  TAction extends 'complete_setup' ? GamePhaseState & { phase: 'action' } : TCurrentState :
  TCurrentState extends { phase: 'action' } ?
  TAction extends 'submit_actions' ? GamePhaseState & { phase: 'results' } : TCurrentState :
  TCurrentState extends { phase: 'results' } ?
  TAction extends 'continue_game' ? GamePhaseState & { phase: 'action' } :
  TAction extends 'end_game' ? GamePhaseState & { phase: 'ended' } : TCurrentState :
  TCurrentState;