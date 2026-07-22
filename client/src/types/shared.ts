/**
 * Temporary shared types file for TypeScript client development
 * This is a workaround until we can properly build the shared types
 */

// Re-export from the shared types (Player/Monster/etc. below shadow these)
export * from '../../../shared/types';

// Client-side Player type. The server sends players in a flat format with hp/maxHp at the
// top level (not nested under stats), so we declare this independently rather than extending
// the Zod-inferred type (which resolves to `any` via z.lazy and adds unwanted index signatures).
export interface Player {
  id: string;
  name: string;
  race?: string;
  class?: string;
  status?: string;
  role?: string;
  hp: number;
  maxHp: number;
  level?: number;
  isAlive: boolean;
  armor?: number;
  baseArmor?: number;
  stats?: any;
  unlocked?: any[];
  abilityCooldowns?: Record<string, number>;
  racialAbility?: any;
  racialUsesLeft?: number;
  racialCooldown?: number;
  hasSubmittedAction?: boolean;
  submissionStatus?: any;
  isWarlock?: boolean;
  statusEffects?: any;
  damageMod?: number;
}

// Client-side Monster type with nextDamage field added by server events.
export interface Monster {
  id?: string;
  name?: string;
  hp: number;
  maxHp: number;
  level?: number;
  attackPower?: number;
  defensePower?: number;
  abilities?: string[];
  statusEffects?: any[];
  isAlive?: boolean;
  race?: string;
  nextDamage?: number;
}

// Partial Monster for client state updates
export interface PartialMonster {
  hp?: number;
  maxHp?: number;
  nextDamage?: number;
  level?: number;
  attackPower?: number;
  defensePower?: number;
  id?: string;
  name?: string;
  abilities?: string[];
  statusEffects?: any[];
  isAlive?: boolean;
  metadata?: Record<string, any>;
}

export interface PlayerRace {
  id: string;
  name: string;
  description: string;
  attributes: Record<string, any>;
}

export interface PlayerClass {
  id: string;
  name: string;
  description: string;
  abilities: string[];
  attributes: Record<string, any>;
}

export interface Ability {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  cooldown?: number;
  usageLimit?: string;
  target?: string;
  damage?: number;
  heal?: number;
  armor?: number;
  effect?: string;
  params?: Record<string, any>;
  unlockAt?: number;
}

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  duration: number;
  stackable?: boolean;
  effect: Record<string, any>;
}

// Socket event types
export interface ClientToServerEvents {
  createGame: (data: { playerName: string }) => void;
  joinGame: (data: { gameCode: string; playerName: string }) => void;
  selectCharacter: (data: { gameCode: string; race: string; className: string }) => void;
  startGame: (data: { gameCode: string }) => void;
  performAction: (data: any) => void;
  useRacialAbility: (data: any) => void;
  checkName: (data: { gameCode: string; playerName: string }) => void;
  playAgain: (data: { gameCode: string; playerName: string }) => void;
  playerReady: (data: { gameCode: string }) => void;
  disconnect: () => void;
}

export interface ServerToClientEvents {
  gameCreated: (data: { gameCode: string }) => void;
  gameJoined: (data: any) => void;
  playerList: (data: { players: Player[] }) => void;
  gameStarted: (data: any) => void;
  roundResult: (data: any) => void;
  gameEnded: (data: any) => void;
  errorMessage: (data: { message: string }) => void;
  nameCheckResult: (data: { available: boolean; suggestions?: string[] }) => void;
  nameCheckResponse: (data: { available: boolean; suggestions?: string[] }) => void;
  privateEvent: (data: any) => void;
  adaptabilityChoose: (data: any) => void;
  battleResults: (data: any) => void;
}
