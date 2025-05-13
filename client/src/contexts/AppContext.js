/**
 * @fileoverview Global application context provider
 * Manages shared state across the application
 */
import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { GAME_PHASES } from '../config/constants';

// Initial state
const initialState = {
  screen: GAME_PHASES.JOIN,
  gameCode: '',
  playerName: '',
  isHost: false,
  players: [],
  eventsLog: [],
  monster: { hp: 100, maxHp: 100, nextDamage: 10 },
  winner: null,
  selectedRace: null,
  selectedClass: null,
  error: null,
};

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
  RESET_GAME: 'RESET_GAME',
};

/**
 * Reducer function to handle state updates
 * 
 * @param {Object} state - Current state
 * @param {Object} action - Dispatched action
 * @returns {Object} New state
 */
function appReducer(state, action) {
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
      return { ...state, monster: action.payload };
    
    case ACTION_TYPES.SET_WINNER:
      return { ...state, winner: action.payload };
    
    case ACTION_TYPES.SET_SELECTED_RACE:
      return { ...state, selectedRace: action.payload };
    
    case ACTION_TYPES.SET_SELECTED_CLASS:
      return { ...state, selectedClass: action.payload };
    
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload };
    
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
const AppContext = createContext();

/**
 * AppProvider component provides global state to all child components
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} The context provider wrapper
 */
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Create memoized action creators
  const actions = useMemo(() => ({
    setScreen: (screen) => dispatch({ 
      type: ACTION_TYPES.SET_SCREEN, 
      payload: screen 
    }),
    
    setGameCode: (code) => dispatch({ 
      type: ACTION_TYPES.SET_GAME_CODE, 
      payload: code 
    }),
    
    setPlayerName: (name) => dispatch({ 
      type: ACTION_TYPES.SET_PLAYER_NAME, 
      payload: name 
    }),
    
    setIsHost: (isHost) => dispatch({ 
      type: ACTION_TYPES.SET_IS_HOST, 
      payload: isHost 
    }),
    
    setPlayers: (players) => dispatch({ 
      type: ACTION_TYPES.SET_PLAYERS, 
      payload: players 
    }),
    
    addEventLog: (eventLog) => dispatch({ 
      type: ACTION_TYPES.ADD_EVENT_LOG, 
      payload: eventLog 
    }),
    
    setEventsLog: (eventsLog) => dispatch({
      type: ACTION_TYPES.SET_EVENTS_LOG,
      payload: eventsLog
    }),
    
    setMonster: (monster) => dispatch({ 
      type: ACTION_TYPES.SET_MONSTER, 
      payload: monster 
    }),
    
    setWinner: (winner) => dispatch({ 
      type: ACTION_TYPES.SET_WINNER, 
      payload: winner 
    }),
    
    setSelectedRace: (race) => dispatch({ 
      type: ACTION_TYPES.SET_SELECTED_RACE, 
      payload: race 
    }),
    
    setSelectedClass: (cls) => dispatch({ 
      type: ACTION_TYPES.SET_SELECTED_CLASS, 
      payload: cls 
    }),
    
    setError: (error) => dispatch({ 
      type: ACTION_TYPES.SET_ERROR, 
      payload: error 
    }),
    
    resetGame: () => dispatch({ type: ACTION_TYPES.RESET_GAME }),
  }), []);
  
  // Memoized context value
  const value = useMemo(() => ({
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
 * @returns {Object} App context with state and actions
 * 
 * @example
 * // Use in a component
 * const { 
 *   screen, players, setScreen, setPlayers 
 * } = useAppContext();
 */
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export default AppContext;