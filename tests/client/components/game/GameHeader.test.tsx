/**
 * @fileoverview Tests for GameHeader.tsx
 * Tests the unified GameHeader component with responsive design
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameHeader from '../../../../client/src/components/game/GameHeader/GameHeader';
import type { Player } from '../../../../shared/types';

// Mock CSS
jest.mock('../../../../client/src/components/game/GameHeader/GameHeader.css', () => ({}));

describe('GameHeader', () => {
  const mockPlayer: Player = {
    id: 'player1',
    name: 'Test Player',
    race: 'Human',
    class: 'Wizard',
    hp: 80,
    maxHp: 100,
    level: 5,
    isAlive: true,
    isWarlock: false,
    statusEffects: {
      armor: 10,
      blessed: { active: true, turns: 2 }
    }
  };

  const mockPlayers: Player[] = [
    mockPlayer,
    {
      id: 'player2',
      name: 'Player 2',
      race: 'Orc',
      class: 'Warrior',
      hp: 90,
      maxHp: 100,
      level: 3,
      isAlive: true,
      isWarlock: true
    },
    {
      id: 'player3',
      name: 'Player 3',
      race: 'Elf',
      class: 'Priest',
      hp: 0,
      maxHp: 100,
      level: 4,
      isAlive: false,
      isWarlock: false
    }
  ];

  const defaultProps = {
    player: mockPlayer,
    round: 3,
    players: mockPlayers,
    isMobile: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render player name and details', () => {
      render(<GameHeader {...defaultProps} />);

      expect(screen.getByText('Test Player')).toBeInTheDocument();
      expect(screen.getByText('Wizard')).toBeInTheDocument();
      expect(screen.getByText('Human')).toBeInTheDocument();
    });

    it('should render round information', () => {
      render(<GameHeader {...defaultProps} />);

      expect(screen.getByText('Round 3')).toBeInTheDocument();
    });

    it('should render level information', () => {
      render(<GameHeader {...defaultProps} />);

      expect(screen.getByText('Level 5')).toBeInTheDocument();
    });

    it('should render health information', () => {
      render(<GameHeader {...defaultProps} />);

      expect(screen.getByText('80/100')).toBeInTheDocument();
    });

    it('should not render when player is null', () => {
      const { container } = render(<GameHeader {...defaultProps} player={null} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Avatar Background', () => {
    it('should set correct avatar background for race and class', () => {
      const { container } = render(<GameHeader {...defaultProps} />);

      const headerContent = container.querySelector('.game-header-content');
      expect(headerContent).toHaveStyle({
        backgroundImage: 'url(/images/avatars/human/wizard.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'left bottom',
        backgroundRepeat: 'no-repeat'
      });
    });

    it('should use random avatar for missing race or class', () => {
      const playerWithoutRace = { ...mockPlayer, race: null, class: null };
      const { container } = render(<GameHeader {...defaultProps} player={playerWithoutRace} />);

      const headerContent = container.querySelector('.game-header-content');
      expect(headerContent).toHaveStyle({
        backgroundImage: 'url(/images/races/random.png)'
      });
    });
  });

  describe('Health Bar', () => {
    it('should display correct health percentage and color', () => {
      const { container } = render(<GameHeader {...defaultProps} />);

      const healthFill = container.querySelector('.health-fill');
      expect(healthFill).toHaveStyle({
        width: '80%',
        backgroundColor: '#fbbf24', // Yellow for 80% health
        transform: 'scaleX(0.8)'
      });
    });

    it('should show green color for high health', () => {
      const highHealthPlayer = { ...mockPlayer, hp: 90, maxHp: 100 };
      const { container } = render(<GameHeader {...defaultProps} player={highHealthPlayer} />);

      const healthFill = container.querySelector('.health-fill');
      expect(healthFill).toHaveStyle({
        backgroundColor: '#4ade80' // Green for >70% health
      });
    });

    it('should show red color for low health', () => {
      const lowHealthPlayer = { ...mockPlayer, hp: 20, maxHp: 100 };
      const { container } = render(<GameHeader {...defaultProps} player={lowHealthPlayer} />);

      const healthFill = container.querySelector('.health-fill');
      expect(healthFill).toHaveStyle({
        backgroundColor: '#ef4444' // Red for ≤30% health
      });
    });

    it('should handle zero health', () => {
      const deadPlayer = { ...mockPlayer, hp: 0, maxHp: 100 };
      const { container } = render(<GameHeader {...defaultProps} player={deadPlayer} />);

      const healthFill = container.querySelector('.health-fill');
      expect(healthFill).toHaveStyle({
        width: '0%',
        transform: 'scaleX(0)'
      });
    });

    it('should handle missing health values', () => {
      const playerWithoutHealth = { ...mockPlayer, hp: null, maxHp: null };
      render(<GameHeader {...defaultProps} player={playerWithoutHealth} />);

      expect(screen.getByText('0/0')).toBeInTheDocument();
    });
  });

  describe('Status Effects', () => {
    it('should display armor status effect', () => {
      render(<GameHeader {...defaultProps} />);

      expect(screen.getByText('🛡️')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should display blessed status effect', () => {
      render(<GameHeader {...defaultProps} />);

      expect(screen.getByText('✨')).toBeInTheDocument();
    });

    it('should display stunned status effect', () => {
      const stunnedPlayer = {
        ...mockPlayer,
        statusEffects: { stunned: true }
      };
      render(<GameHeader {...defaultProps} player={stunnedPlayer} />);

      expect(screen.getByText('💫')).toBeInTheDocument();
    });

    it('should not display inactive status effects', () => {
      const playerWithoutEffects = {
        ...mockPlayer,
        statusEffects: {}
      };
      const { container } = render(<GameHeader {...defaultProps} player={playerWithoutEffects} />);

      expect(container.querySelector('.status-effect.armor')).not.toBeInTheDocument();
      expect(container.querySelector('.status-effect.blessed')).not.toBeInTheDocument();
    });
  });

  describe('Player Statistics', () => {
    it('should show correct alive player count', () => {
      render(<GameHeader {...defaultProps} />);

      expect(screen.getByText('2 Players Alive')).toBeInTheDocument();
    });

    it('should show correct warlock count for non-warlock player', () => {
      render(<GameHeader {...defaultProps} />);

      expect(screen.getByText('0 Warlocks killed')).toBeInTheDocument();
    });

    it('should show fellow warlocks count for warlock player', () => {
      const warlockPlayer = { ...mockPlayer, isWarlock: true };
      render(<GameHeader {...defaultProps} player={warlockPlayer} />);

      expect(screen.getByText('0 fellow Warlocks')).toBeInTheDocument();
    });

    it('should handle empty players list', () => {
      render(<GameHeader {...defaultProps} players={[]} />);

      expect(screen.getByText('0 Players Alive')).toBeInTheDocument();
      expect(screen.getByText('0 Warlocks killed')).toBeInTheDocument();
    });

    it('should handle players list with multiple dead warlocks', () => {
      const playersWithDeadWarlocks = [
        ...mockPlayers,
        {
          id: 'player4',
          name: 'Dead Warlock',
          race: 'Orc',
          class: 'Assassin',
          hp: 0,
          maxHp: 100,
          level: 2,
          isAlive: false,
          isWarlock: true
        }
      ];

      render(<GameHeader {...defaultProps} players={playersWithDeadWarlocks} />);

      expect(screen.getByText('1 Warlocks killed')).toBeInTheDocument();
    });
  });

  describe('Warlock Styling', () => {
    it('should show corruption overlay for warlock player in desktop mode', () => {
      const warlockPlayer = { ...mockPlayer, isWarlock: true };
      const { container } = render(<GameHeader {...defaultProps} player={warlockPlayer} isMobile={false} />);

      const corruptionOverlay = container.querySelector('.corruption-overlay');
      expect(corruptionOverlay).toBeInTheDocument();
      expect(corruptionOverlay).toHaveStyle({
        backgroundImage: 'url(/images/warlock/corruption.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: '0.5'
      });
    });

    it('should show mobile corruption indicator for warlock player in mobile mode', () => {
      const warlockPlayer = { ...mockPlayer, isWarlock: true };
      const { container } = render(<GameHeader {...defaultProps} player={warlockPlayer} isMobile={true} />);

      const mobileCorruption = container.querySelector('.mobile-corruption-indicator');
      expect(mobileCorruption).toBeInTheDocument();
      expect(mobileCorruption).toHaveStyle({
        backgroundImage: 'url(/images/warlock/corruption.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: '0.3'
      });
    });

    it('should not show corruption styling for non-warlock player', () => {
      const { container } = render(<GameHeader {...defaultProps} />);

      expect(container.querySelector('.corruption-overlay')).not.toBeInTheDocument();
      expect(container.querySelector('.mobile-corruption-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should apply mobile class when isMobile is true', () => {
      const { container } = render(<GameHeader {...defaultProps} isMobile={true} />);

      expect(container.querySelector('.mobile')).toBeInTheDocument();
    });

    it('should apply desktop class when isMobile is false', () => {
      const { container } = render(<GameHeader {...defaultProps} isMobile={false} />);

      expect(container.querySelector('.desktop')).toBeInTheDocument();
    });

    it('should default to desktop mode when isMobile is not specified', () => {
      const { container } = render(<GameHeader player={mockPlayer} round={1} />);

      expect(container.querySelector('.desktop')).toBeInTheDocument();
    });
  });

  describe('Level Display', () => {
    it('should show default level 1 when level is not specified', () => {
      const playerWithoutLevel = { ...mockPlayer, level: null };
      render(<GameHeader {...defaultProps} player={playerWithoutLevel} />);

      expect(screen.getByText('Level 1')).toBeInTheDocument();
    });

    it('should handle zero level', () => {
      const playerWithZeroLevel = { ...mockPlayer, level: 0 };
      render(<GameHeader {...defaultProps} player={playerWithZeroLevel} />);

      expect(screen.getByText('Level 1')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined statusEffects', () => {
      const playerWithoutStatusEffects = { ...mockPlayer, statusEffects: undefined };

      expect(() => {
        render(<GameHeader {...defaultProps} player={playerWithoutStatusEffects} />);
      }).not.toThrow();
    });

    it('should handle null statusEffects', () => {
      const playerWithNullStatusEffects = { ...mockPlayer, statusEffects: null };

      expect(() => {
        render(<GameHeader {...defaultProps} player={playerWithNullStatusEffects} />);
      }).not.toThrow();
    });

    it('should handle missing player name', () => {
      const playerWithoutName = { ...mockPlayer, name: null };
      render(<GameHeader {...defaultProps} player={playerWithoutName} />);

      expect(screen.queryByText('Test Player')).not.toBeInTheDocument();
    });

    it('should handle missing race and class', () => {
      const incompletePlayer = { ...mockPlayer, race: null, class: null };
      render(<GameHeader {...defaultProps} player={incompletePlayer} />);

      expect(screen.queryByText('Wizard')).not.toBeInTheDocument();
      expect(screen.queryByText('Human')).not.toBeInTheDocument();
    });
  });
});
