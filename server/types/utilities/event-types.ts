/**
 * @fileoverview Event system types and interfaces
 * Provides type-safe event handling and event payload definitions
 */

/**
 * Event map for typed event emitters
 */
export type EventMap = {
  [key: string]: any;
};

/**
 * Event handler type
 */
export type EventHandler<T = any> = (payload: T) => void | Promise<void>;

/**
 * Typed event emitter interface
 */
export type TypedEventEmitter<Events extends EventMap> = {
  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;
  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void;
};

/**
 * Game event payload types
 */
export type GameEventPayload<T extends string> = 
  T extends 'damage_applied' ? DamageAppliedPayload :
  T extends 'player_healed' ? PlayerHealedPayload :
  T extends 'ability_used' ? AbilityUsedPayload :
  T extends 'player_died' ? PlayerDiedPayload :
  T extends 'phase_changed' ? PhaseChangedPayload :
  T extends 'coordination_activated' ? CoordinationActivatedPayload :
  T extends 'status_effect_applied' ? StatusEffectAppliedPayload :
  Record<string, unknown>;

/**
 * Damage applied event payload
 */
export interface DamageAppliedPayload {
  targetId: string;
  sourceId: string;
  damage: number;
  damageType: 'physical' | 'magical' | 'true';
  wasCritical: boolean;
  wasBlocked: boolean;
  finalHp: number;
  timestamp: number;
}

/**
 * Player healed event payload
 */
export interface PlayerHealedPayload {
  targetId: string;
  healerId: string;
  healing: number;
  healingType: 'direct' | 'overtime' | 'instant';
  wasOverhealing: boolean;
  finalHp: number;
  timestamp: number;
}

/**
 * Ability used event payload
 */
export interface AbilityUsedPayload {
  playerId: string;
  abilityId: string;
  targets: string[];
  wasSuccessful: boolean;
  coordinationBonus: number;
  timestamp: number;
}

/**
 * Player died event payload
 */
export interface PlayerDiedPayload {
  playerId: string;
  killedBy?: string;
  causeOfDeath: string;
  finalDamage: number;
  timestamp: number;
}

/**
 * Phase changed event payload
 */
export interface PhaseChangedPayload {
  previousPhase: string;
  newPhase: string;
  reason: string;
  timestamp: number;
}

/**
 * Coordination activated event payload
 */
export interface CoordinationActivatedPayload {
  participants: string[];
  abilityUsed: string;
  bonusMultiplier: number;
  timestamp: number;
}

/**
 * Status effect applied event payload
 */
export interface StatusEffectAppliedPayload {
  targetId: string;
  sourceId: string;
  effectId: string;
  effectName: string;
  duration: number;
  stacks?: number;
  replacedExisting?: boolean;
  timestamp: number;
}