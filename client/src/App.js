/**
 * client/src/App.js
 * Main application component with ConfigProvider integration
 */

import React, { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/common/ThemeToggle';
import { ConfigProvider, useConfig } from '@contexts/ConfigContext';
import { AppProvider, useAppContext } from './contexts/AppContext';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorBoundary from './components/common/ErrorBoundary';
import usePageLeaveWarning from './hooks/usePageLeaveWarning'; 
import useSocket from './hooks/useSocket';

// Game components
import JoinGamePage from './pages/JoinGamePage';
import CharacterSelectPage from './pages/CharacterSelectPage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import EndPage from './pages/EndPage';
import RuneButtonTest from './pages/RuneButtonTest';

// Constants
import { SOCKET_URL, GAME_PHASES } from './config/constants';

// Styles
import './styles/App.css';

/**
 * Main App component
 * Wraps the application with context providers including ConfigProvider
 *
 * @returns {React.ReactElement} The application
 */
function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider>
        <AppProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </AppProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

/**
 * AppContent component handles routing and socket connections
 * Uses ConfigContext and AppContext for state management
 *
 * @returns {React.ReactElement} The application content
 */
function AppContent() {
  // Get state and actions from context
  const {
    screen,
    gameCode,
    playerName,
    players,
    eventsLog,
    winner,
    monster,
    selectedRace,
    selectedClass,
    setScreen,
    setGameCode,
    setPlayerName,
    setIsHost,
    setPlayers,
    addEventLog,
    setMonster,
    setWinner,
    setSelectedRace,
    setSelectedClass,
    resetGame,
    setEventsLog,
  } = useAppContext();

  // Get configuration loading state from context
  const { loading: configLoading, error: configError } = useConfig();

  // Connect to socket server
  const { socket, connected, socketId, emit, on } = useSocket(SOCKET_URL);

  // Determine if we should warn on page leave
  const isInActiveGame = screen === GAME_PHASES.GAME && !winner;
  const isInLobby = screen === GAME_PHASES.LOBBY || screen === GAME_PHASES.CHARACTER_SELECT;
  
  // Show warning during active game or when in lobby/character select with other players
  const shouldWarn = isInActiveGame || (isInLobby && players.length > 1);
  
  const getWarningMessage = () => {
    if (isInActiveGame) {
      return `You're currently playing Warlock! Leaving now will abandon your teammates ` +
        `and may affect the game. Are you sure you want to leave?`;
    }
    if (isInLobby) {
      return `You're in a game lobby with ${players.length} player(s). ` +
        `Leaving now may disappoint other players who are waiting. Are you sure you want to leave?`;
    }
    return undefined;
  };

  // Use the page leave warning hook
  usePageLeaveWarning(shouldWarn, getWarningMessage());

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

    const unsubscribePlayerJoined = on(
      'playerJoined',
      ({ gameCode, playerName, message }) => {
        console.log('Successfully joined replay game:', message);
        // Set screen to character select since it's a new game
        setScreen(GAME_PHASES.CHARACTER_SELECT);
      }
    );

    // Game started event
    const unsubscribeGameStarted = on('gameStarted', (payload) => {
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
          nextDamage: mPayload.nextDamage,
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
        host,
      } = payload;

      // Update game state
      setPlayers(newPlayers);

      // Update monster if provided
      if (monsterData) {
        setMonster({
          hp: monsterData.hp,
          maxHp: monsterData.maxHp,
          nextDamage: monsterData.nextDamage,
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
    const unsubscribeRoundResult = on('roundResult', (payload) => {
      const {
        players: newPlayers,
        eventsLog: newEvents,
        monster: mPayload,
        winner: roundWinner,
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
          nextDamage: mPayload.nextDamage,
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

    const unsubscribePrivateEvent = on('privateEvent', ({ events }) => {
      if (events && events.length > 0) {
        addEventLog({ turn: 0, events });
      }
    });

    // Return cleanup function to remove listeners
    return () => {
      unsubscribeGameCreated();
      unsubscribePlayerList();
      unsubscribeGameStarted();
      unsubscribeRoundResult();
      unsubscribeErrorMessage();
      unsubscribePrivateEvent();
      unsubscribeGameReconnected();
      unsubscribePlayerJoined();
    };
  }, [
    connected,
    on,
    setGameCode,
    setIsHost,
    setPlayers,
    addEventLog,
    setMonster,
    setWinner,
    setScreen,
    setEventsLog,
  ]);

  // Current player data (derived from players list)
  const currentPlayer = React.useMemo(() => {
    return players.find((p) => p.id === socketId) || null;
  }, [players, socketId]);

  // Handler functions using useCallback
  const handleCreateGame = React.useCallback(
    (name) => {
      setPlayerName(name);
      emit('createGame', { playerName: name });
    },
    [emit, setPlayerName]
  );

  const handleJoinGame = React.useCallback(
    (code, name) => {
      setPlayerName(name);
      setGameCode(code);
      emit('joinGame', { gameCode: code, playerName: name });
      setScreen(GAME_PHASES.CHARACTER_SELECT);
    },
    [emit, setPlayerName, setGameCode, setScreen]
  );

  const handleConfirm = React.useCallback(
    (race, cls) => {
      setSelectedRace(race);
      setSelectedClass(cls);
      emit('selectCharacter', {
        gameCode,
        race,
        className: cls,
      });

      // Scroll to the top of the page
      window.scrollTo({ top: 0, behavior: 'auto' });

      setScreen(GAME_PHASES.LOBBY);
    },
    [gameCode, emit, setSelectedRace, setSelectedClass, setScreen]
  );

  const handleStartGame = React.useCallback(() => {
    // Add the scroll behavior at the beginning
    window.scrollTo({ top: 0, behavior: 'smooth' });

    emit('startGame', { gameCode });
  }, [gameCode, emit]);

  const handleReconnect = React.useCallback(
    (code, name) => {
      emit('reconnectToGame', { gameCode: code, playerName: name });
      setPlayerName(name);
      setGameCode(code);
    },
    [emit, setPlayerName, setGameCode]
  );

  const handleSubmitAction = React.useCallback(
    (actionType, targetId) => {
      emit('performAction', { gameCode, actionType, targetId });
    },
    [gameCode, emit]
  );

  const handlePlayAgain = React.useCallback(() => {
    // This can just handle any app-level state reset if needed
    resetGame();
    setGameCode(gameCode); // Keep the same game code
    setPlayerName(playerName); // Keep the same player name
  }, [resetGame, gameCode, playerName, setGameCode, setPlayerName]);

  // Play again responses are handled by the existing gameCreated and playerList handlers

  // Render the appropriate screen based on the current state
  const renderScreen = () => {
    // Check for test route in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test') === 'rune-buttons') {
      return <RuneButtonTest />;
    }

    // Show loading screen while configuration is loading
    if (configLoading) {
      return <LoadingScreen message="Loading game configuration..." />;
    }

    // Show error screen if configuration loading failed
    if (configError) {
      return (
        <div className="error-screen">
          <h2>Configuration Error</h2>
          <p>{configError}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      );
    }

    // Render the appropriate game screen
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
            currentPlayerId={currentPlayer?.id}
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
            gameCode={gameCode} // Add this
            playerName={playerName} // Add this
            socket={socket} // Add this
            onPlayAgain={handlePlayAgain} // Keep this but make it optional
          />
        );
      default:
        return null;
    }
  };

  return <div className="app-container">{renderScreen()}</div>;
}

export default App;
