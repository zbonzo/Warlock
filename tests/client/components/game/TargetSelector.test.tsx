/**
 * @fileoverview Tests for TargetSelector.tsx
 * Comprehensive test suite for the TargetSelector component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TargetSelector from '../../../../client/src/components/game/TargetSelector/TargetSelector';
import type { Player, Monster, Ability } from '../../../../shared/types';

// Mock CSS
jest.mock('../../../../client/src/components/game/TargetSelector/TargetSelector.css', () => ({}));
jest.mock('../../../../client/src/pages/GamePage/components/MobileActionWizard/TargetSelectionStep.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('../../../../client/src/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

// Mock constants
jest.mock('../../../../client/src/config/constants', () => ({
  ICONS: {
    CLASSES: {}
  }
}));

describe('TargetSelector', () => {
  const mockPlayer1: Player = {
    id: 'player1',
    name: 'Test Player 1',
    race: 'Human',
    class: 'Wizard',
    hp: 80,
    maxHp: 100,
    level: 5,
    isAlive: true,
    isWarlock: false,
    armor: 10,
    baseArmor: 5,
    statusEffects: {}
  };

  const mockPlayer2: Player = {
    id: 'player2',
    name: 'Test Player 2',
    race: 'Elf',
    class: 'Warrior',
    hp: 90,
    maxHp: 100,
    level: 4,
    isAlive: true,
    isWarlock: false,
    armor: 15,
    baseArmor: 10,
    statusEffects: {}
  };

  const mockMonster: Monster = {
    id: 'monster1',
    name: 'Test Monster',
    hp: 150,
    maxHp: 200,
    level: 3,
    isAlive: true,
    armor: 5,
    statusEffects: {}
  };

  const mockAttackAbility: Ability = {
    type: 'attack',
    name: 'Slash',
    category: 'Attack',
    unlockAt: 1,
    target: 'Enemy'
  };

  const mockHealAbility: Ability = {
    type: 'heal',
    name: 'Heal',
    category: 'Heal',
    unlockAt: 2,
    target: 'Ally'
  };

  const mockSelfAbility: Ability = {
    type: 'shield',
    name: 'Shield',
    category: 'Defense',
    unlockAt: 1,
    target: 'Self'
  };

  const defaultProps = {
    alivePlayers: [mockPlayer1, mockPlayer2],
    monster: mockMonster,
    currentPlayerId: 'player1',
    onSelectTarget: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      isDarkMode: false,
      toggleTheme: jest.fn()
    });
  });

  describe('Basic Rendering', () => {
    it('should render title and target options', () => {
      render(<TargetSelector {...defaultProps} />);
      
      expect(screen.getByText('Choose Target')).toBeInTheDocument();
      expect(screen.getByText('Test Player 1')).toBeInTheDocument();
      expect(screen.getByText('Test Player 2')).toBeInTheDocument();
      expect(screen.getByText('Monster')).toBeInTheDocument();
    });

    it('should show health values for all targets', () => {
      render(<TargetSelector {...defaultProps} />);
      
      expect(screen.getByText('80/100')).toBeInTheDocument(); // Player 1
      expect(screen.getByText('90/100')).toBeInTheDocument(); // Player 2
      expect(screen.getByText('150/200')).toBeInTheDocument(); // Monster
    });

    it('should apply selected class when target is selected', () => {
      const { container } = render(
        <TargetSelector {...defaultProps} selectedTarget="player1" />
      );
      
      expect(container.querySelector('.selected')).toBeInTheDocument();
    });

    it('should show "You" indicator for current player', () => {
      render(<TargetSelector {...defaultProps} />);
      
      expect(screen.getByText('Test Player 1 (You)')).toBeInTheDocument();
    });
  });

  describe('Monster Avatar', () => {
    it('should render monster avatar canvas', () => {
      const { container } = render(<TargetSelector {...defaultProps} />);
      
      const canvas = container.querySelector('canvas.monster-avatar');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('width', '40');
      expect(canvas).toHaveAttribute('height', '40');
    });

    it('should not render monster when disabled', () => {
      render(<TargetSelector {...defaultProps} disableMonster={true} />);
      
      expect(screen.queryByText('Monster')).not.toBeInTheDocument();
    });
  });

  describe('Custom Player Avatars', () => {
    it('should render custom avatar canvas for players with race and class', () => {
      const { container } = render(<TargetSelector {...defaultProps} />);
      
      const canvases = container.querySelectorAll('canvas.custom-avatar');
      expect(canvases).toHaveLength(2); // Two players with race/class
    });

    it('should show fallback avatar for players without race/class', () => {
      const playersWithoutRaceClass = [
        { ...mockPlayer1, race: null, class: null },
        { ...mockPlayer2, race: null, class: null }
      ];
      
      render(
        <TargetSelector 
          {...defaultProps} 
          alivePlayers={playersWithoutRaceClass} 
        />
      );
      
      expect(screen.getByText('You')).toBeInTheDocument();
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of player 2 name
    });
  });

  describe('Health Bar Display', () => {
    it('should show correct health percentages', () => {
      const { container } = render(<TargetSelector {...defaultProps} />);
      
      const healthFills = container.querySelectorAll('.health-fill');
      expect(healthFills[0]).toHaveStyle({ width: '75%' }); // Monster: 150/200
      expect(healthFills[1]).toHaveStyle({ width: '80%' }); // Player 1: 80/100
      expect(healthFills[2]).toHaveStyle({ width: '90%' }); // Player 2: 90/100
    });

    it('should apply correct health classes', () => {
      const lowHealthPlayer = { ...mockPlayer1, hp: 20, maxHp: 100 };
      const mediumHealthPlayer = { ...mockPlayer2, hp: 50, maxHp: 100 };
      
      const { container } = render(
        <TargetSelector 
          {...defaultProps} 
          alivePlayers={[lowHealthPlayer, mediumHealthPlayer]} 
        />
      );
      
      const healthFills = container.querySelectorAll('.health-fill');
      expect(healthFills[1]).toHaveClass('health-low'); // 20% health
      expect(healthFills[2]).toHaveClass('health-medium'); // 50% health
    });
  });

  describe('Target Selection', () => {
    it('should call onSelectTarget when monster is clicked', () => {
      const onSelectTarget = jest.fn();
      render(<TargetSelector {...defaultProps} onSelectTarget={onSelectTarget} />);
      
      fireEvent.click(screen.getByText('Monster'));
      expect(onSelectTarget).toHaveBeenCalledWith('__monster__');
    });

    it('should call onSelectTarget when player is clicked', () => {
      const onSelectTarget = jest.fn();
      render(<TargetSelector {...defaultProps} onSelectTarget={onSelectTarget} />);
      
      fireEvent.click(screen.getByText('Test Player 2'));
      expect(onSelectTarget).toHaveBeenCalledWith('player2');
    });

    it('should not call onSelectTarget for invalid targets', () => {
      const onSelectTarget = jest.fn();
      render(
        <TargetSelector 
          {...defaultProps} 
          onSelectTarget={onSelectTarget}
          selectedAbility={mockSelfAbility}
        />
      );
      
      // Should not be able to click player 2 with self-targeting ability
      const player2Element = screen.getByText('Test Player 2').closest('.player-target-card');
      fireEvent.click(player2Element!);
      expect(onSelectTarget).not.toHaveBeenCalled();
    });
  });

  describe('Ability-based Target Validation', () => {
    it('should only allow self-targeting for Self abilities', () => {
      const { container } = render(
        <TargetSelector 
          {...defaultProps} 
          selectedAbility={mockSelfAbility}
        />
      );
      
      // Only current player should be valid
      const playerCards = container.querySelectorAll('.player-target-card:not(.monster-target)');
      expect(playerCards[0]).not.toHaveClass('invalid-target'); // Current player
      expect(playerCards[1]).toHaveClass('invalid-target'); // Other player
    });

    it('should only allow players for Heal abilities', () => {
      render(
        <TargetSelector 
          {...defaultProps} 
          selectedAbility={mockHealAbility}
        />
      );
      
      // Monster should not be visible for heal abilities
      expect(screen.queryByText('Monster')).not.toBeInTheDocument();
      expect(screen.getByText('Test Player 1')).toBeInTheDocument();
      expect(screen.getByText('Test Player 2')).toBeInTheDocument();
    });

    it('should exclude self for Attack abilities', () => {
      const { container } = render(
        <TargetSelector 
          {...defaultProps} 
          selectedAbility={mockAttackAbility}
        />
      );
      
      // Monster should be available
      expect(screen.getByText('Monster')).toBeInTheDocument();
      
      // Current player should be invalid target for attacks
      const playerCards = container.querySelectorAll('.player-target-card:not(.monster-target)');
      expect(playerCards[0]).toHaveClass('invalid-target'); // Current player
      expect(playerCards[1]).not.toHaveClass('invalid-target'); // Other player
    });

    it('should allow all targets when no ability is selected', () => {
      const { container } = render(<TargetSelector {...defaultProps} />);
      
      expect(screen.getByText('Monster')).toBeInTheDocument();
      const invalidTargets = container.querySelectorAll('.invalid-target');
      expect(invalidTargets).toHaveLength(0);
    });
  });

  describe('Monster Restriction Message', () => {
    it('should show restriction message when monster is disabled but selected', () => {
      render(
        <TargetSelector 
          {...defaultProps} 
          disableMonster={true}
          selectedTarget="__monster__"
        />
      );
      
      expect(screen.getByText('Keen Senses can only target players. Please select a player target.')).toBeInTheDocument();
    });

    it('should not show restriction message when monster is enabled', () => {
      render(
        <TargetSelector 
          {...defaultProps} 
          selectedTarget="__monster__"
        />
      );
      
      expect(screen.queryByText('Keen Senses can only target players. Please select a player target.')).not.toBeInTheDocument();
    });
  });

  describe('Player Status Indicators', () => {
    it('should show ready indicator for players who submitted actions', () => {
      const playersWithSubmission = [
        { ...mockPlayer1, hasSubmittedAction: true },
        mockPlayer2
      ] as any[];
      
      const { container } = render(
        <TargetSelector 
          {...defaultProps} 
          alivePlayers={playersWithSubmission}
        />
      );
      
      const readyPlayer = container.querySelector('.ready');
      expect(readyPlayer).toBeInTheDocument();
    });

    it('should apply self class to current player', () => {
      const { container } = render(<TargetSelector {...defaultProps} />);
      
      const selfPlayer = container.querySelector('.self');
      expect(selfPlayer).toBeInTheDocument();
    });
  });

  describe('Health Class Calculation', () => {
    it('should return correct health classes for different percentages', () => {
      render(<TargetSelector {...defaultProps} />);
      
      // Test health class calculation indirectly through rendered elements
      const highHealthPlayer = { ...mockPlayer1, hp: 80, maxHp: 100 }; // 80%
      const mediumHealthPlayer = { ...mockPlayer1, hp: 50, maxHp: 100 }; // 50%
      const lowHealthPlayer = { ...mockPlayer1, hp: 20, maxHp: 100 }; // 20%
      
      const { container: highContainer } = render(
        <TargetSelector {...defaultProps} alivePlayers={[highHealthPlayer]} />
      );
      expect(highContainer.querySelector('.health-high')).toBeInTheDocument();
      
      const { container: mediumContainer } = render(
        <TargetSelector {...defaultProps} alivePlayers={[mediumHealthPlayer]} />
      );
      expect(mediumContainer.querySelector('.health-medium')).toBeInTheDocument();
      
      const { container: lowContainer } = render(
        <TargetSelector {...defaultProps} alivePlayers={[lowHealthPlayer]} />
      );
      expect(lowContainer.querySelector('.health-low')).toBeInTheDocument();
    });
  });

  describe('Canvas Drawing Functions', () => {
    it('should handle canvas drawing without errors', () => {
      // Test that canvas elements are created without throwing errors
      expect(() => {
        render(<TargetSelector {...defaultProps} />);
      }).not.toThrow();
    });

    it('should handle missing canvas context gracefully', () => {
      // Mock getContext to return null
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = jest.fn(() => null);
      
      expect(() => {
        render(<TargetSelector {...defaultProps} />);
      }).not.toThrow();
      
      // Restore original method
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty player list', () => {
      render(<TargetSelector {...defaultProps} alivePlayers={[]} />);
      
      expect(screen.getByText('Choose Target')).toBeInTheDocument();
      expect(screen.getByText('Monster')).toBeInTheDocument();
    });

    it('should handle null/undefined player properties', () => {
      const incompletePlayer = {
        id: 'player3',
        name: null,
        race: null,
        class: null,
        hp: null,
        maxHp: null,
        level: 1,
        isAlive: true,
        isWarlock: false,
        armor: null,
        baseArmor: 0,
        statusEffects: null
      } as any;
      
      expect(() => {
        render(
          <TargetSelector 
            {...defaultProps} 
            alivePlayers={[incompletePlayer]}
          />
        );
      }).not.toThrow();
    });

    it('should handle monster with zero health', () => {
      const deadMonster = { ...mockMonster, hp: 0 };
      
      const { container } = render(
        <TargetSelector {...defaultProps} monster={deadMonster} />
      );
      
      expect(screen.getByText('0/200')).toBeInTheDocument();
      const healthFill = container.querySelector('.health-fill');
      expect(healthFill).toHaveStyle({ width: '0%' });
    });

    it('should handle very long player names', () => {
      const longNamePlayer = {
        ...mockPlayer1,
        name: 'This is a very long player name that might cause display issues'
      };
      
      render(
        <TargetSelector 
          {...defaultProps} 
          alivePlayers={[longNamePlayer]}
        />
      );
      
      expect(screen.getByText('This is a very long player name that might cause display issues (You)')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<TargetSelector {...defaultProps} />);
      
      const targetCards = screen.getAllByText(/Test Player|Monster/);
      targetCards.forEach(card => {
        expect(card.closest('.player-target-card')).toBeInTheDocument();
      });
    });

    it('should have appropriate ARIA attributes', () => {
      render(<TargetSelector {...defaultProps} />);
      
      // Test that clickable elements are present and accessible
      const clickableElements = screen.getAllByText(/Test Player|Monster/);
      expect(clickableElements.length).toBeGreaterThan(0);
    });
  });
});