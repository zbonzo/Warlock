/**
 * @fileoverview Global application context provider
 * Manages shared state across the application
 */
import React, { createContext, useContext, useReducer, useMemo, ReactNode } from 'react';
import { GAME_PHASES } from '../config/constants';
import { Player, Monster, PlayerRace, PlayerClass } from '../types/shared';

// Event log types
interface GameEvent {
  type: string;
  targetId?: string;
  targetName?: string;
  damage?: number;
  sourceId?: string;
  sourceName?: string;
  [key: string]: any;
}

interface EventsLogRound {
  turn: number;
  events: GameEvent[];
}

type GameScreen = typeof GAME_PHASES[keyof typeof GAME_PHASES];
type Winner = 'Good' | 'Evil' | 'warlocks' | 'innocents' | null;
type TrophyAward = {
  playerName: string;
  trophyName: string;
  trophyDescription: string;
} | null;

// State interface
interface AppState {
  screen: GameScreen;
  gameCode: string;
  playerName: string;
  isHost: boolean;
  players: Player[];
  eventsLog: EventsLogRound[];
  monster: Monster | null;
  winner: Winner;
  selectedRace: PlayerRace | null;
  selectedClass: PlayerClass | null;
  error: string | null;
  trophyAward: TrophyAward;
}

// Action types
const ACTION_TYPES = {
  SET_SCREEN: 'SET_SCREEN',
  SET_GAME_CODE: 'SET_GAME_CODE',
  SET_PLAYER_NAME: 'SET_PLAYER_NAME',
  SET_IS_HOST: 'SET_IS_HOST',
  SET_PLAYERS: 'SET_PLAYERS',
  ADD_EVENT_LOG: 'ADD_EVENT_LOG',
  SET_EVENTS_LOG: 'SET_EVENTS_LOG',
  SET_MONSTER: 'SET_MONSTER',
  SET_WINNER: 'SET_WINNER',
  SET_SELECTED_RACE: 'SET_SELECTED_RACE',
  SET_SELECTED_CLASS: 'SET_SELECTED_CLASS',
  SET_ERROR: 'SET_ERROR',
  SET_TROPHY_AWARD: 'SET_TROPHY_AWARD',
  RESET_GAME: 'RESET_GAME',
} as const;

// type ActionType = keyof typeof ACTION_TYPES; // Currently unused but available for future use

// Action interfaces
type AppAction = 
  | { type: 'SET_SCREEN'; payload: GameScreen }
  | { type: 'SET_GAME_CODE'; payload: string }
  | { type: 'SET_PLAYER_NAME'; payload: string }
  | { type: 'SET_IS_HOST'; payload: boolean }
  | { type: 'SET_PLAYERS'; payload: Player[] }
  | { type: 'ADD_EVENT_LOG'; payload: EventsLogRound }
  | { type: 'SET_EVENTS_LOG'; payload: EventsLogRound[] }
  | { type: 'SET_MONSTER'; payload: Partial<Monster> }
  | { type: 'SET_WINNER'; payload: Winner }
  | { type: 'SET_SELECTED_RACE'; payload: PlayerRace | null }
  | { type: 'SET_SELECTED_CLASS'; payload: PlayerClass | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TROPHY_AWARD'; payload: TrophyAward }
  | { type: 'RESET_GAME' };

// Actions interface
interface AppActions {
  setScreen: (screen: GameScreen) => void;
  setGameCode: (code: string) => void;
  setPlayerName: (name: string) => void;
  setIsHost: (isHost: boolean) => void;
  setPlayers: (players: Player[]) => void;
  addEventLog: (eventLog: EventsLogRound) => void;
  setEventsLog: (eventsLog: EventsLogRound[]) => void;
  setMonster: (monster: Partial<Monster>) => void;
  setWinner: (winner: Winner) => void;
  setSelectedRace: (race: PlayerRace | null) => void;
  setSelectedClass: (cls: PlayerClass | null) => void;
  setError: (error: string | null) => void;
  setTrophyAward: (trophyAward: TrophyAward) => void;
  resetGame: () => void;
}

// Context value interface
type AppContextValue = AppState & AppActions;

// Initial state
const initialState: AppState = {
  screen: GAME_PHASES.JOIN,
  gameCode: '',
  playerName: '',
  isHost: false,
  players: [],
  eventsLog: [],
  monster: { 
    id: 'monster-1',
    name: 'Monster',
    hp: 100,
    maxHp: 100,
    level: 1,
    attackPower: 10,
    defensePower: 0,
    abilities: [],
    statusEffects: [],
    isAlive: true,
    race: 'Monster'
  },
  winner: null,
  selectedRace: null,
  selectedClass: null,
  error: null,
  trophyAward: null,
};

/**
 * Reducer function to handle state updates
 */
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case ACTION_TYPES.SET_SCREEN:
      return { ...state, screen: action.payload };
    
    case ACTION_TYPES.SET_GAME_CODE:
      return { ...state, gameCode: action.payload };
    
    case ACTION_TYPES.SET_PLAYER_NAME:
      return { ...state, playerName: action.payload };
    
    case ACTION_TYPES.SET_IS_HOST:
      return { ...state, isHost: action.payload };
    
    case ACTION_TYPES.SET_PLAYERS:
      return { ...state, players: action.payload };
    
    case ACTION_TYPES.ADD_EVENT_LOG:
      return { 
        ...state, 
        eventsLog: [...state.eventsLog, action.payload]
      };
      
    case ACTION_TYPES.SET_EVENTS_LOG:
      return {
        ...state,
        eventsLog: action.payload
      };
    
    case ACTION_TYPES.SET_MONSTER:
      return { 
        ...state, 
        monster: state.monster ? { ...state.monster, ...action.payload } : action.payload as Monster
      };
    
    case ACTION_TYPES.SET_WINNER:
      return { ...state, winner: action.payload };
    
    case ACTION_TYPES.SET_SELECTED_RACE:
      return { ...state, selectedRace: action.payload };
    
    case ACTION_TYPES.SET_SELECTED_CLASS:
      return { ...state, selectedClass: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload };
    
    case ACTION_TYPES.SET_TROPHY_AWARD:
      return { ...state, trophyAward: action.payload };
    
    case ACTION_TYPES.RESET_GAME:
      return { 
        ...initialState,
        // Keep the player name for convenience
        playerName: state.playerName 
      };
    
    default:
      return state;
  }
}

