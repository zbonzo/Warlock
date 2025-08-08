/**
 * @fileoverview Tests for EndPage component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EndPage from '../../../../client/src/pages/EndPage/EndPage';

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

jest.mock('../../../../client/src/pages/EndPage/components/Confetti', () => {
  return function MockConfetti() {
    return <div data-testid="confetti">Confetti Animation</div>;
  };
});

jest.mock('../../../../client/src/pages/EndPage/components/FinalScoresTable', () => {
  return function MockFinalScoresTable({ players }: any) {
    return (
      <div data-testid="final-scores-table">
        Final Scores: {players.length} players
      </div>
    );
  };
});

jest.mock('@pages/GamePage/components/HistoryColumn', () => {
  return function MockHistoryColumn({ eventsLog, showAllEvents }: any) {
    return (
      <div data-testid="history-column">
        History: {eventsLog.length} events, showAll: {showAllEvents.toString()}
      </div>
    );
  };
});

jest.mock('../../../../client/src/components/ui/RuneButton', () => {
  return function MockRuneButton({
    children,
    onClick,
    variant = 'primary'
  }: any) {
    return (
      <button
        onClick={onClick}
        data-testid="rune-button"
        data-variant={variant}
      >
        {children}
      </button>
    );
  };
});

jest.mock('../../../../client/src/pages/EndPage/EndPage.css', () => ({}));

// Mock window.scrollTo
global.scrollTo = jest.fn();

describe('EndPage', () => {
  const mockPlayers = [
    {
      id: 'player1',
      name: 'Alice',
      race: 'Human',
      class: 'Warrior',
      isWarlock: false,
      isAlive: true
    },
    {
      id: 'player2',
      name: 'Bob',
      race: 'Orc',
      class: 'Wizard',
      isWarlock: true,
      isAlive: false
    }
  ];

  const mockEventsLog = [
    { turn: 1, events: ['Game started'] },
    { turn: 2, events: ['Player attacked'] },
    { turn: 3, events: ['Game ended'] }
  ];

  const mockSocket = {
    emit: jest.fn()
  };

  const defaultProps = {
    winner: 'Good' as const,
    players: mockPlayers,
    eventsLog: mockEventsLog,
    gameCode: 'ABC123',
    playerName: 'TestPlayer',
    socket: mockSocket,
    onPlayAgain: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        removeItem: jest.fn(),
        getItem: jest.fn(),
        setItem: jest.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render game over title initially', () => {
      render(<EndPage {...defaultProps} />);

      expect(screen.getByText('++ GAME OVER ++')).toBeInTheDocument();
    });

    it('should render winner announcement', () => {
      render(<EndPage {...defaultProps} />);

      expect(screen.getByText('Good Players Win!')).toBeInTheDocument();
    });

    it('should render final scores table', () => {
      render(<EndPage {...defaultProps} />);

      expect(screen.getByTestId('final-scores-table')).toBeInTheDocument();
      expect(screen.getByText('Final Scores: 2 players')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<EndPage {...defaultProps} />);

      expect(screen.getByText('Reawaken the Circle (ABC123)')).toBeInTheDocument();
      expect(screen.getByText('Forge a New Circle')).toBeInTheDocument();
    });

    it('should render history toggle button', () => {
      render(<EndPage {...defaultProps} />);

      expect(screen.getByText('Unveil the Chronicle')).toBeInTheDocument();
    });
  });

  describe('Winner Display', () => {
    it('should show good players win message and color for good victory', () => {
      render(<EndPage {...defaultProps} winner="Good" />);

      const winnerText = screen.getByText('Good Players Win!');
      expect(winnerText).toBeInTheDocument();
      expect(winnerText).toHaveStyle({ color: '#00ff00' });
    });

    it('should show warlocks win message and color for evil victory', () => {
      render(<EndPage {...defaultProps} winner="Evil" />);

      const winnerText = screen.getByText('Warlocks Win!');
      expect(winnerText).toBeInTheDocument();
      expect(winnerText).toHaveStyle({ color: '#ff0000' });
    });
  });

  describe('Confetti Animation', () => {
    it('should show confetti initially', () => {
      render(<EndPage {...defaultProps} />);

      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('should hide confetti after 5 seconds', () => {
      render(<EndPage {...defaultProps} />);

      expect(screen.getByTestId('confetti')).toBeInTheDocument();

      // Fast forward 5 seconds
      jest.advanceTimersByTime(5000);

      expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    });
  });

  describe('Title Animation', () => {
    it('should alternate between game over and winner text', () => {
      render(<EndPage {...defaultProps} />);

      // Initially should show game over
      expect(screen.getByText('++ GAME OVER ++')).toHaveClass('visible');
      expect(screen.getByText('Good Players Win!')).toHaveClass('hidden');

      // After 3 seconds, should switch
      jest.advanceTimersByTime(3000);

      expect(screen.getByText('++ GAME OVER ++')).toHaveClass('hidden');
      expect(screen.getByText('Good Players Win!')).toHaveClass('visible');

      // After another 3 seconds, should switch back
      jest.advanceTimersByTime(3000);

      expect(screen.getByText('++ GAME OVER ++')).toHaveClass('visible');
      expect(screen.getByText('Good Players Win!')).toHaveClass('hidden');
    });
  });

  describe('Trophy Display', () => {
    const trophyAward = {
      playerName: 'Alice',
      trophyName: 'Victory Trophy',
      trophyDescription: 'Awarded for winning the game'
    };

    it('should show trophy when winner is on winning team', () => {
      render(<EndPage
        {...defaultProps}
        winner="Good"
        trophyAward={trophyAward}
      />);

      expect(screen.getByText('Trophy Awarded!')).toBeInTheDocument();
      expect(screen.getByText('Victory Trophy')).toBeInTheDocument();
      expect(screen.getByText('Awarded to: Alice')).toBeInTheDocument();
      expect(screen.getByText('"Awarded for winning the game"')).toBeInTheDocument();
    });

    it('should not show trophy when winner is on losing team', () => {
      const trophyForLosingTeam = {
        ...trophyAward,
        playerName: 'Bob' // Bob is a warlock, but Good won
      };

      render(<EndPage
        {...defaultProps}
        winner="Good"
        trophyAward={trophyForLosingTeam}
      />);

      expect(screen.queryByText('Trophy Awarded!')).not.toBeInTheDocument();
    });

    it('should not show trophy when no trophy award provided', () => {
      render(<EndPage {...defaultProps} trophyAward={undefined} />);

      expect(screen.queryByText('Trophy Awarded!')).not.toBeInTheDocument();
    });

    it('should handle trophy for warlock when warlocks win', () => {
      const warlockTrophy = {
        playerName: 'Bob',
        trophyName: 'Evil Victory',
        trophyDescription: 'Corrupted all players'
      };

      render(<EndPage
        {...defaultProps}
        winner="Evil"
        trophyAward={warlockTrophy}
      />);

      expect(screen.getByText('Trophy Awarded!')).toBeInTheDocument();
      expect(screen.getByText('Evil Victory')).toBeInTheDocument();
    });
  });

  describe('Game History', () => {
    it('should not show history initially', () => {
      render(<EndPage {...defaultProps} />);

      expect(screen.queryByTestId('history-column')).not.toBeInTheDocument();
    });

    it('should show history when toggle button is clicked', () => {
      render(<EndPage {...defaultProps} />);

      fireEvent.click(screen.getByText('Unveil the Chronicle'));

      expect(screen.getByTestId('history-column')).toBeInTheDocument();
      expect(screen.getByText('History: 3 events, showAll: true')).toBeInTheDocument();
    });

    it('should hide history when toggle button is clicked again', () => {
      render(<EndPage {...defaultProps} />);

      // Show history
      fireEvent.click(screen.getByText('Unveil the Chronicle'));
      expect(screen.getByTestId('history-column')).toBeInTheDocument();

      // Hide history
      fireEvent.click(screen.getByText('Seal the Chronicle'));
      expect(screen.queryByTestId('history-column')).not.toBeInTheDocument();
    });

    it('should change button text when history is toggled', () => {
      render(<EndPage {...defaultProps} />);

      expect(screen.getByText('Unveil the Chronicle')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Unveil the Chronicle'));
      expect(screen.getByText('Seal the Chronicle')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Seal the Chronicle'));
      expect(screen.getByText('Unveil the Chronicle')).toBeInTheDocument();
    });

    it('should not show history section when no events log', () => {
      render(<EndPage {...defaultProps} eventsLog={[]} />);

      fireEvent.click(screen.getByText('Unveil the Chronicle'));
      expect(screen.queryByTestId('history-column')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should call play again handler when play again button is clicked', () => {
      render(<EndPage {...defaultProps} />);

      fireEvent.click(screen.getByText('Reawaken the Circle (ABC123)'));

      expect(mockSocket.emit).toHaveBeenCalledWith('playAgain', {
        gameCode: 'ABC123',
        playerName: 'TestPlayer'
      });
    });

    it('should handle play again with missing socket', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<EndPage {...defaultProps} socket={undefined} />);

      fireEvent.click(screen.getByText('Reawaken the Circle (ABC123)'));

      expect(consoleSpy).toHaveBeenCalledWith('Missing required data for play again');
      expect(mockSocket.emit).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle play again with missing game code', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<EndPage {...defaultProps} gameCode={undefined} />);

      fireEvent.click(screen.getByText('Reawaken the Circle (undefined)'));

      expect(consoleSpy).toHaveBeenCalledWith('Missing required data for play again');

      consoleSpy.mockRestore();
    });

    it('should navigate to home when forge new circle is clicked', () => {
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true
      });

      render(<EndPage {...defaultProps} />);

      fireEvent.click(screen.getByText('Forge a New Circle'));

      expect(window.location.href).toBe('/');
    });
  });

  describe('Lifecycle Effects', () => {
    it('should scroll to top on mount', () => {
      render(<EndPage {...defaultProps} />);

      expect(global.scrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth'
      });
    });

    it('should remove player name from localStorage on mount', () => {
      render(<EndPage {...defaultProps} />);

      expect(window.localStorage.removeItem).toHaveBeenCalledWith('lastPlayerName');
    });

    it('should clean up timers on unmount', () => {
      const { unmount } = render(<EndPage {...defaultProps} />);

      // Start with confetti visible
      expect(screen.getByTestId('confetti')).toBeInTheDocument();

      // Unmount before timer completes
      unmount();

      // Fast forward time - should not cause any issues
      jest.advanceTimersByTime(5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing players array', () => {
      expect(() => {
        render(<EndPage {...defaultProps} players={undefined as any} />);
      }).not.toThrow();
    });

    it('should handle missing events log', () => {
      render(<EndPage {...defaultProps} eventsLog={undefined} />);

      // Should still render without crashing
      expect(screen.getByText('Good Players Win!')).toBeInTheDocument();

      // History toggle should still work
      fireEvent.click(screen.getByText('Unveil the Chronicle'));
      expect(screen.queryByTestId('history-column')).not.toBeInTheDocument();
    });

    it('should handle invalid winner value', () => {
      expect(() => {
        render(<EndPage {...defaultProps} winner={'Invalid' as any} />);
      }).not.toThrow();
    });
  });

  describe('Trophy Avatar', () => {
    it('should generate correct avatar path for player with race and class', () => {
      const trophyAward = {
        playerName: 'Alice',
        trophyName: 'Test Trophy',
        trophyDescription: 'Test Description'
      };

      render(<EndPage
        {...defaultProps}
        winner="Good"
        trophyAward={trophyAward}
      />);

      const avatar = document.querySelector('.player-avatar');
      expect(avatar).toHaveStyle({
        backgroundImage: 'url(/images/avatars/human/warrior.png)'
      });
    });

    it('should use default avatar for player without race/class', () => {
      const playersWithoutRaceClass = [{
        id: 'player1',
        name: 'Alice',
        isWarlock: false,
        isAlive: true
      }];

      const trophyAward = {
        playerName: 'Alice',
        trophyName: 'Test Trophy',
        trophyDescription: 'Test Description'
      };

      render(<EndPage
        {...defaultProps}
        players={playersWithoutRaceClass}
        winner="Good"
        trophyAward={trophyAward}
      />);

      const avatar = document.querySelector('.player-avatar');
      expect(avatar).toHaveStyle({
        backgroundImage: 'url(/images/races/random.png)'
      });
    });
  });
});
