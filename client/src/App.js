/**
 * @fileoverview Main application component that handles routing and state management
 * Entry point for the Warlock game application
 */
import React, { useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import useSocket from './hooks/useSocket';

// Game components
import JoinGamePage from './pages/JoinGamePage';
import CharacterSelectPage from './pages/CharacterSelectPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import EndPage from './pages/EndPage';

// Constants
import { SOCKET_URL, GAME_PHASES } from './config/constants';

// Styles
import './styles/App.css';

/**
 * Main App component 
 * Wraps the application with context providers
 * 
 * @returns {React.ReactElement} The application
 */
function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AppProvider>
  );
}

/**
 * AppContent component handles routing and socket connections
 * Uses AppContext for state management
 * 
 * @returns {React.ReactElement} The application content
 */
function AppContent() {
  // Get state and actions from context
  const {
    screen, gameCode, playerName, players, eventsLog, winner, monster,
    selectedRace, selectedClass, 
    setScreen, setGameCode, setPlayerName, setIsHost, setPlayers,
    addEventLog, setMonster, setWinner, setSelectedRace, setSelectedClass,
    resetGame, setEventsLog
  } = useAppContext();
  
  // Connect to socket server
  const { socket, connected, socketId, emit, on } = useSocket(SOCKET_URL);
  
  // Initialize socket event listeners
  useEffect(() => {
    if (!connected) return;
    
    // Game creation event
    const unsubscribeGameCreated = on('gameCreated', ({ gameCode }) => {
      setGameCode(gameCode);
      setIsHost(true);
      setScreen(GAME_PHASES.CHARACTER_SELECT);
    });
    
    // Player list updates
    const unsubscribePlayerList = on('playerList', ({ players }) => {
      setPlayers(players);
    });
    
    // Game started event
    const unsubscribeGameStarted = on('gameStarted', payload => {
      const { players: newPlayers, monster: mPayload } = payload;
      setPlayers(newPlayers);
      
      // Reset event log for new game
      setEventsLog([]);
      setWinner(null);
      
      // Update monster state if provided
      if (mPayload) {
        setMonster({
          hp: mPayload.hp,
          maxHp: mPayload.maxHp,
          nextDamage: mPayload.nextDamage
        });
      }
      
      setScreen(GAME_PHASES.GAME);
    });

    const unsubscribeGameReconnected = on('gameReconnected', (payload) => {
        const { 
          players: newPlayers, 
          monster: monsterData, 
          turn, 
          level, 
          started, 
          host 
        } = payload;
        
        // Update game state
        setPlayers(newPlayers);
        
        // Update monster if provided
        if (monsterData) {
          setMonster({
            hp: monsterData.hp,
            maxHp: monsterData.maxHp,
            nextDamage: monsterData.nextDamage
          });
        }
        
        // Update other game state
        if (turn) {
          // Set any turn-related state
        }
        
        if (level) {
          // Set level-related state
        }
        
        // Important: Set the correct screen based on game state
        if (started) {
          console.log('Reconnected to active game - switching to game screen');
          setScreen(GAME_PHASES.GAME);
        } else {
          console.log('Reconnected to lobby - switching to lobby screen');
          setScreen(GAME_PHASES.LOBBY);
        }
      });
    
    // Round results event
    const unsubscribeRoundResult = on('roundResult', payload => {
      const {
        players: newPlayers,
        eventsLog: newEvents,
        monster: mPayload,
        winner: roundWinner
      } = payload;
      
      // Update players
      setPlayers(newPlayers);
      
      // Add new events to log
      addEventLog({ turn: payload.turn, events: newEvents });
      
      // Update monster if provided
      if (mPayload) {
        setMonster({
          hp: mPayload.hp,
          maxHp: mPayload.maxHp,
          nextDamage: mPayload.nextDamage
        });
      }
      
      // Check for winner
      if (roundWinner) {
        localStorage.removeItem('lastGameCode');
        setWinner(roundWinner);
        setScreen(GAME_PHASES.END);
      }
    });
    
    // Error messages
    const unsubscribeErrorMessage = on('errorMessage', ({ message }) => {
      alert(message);
    });
    
    // Return cleanup function to remove listeners
    return () => {
      unsubscribeGameCreated();
      unsubscribePlayerList();
      unsubscribeGameStarted();
      unsubscribeRoundResult();
      unsubscribeErrorMessage();
      unsubscribeGameReconnected();
    };
  }, [connected, on, setGameCode, setIsHost, setPlayers, addEventLog, setMonster, setWinner, setScreen, setEventsLog]);
  
  // Current player data (derived from players list)
  const currentPlayer = useMemo(() => {
    return players.find(p => p.id === socketId) || null;
  }, [players, socketId]);
  
  // Handler functions using useCallback
  const handleCreateGame = useCallback(name => {
    setPlayerName(name);
    emit('createGame', { playerName: name });
  }, [emit, setPlayerName]);
  
  const handleJoinGame = useCallback((code, name) => {
    setPlayerName(name);
    setGameCode(code);
    emit('joinGame', { gameCode: code, playerName: name });
    setScreen(GAME_PHASES.CHARACTER_SELECT);
  }, [emit, setPlayerName, setGameCode, setScreen]);
  
  const handleConfirm = useCallback((race, cls) => {
    setSelectedRace(race);
    setSelectedClass(cls);
    emit('selectCharacter', {
      gameCode,
      race,
      className: cls
    });
    setScreen(GAME_PHASES.LOBBY);
  }, [gameCode, emit, setSelectedRace, setSelectedClass, setScreen]);
  
  const handleStartGame = useCallback(() => {
    emit('startGame', { gameCode });
  }, [gameCode, emit]);
  
  const handleReconnect = useCallback((code, name) => {
    emit('reconnectToGame', { gameCode: code, playerName: name });
    setPlayerName(name);
    setGameCode(code);
  }, [emit, setPlayerName, setGameCode]);
    
  const handleSubmitAction = useCallback((actionType, targetId) => {
    emit('performAction', { gameCode, actionType, targetId });
  }, [gameCode, emit]);
  
  const handlePlayAgain = useCallback(() => {
    // Reset game state and return to start screen
    localStorage.removeItem('lastGameCode');
    resetGame();
  }, [resetGame]);
  
  // Render the appropriate screen based on the current state
  const renderScreen = () => {
    switch (screen) {
      case GAME_PHASES.JOIN:
        return (
          <JoinGamePage
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
            onReconnect={handleReconnect}
          />
        );
      case GAME_PHASES.CHARACTER_SELECT:
        return (
          <CharacterSelectPage
            playerName={playerName}
            gameCode={gameCode}
            selectedRace={selectedRace}
            selectedClass={selectedClass}
            onSelectRace={setSelectedRace}
            onSelectClass={setSelectedClass}
            onConfirm={handleConfirm}
          />
        );
      case GAME_PHASES.LOBBY:
        return (
          <LobbyPage
            players={players}
            gameCode={gameCode}
            isHost={currentPlayer && players[0]?.id === currentPlayer.id}
            onStartGame={handleStartGame}
          />
        );
      case GAME_PHASES.GAME:
        return (
          <GamePage
            socket={socket}
            gameCode={gameCode}
            players={players}
            me={currentPlayer}
            monster={monster}
            eventsLog={eventsLog}
            onSubmitAction={handleSubmitAction}
          />
        );
      case GAME_PHASES.END:
        return (
          <EndPage
            winner={winner}
            players={players}
            eventsLog={eventsLog} 
            onPlayAgain={handlePlayAgain}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="app-container">
      {renderScreen()}
    </div>
  );
}

export default App;

