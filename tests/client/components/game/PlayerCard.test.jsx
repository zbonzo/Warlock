/**
 * @fileoverview Tests for PlayerCard component
 * Tests player display, health bars, status effects, and warlock detection
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerCard from '@client/components/game/PlayerCard';

// Mock the ThemeContext
const mockThemeContext = {
  currentTheme: 'light',
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    accent: '#6f42c1'
  }
};

jest.mock('@client/contexts/ThemeContext', () => ({
  useTheme: () => mockThemeContext,
}));

// Mock path imports
jest.mock('@contexts/ThemeContext', () => ({
  useTheme: () => mockThemeContext,
}));

describe('PlayerCard', () => {
  const mockPlayer = {
    name: 'TestPlayer',
    race: 'Artisan',
    class: 'Warrior',
    hp: 80,
    maxHp: 100,
    armor: 5,
    isAlive: true,
    isWarlock: false,
    statusEffects: {},
  };

  const defaultProps = {
    player: mockPlayer,
    isCurrentPlayer: false,
    canSeeWarlock: false,
  };

  it('should render player card with basic information', () => {
    render(<PlayerCard {...defaultProps} />);

    expect(screen.getByText('TestPlayer - Artisan Warrior')).toBeInTheDocument();
    expect(screen.getByText('HP: 80/100')).toBeInTheDocument();
  });

  it('should display current player indicator', () => {
    render(<PlayerCard {...defaultProps} isCurrentPlayer={true} />);

    expect(screen.getByText('TestPlayer - Artisan Warrior (You)')).toBeInTheDocument();
  });

  it('should display health bar with correct percentage', () => {
    render(<PlayerCard {...defaultProps} />);

    const healthFill = document.querySelector('.health-fill');
    expect(healthFill).toHaveStyle('width: 80%');
    expect(healthFill).toHaveClass('health-medium');
  });

  it('should show high health status for >70% HP', () => {
    const highHealthPlayer = { ...mockPlayer, hp: 80, maxHp: 100 };
    render(<PlayerCard {...defaultProps} player={highHealthPlayer} />);

    const healthFill = document.querySelector('.health-fill');
    expect(healthFill).toHaveClass('health-high');
  });

  it('should show medium health status for 30-70% HP', () => {
    const mediumHealthPlayer = { ...mockPlayer, hp: 50, maxHp: 100 };
    render(<PlayerCard {...defaultProps} player={mediumHealthPlayer} />);

    const healthFill = document.querySelector('.health-fill');
    expect(healthFill).toHaveClass('health-medium');
  });

  it('should show low health status for <30% HP', () => {
    const lowHealthPlayer = { ...mockPlayer, hp: 20, maxHp: 100 };
    render(<PlayerCard {...defaultProps} player={lowHealthPlayer} />);

    const healthFill = document.querySelector('.health-fill');
    expect(healthFill).toHaveClass('health-low');
  });

  it('should display armor when player has armor', () => {
    render(<PlayerCard {...defaultProps} />);

    expect(screen.getByText('🛡️')).toBeInTheDocument();
    expect(screen.getByText('Base Armor: 5')).toBeInTheDocument();
  });

  it('should not display armor when player has no armor', () => {
    const noArmorPlayer = { ...mockPlayer, armor: 0 };
    render(<PlayerCard {...defaultProps} player={noArmorPlayer} />);

    expect(screen.queryByText('Base Armor: 0')).not.toBeInTheDocument();
  });

  it('should display dead overlay when player is dead', () => {
    const deadPlayer = { ...mockPlayer, isAlive: false };
    render(<PlayerCard {...defaultProps} player={deadPlayer} />);

    expect(screen.getByText('💀 Dead')).toBeInTheDocument();
    
    const card = document.querySelector('.player-card');
    expect(card).toHaveClass('dead');
  });

  it('should apply current player class', () => {
    render(<PlayerCard {...defaultProps} isCurrentPlayer={true} />);

    const card = document.querySelector('.player-card');
    expect(card).toHaveClass('current-player');
  });

  it('should handle unknown race and class', () => {
    const unknownPlayer = { ...mockPlayer, race: undefined, class: undefined };
    render(<PlayerCard {...defaultProps} player={unknownPlayer} />);

    expect(screen.getByText('TestPlayer - Unknown Unknown')).toBeInTheDocument();
  });

  describe('Status Effects', () => {
    it('should display poison status effect', () => {
      const poisonPlayer = {
        ...mockPlayer,
        statusEffects: {
          poison: { damage: 5, turns: 2 }
        }
      };
      render(<PlayerCard {...defaultProps} player={poisonPlayer} />);

      expect(screen.getByText('☠️')).toBeInTheDocument();
      expect(screen.getByText('Poison (5 dmg) (2 turns)')).toBeInTheDocument();
    });

    it('should display shielded status effect', () => {
      const shieldedPlayer = {
        ...mockPlayer,
        statusEffects: {
          shielded: { armor: 3, turns: 1 }
        }
      };
      render(<PlayerCard {...defaultProps} player={shieldedPlayer} />);

      expect(screen.getByText('🛡️')).toBeInTheDocument();
      expect(screen.getByText('Shielded +3 Armor (1 turn)')).toBeInTheDocument();
    });

    it('should display invisible status effect', () => {
      const invisiblePlayer = {
        ...mockPlayer,
        statusEffects: {
          invisible: { turns: 2 }
        }
      };
      render(<PlayerCard {...defaultProps} player={invisiblePlayer} />);

      expect(screen.getByText('👻')).toBeInTheDocument();
      expect(screen.getByText('Invisible (2 turns)')).toBeInTheDocument();
    });

    it('should display stunned status effect', () => {
      const stunnedPlayer = {
        ...mockPlayer,
        statusEffects: {
          stunned: { turns: 1 }
        }
      };
      render(<PlayerCard {...defaultProps} player={stunnedPlayer} />);

      expect(screen.getByText('⚡')).toBeInTheDocument();
      expect(screen.getByText('Stunned (1 turn)')).toBeInTheDocument();
    });

    it('should display unknown status effect', () => {
      const unknownEffectPlayer = {
        ...mockPlayer,
        statusEffects: {
          weirdEffect: { turns: 1 }
        }
      };
      render(<PlayerCard {...defaultProps} player={unknownEffectPlayer} />);

      expect(screen.getByText('❓')).toBeInTheDocument();
      expect(screen.getByText('weirdEffect (1 turn)')).toBeInTheDocument();
    });

    it('should display multiple status effects', () => {
      const multiEffectPlayer = {
        ...mockPlayer,
        statusEffects: {
          poison: { damage: 3, turns: 2 },
          shielded: { armor: 2, turns: 1 }
        }
      };
      render(<PlayerCard {...defaultProps} player={multiEffectPlayer} />);

      expect(screen.getByText('Poison (3 dmg) (2 turns)')).toBeInTheDocument();
      expect(screen.getByText('Shielded +2 Armor (1 turn)')).toBeInTheDocument();
    });

    it('should handle status effects with singular turn', () => {
      const singleTurnPlayer = {
        ...mockPlayer,
        statusEffects: {
          poison: { damage: 5, turns: 1 }
        }
      };
      render(<PlayerCard {...defaultProps} player={singleTurnPlayer} />);

      expect(screen.getByText('Poison (5 dmg) (1 turn)')).toBeInTheDocument();
    });

    it('should not display status effects container when no effects', () => {
      render(<PlayerCard {...defaultProps} />);

      const statusContainer = document.querySelector('.status-effects-container');
      expect(statusContainer).not.toBeInTheDocument();
    });
  });

  describe('Warlock Detection', () => {
    it('should display normal name when canSeeWarlock is false', () => {
      const warlockPlayer = { ...mockPlayer, isWarlock: true };
      render(<PlayerCard {...defaultProps} player={warlockPlayer} canSeeWarlock={false} />);

      expect(screen.getByText('TestPlayer - Artisan Warrior')).toBeInTheDocument();
      
      const card = document.querySelector('.player-card');
      expect(card).not.toHaveClass('warlock-player');
    });

    it('should display corrupted name when canSeeWarlock is true and player is warlock', () => {
      const warlockPlayer = { ...mockPlayer, isWarlock: true };
      render(<PlayerCard {...defaultProps} player={warlockPlayer} canSeeWarlock={true} />);

      // Check for warlock styling
      const card = document.querySelector('.player-card');
      expect(card).toHaveClass('warlock-player');
      
      const nameElement = document.querySelector('.warlock-text');
      expect(nameElement).toBeInTheDocument();
    });

    it('should display normal name when canSeeWarlock is true but player is not warlock', () => {
      const normalPlayer = { ...mockPlayer, isWarlock: false };
      render(<PlayerCard {...defaultProps} player={normalPlayer} canSeeWarlock={true} />);

      expect(screen.getByText('TestPlayer - Artisan Warrior')).toBeInTheDocument();
      
      const card = document.querySelector('.player-card');
      expect(card).not.toHaveClass('warlock-player');
    });

    it('should apply warlock styling when showing warlock', () => {
      const warlockPlayer = { ...mockPlayer, isWarlock: true };
      render(<PlayerCard {...defaultProps} player={warlockPlayer} canSeeWarlock={true} />);

      const card = document.querySelector('.player-card');
      expect(card).toHaveClass('warlock-player');
      
      const nameElement = document.querySelector('.warlock-text');
      expect(nameElement).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero HP', () => {
      const zeroHpPlayer = { ...mockPlayer, hp: 0 };
      render(<PlayerCard {...defaultProps} player={zeroHpPlayer} />);

      expect(screen.getByText('HP: 0/100')).toBeInTheDocument();
      
      const healthFill = document.querySelector('.health-fill');
      expect(healthFill).toHaveStyle('width: 0%');
    });

    it('should handle full HP', () => {
      const fullHpPlayer = { ...mockPlayer, hp: 100 };
      render(<PlayerCard {...defaultProps} player={fullHpPlayer} />);

      expect(screen.getByText('HP: 100/100')).toBeInTheDocument();
      
      const healthFill = document.querySelector('.health-fill');
      expect(healthFill).toHaveStyle('width: 100%');
      expect(healthFill).toHaveClass('health-high');
    });

    it('should handle negative armor', () => {
      const negativeArmorPlayer = { ...mockPlayer, armor: -5 };
      render(<PlayerCard {...defaultProps} player={negativeArmorPlayer} />);

      expect(screen.queryByText('Base Armor: -5')).not.toBeInTheDocument();
    });

    it('should handle empty player name', () => {
      const emptyNamePlayer = { ...mockPlayer, name: '' };
      render(<PlayerCard {...defaultProps} player={emptyNamePlayer} />);

      expect(screen.getByText(' - Artisan Warrior')).toBeInTheDocument();
    });

    it('should handle status effects without additional data', () => {
      const simpleEffectPlayer = {
        ...mockPlayer,
        statusEffects: {
          poison: {}
        }
      };
      render(<PlayerCard {...defaultProps} player={simpleEffectPlayer} />);

      expect(screen.getByText('Poison')).toBeInTheDocument();
    });

    it('should handle very large HP values', () => {
      const largeHpPlayer = { ...mockPlayer, hp: 999999, maxHp: 999999 };
      render(<PlayerCard {...defaultProps} player={largeHpPlayer} />);

      expect(screen.getByText('HP: 999999/999999')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper title attributes for status effects', () => {
      const poisonPlayer = {
        ...mockPlayer,
        statusEffects: {
          poison: { damage: 5, turns: 2 }
        }
      };
      render(<PlayerCard {...defaultProps} player={poisonPlayer} />);

      const statusEffect = document.querySelector('.status-effect');
      expect(statusEffect).toHaveAttribute('title', 'Poison (5 dmg) (2 turns)');
    });

    it('should have proper structure for screen readers', () => {
      render(<PlayerCard {...defaultProps} />);

      const card = document.querySelector('.player-card');
      expect(card).toBeInTheDocument();
      
      const header = document.querySelector('.character-header');
      expect(header).toBeInTheDocument();
      
      const healthContainer = document.querySelector('.health-container');
      expect(healthContainer).toBeInTheDocument();
    });
  });
});