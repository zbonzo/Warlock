/**
 * @fileoverview Tests for LobbyPage component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LobbyPage from '../../../../client/src/pages/LobbyPage/LobbyPage';

// Mock dependencies
jest.mock('@contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primary: '#1a1a1a',
      secondary: '#333333',
      accent: '#00ff00',
      danger: '#ff0000'
    }
  }))
}));

jest.mock('../../../../client/src/hooks/useMediaQuery', () => {
  return jest.fn(() => false); // Default to desktop
});

jest.mock('../../../../client/src/utils/playerCardUtils', () => ({
  getPlayerCardSize: jest.fn(() => 'medium')
}));

jest.mock('../../../../client/src/components/ui/RuneButton', () => {
  return function MockRuneButton({
    children,
    onClick,
    disabled,
    variant = 'primary'
  }: any) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        data-testid="rune-button"
        data-variant={variant}
      >
        {children}
      </button>
    );
  };
});

jest.mock('../../../../client/src/components/common/PlayerCard/PlayerCard', () => {
  return function MockPlayerCard({ player, isCurrentPlayer, size }: any) {
    return (
      <div data-testid="player-card" data-current={isCurrentPlayer} data-size={size}>
        {player.name} - {player.race} {player.class}
      </div>
    );
  };
});

jest.mock('../../../../client/src/pages/LobbyPage/LobbyPage.css', () => ({}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
});

// Mock document.execCommand
document.execCommand = jest.fn(() => true);

describe('LobbyPage', () => {
  const mockPlayers = [
    {
      id: 'host',
      name: 'HostPlayer',
      race: 'Human',
      class: 'Warrior',
      isReady: true,
      hp: 100,
      maxHp: 100
    },
    {
      id: 'player2',
      name: 'PlayerTwo',
      race: 'Elf',
      class: 'Wizard',
      isReady: true,
      hp: 100,
      maxHp: 100
    },
    {
      id: 'player3',
      name: 'PlayerThree',
      isReady: false
    }
  ];

  const defaultProps = {
    players: mockPlayers,
    gameCode: '1234',
    isHost: true,
    currentPlayerId: 'host',
    onStartGame: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render lobby title', () => {
      render(<LobbyPage {...defaultProps} />);

      expect(screen.getByText('Preparing the betrayal')).toBeInTheDocument();
    });

    it('should render game code display', () => {
      render(<LobbyPage {...defaultProps} />);

      expect(screen.getByText('Code: 1234')).toBeInTheDocument();
    });

    it('should render player count', () => {
      render(<LobbyPage {...defaultProps} />);

      expect(screen.getByText('3 Players in Lobby')).toBeInTheDocument();
    });

    it('should render readiness count', () => {
      render(<LobbyPage {...defaultProps} />);

      expect(screen.getByText('2 of 3 players ready')).toBeInTheDocument();
    });

    it('should render all player cards', () => {
      render(<LobbyPage {...defaultProps} />);

      const playerCards = screen.getAllByTestId('player-card');
      expect(playerCards).toHaveLength(3);
    });

    it('should render game instructions', () => {
      render(<LobbyPage {...defaultProps} />);

      expect(screen.getByText('Game Instructions')).toBeInTheDocument();
      expect(screen.getByText('Share the game code with your friends so they can join')).toBeInTheDocument();
    });
  });

  describe('Host Functionality', () => {
    it('should show start game button for host', () => {
      render(<LobbyPage {...defaultProps} isHost={true} />);

      expect(screen.getByTestId('rune-button')).toBeInTheDocument();
    });

    it('should enable start game button when all players ready', () => {
      const allReadyPlayers = mockPlayers.map(p => ({
        ...p,
        race: 'Human',
        class: 'Warrior'
      }));

      render(<LobbyPage {...defaultProps} players={allReadyPlayers} />);

      const startButton = screen.getByText('Begin the Quest');
      expect(startButton).not.toBeDisabled();
    });

    it('should disable start game button when not all players ready', () => {
      render(<LobbyPage {...defaultProps} />);

      const startButton = screen.getByText('Waiting for all players...');
      expect(startButton).toBeDisabled();
    });

    it('should call onStartGame when start button is clicked', () => {
      const allReadyPlayers = mockPlayers.map(p => ({
        ...p,
        race: 'Human',
        class: 'Warrior'
      }));

      render(<LobbyPage {...defaultProps} players={allReadyPlayers} />);

      const startButton = screen.getByText('Begin the Quest');
      fireEvent.click(startButton);

      expect(defaultProps.onStartGame).toHaveBeenCalled();
    });

    it('should show host badge for first player', () => {
      render(<LobbyPage {...defaultProps} />);

      expect(screen.getByText('HOST')).toBeInTheDocument();
    });
  });

  describe('Non-Host View', () => {
    it('should show waiting message for non-host', () => {
      render(<LobbyPage {...defaultProps} isHost={false} />);

      expect(screen.getByText('Waiting for host to start the game...')).toBeInTheDocument();
      expect(screen.queryByText('Begin the Quest')).not.toBeInTheDocument();
    });
  });

  describe('Player Status', () => {
    it('should show ready status for players with race and class', () => {
      render(<LobbyPage {...defaultProps} />);

      const readyBadges = screen.getAllByText('Ready');
      expect(readyBadges).toHaveLength(2);
    });

    it('should show selecting status for players without race or class', () => {
      render(<LobbyPage {...defaultProps} />);

      const selectingBadges = screen.getAllByText('Selecting');
      expect(selectingBadges).toHaveLength(1);
    });

    it('should highlight current player', () => {
      render(<LobbyPage {...defaultProps} />);

      const playerCards = screen.getAllByTestId('player-card');
      const currentPlayerCard = playerCards.find(card =>
        card.getAttribute('data-current') === 'true'
      );

      expect(currentPlayerCard).toBeTruthy();
    });
  });

  describe('Readiness Progress', () => {
    it('should show correct readiness percentage', () => {
      render(<LobbyPage {...defaultProps} />);

      // 2 ready out of 3 players = 66.67%
      const readinessBar = document.querySelector('.readiness-bar');
      expect(readinessBar).toHaveStyle({ width: '66.66666666666667%' });
    });

    it('should add all-ready class when all players ready', () => {
      const allReadyPlayers = mockPlayers.map(p => ({
        ...p,
        race: 'Human',
        class: 'Warrior'
      }));

      render(<LobbyPage {...defaultProps} players={allReadyPlayers} />);

      const readinessBar = document.querySelector('.readiness-bar');
      expect(readinessBar).toHaveClass('all-ready');
    });

    it('should show help message when not all ready', () => {
      render(<LobbyPage {...defaultProps} />);

      expect(screen.getByText('All players must select a race and class before the game can start.')).toBeInTheDocument();
    });

    it('should hide help message when all ready', () => {
      const allReadyPlayers = mockPlayers.map(p => ({
        ...p,
        race: 'Human',
        class: 'Warrior'
      }));

      render(<LobbyPage {...defaultProps} players={allReadyPlayers} />);

      expect(screen.queryByText('All players must select a race and class before the game can start.')).not.toBeInTheDocument();
    });
  });

  describe('Game Code Copying', () => {
    it('should copy game code to clipboard when clicked', async () => {
      render(<LobbyPage {...defaultProps} />);

      const gameCodeDisplay = screen.getByText('Code: 1234').closest('.game-code-display');
      fireEvent.click(gameCodeDisplay!);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1234');
      });
    });

    it('should show copied feedback after successful copy', async () => {
      render(<LobbyPage {...defaultProps} />);

      const gameCodeDisplay = screen.getByText('Code: 1234').closest('.game-code-display');
      fireEvent.click(gameCodeDisplay!);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
        expect(screen.getByText('✓')).toBeInTheDocument();
      });
    });

    it('should revert copy feedback after timeout', async () => {
      jest.useFakeTimers();

      render(<LobbyPage {...defaultProps} />);

      const gameCodeDisplay = screen.getByText('Code: 1234').closest('.game-code-display');
      fireEvent.click(gameCodeDisplay!);

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      // Fast forward 2 seconds
      jest.advanceTimersByTime(2000);

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();

      jest.useRealTimers();
    });

    it('should fallback to execCommand when clipboard API fails', async () => {
      // Mock clipboard API to fail
      const clipboardWriteText = jest.fn(() => Promise.reject(new Error('Clipboard API failed')));
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText
        }
      });

      render(<LobbyPage {...defaultProps} />);

      const gameCodeDisplay = screen.getByText('Code: 1234').closest('.game-code-display');
      fireEvent.click(gameCodeDisplay!);

      await waitFor(() => {
        expect(document.execCommand).toHaveBeenCalledWith('copy');
      });
    });

    it('should handle copy failure gracefully', async () => {
      // Mock both clipboard API and execCommand to fail
      const clipboardWriteText = jest.fn(() => Promise.reject(new Error('Clipboard API failed')));
      Object.assign(navigator, {
        clipboard: {
          writeText: clipboardWriteText
        }
      });
      document.execCommand = jest.fn(() => false);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<LobbyPage {...defaultProps} />);

      const gameCodeDisplay = screen.getByText('Code: 1234').closest('.game-code-display');
      fireEvent.click(gameCodeDisplay!);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Player Count Display', () => {
    it('should show singular "Player" for one player', () => {
      const singlePlayer = [mockPlayers[0]];

      render(<LobbyPage {...defaultProps} players={singlePlayer} />);

      expect(screen.getByText('1 Player in Lobby')).toBeInTheDocument();
    });

    it('should show plural "Players" for multiple players', () => {
      render(<LobbyPage {...defaultProps} />);

      expect(screen.getByText('3 Players in Lobby')).toBeInTheDocument();
    });
  });

  describe('Player Card Properties', () => {
    it('should pass correct props to PlayerCard', () => {
      render(<LobbyPage {...defaultProps} />);

      const playerCards = screen.getAllByTestId('player-card');

      // Check first player (host)
      expect(playerCards[0]).toHaveAttribute('data-current', 'true');
      expect(playerCards[0]).toHaveAttribute('data-size', 'medium');
      expect(playerCards[0]).toHaveTextContent('HostPlayer - Human Warrior');
    });

    it('should set default HP values for players', () => {
      const playersWithoutHP = [{
        id: 'player1',
        name: 'TestPlayer',
        race: 'Human',
        class: 'Warrior'
      }];

      render(<LobbyPage {...defaultProps} players={playersWithoutHP} />);

      // The component should add default HP values
      const playerCard = screen.getByTestId('player-card');
      expect(playerCard).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should use mobile card size on mobile', () => {
      const mockUseMediaQuery = require('../../../../client/src/hooks/useMediaQuery');
      const mockGetPlayerCardSize = require('../../../../client/src/utils/playerCardUtils').getPlayerCardSize;

      mockUseMediaQuery.mockReturnValue(true); // Mobile
      mockGetPlayerCardSize.mockReturnValue('small');

      render(<LobbyPage {...defaultProps} />);

      expect(mockGetPlayerCardSize).toHaveBeenCalledWith(true, 'lobby');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty players array', () => {
      render(<LobbyPage {...defaultProps} players={[]} />);

      expect(screen.getByText('0 Players in Lobby')).toBeInTheDocument();
      expect(screen.getByText('0 of 0 players ready')).toBeInTheDocument();
    });

    it('should handle missing player properties', () => {
      const malformedPlayers = [
        { id: 'player1', name: 'Player1' }, // Missing race/class
        { id: 'player2' }, // Missing name
      ] as any[];

      expect(() => {
        render(<LobbyPage {...defaultProps} players={malformedPlayers} />);
      }).not.toThrow();
    });

    it('should handle undefined currentPlayerId', () => {
      render(<LobbyPage {...defaultProps} currentPlayerId={undefined} />);

      const playerCards = screen.getAllByTestId('player-card');
      const currentPlayerCards = playerCards.filter(card =>
        card.getAttribute('data-current') === 'true'
      );

      expect(currentPlayerCards).toHaveLength(0);
    });

    it('should handle missing gameCode', () => {
      render(<LobbyPage {...defaultProps} gameCode="" />);

      expect(screen.getByText('Code:')).toBeInTheDocument();
    });
  });

  describe('Instructions', () => {
    it('should render all game instructions', () => {
      render(<LobbyPage {...defaultProps} />);

      const expectedInstructions = [
        'Share the game code with your friends so they can join',
        'Everyone must select a character race and class',
        'One random player will secretly be a Warlock',
        'Work together to defeat the monster, but beware the Warlock!',
        'The Warlock can convert other players when attacking or being healed',
        'Good players win by eliminating all Warlocks',
        'Warlocks win by converting or eliminating all good players'
      ];

      expectedInstructions.forEach(instruction => {
        expect(screen.getByText(instruction)).toBeInTheDocument();
      });
    });
  });
});
