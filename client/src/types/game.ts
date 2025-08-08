/**
 * Shared type definitions for game objects used across React components
 */

import type { Player, Monster } from './shared';

export interface AbilityParams {
  damage?: number;
  damagePerHit?: number;
  hits?: number;
  hitChance?: number;
  amount?: number;
  armor?: number;
  duration?: number;
  counterDamage?: number;
  selfDamage?: number;
  selfDamageOnFailure?: number;
  damageReduction?: number;
  damageBoost?: number;
  damageResistance?: number;
  damageIncreasePerHpMissing?: number;
  chance?: number;
  poison?: {
    damage: number;
    turns: number;
  };
  vulnerable?: {
    damageIncrease: number;
    turns: number;
  };
  effectEnds?: {
    selfDamagePercent: number;
  };
}

export interface Ability {
  type: string;
  name: string;
  category: 'Attack' | 'Defense' | 'Heal' | 'Special' | 'Racial';
  effect?: 'poison' | 'shielded' | 'invisible' | 'stunned' | 'detect' | 'weakened' | 'vulnerable';
  target?: 'Single' | 'Multi' | 'Self';
  description?: string;
  flavorText?: string;
  params?: AbilityParams;
  usageLimit?: 'perGame' | 'perRound';
  cooldown?: number;
}

export interface StatusEffectData {
  turns?: number;
  damage?: number;
  armor?: number;
  [key: string]: any;
}

export interface StatusEffects {
  poison?: StatusEffectData;
  shielded?: StatusEffectData;
  invisible?: StatusEffectData;
  stunned?: StatusEffectData;
  weakened?: StatusEffectData;
  vulnerable?: StatusEffectData;
  [key: string]: StatusEffectData | undefined;
}

// Re-export Player from shared types to maintain compatibility
export type { Player } from './shared';

// Re-export Monster from shared types to maintain compatibility
export type { Monster } from './shared';

export interface GameState {
  round: number;
  phase: 'action' | 'results' | 'end';
  players: Player[];
  monster: Monster;
  currentPlayer?: Player;
  alivePlayers: Player[];
  deadPlayers: Player[];
  winner?: 'villagers' | 'warlocks' | 'monster';
}

export interface GameEvent {
  type: string;
  timestamp?: Date;
  playerId?: string;
  targetId?: string;
  attackerId?: string;
  damage?: number | { final: number; initial: number; reduction: number };
  healing?: number;
  amount?: number;
  armor?: number;
  turns?: number;
  abilityName?: string;
  message?: string;
  privateMessage?: string;
  attackerMessage?: string;
  public?: boolean;
  visibleTo?: string[];
  [key: string]: any;
}

export interface SocketEmitEvents {
  selectAbility: (abilityType: string, targetId?: string) => void;
  joinGame: (playerName: string, gameCode: string) => void;
  startGame: () => void;
  leaveGame: () => void;
  reconnect: (playerId: string, gameCode: string) => void;
}

export interface SocketListenEvents {
  gameUpdate: (gameState: GameState) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  gameStarted: () => void;
  gameEnded: (winner: string) => void;
  error: (message: string) => void;
  actionResult: (result: any) => void;
  phaseChange: (phase: string) => void;
}