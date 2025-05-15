import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSocket from './hooks/useSocket';

import { ThemeProvider } from './contexts/ThemeContext';
import './styles.css';

import JoinGamePage from './components/JoinGamePage';
import CharacterSelectPage from './components/CharacterSelectPage';
import LobbyPage from './components/LobbyPage';
import GamePage from './components/GamePage/GamePage';
import EndScreen from './components/EndScreen';

// Determine the WebSocket URL
let determinedSocketUrl;

if (process.env.NODE_ENV === 'production') {
  // For production build (inside Docker, served by Nginx)
  // Connect to the same host and port as the web page, using ws:// or wss://
  // Nginx will proxy requests to /socket.io/ (or whatever path your WebSocket server uses)
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  determinedSocketUrl = `${wsProtocol}//${window.location.host}/socket.io/`;
} else if (process.env.REACT_APP_SOCKET_URL) {
  // Allow overriding via .env for development (e.g., REACT_APP_SOCKET_URL=ws://localhost:3001/socket.io/)
  determinedSocketUrl = process.env.REACT_APP_SOCKET_URL;
} else {
  // Fallback for development if no env variable is set (ensure ws:// or wss://)
  determinedSocketUrl = 'http://zacomen:3001/'; // Assuming Socket.IO and default path
}
const SOCKET_URL = determinedSocketUrl;


function App() {
  const [screen, setScreen] = useState('join');
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [myId, setMyId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [eventsLog, setEventsLog] = useState([]);
  const [winner, setWinner] = useState(null);
  const [monster, setMonster] = useState({ hp: 100, maxHp: 100, nextDamage: 10 });

  // Character selection state
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  // Use our custom socket hook
  const { socket, connected, socketId, emit, on } = useSocket(SOCKET_URL);


  
  // Set myId when socket connects
  useEffect(() => {
    if (socketId) {
      setMyId(socketId);
    }
  }, [socketId]);

  // Set up socket event listeners
  useEffect(() => {
    if (!connected) return;

    // Set up event listeners using our custom hook
    const unsubscribeGameCreated = on('gameCreated', ({ gameCode }) => {
      setGameCode(gameCode);
      setScreen('charSelect');
    });

    const unsubscribePlayerList = on('playerList', ({ players }) => {
      setPlayers(players);
    });

    const unsubscribeGameStarted = on('gameStarted', payload => {
      const { players: newPlayers, monster: mPayload } = payload;
      setPlayers(newPlayers);
      setEventsLog([]);
      setWinner(null);

      // Use the server's monster if provided, otherwise keep our default
      if (mPayload) {
        setMonster({
          hp: mPayload.hp,
          maxHp: mPayload.maxHp,
          nextDamage: mPayload.nextDamage
        });
      }

      setScreen('game');
    });

    const unsubscribeRoundResult = on('roundResult', payload => {
      const {
        players: newPlayers,
        eventsLog: newEvents,
        monster: mPayload,
        winner: roundWinner
      } = payload;

      setPlayers(newPlayers);
      setEventsLog(prev => [...prev, { turn: payload.turn, events: newEvents }]);

      if (mPayload) {
        setMonster({
          hp: mPayload.hp,
          maxHp: mPayload.maxHp,
          nextDamage: mPayload.nextDamage
        });
      }

      if (roundWinner) {
        setWinner(roundWinner);
        setScreen('end');
      }
    });

    const unsubscribeErrorMessage = on('errorMessage', ({ message }) => {
      alert(message);
    });

    // Return cleanup function
    return () => {
      unsubscribeGameCreated();
      unsubscribePlayerList();
      unsubscribeGameStarted();
      unsubscribeRoundResult();
      unsubscribeErrorMessage();
    };
  }, [connected, on]);

  // Memoize the current player data
  const currentPlayer = useMemo(() => {
    return players.find(p => p.id === myId) || null;
  }, [players, myId]);

  // Handlers using useCallback for better performance
  const handleCreateGame = useCallback(name => {
    setPlayerName(name);
    emit('createGame', { playerName: name });
  }, [emit]);

  const handleJoinGame = useCallback((code, name) => {
    setPlayerName(name);
    setGameCode(code);
    emit('joinGame', { gameCode: code, playerName: name });
    setScreen('charSelect');
  }, [emit]);

  const handleConfirm = useCallback((race, cls) => {
    setSelectedRace(race);
    setSelectedClass(cls);
    emit('selectCharacter', {
      gameCode,
      race,
      className: cls
    });
    setScreen('lobby');
  }, [gameCode, emit]);

  const handleStartGame = useCallback(() => {
    emit('startGame', { gameCode });
  }, [gameCode, emit]);

  const handleSubmitAction = useCallback((actionType, targetId) => {
    emit('performAction', { gameCode, actionType, targetId });
  }, [gameCode, emit]);

  const handlePlayAgain = useCallback(() => {
    window.location.reload();
  }, []);

  // Render component based on current screen
  const renderScreen = () => {
    switch (screen) {
      case 'join':
        return (
          <JoinGamePage
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
          />
        );
      case 'charSelect':
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
      case 'lobby':
        return (
          <LobbyPage
            players={players}
            gameCode={gameCode}
            isHost={currentPlayer && players[0]?.id === currentPlayer.id}
            onStartGame={handleStartGame}
          />
        );
      case 'game':
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
      case 'end':
        return (
          <EndScreen
            winner={winner}
            players={players}
            onPlayAgain={handlePlayAgain}
          />
        );
      default:
        return null;
    }
  };

  // Use ThemeProvider to wrap everything
  return (
    <ThemeProvider>
      {renderScreen()}
    </ThemeProvider>
  );
}

export default React.memo(App);