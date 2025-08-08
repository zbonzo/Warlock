/**
 * @fileoverview Tests for PlayerCard.tsx
 * Comprehensive test suite for the unified PlayerCard component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerCard from '../../../../client/src/components/common/PlayerCard/PlayerCard';
import type { Player } from '../../../../shared/types';

// Mock CSS
jest.mock('../../../../client/src/components/common/PlayerCard/PlayerCard.css', () => ({}));

describe('PlayerCard', () => {
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
    armor: 10,
    baseArmor: 5,
    statusEffects: {
      blessed: { active: true, turns: 3 },
      armor: 10
    }
  };

  const defaultProps = {
    player: mockPlayer,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render player card with basic information', () => {
      render(<PlayerCard {...defaultProps} />);

      expect(screen.getByText('Test Player')).toBeInTheDocument();
      expect(screen.getByText('80/100')).toBeInTheDocument();
    });

    it('should apply correct CSS classes for size', () => {
      const { container } = render(<PlayerCard {...defaultProps} size="large" />);

      expect(container.querySelector('.unified-player-card--large')).toBeInTheDocument();
    });

    it('should apply selected class when isSelected is true', () => {
      const { container } = render(<PlayerCard {...defaultProps} isSelected={true} />);

      expect(container.querySelector('.selected')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should show current player indicator when isCurrentPlayer is true', () => {
      render(<PlayerCard {...defaultProps} isCurrentPlayer={true} />);

      expect(screen.getByText('YOU')).toBeInTheDocument();
    });

    it('should apply dead class and show dead overlay for dead players', () => {
      const deadPlayer = { ...mockPlayer, isAlive: false };
      const { container } = render(<PlayerCard player={deadPlayer} />);

      expect(container.querySelector('.dead')).toBeInTheDocument();
      expect(screen.getByText('💀')).toBeInTheDocument();
    });

    it('should apply clickable class when onClick is provided', () => {
      const onClick = jest.fn();
      const { container } = render(<PlayerCard {...defaultProps} onClick={onClick} />);

      expect(container.querySelector('.clickable')).toBeInTheDocument();
    });
  });

  describe('Avatar and Background', () => {
    it('should show correct avatar path for race and class', () => {
      const { container } = render(<PlayerCard {...defaultProps} />);

      const background = container.querySelector('.player-card-background');
      expect(background).toHaveStyle({
        backgroundImage: 'url(/images/avatars/human/wizard.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'top center'
      });
    });

    it('should show random avatar for unselected player', () => {
      const unselectedPlayer = { ...mockPlayer, race: null, class: null };
      const { container } = render(<PlayerCard player={unselectedPlayer} />);

      const background = container.querySelector('.player-card-background');
      expect(background).toHaveStyle({
        backgroundImage: 'url(/images/races/random.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'center 20%'
      });
    });

    it('should handle missing race or class', () => {
      const incompletePlayer = { ...mockPlayer, race: 'Human', class: null };
      const { container } = render(<PlayerCard player={incompletePlayer} />);

      const background = container.querySelector('.player-card-background');
      expect(background).toHaveStyle({
        backgroundImage: 'url(/images/races/random.png)'
      });
    });
  });

  describe('Health Bar', () => {
    it('should display correct health values', () => {
      render(<PlayerCard {...defaultProps} />);

      expect(screen.getByText('80/100')).toBeInTheDocument();
    });

    it('should calculate health percentage correctly', () => {
      const { container } = render(<PlayerCard {...defaultProps} />);

      const healthFill = container.querySelector('.health-fill');
      expect(healthFill).toHaveStyle({
        width: '80%',
        backgroundColor: '#fbbf24', // Yellow for 80% health
        transform: 'scaleX(0.8)'
      });
    });

    it('should show green color for high health', () => {
      const highHealthPlayer = { ...mockPlayer, hp: 90, maxHp: 100 };
      const { container } = render(<PlayerCard player={highHealthPlayer} />);

      const healthFill = container.querySelector('.health-fill');
      expect(healthFill).toHaveStyle({
        backgroundColor: '#4ade80' // Green for >70% health
      });
    });

    it('should show red color for low health', () => {
      const lowHealthPlayer = { ...mockPlayer, hp: 20, maxHp: 100 };
      const { container } = render(<PlayerCard player={lowHealthPlayer} />);

      const healthFill = container.querySelector('.health-fill');
      expect(healthFill).toHaveStyle({
        backgroundColor: '#ef4444' // Red for ≤30% health
      });
    });

    it('should handle zero health', () => {
      const deadPlayer = { ...mockPlayer, hp: 0, maxHp: 100 };
      const { container } = render(<PlayerCard player={deadPlayer} />);

      const healthFill = container.querySelector('.health-fill');
      expect(healthFill).toHaveStyle({
        width: '0%',
        transform: 'scaleX(0)'
      });
    });

    it('should handle missing health values', () => {
      const playerWithoutHealth = { ...mockPlayer, hp: null, maxHp: null };
      render(<PlayerCard player={playerWithoutHealth} />);

      expect(screen.getByText('0/0')).toBeInTheDocument();
    });

    it('should not show health bar for unselected players', () => {
      const unselectedPlayer = { ...mockPlayer, race: null, class: null };
      const { container } = render(<PlayerCard player={unselectedPlayer} />);

      expect(container.querySelector('.health-bar-container')).not.toBeInTheDocument();
    });
  });

  describe('Status Effects', () => {
    it('should display armor status effect', () => {
      render(<PlayerCard {...defaultProps} />);

      expect(screen.getByTitle('armor: 10')).toBeInTheDocument();
      expect(screen.getByText('🛡️')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should display blessed status effect', () => {
      render(<PlayerCard {...defaultProps} />);

      expect(screen.getByTitle('blessed: 3')).toBeInTheDocument();
      expect(screen.getByText('✨')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display poisoned status effect', () => {
      const poisonedPlayer = {
        ...mockPlayer,
        statusEffects: { poisoned: { active: true, turns: 2 } }
      };
      render(<PlayerCard player={poisonedPlayer} />);

      expect(screen.getByTitle('poisoned: 2')).toBeInTheDocument();
      expect(screen.getByText('💀')).toBeInTheDocument();
    });

    it('should display stunned status effect', () => {
      const stunnedPlayer = {
        ...mockPlayer,
        statusEffects: { stunned: { active: true } }
      };
      render(<PlayerCard player={stunnedPlayer} />);

      expect(screen.getByTitle('stunned: ')).toBeInTheDocument();
      expect(screen.getByText('😵')).toBeInTheDocument();
    });

    it('should display shielded status effect', () => {
      const shieldedPlayer = {
        ...mockPlayer,
        statusEffects: { shielded: { active: true, stacks: 5 } }
      };
      render(<PlayerCard player={shieldedPlayer} />);

      expect(screen.getByTitle('shielded: 5')).toBeInTheDocument();
      expect(screen.getByText('🛡️')).toBeInTheDocument();
    });

    it('should not display inactive status effects', () => {
      const playerWithInactiveEffect = {
        ...mockPlayer,
        statusEffects: {
          blessed: { active: false, turns: 3 },
          poisoned: { active: true, turns: 1 }
        }
      };
      render(<PlayerCard player={playerWithInactiveEffect} />);

      expect(screen.queryByTitle('blessed: 3')).not.toBeInTheDocument();
      expect(screen.getByTitle('poisoned: 1')).toBeInTheDocument();
    });

    it('should hide status effects when showStatusEffects is false', () => {
      const { container } = render(<PlayerCard {...defaultProps} showStatusEffects={false} />);

      expect(container.querySelector('.status-effects-bar')).not.toBeInTheDocument();
    });

    it('should not show status effects for unselected players', () => {
      const unselectedPlayer = { ...mockPlayer, race: null, class: null };
      const { container } = render(<PlayerCard player={unselectedPlayer} />);

      expect(container.querySelector('.status-effects-bar')).not.toBeInTheDocument();
    });

    it('should use baseArmor when armor is not present', () => {
      const playerWithBaseArmor = {
        ...mockPlayer,
        armor: null,
        baseArmor: 8,
        statusEffects: {}
      };
      render(<PlayerCard player={playerWithBaseArmor} />);

      expect(screen.getByTitle('armor: 8')).toBeInTheDocument();
    });
  });

  describe('Player Information', () => {
    it('should display unknown for missing player name', () => {
      const playerWithoutName = { ...mockPlayer, name: null };
      render(<PlayerCard player={playerWithoutName} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should handle null player gracefully', () => {
      const { container } = render(<PlayerCard player={null} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(container.querySelector('.unified-player-card')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when card is clicked', () => {
      const onClick = jest.fn();
      render(<PlayerCard {...defaultProps} onClick={onClick} />);

      fireEvent.click(screen.getByText('Test Player'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when onClick is not provided', () => {
      const { container } = render(<PlayerCard {...defaultProps} />);

      expect(() => {
        fireEvent.click(container.querySelector('.unified-player-card'));
      }).not.toThrow();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom styles', () => {
      const customStyles = { backgroundColor: 'red', border: '2px solid blue' };
      const { container } = render(<PlayerCard {...defaultProps} customStyles={customStyles} />);

      const card = container.querySelector('.unified-player-card');
      expect(card).toHaveStyle(customStyles);
    });

    it('should handle empty custom styles', () => {
      const { container } = render(<PlayerCard {...defaultProps} customStyles={{}} />);

      expect(container.querySelector('.unified-player-card')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size class', () => {
      const { container } = render(<PlayerCard {...defaultProps} size="small" />);

      expect(container.querySelector('.unified-player-card--small')).toBeInTheDocument();
    });

    it('should apply medium size class by default', () => {
      const { container } = render(<PlayerCard {...defaultProps} />);

      expect(container.querySelector('.unified-player-card--medium')).toBeInTheDocument();
    });

    it('should apply large size class', () => {
      const { container } = render(<PlayerCard {...defaultProps} size="large" />);

      expect(container.querySelector('.unified-player-card--large')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined status effects', () => {
      const playerWithoutStatusEffects = { ...mockPlayer, statusEffects: undefined };
      render(<PlayerCard player={playerWithoutStatusEffects} />);

      // Should still show armor (defaulting to baseArmor or 0)
      expect(screen.getByTitle('armor: 5')).toBeInTheDocument();
    });

    it('should handle complex status effect data structures', () => {
      const playerWithComplexEffects = {
        ...mockPlayer,
        statusEffects: {
          customEffect: { active: true, turns: 2, stacks: 3, value: 10 }
        }
      };
      render(<PlayerCard player={playerWithComplexEffects} />);

      expect(screen.getByTitle('customEffect: 2')).toBeInTheDocument();
    });

    it('should handle zero values in status effects', () => {
      const playerWithZeroArmor = {
        ...mockPlayer,
        armor: 0,
        baseArmor: 0,
        statusEffects: {}
      };
      render(<PlayerCard player={playerWithZeroArmor} />);

      expect(screen.getByTitle('armor: 0')).toBeInTheDocument();
    });
  });
});
