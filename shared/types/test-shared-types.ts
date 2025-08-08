/**
 * Test file for shared type definitions
 * Verifies client-server type compatibility
 */

import {
  // Client-specific types
  UIState,
  ClientToServerEvents,
  ServerToClientEvents,
  GameContextState,
  ClientPlayer,
  GamePhaseInfo,
  ChatMessageData,
  GameStatistics
} from './index';

// Test 1: UI State
const uiState: UIState = {
  isLoading: false,
  error: null,
  modal: {
    type: 'abilities',
    props: { playerId: 'player-123' },
    isOpen: true
  },
  notifications: [
    {
      id: 'notif-1',
      type: 'success',
      message: 'Ability used successfully!',
      duration: 3000,
      timestamp: new Date()
    }
  ],
  theme: 'dark'
};

// Test 2: Socket event typing
const joinGameEvent: Parameters<ClientToServerEvents['game:join']>[0] = {
  gameCode: 'ABC123',
  playerData: {
    name: 'TestPlayer',
    class: 'Wizard',
    race: 'Elf'
  }
};

const submitActionEvent: Parameters<ClientToServerEvents['action:submit']>[0] = {
  action: {
    actionType: 'ability',
    targetId: 'player-456',
    abilityId: 'fireball'
  }
};

// Test 3: Server response events
const stateUpdateEvent: Parameters<ServerToClientEvents['game:stateUpdate']>[0] = {
  gameState: {
    isActive: true,
    phase: {
      current: 'day',
      round: 5,
      turn: 2,
      canSubmitActions: true,
      actionsSubmitted: {}
    }
  },
  changedFields: ['phase.current', 'phase.turn'],
  timestamp: new Date()
};

const damageEventData: Parameters<ServerToClientEvents['event:damage']>[0] = {
  targetId: 'player-456',
  sourceId: 'player-123',
  damage: 25,
  damageType: 'magical',
  blocked: 5,
  critical: true
};

// Test 4: Game context state
const gameContext: GameContextState = {
  gameState: null,
  localPlayer: null,
  isHost: false,
  isSpectator: false,
  connectionStatus: 'connecting',
  lastUpdate: null
};

// Test 5: Client player with additional fields
const clientPlayer: ClientPlayer = {
  id: 'player-123',
  name: 'TestPlayer',
  class: 'Paladin',
  race: 'Human',
  role: 'Good',
  status: 'alive',
  stats: {
    hp: 100,
    maxHp: 100,
    level: 1,
    experience: 0,
    gold: 100,
    attackPower: 30,
    defensePower: 35,
    magicPower: 15,
    luck: 20
  },
  abilities: [],
  statusEffects: [],
  actionThisRound: false,
  isReady: true,
  isLocalPlayer: true,
  isHost: false,
  ping: 45
};

// Test 6: Game phase info
const phaseInfo: GamePhaseInfo = {
  phase: 'voting',
  canAct: true,
  timeRemaining: 45,
  waitingFor: ['player-789', 'player-012']
};

// Test 7: Chat message
const chatMessage: ChatMessageData = {
  id: 'msg-123',
  userId: 'player-123',
  userName: 'TestPlayer',
  message: 'Hello team!',
  channel: 'team',
  timestamp: new Date(),
  metadata: {
    playerRole: 'Good',
    isDead: false
  }
};

// Test 8: Game statistics
const gameStats: GameStatistics = {
  duration: 1800, // 30 minutes in seconds
  rounds: 15,
  playerStats: {
    'player-123': {
      damageDealt: 450,
      damageTaken: 200,
      healingDone: 150,
      abilitiesUsed: 12,
      playersKilled: 2,
      survivalTime: 1800
    }
  },
  mvp: 'player-123'
};

// Test 9: Form data types
import { GameSettingsForm, PlayerSettingsForm } from './index';

const gameSettings: GameSettingsForm = {
  maxPlayers: 8,
  minPlayers: 4,
  turnTimeLimit: 120,
  allowSpectators: true,
  allowLateJoin: false,
  difficultyModifier: 1.5
};

const playerSettings: PlayerSettingsForm = {
  displayName: 'TestPlayer',
  preferredClass: 'Wizard',
  preferredRace: 'Elf',
  colorScheme: '#FF5733'
};

/* eslint-disable no-console */
console.log('\n✅ All shared type tests compiled successfully!');
console.log('Client-server type compatibility verified.');
/* eslint-enable no-console */

// Export for verification
export {
  uiState,
  joinGameEvent,
  submitActionEvent,
  stateUpdateEvent,
  damageEventData,
  gameContext,
  clientPlayer,
  phaseInfo,
  chatMessage,
  gameStats,
  gameSettings,
  playerSettings
};
