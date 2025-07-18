/**
 * @fileoverview Tests for GameDashboard component
 * Tests game status display, monster health, and player count
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import GameDashboard from '@client/components/game/GameDashboard';

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

describe('GameDashboard', () => {
  const mockAlivePlayers = [
    { id: 1, name: 'Player 1', isAlive: true },
    { id: 2, name: 'Player 2', isAlive: true },
    { id: 3, name: 'Player 3', isAlive: true }
  ];

  const mockMonster = {
    hp: 80,
    maxHp: 100,
    nextDamage: 25
  };

  const defaultProps = {
    round: 3,
    alivePlayers: mockAlivePlayers,
    monster: mockMonster
  };

  it('should render dashboard with all sections', () => {
    render(<GameDashboard {...defaultProps} />);

    expect(screen.getByText('Round 3')).toBeInTheDocument();
    expect(screen.getByText('Players')).toBeInTheDocument();
    expect(screen.getByText('Monster')).toBeInTheDocument();
  });

  it('should display current round number', () => {
    render(<GameDashboard {...defaultProps} />);

    expect(screen.getByText('Round 3')).toBeInTheDocument();
  });

  it('should display player count', () => {
    render(<GameDashboard {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('alive')).toBeInTheDocument();
  });

  it('should display monster health', () => {
    render(<GameDashboard {...defaultProps} />);

    expect(screen.getByText('80/100')).toBeInTheDocument();
  });

  it('should display next monster damage', () => {
    render(<GameDashboard {...defaultProps} />);

    expect(screen.getByText('Next strike: 25')).toBeInTheDocument();
  });

  it('should display correct health bar percentage', () => {
    render(<GameDashboard {...defaultProps} />);

    const healthBar = document.querySelector('.health-bar-fill');
    expect(healthBar).toHaveStyle('width: 80%');
  });

  it('should not apply low health class when health is above 30%', () => {
    render(<GameDashboard {...defaultProps} />);

    const healthBar = document.querySelector('.health-bar-fill');
    expect(healthBar).not.toHaveClass('low-health');
  });

  it('should apply low health class when health is below 30%', () => {
    const lowHealthMonster = { ...mockMonster, hp: 20 };
    render(<GameDashboard {...defaultProps} monster={lowHealthMonster} />);

    const healthBar = document.querySelector('.health-bar-fill');
    expect(healthBar).toHaveClass('low-health');
  });

  it('should apply low health class when health is exactly 30%', () => {
    const exactlyLowHealthMonster = { ...mockMonster, hp: 30 };
    render(<GameDashboard {...defaultProps} monster={exactlyLowHealthMonster} />);

    const healthBar = document.querySelector('.health-bar-fill');
    expect(healthBar).toHaveClass('low-health');
  });

  it('should handle zero alive players', () => {
    render(<GameDashboard {...defaultProps} alivePlayers={[]} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('alive')).toBeInTheDocument();
  });

  it('should handle single alive player', () => {
    const singlePlayer = [mockAlivePlayers[0]];
    render(<GameDashboard {...defaultProps} alivePlayers={singlePlayer} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('alive')).toBeInTheDocument();
  });

  it('should handle many alive players', () => {
    const manyPlayers = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      isAlive: true
    }));
    render(<GameDashboard {...defaultProps} alivePlayers={manyPlayers} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('alive')).toBeInTheDocument();
  });

  it('should handle first round', () => {
    render(<GameDashboard {...defaultProps} round={1} />);

    expect(screen.getByText('Round 1')).toBeInTheDocument();
  });

  it('should handle high round numbers', () => {
    render(<GameDashboard {...defaultProps} round={99} />);

    expect(screen.getByText('Round 99')).toBeInTheDocument();
  });

  it('should handle zero monster health', () => {
    const deadMonster = { ...mockMonster, hp: 0 };
    render(<GameDashboard {...defaultProps} monster={deadMonster} />);

    expect(screen.getByText('0/100')).toBeInTheDocument();
    
    const healthBar = document.querySelector('.health-bar-fill');
    expect(healthBar).toHaveStyle('width: 0%');
    expect(healthBar).toHaveClass('low-health');
  });

  it('should handle full monster health', () => {
    const fullHealthMonster = { ...mockMonster, hp: 100 };
    render(<GameDashboard {...defaultProps} monster={fullHealthMonster} />);

    expect(screen.getByText('100/100')).toBeInTheDocument();
    
    const healthBar = document.querySelector('.health-bar-fill');
    expect(healthBar).toHaveStyle('width: 100%');
    expect(healthBar).not.toHaveClass('low-health');
  });

  it('should handle high monster damage', () => {
    const highDamageMonster = { ...mockMonster, nextDamage: 999 };
    render(<GameDashboard {...defaultProps} monster={highDamageMonster} />);

    expect(screen.getByText('Next strike: 999')).toBeInTheDocument();
  });

  it('should handle zero monster damage', () => {
    const noDamageMonster = { ...mockMonster, nextDamage: 0 };
    render(<GameDashboard {...defaultProps} monster={noDamageMonster} />);

    expect(screen.getByText('Next strike: 0')).toBeInTheDocument();
  });

  it('should have proper dashboard structure', () => {
    render(<GameDashboard {...defaultProps} />);

    const container = document.querySelector('.dashboard-container');
    expect(container).toBeInTheDocument();

    const sections = document.querySelectorAll('.dashboard-section');
    expect(sections).toHaveLength(3);

    const headings = document.querySelectorAll('.dashboard-heading');
    expect(headings).toHaveLength(3);
  });

  it('should have health bar container', () => {
    render(<GameDashboard {...defaultProps} />);

    const healthBarContainer = document.querySelector('.health-bar-container');
    expect(healthBarContainer).toBeInTheDocument();

    const healthBarFill = document.querySelector('.health-bar-fill');
    expect(healthBarFill).toBeInTheDocument();

    const healthBarText = document.querySelector('.health-bar-text');
    expect(healthBarText).toBeInTheDocument();
  });

  it('should have damage indicator', () => {
    render(<GameDashboard {...defaultProps} />);

    const damageIndicator = document.querySelector('.damage-indicator');
    expect(damageIndicator).toBeInTheDocument();
  });

  it('should have players count element', () => {
    render(<GameDashboard {...defaultProps} />);

    const playersCount = document.querySelector('.players-count');
    expect(playersCount).toBeInTheDocument();
  });

  describe('Edge Cases', () => {
    it('should handle monster with higher current HP than max HP', () => {
      const overHealedMonster = { ...mockMonster, hp: 120, maxHp: 100 };
      render(<GameDashboard {...defaultProps} monster={overHealedMonster} />);

      expect(screen.getByText('120/100')).toBeInTheDocument();
      
      const healthBar = document.querySelector('.health-bar-fill');
      expect(healthBar).toHaveStyle('width: 120%');
    });

    it('should handle negative monster health', () => {
      const negativeHealthMonster = { ...mockMonster, hp: -10 };
      render(<GameDashboard {...defaultProps} monster={negativeHealthMonster} />);

      expect(screen.getByText('-10/100')).toBeInTheDocument();
      
      const healthBar = document.querySelector('.health-bar-fill');
      expect(healthBar).toHaveStyle('width: -10%');
    });

    it('should handle negative round number', () => {
      render(<GameDashboard {...defaultProps} round={-1} />);

      expect(screen.getByText('Round -1')).toBeInTheDocument();
    });

    it('should handle zero round number', () => {
      render(<GameDashboard {...defaultProps} round={0} />);

      expect(screen.getByText('Round 0')).toBeInTheDocument();
    });

    it('should handle decimal round number', () => {
      render(<GameDashboard {...defaultProps} round={3.5} />);

      expect(screen.getByText('Round 3.5')).toBeInTheDocument();
    });

    it('should handle very large numbers', () => {
      const largeNumbersMonster = { 
        hp: 999999, 
        maxHp: 999999, 
        nextDamage: 999999 
      };
      const largePlayers = Array.from({ length: 999 }, (_, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        isAlive: true
      }));
      
      render(<GameDashboard 
        round={999} 
        alivePlayers={largePlayers} 
        monster={largeNumbersMonster} 
      />);

      expect(screen.getByText('Round 999')).toBeInTheDocument();
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('999999/999999')).toBeInTheDocument();
      expect(screen.getByText('Next strike: 999999')).toBeInTheDocument();
    });
  });
});