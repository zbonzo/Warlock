/**
 * @fileoverview Tests for BattleResultsModal.tsx
 * Comprehensive test suite for the BattleResultsModal component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import BattleResultsModal from '../../../../../client/src/components/modals/BattleResultsModal/BattleResultsModal';
import type { Player } from '../../../../../shared/types';

// Mock CSS
jest.mock('../../../../../client/src/components/modals/BattleResultsModal/BattleResultsModal.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('../../../../../client/src/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

// Mock EventsLog component
jest.mock('../../../../../client/src/components/game/EventsLog', () => {
  return function MockEventsLog({ events, currentPlayerId, players }: any) {
    return (
      <div data-testid="events-log">
        EventsLog component with {events?.length || 0} events
        {currentPlayerId && <span data-testid="current-player-id">{currentPlayerId}</span>}
        {players && <span data-testid="players-count">{players.length}</span>}
      </div>
    );
  };
});

describe('BattleResultsModal', () => {
  const mockEvents = [
    {
      type: 'action',
      message: 'Player attacks monster',
      timestamp: Date.now()
    },
    {
      type: 'damage',
      message: 'Monster takes 25 damage',
      timestamp: Date.now()
    }
  ];

  const mockPlayers: Player[] = [
    {
      id: 'player1',
      name: 'Test Player 1',
      race: 'Human',
      class: 'Warrior',
      hp: 80,
      maxHp: 100,
      level: 5,
      isAlive: true,
      isWarlock: false,
      armor: 10,
      baseArmor: 5,
      statusEffects: {}
    },
    {
      id: 'player2',
      name: 'Test Player 2',
      race: 'Elf',
      class: 'Wizard',
      hp: 60,
      maxHp: 80,
      level: 4,
      isAlive: true,
      isWarlock: false,
      armor: 5,
      baseArmor: 3,
      statusEffects: {}
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    events: mockEvents,
    round: 3,
    currentPlayerId: 'player1',
    players: mockPlayers,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseTheme.mockReturnValue({
      isDarkMode: false,
      toggleTheme: jest.fn()
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<BattleResultsModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Round 3 Results')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.getByText('Round 3 Results')).toBeInTheDocument();
    });

    it('should render events log component', () => {
      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.getByTestId('events-log')).toBeInTheDocument();
      expect(screen.getByText('EventsLog component with 2 events')).toBeInTheDocument();
    });

    it('should pass correct props to EventsLog', () => {
      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.getByTestId('current-player-id')).toHaveTextContent('player1');
      expect(screen.getByTestId('players-count')).toHaveTextContent('2');
    });

    it('should render continue button by default', () => {
      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.getByText('Continue to Next Round')).toBeInTheDocument();
    });

    it('should render close button (X)', () => {
      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.getByLabelText('Close battle results')).toBeInTheDocument();
    });
  });

  describe('Level Up Banner', () => {
    it('should not show level up banner when levelUp is not provided', () => {
      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.queryByText(/The heroes grow stronger/)).not.toBeInTheDocument();
    });

    it('should show level up banner when levelUp is provided', () => {
      const levelUpProps = {
        ...defaultProps,
        levelUp: { oldLevel: 2, newLevel: 3 }
      };

      render(<BattleResultsModal {...levelUpProps} />);

      expect(screen.getByText('— The heroes grow stronger — Level 3 —')).toBeInTheDocument();
    });

    it('should show correct new level in banner', () => {
      const levelUpProps = {
        ...defaultProps,
        levelUp: { oldLevel: 4, newLevel: 5 }
      };

      render(<BattleResultsModal {...levelUpProps} />);

      expect(screen.getByText('— The heroes grow stronger — Level 5 —')).toBeInTheDocument();
    });
  });

  describe('Game Over Banner', () => {
    it('should not show game over banner when winner is not provided', () => {
      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.queryByText(/Game Over!/)).not.toBeInTheDocument();
    });

    it('should show game over banner for Good team victory', () => {
      const gameOverProps = {
        ...defaultProps,
        winner: 'Good'
      };

      render(<BattleResultsModal {...gameOverProps} />);

      expect(screen.getByText('Game Over! Heroes Win!')).toBeInTheDocument();
    });

    it('should show game over banner for Evil team victory', () => {
      const gameOverProps = {
        ...defaultProps,
        winner: 'Evil'
      };

      render(<BattleResultsModal {...gameOverProps} />);

      expect(screen.getByText('Game Over! Warlocks Win!')).toBeInTheDocument();
    });

    it('should apply correct CSS class for winner', () => {
      const gameOverProps = {
        ...defaultProps,
        winner: 'Good'
      };

      const { container } = render(<BattleResultsModal {...gameOverProps} />);

      expect(container.querySelector('.game-over-banner.good')).toBeInTheDocument();
    });

    it('should show Close button instead of Continue when game is over', () => {
      const gameOverProps = {
        ...defaultProps,
        winner: 'Good'
      };

      render(<BattleResultsModal {...gameOverProps} />);

      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.queryByText('Continue to Next Round')).not.toBeInTheDocument();
    });
  });

  describe('Trophy Award', () => {
    it('should not show trophy award when trophyAward is not provided', () => {
      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.queryByText('Trophy Awarded!')).not.toBeInTheDocument();
    });

    it('should show trophy award when trophyAward is provided', () => {
      const trophyProps = {
        ...defaultProps,
        trophyAward: {
          playerName: 'Test Player',
          trophyName: 'First Blood',
          trophyDescription: 'Deal the first damage of the game'
        }
      };

      render(<BattleResultsModal {...trophyProps} />);

      expect(screen.getByText('🏆 Trophy Awarded! 🏆')).toBeInTheDocument();
      expect(screen.getByText('First Blood')).toBeInTheDocument();
      expect(screen.getByText('Awarded to: Test Player')).toBeInTheDocument();
      expect(screen.getByText('"Deal the first damage of the game"')).toBeInTheDocument();
    });

    it('should display trophy details correctly', () => {
      const trophyProps = {
        ...defaultProps,
        trophyAward: {
          playerName: 'John Doe',
          trophyName: 'Master Healer',
          trophyDescription: 'Heal 500 total HP in a single game'
        }
      };

      render(<BattleResultsModal {...trophyProps} />);

      expect(screen.getByText('Master Healer')).toBeInTheDocument();
      expect(screen.getByText('Awarded to: John Doe')).toBeInTheDocument();
      expect(screen.getByText('"Heal 500 total HP in a single game"')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when continue button is clicked', () => {
      const onClose = jest.fn();
      render(<BattleResultsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Continue to Next Round'));

      // Should trigger exit animation first
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close (X) button is clicked', () => {
      const onClose = jest.fn();
      render(<BattleResultsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText('Close battle results'));

      // Should trigger exit animation first
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when game over Close button is clicked', () => {
      const onClose = jest.fn();
      const gameOverProps = {
        ...defaultProps,
        winner: 'Good',
        onClose
      };

      render(<BattleResultsModal {...gameOverProps} />);

      fireEvent.click(screen.getByText('Close'));

      // Should trigger exit animation first
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close modal when Escape key is pressed', () => {
      const onClose = jest.fn();
      render(<BattleResultsModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      // Should trigger exit animation first
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal for other keys', () => {
      const onClose = jest.fn();
      render(<BattleResultsModal {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Space' });
      fireEvent.keyDown(window, { key: 'Tab' });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = render(<BattleResultsModal {...defaultProps} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Exit Animation', () => {
    it('should apply exiting class during exit animation', () => {
      const { container } = render(<BattleResultsModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Continue to Next Round'));

      expect(container.querySelector('.battle-results-overlay.exiting')).toBeInTheDocument();
    });

    it('should delay onClose call until after animation', () => {
      const onClose = jest.fn();
      render(<BattleResultsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Continue to Next Round'));

      // Should not call onClose immediately
      expect(onClose).not.toHaveBeenCalled();

      // Should call onClose after 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should reset exiting state after animation completes', () => {
      const onClose = jest.fn();
      render(<BattleResultsModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Continue to Next Round'));

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Exiting state should be reset after onClose is called
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Console Logging', () => {
    it('should log trophy award information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const trophyProps = {
        ...defaultProps,
        trophyAward: {
          playerName: 'Test Player',
          trophyName: 'Test Trophy',
          trophyDescription: 'Test Description'
        }
      };

      render(<BattleResultsModal {...trophyProps} />);

      expect(consoleSpy).toHaveBeenCalledWith(
        '🏆 BattleResultsModal rendered with trophyAward:',
        trophyProps.trophyAward
      );

      consoleSpy.mockRestore();
    });

    it('should log all props information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      render(<BattleResultsModal {...defaultProps} />);

      expect(consoleSpy).toHaveBeenCalledWith(
        '🏆 BattleResultsModal all props:',
        expect.objectContaining({
          isOpen: true,
          hasEvents: true,
          round: 3,
          hasPlayers: true,
          levelUp: undefined,
          winner: undefined,
          trophyAward: undefined
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty events array', () => {
      render(<BattleResultsModal {...defaultProps} events={[]} />);

      expect(screen.getByText('EventsLog component with 0 events')).toBeInTheDocument();
    });

    it('should handle null events', () => {
      render(<BattleResultsModal {...defaultProps} events={null as any} />);

      expect(screen.getByTestId('events-log')).toBeInTheDocument();
    });

    it('should handle undefined events', () => {
      render(<BattleResultsModal {...defaultProps} events={undefined as any} />);

      expect(screen.getByTestId('events-log')).toBeInTheDocument();
    });

    it('should handle missing players prop', () => {
      const propsWithoutPlayers = { ...defaultProps };
      delete (propsWithoutPlayers as any).players;

      render(<BattleResultsModal {...propsWithoutPlayers} />);

      expect(screen.getByTestId('events-log')).toBeInTheDocument();
    });

    it('should handle empty players array', () => {
      render(<BattleResultsModal {...defaultProps} players={[]} />);

      expect(screen.getByTestId('players-count')).toHaveTextContent('0');
    });

    it('should handle round number 0', () => {
      render(<BattleResultsModal {...defaultProps} round={0} />);

      expect(screen.getByText('Round 0 Results')).toBeInTheDocument();
    });

    it('should handle negative round number', () => {
      render(<BattleResultsModal {...defaultProps} round={-1} />);

      expect(screen.getByText('Round -1 Results')).toBeInTheDocument();
    });

    it('should handle very large round number', () => {
      render(<BattleResultsModal {...defaultProps} round={9999} />);

      expect(screen.getByText('Round 9999 Results')).toBeInTheDocument();
    });
  });

  describe('Component State Management', () => {
    it('should maintain exiting state correctly', () => {
      const { container } = render(<BattleResultsModal {...defaultProps} />);

      // Initially not exiting
      expect(container.querySelector('.exiting')).not.toBeInTheDocument();

      // Start exit
      fireEvent.click(screen.getByText('Continue to Next Round'));
      expect(container.querySelector('.exiting')).toBeInTheDocument();
    });

    it('should handle multiple close attempts gracefully', () => {
      const onClose = jest.fn();
      render(<BattleResultsModal {...defaultProps} onClose={onClose} />);

      // Click multiple times rapidly
      fireEvent.click(screen.getByText('Continue to Next Round'));
      fireEvent.click(screen.getByLabelText('Close battle results'));

      // Should only trigger one close sequence
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Theme Integration', () => {
    it('should work with dark theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: true,
        toggleTheme: jest.fn()
      });

      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.getByText('Round 3 Results')).toBeInTheDocument();
    });

    it('should work with light theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: false,
        toggleTheme: jest.fn()
      });

      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.getByText('Round 3 Results')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for close button', () => {
      render(<BattleResultsModal {...defaultProps} />);

      expect(screen.getByLabelText('Close battle results')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<BattleResultsModal {...defaultProps} />);

      const continueButton = screen.getByText('Continue to Next Round');
      const closeButton = screen.getByLabelText('Close battle results');

      // Buttons should be focusable
      continueButton.focus();
      expect(document.activeElement).toBe(continueButton);

      closeButton.focus();
      expect(document.activeElement).toBe(closeButton);
    });
  });
});
