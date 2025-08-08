/**
 * @fileoverview Tests for PlayerGroup component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerGroup from '../../../../../client/src/pages/EndPage/components/PlayerGroup';

// Mock CSS imports
jest.mock('../../../../../client/src/pages/EndPage/components/PlayerGroup.css', () => ({}));

describe('PlayerGroup', () => {
  const mockPlayers = [
    {
      id: 'player1',
      name: 'Alice',
      race: 'Human',
      class: 'Warrior',
      isAlive: true
    },
    {
      id: 'player2',
      name: 'Bob',
      race: 'Orc',
      class: 'Wizard',
      isAlive: false
    },
    {
      id: 'player3',
      name: 'Charlie',
      race: 'Elf',
      class: 'Priest',
      isAlive: true
    }
  ];

  const defaultProps = {
    title: 'Good Players',
    players: mockPlayers,
    color: '#00ff00'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the group title', () => {
      render(<PlayerGroup {...defaultProps} />);

      expect(screen.getByText('Good Players')).toBeInTheDocument();
    });

    it('should render all players', () => {
      render(<PlayerGroup {...defaultProps} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should render player character information', () => {
      render(<PlayerGroup {...defaultProps} />);

      expect(screen.getByText('Human Warrior')).toBeInTheDocument();
      expect(screen.getByText('Orc Wizard')).toBeInTheDocument();
      expect(screen.getByText('Elf Priest')).toBeInTheDocument();
    });

    it('should render with empty players array', () => {
      render(<PlayerGroup {...defaultProps} players={[]} />);

      expect(screen.getByText('Good Players')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply correct background color and border', () => {
      render(<PlayerGroup {...defaultProps} />);

      const playerGroup = screen.getByText('Good Players').closest('.player-group');
      expect(playerGroup).toHaveStyle({
        backgroundColor: '#00ff0015',
        borderLeft: '4px solid #00ff00'
      });
    });

    it('should apply color to group title', () => {
      render(<PlayerGroup {...defaultProps} />);

      const title = screen.getByText('Good Players');
      expect(title).toHaveStyle({ color: '#00ff00' });
    });

    it('should apply different colors correctly', () => {
      render(<PlayerGroup {...defaultProps} color="#ff0000" />);

      const playerGroup = screen.getByText('Good Players').closest('.player-group');
      const title = screen.getByText('Good Players');

      expect(playerGroup).toHaveStyle({
        backgroundColor: '#ff000015',
        borderLeft: '4px solid #ff0000'
      });
      expect(title).toHaveStyle({ color: '#ff0000' });
    });
  });

  describe('Player Badges', () => {
    it('should render player badges for all players', () => {
      render(<PlayerGroup {...defaultProps} />);

      const playerBadges = document.querySelectorAll('.player-badge');
      expect(playerBadges).toHaveLength(3);
    });

    it('should show player separators', () => {
      render(<PlayerGroup {...defaultProps} />);

      const separators = screen.getAllByText('•');
      expect(separators).toHaveLength(3); // One for each player
    });

    it('should apply correct border color for alive players', () => {
      render(<PlayerGroup {...defaultProps} />);

      const aliceBadge = screen.getByText('Alice').closest('.player-badge');
      const charlieBadge = screen.getByText('Charlie').closest('.player-badge');

      expect(aliceBadge).toHaveStyle({ borderColor: '#00ff00' });
      expect(charlieBadge).toHaveStyle({ borderColor: '#00ff00' });
    });

    it('should apply grey border color for dead players', () => {
      render(<PlayerGroup {...defaultProps} />);

      const bobBadge = screen.getByText('Bob').closest('.player-badge');
      expect(bobBadge).toHaveStyle({ borderColor: '#ccc' });
    });

    it('should add dead class to dead players', () => {
      render(<PlayerGroup {...defaultProps} />);

      const bobBadge = screen.getByText('Bob').closest('.player-badge');
      expect(bobBadge).toHaveClass('dead');

      const aliceBadge = screen.getByText('Alice').closest('.player-badge');
      expect(aliceBadge).not.toHaveClass('dead');
    });

    it('should show death indicator for dead players', () => {
      render(<PlayerGroup {...defaultProps} />);

      // Bob is dead, should have death indicator
      const bobBadge = screen.getByText('Bob').closest('.player-badge');
      expect(bobBadge).toHaveTextContent('💀');

      // Alice is alive, should not have death indicator
      const aliceBadge = screen.getByText('Alice').closest('.player-badge');
      expect(aliceBadge).not.toHaveTextContent('💀');
    });

    it('should not show death indicator for alive players', () => {
      render(<PlayerGroup {...defaultProps} />);

      const aliceBadge = screen.getByText('Alice').closest('.player-badge');
      const charlieBadge = screen.getByText('Charlie').closest('.player-badge');

      expect(aliceBadge?.querySelector('.death-indicator')).toBeNull();
      expect(charlieBadge?.querySelector('.death-indicator')).toBeNull();
    });
  });

  describe('Player Information Display', () => {
    it('should handle players with missing race or class', () => {
      const playersWithMissingInfo = [
        {
          id: 'player1',
          name: 'NoRace',
          class: 'Warrior',
          isAlive: true
        },
        {
          id: 'player2',
          name: 'NoClass',
          race: 'Human',
          isAlive: true
        },
        {
          id: 'player3',
          name: 'Neither',
          isAlive: true
        }
      ];

      render(<PlayerGroup {...defaultProps} players={playersWithMissingInfo} />);

      expect(screen.getByText('NoRace')).toBeInTheDocument();
      expect(screen.getByText('NoClass')).toBeInTheDocument();
      expect(screen.getByText('Neither')).toBeInTheDocument();

      // Should still render character info section even if empty
      expect(screen.getByText(' Warrior')).toBeInTheDocument(); // Leading space due to missing race
      expect(screen.getByText('Human ')).toBeInTheDocument(); // Trailing space due to missing class
    });

    it('should render complete player information when available', () => {
      render(<PlayerGroup {...defaultProps} />);

      // Check that race and class are both displayed
      mockPlayers.forEach(player => {
        if (player.race && player.class) {
          expect(screen.getByText(`${player.race} ${player.class}`)).toBeInTheDocument();
        }
      });
    });
  });

  describe('Props Handling', () => {
    it('should handle different title texts', () => {
      render(<PlayerGroup {...defaultProps} title="Evil Warlocks" />);

      expect(screen.getByText('Evil Warlocks')).toBeInTheDocument();
      expect(screen.queryByText('Good Players')).not.toBeInTheDocument();
    });

    it('should handle different color values', () => {
      const testColors = ['#ff0000', '#0000ff', 'rgb(255, 0, 0)', 'red'];

      testColors.forEach((color, index) => {
        const { rerender } = render(
          <PlayerGroup {...defaultProps} color={color} title={`Test ${index}`} />
        );

        const title = screen.getByText(`Test ${index}`);
        expect(title).toHaveStyle({ color });

        if (index < testColors.length - 1) {
          rerender(<PlayerGroup {...defaultProps} color={testColors[index + 1]} title={`Test ${index + 1}`} />);
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single player', () => {
      const singlePlayer = [mockPlayers[0]];

      render(<PlayerGroup {...defaultProps} players={singlePlayer} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Human Warrior')).toBeInTheDocument();

      const playerBadges = document.querySelectorAll('.player-badge');
      expect(playerBadges).toHaveLength(1);
    });

    it('should handle players with very long names', () => {
      const longNamePlayer = [{
        id: 'player1',
        name: 'PlayerWithAVeryLongNameThatMightCauseLayoutIssues',
        race: 'Human',
        class: 'Warrior',
        isAlive: true
      }];

      render(<PlayerGroup {...defaultProps} players={longNamePlayer} />);

      expect(screen.getByText('PlayerWithAVeryLongNameThatMightCauseLayoutIssues')).toBeInTheDocument();
    });

    it('should handle undefined color gracefully', () => {
      expect(() => {
        render(<PlayerGroup {...defaultProps} color={undefined as any} />);
      }).not.toThrow();
    });

    it('should handle null players array', () => {
      expect(() => {
        render(<PlayerGroup {...defaultProps} players={null as any} />);
      }).not.toThrow();
    });

    it('should handle undefined title', () => {
      expect(() => {
        render(<PlayerGroup {...defaultProps} title={undefined as any} />);
      }).not.toThrow();
    });
  });
});
