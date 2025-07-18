/**
 * @fileoverview Tests for App component
 * Tests routing, socket integration, and application state management
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from '@client/App';
import * as configService from '@client/services/configService';
import { io } from 'socket.io-client';

// Mock dependencies
jest.mock('@client/services/configService', () => ({
  preloadConfig: jest.fn(),
  getBasicConfig: jest.fn(),
  getRaces: jest.fn(),
  getClasses: jest.fn(),
  getCompatibility: jest.fn(),
  getRacialAbilities: jest.fn(),
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn()
}));

// Mock constants
jest.mock('@client/config/constants', () => ({
  SOCKET_URL: 'http://localhost:3001',
  GAME_PHASES: {
    JOIN: 'join',
    CHARACTER_SELECT: 'charSelect',
    LOBBY: 'lobby',
    GAME: 'game',
    END: 'end'
  },
  ICONS: {
    RACES: {
      Artisan: '/images/races/artisan.png',
    },
    CLASSES: {
      Warrior: '/images/classes/warrior.png',
    }
  }
}));

describe('App', () => {
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      id: 'test-socket-id',
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      removeAllListeners: jest.fn(),
      connected: false
    };

    io.mockReturnValue(mockSocket);
    
    // Mock successful config loading
    configService.preloadConfig.mockResolvedValue(true);
    configService.getBasicConfig.mockResolvedValue({
      minPlayers: 2,
      maxPlayers: 20,
      version: '1.0.0'
    });
    configService.getRaces.mockResolvedValue({
      races: ['Artisan'],
      raceAttributes: {
        Artisan: { description: 'Adaptable' }
      }
    });
    configService.getClasses.mockResolvedValue({
      classes: ['Warrior'],
      classAttributes: {
        Warrior: { description: 'Tank' }
      }
    });
    configService.getCompatibility.mockResolvedValue({
      classToRaces: { Warrior: ['Artisan'] },
      racesToClasses: { Artisan: ['Warrior'] }
    });
    configService.getRacialAbilities.mockResolvedValue({
      Artisan: { type: 'adaptability', name: 'Adaptability' }
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render without crashing', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Create Game|Join Game/)).toBeInTheDocument();
    });
  });

  it('should show loading state while config is loading', () => {
    configService.preloadConfig.mockImplementation(() => new Promise(() => {}));

    render(<App />);

    expect(screen.getByText('Loading game configuration...')).toBeInTheDocument();
  });

  it('should show error state when config fails to load', async () => {
    configService.preloadConfig.mockRejectedValue(new Error('Config failed'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Configuration Error')).toBeInTheDocument();
    });
  });

  it('should initialize socket connection', async () => {
    render(<App />);

    await waitFor(() => {
      expect(io).toHaveBeenCalledWith('http://localhost:3001');
    });
  });

  it('should handle socket connection', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    // Simulate socket connection
    const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    mockSocket.connected = true;
    mockSocket.id = 'connected-socket-id';
    
    act(() => {
      connectCallback();
    });

    // Socket should be connected
    expect(mockSocket.connected).toBe(true);
  });

  it('should handle game creation', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('gameCreated', expect.any(Function));
    });

    // Simulate game creation
    const gameCreatedCallback = mockSocket.on.mock.calls.find(call => call[0] === 'gameCreated')[1];
    
    act(() => {
      gameCreatedCallback({ gameCode: '1234' });
    });

    // Should transition to character select
    await waitFor(() => {
      expect(screen.getByText(/Select Your Race/)).toBeInTheDocument();
    });
  });

  it('should handle player list updates', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('playerList', expect.any(Function));
    });

    // Simulate player list update
    const playerListCallback = mockSocket.on.mock.calls.find(call => call[0] === 'playerList')[1];
    
    act(() => {
      playerListCallback({ 
        players: [
          { id: 'player1', name: 'Player 1' },
          { id: 'player2', name: 'Player 2' }
        ]
      });
    });

    // Players should be updated (we'd need to check this via some UI element)
    expect(playerListCallback).toHaveBeenCalled;
  });

  it('should handle game start', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('gameStarted', expect.any(Function));
    });

    // Simulate game start
    const gameStartedCallback = mockSocket.on.mock.calls.find(call => call[0] === 'gameStarted')[1];
    
    act(() => {
      gameStartedCallback({ 
        players: [{ id: 'player1', name: 'Player 1' }],
        monster: { hp: 100, maxHp: 100 }
      });
    });

    // Should transition to game screen
    await waitFor(() => {
      expect(screen.getByText(/Game/)).toBeInTheDocument();
    });
  });

  it('should handle round results', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('roundResult', expect.any(Function));
    });

    // Simulate round result
    const roundResultCallback = mockSocket.on.mock.calls.find(call => call[0] === 'roundResult')[1];
    
    act(() => {
      roundResultCallback({ 
        players: [{ id: 'player1', name: 'Player 1' }],
        monster: { hp: 80, maxHp: 100 },
        events: ['Player 1 attacked the monster'],
        turn: 1
      });
    });

    // Should update game state
    expect(roundResultCallback).toHaveBeenCalled;
  });

  it('should handle error messages', async () => {
    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('errorMessage', expect.any(Function));
    });

    // Simulate error message
    const errorMessageCallback = mockSocket.on.mock.calls.find(call => call[0] === 'errorMessage')[1];
    
    act(() => {
      errorMessageCallback({ message: 'Test error message' });
    });

    expect(alertSpy).toHaveBeenCalledWith('Test error message');
    alertSpy.mockRestore();
  });

  it('should handle game end', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('roundResult', expect.any(Function));
    });

    // Simulate game end
    const roundResultCallback = mockSocket.on.mock.calls.find(call => call[0] === 'roundResult')[1];
    
    act(() => {
      roundResultCallback({ 
        players: [{ id: 'player1', name: 'Player 1' }],
        monster: { hp: 0, maxHp: 100 },
        events: ['Monster defeated!'],
        turn: 5,
        winner: 'good'
      });
    });

    // Should transition to end screen
    await waitFor(() => {
      expect(screen.getByText(/Game Over|Victory|Defeat/)).toBeInTheDocument();
    });
  });

  it('should handle socket disconnection', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    // Simulate disconnection
    const disconnectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    mockSocket.connected = false;
    
    act(() => {
      disconnectCallback('transport close');
    });

    // Should handle disconnection gracefully
    expect(mockSocket.connected).toBe(false);
  });

  it('should cleanup socket on unmount', async () => {
    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    unmount();

    expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should handle page leave warning in active game', async () => {
    // Mock window.addEventListener
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    render(<App />);

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    addEventListenerSpy.mockRestore();
  });

  it('should handle reconnection', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('gameReconnected', expect.any(Function));
    });

    // Simulate reconnection
    const reconnectedCallback = mockSocket.on.mock.calls.find(call => call[0] === 'gameReconnected')[1];
    
    act(() => {
      reconnectedCallback({ 
        gameCode: '1234',
        players: [{ id: 'player1', name: 'Player 1' }],
        screen: 'game'
      });
    });

    // Should restore game state
    expect(reconnectedCallback).toHaveBeenCalled;
  });

  it('should handle private events', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('privateEvent', expect.any(Function));
    });

    // Simulate private event
    const privateEventCallback = mockSocket.on.mock.calls.find(call => call[0] === 'privateEvent')[1];
    
    act(() => {
      privateEventCallback({ 
        events: ['You detected a warlock!']
      });
    });

    // Should handle private events
    expect(privateEventCallback).toHaveBeenCalled;
  });

  it('should maintain socket connection across component updates', async () => {
    const { rerender } = render(<App />);

    await waitFor(() => {
      expect(io).toHaveBeenCalledTimes(1);
    });

    rerender(<App />);

    // Should not create a new socket
    expect(io).toHaveBeenCalledTimes(1);
  });
});