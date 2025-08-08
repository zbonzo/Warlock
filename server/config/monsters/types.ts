/**
 * @fileoverview TypeScript types for monster configuration
 */

export interface MonsterStats {
  hpMultiplier: number;
  damageMultiplier: number;
  armorMultiplier: number;
}

export interface SpecialAttack {
  name: string;
  chance: number;
  effect: string;
  duration?: number;
  targets?: number | string;
  secondary?: string;
}

export interface PassiveAbility {
  name: string;
  effect: string;
  amount?: number;
  chance?: number;
}

export interface ThreatModifiers {
  healers?: number;
  [key: string]: number | undefined;
}

export interface PhaseTransition {
  at: number;
  newAttackPattern: string;
  message: string;
}

export interface MonsterType {
  type: string;
  name: string;
  emoji: string;
  description: string;
  stats: MonsterStats;
  attackPattern: string;
  specialAttack?: SpecialAttack;
  passiveAbility?: PassiveAbility;
  threatModifiers?: ThreatModifiers;
  phaseTransition?: PhaseTransition;
}

export interface AttackPattern {
  targetsCount: number | string;
  targetSelection: string;
  bonusDamage?: number;
  special?: string;
  damageReduction?: number;
  escalatingDamage?: boolean;
}

export type MonsterTypes = Record<number, MonsterType>;
export type AttackPatterns = Record<string, AttackPattern>;