// Create context
const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

/**
 * AppProvider component provides global state to all child components
 */
export function AppProvider({ children }: AppProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Create memoized action creators
  const actions = useMemo((): AppActions => ({
    setScreen: (screen: GameScreen) => dispatch({ 
      type: ACTION_TYPES.SET_SCREEN, 
      payload: screen 
    }),
    
    setGameCode: (code: string) => dispatch({ 
      type: ACTION_TYPES.SET_GAME_CODE, 
      payload: code 
    }),
    
    setPlayerName: (name: string) => dispatch({ 
      type: ACTION_TYPES.SET_PLAYER_NAME, 
      payload: name 
    }),
    
    setIsHost: (isHost: boolean) => dispatch({ 
      type: ACTION_TYPES.SET_IS_HOST, 
      payload: isHost 
    }),
    
    setPlayers: (players: Player[]) => dispatch({ 
      type: ACTION_TYPES.SET_PLAYERS, 
      payload: players 
    }),
    
    addEventLog: (eventLog: EventsLogRound) => dispatch({ 
      type: ACTION_TYPES.ADD_EVENT_LOG, 
      payload: eventLog 
    }),
    
    setEventsLog: (eventsLog: EventsLogRound[]) => dispatch({
      type: ACTION_TYPES.SET_EVENTS_LOG,
      payload: eventsLog
    }),
    
    setMonster: (monster: Partial<Monster>) => dispatch({ 
      type: ACTION_TYPES.SET_MONSTER, 
      payload: monster 
    }),
    
    setWinner: (winner: Winner) => dispatch({ 
      type: ACTION_TYPES.SET_WINNER, 
      payload: winner 
    }),
    
    setSelectedRace: (race: PlayerRace | null) => dispatch({ 
      type: ACTION_TYPES.SET_SELECTED_RACE, 
      payload: race 
    }),
    
    setSelectedClass: (cls: PlayerClass | null) => dispatch({ 
      type: ACTION_TYPES.SET_SELECTED_CLASS, 
      payload: cls 
    }),
    
    setError: (error: string | null) => dispatch({ 
      type: ACTION_TYPES.SET_ERROR, 
      payload: error 
    }),
    
    setTrophyAward: (trophyAward: TrophyAward) => dispatch({ 
      type: ACTION_TYPES.SET_TROPHY_AWARD, 
      payload: trophyAward 
    }),
    
    resetGame: () => dispatch({ type: ACTION_TYPES.RESET_GAME }),
  }), []);
  
  // Memoized context value
  const value = useMemo((): AppContextValue => ({
    ...state,
    ...actions
  }), [state, actions]);
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Custom hook for accessing the app context
 * 
 * @returns App context with state and actions
 * 
 * @example
 * // Use in a component
 * const { 
 *   screen, players, setScreen, setPlayers 
 * } = useAppContext();
 */
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
