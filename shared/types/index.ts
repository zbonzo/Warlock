/**
 * @fileoverview Shared type definitions for client-server communication
 * Re-exports server types and defines client-specific interfaces
 * Part of Phase 2: Zod-to-TypeScript Type Generation
 */

// Import types from server
import type {
  Player,
  GameState,
  GamePhase,
  PlayerClass,
  PlayerRace,
  PlayerRole
} from '../../server/types/generated';

// Re-export all generated server types for client usage
export * from '../../server/types/generated';

// Client-specific UI state types
export interface UIState {
  isLoading: boolean;
  error: string | null;
  modal: ModalState | null;
  notifications: NotificationState[];
  theme: 'light' | 'dark';
}

export interface ModalState {
  type: 'adaptability' | 'battle-results' | 'tutorial' | 'settings' | 'abilities';
  props: Record<string, any>;
  isOpen: boolean;
}

export interface NotificationState {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
  timestamp: Date;
}

// Socket.IO event types with proper typing
export interface ClientToServerEvents {
  // Connection events
  'connection:ping': () => void;
  'connection:authenticate': (_data: { token?: string }) => void;

  // Game events
  'game:join': (_data: { gameCode: string; playerData: CreatePlayerData }) => void;
  'game:leave': (_data: { playerId: string }) => void;
  'game:ready': (_data: { playerId: string; isReady: boolean }) => void;
  'game:start': () => void;

  // Action events
  'action:submit': (_data: { action: PlayerActionData }) => void;
  'action:ability': (_data: { abilityId: string; targetId?: string }) => void;
  'action:vote': (_data: { targetId: string }) => void;

  // Chat events
  'chat:message': (_data: { message: string; channel: ChatChannel }) => void;
  'chat:typing': (_data: { isTyping: boolean }) => void;
}

export interface ServerToClientEvents {
  // Connection events
  'connection:pong': () => void;
  'connection:authenticated': (_data: { success: boolean; playerId?: string }) => void;
  'connection:error': (_data: { message: string; code?: string }) => void;

  // Game state events
  'game:stateUpdate': (_data: GameStateUpdate) => void;
  'game:phaseChange': (_data: PhaseChangeData) => void;
  'game:playerUpdate': (_data: PlayerUpdateData) => void;
  'game:ended': (_data: GameEndData) => void;

  // Action feedback
  'action:result': (_data: ActionResultData) => void;
  'action:invalid': (_data: { reason: string; suggestion?: string }) => void;

  // Event notifications
  'event:damage': (_data: DamageEventData) => void;
  'event:heal': (_data: HealEventData) => void;
  'event:death': (_data: DeathEventData) => void;
  'event:ability': (_data: AbilityEventData) => void;

  // Chat events
  'chat:message': (_data: ChatMessageData) => void;
  'chat:userTyping': (_data: { userId: string; isTyping: boolean }) => void;
}

// Data structures for socket events
export interface CreatePlayerData {
  name: string;
  class: PlayerClass;
  race: PlayerRace;
}

export interface PlayerActionData {
  actionType: string;
  targetId?: string;
  abilityId?: string;
  metadata?: Record<string, any>;
}

export interface GameStateUpdate {
  gameState: Partial<GameState>;
  changedFields: string[];
  timestamp: Date;
}

export interface PhaseChangeData {
  previousPhase: GamePhase;
  newPhase: GamePhase;
  round: number;
  turn?: number;
  message?: string;
}

export interface PlayerUpdateData {
  playerId: string;
  updates: Partial<Player>;
  changedFields: string[];
}

export interface GameEndData {
  winner: 'Good' | 'Evil' | 'warlocks' | 'innocents';
  finalState: GameState;
  statistics: GameStatistics;
}

export interface ActionResultData {
  success: boolean;
  actionType: string;
  results: any[];
  message?: string;
}

export interface DamageEventData {
  targetId: string;
  sourceId: string;
  damage: number;
  damageType: 'physical' | 'magical' | 'true';
  blocked?: number;
  critical?: boolean;
}

export interface HealEventData {
  targetId: string;
  sourceId: string;
  amount: number;
  overheal?: number;
}

export interface DeathEventData {
  playerId: string;
  killedBy?: string;
  deathMessage: string;
}

export interface AbilityEventData {
  playerId: string;
  abilityName: string;
  targetId?: string;
  success: boolean;
  effects?: string[];
}

// Chat types
export type ChatChannel = 'all' | 'team' | 'spectator' | 'system';

export interface ChatMessageData {
  id: string;
  userId: string;
  userName: string;
  message: string;
  channel: ChatChannel;
  timestamp: Date;
  metadata?: {
    playerRole?: PlayerRole;
    isDead?: boolean;
  };
}

// Game statistics
export interface GameStatistics {
  duration: number;
  rounds: number;
  playerStats: Record<string, PlayerStatistics>;
  mvp?: string;
}

export interface PlayerStatistics {
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  abilitiesUsed: number;
  playersKilled: number;
  survivalTime: number;
}

// Client-side game context
export interface GameContextState {
  gameState: GameState | null;
  localPlayer: Player | null;
  isHost: boolean;
  isSpectator: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  lastUpdate: Date | null;
}

// Form data types
export interface GameSettingsForm {
  maxPlayers: number;
  minPlayers: number;
  turnTimeLimit: number;
  allowSpectators: boolean;
  allowLateJoin: boolean;
  difficultyModifier: number;
}

export interface PlayerSettingsForm {
  displayName: string;
  preferredClass: PlayerClass;
  preferredRace: PlayerRace;
  colorScheme?: string;
}

// Utility types for client
export type ClientPlayer = Player & {
  isLocalPlayer: boolean;
  isHost: boolean;
  ping?: number;
};

export type GamePhaseInfo = {
  phase: GamePhase;
  canAct: boolean;
  timeRemaining?: number;
  waitingFor: string[];
};

// Re-export commonly used types with better names
export type {
  Player,
  GameState,
  GamePhase,
  PlayerClass,
  PlayerRace,
  PlayerRole,
  Ability,
  StatusEffect,
  Monster
} from '../../server/types/generated';
