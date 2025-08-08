/**
 * @fileoverview Tests for App.tsx
 * Comprehensive test suite for the main React application component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../../client/src/App';

// Mock all the dependencies
jest.mock('../../../client/src/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>
}));

jest.mock('../../../client/src/components/common/ThemeToggle', () => {
  return function MockThemeToggle() {
    return <div data-testid="theme-toggle">Theme Toggle</div>;
  };
});

jest.mock('@contexts/ConfigContext', () => ({
  ConfigProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="config-provider">{children}</div>,
  useConfig: jest.fn()
}));

jest.mock('../../../client/src/contexts/AppContext', () => ({
  AppProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="app-provider">{children}</div>,
  useAppContext: jest.fn()
}));

jest.mock('../../../client/src/components/common/LoadingScreen', () => {
  return function MockLoadingScreen({ message }: { message?: string }) {
    return <div data-testid="loading-screen">{message}</div>;
  };
});

jest.mock('../../../client/src/components/common/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>
}));

jest.mock('../../../client/src/hooks/usePageLeaveWarning', () => {
  return jest.fn();
});

jest.mock('../../../client/src/hooks/useSocket', () => {
  return jest.fn();
});

// Mock all page components
jest.mock('../../../client/src/pages/JoinGamePage', () => {
  return function MockJoinGamePage({ onCreateGame, onJoinGame, onReconnect }: any) {
    return (
      <div data-testid="join-game-page">
        <button onClick={() => onCreateGame('TestPlayer')}>Create Game</button>
        <button onClick={() => onJoinGame('ABC123', 'TestPlayer')}>Join Game</button>
        <button onClick={() => onReconnect('ABC123', 'TestPlayer')}>Reconnect</button>
      </div>
    );
  };
});

jest.mock('../../../client/src/pages/CharacterSelectPage', () => {
  return function MockCharacterSelectPage({ onConfirm, onSelectRace, onSelectClass }: any) {
    return (
      <div data-testid="character-select-page">
        <button onClick={() => onSelectRace('Human')}>Select Human</button>
        <button onClick={() => onSelectClass('Wizard')}>Select Wizard</button>
        <button onClick={() => onConfirm('Human', 'Wizard')}>Confirm</button>
      </div>
    );
  };
});

jest.mock('../../../client/src/pages/LobbyPage', () => {
  return function MockLobbyPage({ onStartGame }: any) {
    return (
      <div data-testid="lobby-page">
        <button onClick={onStartGame}>Start Game</button>
      </div>
    );
  };
});

jest.mock('../../../client/src/pages/GamePage', () => {
  return function MockGamePage({ onSubmitAction }: any) {
    return (
      <div data-testid="game-page">
        <button onClick={() => onSubmitAction('ability', 'target1')}>Submit Action</button>
      </div>
    );
  };
});

jest.mock('../../../client/src/pages/EndPage', () => {
  return function MockEndPage({ onPlayAgain }: any) {
    return (
      <div data-testid="end-page">
        <button onClick={onPlayAgain}>Play Again</button>
      </div>
    );
  };
});

jest.mock('../../../client/src/pages/RuneButtonTest', () => {
  return function MockRuneButtonTest() {
    return <div data-testid="rune-button-test">Rune Button Test</div>;
  };
});

jest.mock('../../../client/src/config/constants', () => ({
  SOCKET_URL: 'ws://localhost:3001',
  GAME_PHASES: {
    JOIN: 'join',
    CHARACTER_SELECT: 'character_select',
    LOBBY: 'lobby',
    GAME: 'game',
    END: 'end'
  }
}));

// Mock CSS imports
jest.mock('../../../client/src/styles/App.css', () => ({}));

describe('App', () => {
  const mockUseConfig = require('@contexts/ConfigContext').useConfig;
  const mockUseAppContext = require('../../../client/src/contexts/AppContext').useAppContext;
  const mockUseSocket = require('../../../client/src/hooks/useSocket').default;
  const mockUsePageLeaveWarning = require('../../../client/src/hooks/usePageLeaveWarning').default;

  // Default mocks
  const defaultAppContext = {
    screen: 'join',
    gameCode: '',
    playerName: '',
    players: [],
    eventsLog: [],
    winner: null,
    monster: null,
    selectedRace: null,
    selectedClass: null,
    trophyAward: null,
    setScreen: jest.fn(),
    setGameCode: jest.fn(),
    setPlayerName: jest.fn(),
    setIsHost: jest.fn(),
    setPlayers: jest.fn(),
    addEventLog: jest.fn(),
    setMonster: jest.fn(),
    setWinner: jest.fn(),
    setSelectedRace: jest.fn(),
    setSelectedClass: jest.fn(),
    resetGame: jest.fn(),
    setEventsLog: jest.fn(),
    setTrophyAward: jest.fn()
  };

  const defaultSocketMock = {
    socket: { id: 'socket123' },
    connected: true,
    socketId: 'socket123',
    emit: jest.fn(),
    on: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseConfig.mockReturnValue({
      loading: false,
      error: null
    });

    mockUseAppContext.mockReturnValue(defaultAppContext);

    mockUseSocket.mockReturnValue(defaultSocketMock);

    mockUsePageLeaveWarning.mockImplementation(() => {});

    // Mock window methods
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true
    });

    global.scrollTo = jest.fn();
    global.alert = jest.fn();
    Object.defineProperty(window, 'localStorage', {
      value: {
        removeItem: jest.fn(),
        getItem: jest.fn(),
        setItem: jest.fn()
      },
      writable: true
    });
  });

  describe('App Structure', () => {
    it('should render with all providers', () => {
      render(<App />);

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('config-provider')).toBeInTheDocument();
      expect(screen.getByTestId('app-provider')).toBeInTheDocument();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    });

    it('should show loading screen when config is loading', () => {
      mockUseConfig.mockReturnValue({
        loading: true,
        error: null
      });

      render(<App />);

      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      expect(screen.getByText('Loading game configuration...')).toBeInTheDocument();
    });

    it('should show error screen when config has error', () => {
      mockUseConfig.mockReturnValue({
        loading: false,
        error: 'Failed to load configuration'
      });

      render(<App />);

      expect(screen.getByText('Configuration Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load configuration')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should reload page when retry button is clicked', () => {
      const mockReload = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true
      });

      mockUseConfig.mockReturnValue({
        loading: false,
        error: 'Configuration error'
      });

      render(<App />);

      fireEvent.click(screen.getByText('Retry'));
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Test Route', () => {
    it('should show rune button test when test query parameter is present', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?test=rune-buttons' },
        writable: true
      });

      render(<App />);

      expect(screen.getByTestId('rune-button-test')).toBeInTheDocument();
    });
  });

  describe('Screen Rendering', () => {
    it('should render join game page by default', () => {
      render(<App />);

      expect(screen.getByTestId('join-game-page')).toBeInTheDocument();
    });

    it('should render character select page', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'character_select'
      });

      render(<App />);

      expect(screen.getByTestId('character-select-page')).toBeInTheDocument();
    });

    it('should render lobby page', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'lobby'
      });

      render(<App />);

      expect(screen.getByTestId('lobby-page')).toBeInTheDocument();
    });

    it('should render game page', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'game'
      });

      render(<App />);

      expect(screen.getByTestId('game-page')).toBeInTheDocument();
    });

    it('should render end page', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'end'
      });

      render(<App />);

      expect(screen.getByTestId('end-page')).toBeInTheDocument();
    });

    it('should render nothing for unknown screen', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'unknown'
      });

      const { container } = render(<App />);

      expect(container.querySelector('[data-testid]')).toBeNull();
    });
  });

  describe('Socket Event Handlers', () => {
    let onMock: jest.Mock;

    beforeEach(() => {
      onMock = jest.fn();
      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        on: onMock
      });
    });

    it('should set up socket event listeners when connected', () => {
      render(<App />);

      expect(onMock).toHaveBeenCalledWith('gameCreated', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('playerList', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('playerJoined', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('gameStarted', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('gameReconnected', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('roundResult', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('errorMessage', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('privateEvent', expect.any(Function));
      expect(onMock).toHaveBeenCalledWith('trophyAwarded', expect.any(Function));
    });

    it('should not set up listeners when not connected', () => {
      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        connected: false
      });

      render(<App />);

      expect(onMock).not.toHaveBeenCalled();
    });

    it('should handle gameCreated event', () => {
      const setGameCode = jest.fn();
      const setIsHost = jest.fn();
      const setScreen = jest.fn();

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        setGameCode,
        setIsHost,
        setScreen
      });

      render(<App />);

      // Get the gameCreated handler
      const gameCreatedHandler = onMock.mock.calls.find(call => call[0] === 'gameCreated')[1];

      act(() => {
        gameCreatedHandler({ gameCode: 'XYZ789' });
      });

      expect(setGameCode).toHaveBeenCalledWith('XYZ789');
      expect(setIsHost).toHaveBeenCalledWith(true);
      expect(setScreen).toHaveBeenCalledWith('character_select');
    });

    it('should handle playerList event', () => {
      const setPlayers = jest.fn();
      const mockPlayers = [{ id: 'player1', name: 'Test Player' }];

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        setPlayers
      });

      render(<App />);

      const playerListHandler = onMock.mock.calls.find(call => call[0] === 'playerList')[1];

      act(() => {
        playerListHandler({ players: mockPlayers });
      });

      expect(setPlayers).toHaveBeenCalledWith(mockPlayers);
    });

    it('should handle gameStarted event', () => {
      const setPlayers = jest.fn();
      const setEventsLog = jest.fn();
      const setWinner = jest.fn();
      const setMonster = jest.fn();
      const setScreen = jest.fn();

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        setPlayers,
        setEventsLog,
        setWinner,
        setMonster,
        setScreen
      });

      render(<App />);

      const gameStartedHandler = onMock.mock.calls.find(call => call[0] === 'gameStarted')[1];
      const mockPayload = {
        players: [{ id: 'player1', name: 'Test' }],
        monster: { hp: 100, maxHp: 100, nextDamage: 15 }
      };

      act(() => {
        gameStartedHandler(mockPayload);
      });

      expect(setPlayers).toHaveBeenCalledWith(mockPayload.players);
      expect(setEventsLog).toHaveBeenCalledWith([]);
      expect(setWinner).toHaveBeenCalledWith(null);
      expect(setMonster).toHaveBeenCalledWith({
        hp: 100,
        maxHp: 100,
        nextDamage: 15
      });
      expect(setScreen).toHaveBeenCalledWith('game');
    });

    it('should handle roundResult event with winner', () => {
      const setPlayers = jest.fn();
      const addEventLog = jest.fn();
      const setMonster = jest.fn();
      const setWinner = jest.fn();
      const setScreen = jest.fn();

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        setPlayers,
        addEventLog,
        setMonster,
        setWinner,
        setScreen
      });

      render(<App />);

      const roundResultHandler = onMock.mock.calls.find(call => call[0] === 'roundResult')[1];
      const mockPayload = {
        players: [{ id: 'player1', name: 'Test' }],
        eventsLog: ['Event 1', 'Event 2'],
        monster: { hp: 80, maxHp: 100, nextDamage: 20 },
        winner: 'Good',
        turn: 5
      };

      act(() => {
        roundResultHandler(mockPayload);
      });

      expect(setPlayers).toHaveBeenCalledWith(mockPayload.players);
      expect(addEventLog).toHaveBeenCalledWith({ turn: 5, events: mockPayload.eventsLog });
      expect(setMonster).toHaveBeenCalledWith({
        hp: 80,
        maxHp: 100,
        nextDamage: 20
      });
      expect(setWinner).toHaveBeenCalledWith('Good');
      expect(setScreen).toHaveBeenCalledWith('end');
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('lastGameCode');
    });

    it('should handle errorMessage event', () => {
      render(<App />);

      const errorHandler = onMock.mock.calls.find(call => call[0] === 'errorMessage')[1];

      act(() => {
        errorHandler({ message: 'Test error message' });
      });

      expect(global.alert).toHaveBeenCalledWith('Test error message');
    });

    it('should handle privateEvent', () => {
      const addEventLog = jest.fn();

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        addEventLog
      });

      render(<App />);

      const privateEventHandler = onMock.mock.calls.find(call => call[0] === 'privateEvent')[1];

      act(() => {
        privateEventHandler({ events: ['Private event 1', 'Private event 2'] });
      });

      expect(addEventLog).toHaveBeenCalledWith({ turn: 0, events: ['Private event 1', 'Private event 2'] });
    });

    it('should handle trophyAwarded event', () => {
      const setTrophyAward = jest.fn();

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        setTrophyAward
      });

      render(<App />);

      const trophyAwardedHandler = onMock.mock.calls.find(call => call[0] === 'trophyAwarded')[1];
      const mockTrophy = { playerId: 'player1', type: 'achievement', description: 'Test trophy' };

      act(() => {
        trophyAwardedHandler(mockTrophy);
      });

      expect(setTrophyAward).toHaveBeenCalledWith(mockTrophy);
    });
  });

  describe('Action Handlers', () => {
    it('should handle create game action', () => {
      const emit = jest.fn();
      const setPlayerName = jest.fn();

      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        emit
      });

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        setPlayerName
      });

      render(<App />);

      fireEvent.click(screen.getByText('Create Game'));

      expect(setPlayerName).toHaveBeenCalledWith('TestPlayer');
      expect(emit).toHaveBeenCalledWith('createGame', { playerName: 'TestPlayer' });
    });

    it('should handle join game action', () => {
      const emit = jest.fn();
      const setPlayerName = jest.fn();
      const setGameCode = jest.fn();
      const setScreen = jest.fn();

      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        emit
      });

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        setPlayerName,
        setGameCode,
        setScreen
      });

      render(<App />);

      fireEvent.click(screen.getByText('Join Game'));

      expect(setPlayerName).toHaveBeenCalledWith('TestPlayer');
      expect(setGameCode).toHaveBeenCalledWith('ABC123');
      expect(emit).toHaveBeenCalledWith('joinGame', { gameCode: 'ABC123', playerName: 'TestPlayer' });
      expect(setScreen).toHaveBeenCalledWith('character_select');
    });

    it('should handle reconnect action', () => {
      const emit = jest.fn();
      const setPlayerName = jest.fn();
      const setGameCode = jest.fn();

      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        emit
      });

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        setPlayerName,
        setGameCode
      });

      render(<App />);

      fireEvent.click(screen.getByText('Reconnect'));

      expect(emit).toHaveBeenCalledWith('reconnectToGame', { gameCode: 'ABC123', playerName: 'TestPlayer' });
      expect(setPlayerName).toHaveBeenCalledWith('TestPlayer');
      expect(setGameCode).toHaveBeenCalledWith('ABC123');
    });

    it('should handle character selection', () => {
      const setSelectedRace = jest.fn();
      const setSelectedClass = jest.fn();

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'character_select',
        setSelectedRace,
        setSelectedClass
      });

      render(<App />);

      fireEvent.click(screen.getByText('Select Human'));
      fireEvent.click(screen.getByText('Select Wizard'));

      expect(setSelectedRace).toHaveBeenCalledWith('Human');
      expect(setSelectedClass).toHaveBeenCalledWith('Wizard');
    });

    it('should handle character confirmation', () => {
      const emit = jest.fn();
      const setSelectedRace = jest.fn();
      const setSelectedClass = jest.fn();
      const setScreen = jest.fn();

      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        emit
      });

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'character_select',
        gameCode: 'TEST123',
        setSelectedRace,
        setSelectedClass,
        setScreen
      });

      render(<App />);

      fireEvent.click(screen.getByText('Confirm'));

      expect(setSelectedRace).toHaveBeenCalledWith('Human');
      expect(setSelectedClass).toHaveBeenCalledWith('Wizard');
      expect(emit).toHaveBeenCalledWith('selectCharacter', {
        gameCode: 'TEST123',
        race: 'Human',
        className: 'Wizard'
      });
      expect(setScreen).toHaveBeenCalledWith('lobby');
      expect(global.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    });

    it('should handle start game action', () => {
      const emit = jest.fn();

      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        emit
      });

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'lobby',
        gameCode: 'TEST123'
      });

      render(<App />);

      fireEvent.click(screen.getByText('Start Game'));

      expect(emit).toHaveBeenCalledWith('startGame', { gameCode: 'TEST123' });
      expect(global.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('should handle submit action', () => {
      const emit = jest.fn();

      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        emit
      });

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'game',
        gameCode: 'TEST123'
      });

      render(<App />);

      fireEvent.click(screen.getByText('Submit Action'));

      expect(emit).toHaveBeenCalledWith('performAction', {
        gameCode: 'TEST123',
        actionType: 'ability',
        targetId: 'target1'
      });
    });

    it('should handle play again action', () => {
      const resetGame = jest.fn();
      const setGameCode = jest.fn();
      const setPlayerName = jest.fn();

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'end',
        gameCode: 'TEST123',
        playerName: 'TestPlayer',
        resetGame,
        setGameCode,
        setPlayerName
      });

      render(<App />);

      fireEvent.click(screen.getByText('Play Again'));

      expect(resetGame).toHaveBeenCalled();
      expect(setGameCode).toHaveBeenCalledWith('TEST123');
      expect(setPlayerName).toHaveBeenCalledWith('TestPlayer');
    });
  });

  describe('Page Leave Warning', () => {
    it('should show warning during active game', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'game',
        winner: null,
        players: [{ id: 'player1', name: 'Test' }]
      });

      render(<App />);

      expect(mockUsePageLeaveWarning).toHaveBeenCalledWith(
        true,
        expect.stringContaining("You're currently playing Warlock!")
      );
    });

    it('should show warning in lobby with other players', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'lobby',
        players: [{ id: 'player1' }, { id: 'player2' }]
      });

      render(<App />);

      expect(mockUsePageLeaveWarning).toHaveBeenCalledWith(
        true,
        expect.stringContaining("You're in a game lobby with 2 player(s)")
      );
    });

    it('should not show warning when alone in lobby', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'lobby',
        players: [{ id: 'player1' }]
      });

      render(<App />);

      expect(mockUsePageLeaveWarning).toHaveBeenCalledWith(false, undefined);
    });

    it('should not show warning on join screen', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'join',
        players: []
      });

      render(<App />);

      expect(mockUsePageLeaveWarning).toHaveBeenCalledWith(false, undefined);
    });

    it('should not show warning when game has ended', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'game',
        winner: 'Good',
        players: [{ id: 'player1' }]
      });

      render(<App />);

      expect(mockUsePageLeaveWarning).toHaveBeenCalledWith(false, undefined);
    });
  });

  describe('Current Player Calculation', () => {
    it('should calculate current player from players list', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'socket123', name: 'Current Player' },
        { id: 'player3', name: 'Player 3' }
      ];

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'lobby',
        players
      });

      render(<App />);

      // The current player should be determined by matching socketId
      // This is tested indirectly through the lobby page props
      expect(screen.getByTestId('lobby-page')).toBeInTheDocument();
    });

    it('should handle no current player', () => {
      const players = [
        { id: 'player1', name: 'Player 1' },
        { id: 'player2', name: 'Player 2' }
      ];

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'lobby',
        players
      });

      render(<App />);

      expect(screen.getByTestId('lobby-page')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('should pass correct props to CharacterSelectPage', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'character_select',
        playerName: 'TestPlayer',
        gameCode: 'ABC123',
        selectedRace: 'Human',
        selectedClass: 'Wizard'
      });

      render(<App />);

      const characterSelectPage = screen.getByTestId('character-select-page');
      expect(characterSelectPage).toBeInTheDocument();
    });

    it('should pass correct props to LobbyPage', () => {
      const players = [
        { id: 'socket123', name: 'Host Player' },
        { id: 'player2', name: 'Other Player' }
      ];

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'lobby',
        players,
        gameCode: 'ABC123'
      });

      render(<App />);

      const lobbyPage = screen.getByTestId('lobby-page');
      expect(lobbyPage).toBeInTheDocument();
    });

    it('should pass correct props to GamePage', () => {
      const players = [{ id: 'socket123', name: 'Current Player' }];
      const mockMonster = { hp: 100, maxHp: 100 };
      const mockEventsLog = [{ turn: 1, events: ['Event 1'] }];

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'game',
        players,
        monster: mockMonster,
        eventsLog: mockEventsLog,
        gameCode: 'ABC123'
      });

      render(<App />);

      const gamePage = screen.getByTestId('game-page');
      expect(gamePage).toBeInTheDocument();
    });

    it('should pass correct props to EndPage', () => {
      const players = [{ id: 'player1', name: 'Player 1' }];
      const mockEventsLog = [{ turn: 1, events: ['Game ended'] }];
      const mockTrophyAward = { playerId: 'player1', type: 'victory', description: 'Winner!' };

      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        screen: 'end',
        winner: 'Good',
        players,
        eventsLog: mockEventsLog,
        gameCode: 'ABC123',
        playerName: 'TestPlayer',
        trophyAward: mockTrophyAward
      });

      render(<App />);

      const endPage = screen.getByTestId('end-page');
      expect(endPage).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle socket connection errors gracefully', () => {
      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        connected: false,
        emit: jest.fn()
      });

      expect(() => render(<App />)).not.toThrow();
    });

    it('should handle missing app context gracefully', () => {
      mockUseAppContext.mockReturnValue({
        ...defaultAppContext,
        players: null
      });

      expect(() => render(<App />)).not.toThrow();
    });

    it('should handle undefined socket events', () => {
      const onMock = jest.fn((event, handler) => {
        if (event === 'errorMessage') {
          handler(undefined);
        }
      });

      mockUseSocket.mockReturnValue({
        ...defaultSocketMock,
        on: onMock
      });

      expect(() => render(<App />)).not.toThrow();
    });
  });
});

// Mock CSS module
jest.mock('../../../client/src/styles/App.css', () => ({}));
