/**
 * @fileoverview Tests for StatsPanel component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsPanel from '../../../../../client/src/pages/EndPage/components/StatsPanel';

// Mock CSS imports
jest.mock('../../../../../client/src/pages/EndPage/components/StatsPanel.css', () => ({}));

describe('StatsPanel', () => {
  const mockStats = [
    { value: 15, label: 'Total Kills', color: '#ff0000' },
    { value: 8, label: 'Players Alive', color: '#00ff00' },
    { value: 3, label: 'Rounds Played', color: '#0000ff' },
    { value: 142, label: 'Total Damage', color: '#ff6600' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render all stat cards', () => {
      render(<StatsPanel stats={mockStats} />);
      
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('142')).toBeInTheDocument();
    });

    it('should render all stat labels', () => {
      render(<StatsPanel stats={mockStats} />);
      
      expect(screen.getByText('Total Kills')).toBeInTheDocument();
      expect(screen.getByText('Players Alive')).toBeInTheDocument();
      expect(screen.getByText('Rounds Played')).toBeInTheDocument();
      expect(screen.getByText('Total Damage')).toBeInTheDocument();
    });

    it('should render with empty stats array', () => {
      render(<StatsPanel stats={[]} />);
      
      const statsPanel = document.querySelector('.stats-panel');
      expect(statsPanel).toBeInTheDocument();
      expect(statsPanel?.children).toHaveLength(0);
    });

    it('should render correct number of stat cards', () => {
      render(<StatsPanel stats={mockStats} />);
      
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards).toHaveLength(4);
    });
  });

  describe('Stat Card Structure', () => {
    it('should render stat values and labels in correct structure', () => {
      render(<StatsPanel stats={mockStats} />);
      
      const firstStatCard = document.querySelector('.stat-card');
      expect(firstStatCard).toBeInTheDocument();
      
      const statValue = firstStatCard?.querySelector('.stat-value');
      const statLabel = firstStatCard?.querySelector('.stat-label');
      
      expect(statValue).toBeInTheDocument();
      expect(statLabel).toBeInTheDocument();
      expect(statValue).toHaveTextContent('15');
      expect(statLabel).toHaveTextContent('Total Kills');
    });

    it('should apply correct CSS classes', () => {
      render(<StatsPanel stats={mockStats} />);
      
      const statCards = document.querySelectorAll('.stat-card');
      statCards.forEach(card => {
        expect(card).toHaveClass('stat-card');
        
        const value = card.querySelector('.stat-value');
        const label = card.querySelector('.stat-label');
        
        expect(value).toHaveClass('stat-value');
        expect(label).toHaveClass('stat-label');
      });
    });
  });

  describe('Color Styling', () => {
    it('should apply custom colors to stat values', () => {
      render(<StatsPanel stats={mockStats} />);
      
      const statValues = document.querySelectorAll('.stat-value');
      
      expect(statValues[0]).toHaveStyle({ color: '#ff0000' });
      expect(statValues[1]).toHaveStyle({ color: '#00ff00' });
      expect(statValues[2]).toHaveStyle({ color: '#0000ff' });
      expect(statValues[3]).toHaveStyle({ color: '#ff6600' });
    });

    it('should handle stats without color property', () => {
      const statsWithoutColor = [
        { value: 10, label: 'No Color Stat' }
      ];
      
      render(<StatsPanel stats={statsWithoutColor} />);
      
      const statValue = document.querySelector('.stat-value');
      expect(statValue).not.toHaveStyle({ color: 'undefined' });
      // Should inherit default color from CSS
    });

    it('should handle different color formats', () => {
      const statsWithDifferentColors = [
        { value: 1, label: 'Hex Color', color: '#ff0000' },
        { value: 2, label: 'RGB Color', color: 'rgb(0, 255, 0)' },
        { value: 3, label: 'Named Color', color: 'blue' },
        { value: 4, label: 'RGBA Color', color: 'rgba(255, 0, 255, 0.5)' }
      ];
      
      render(<StatsPanel stats={statsWithDifferentColors} />);
      
      const statValues = document.querySelectorAll('.stat-value');
      
      expect(statValues[0]).toHaveStyle({ color: '#ff0000' });
      expect(statValues[1]).toHaveStyle({ color: 'rgb(0, 255, 0)' });
      expect(statValues[2]).toHaveStyle({ color: 'blue' });
      expect(statValues[3]).toHaveStyle({ color: 'rgba(255, 0, 255, 0.5)' });
    });
  });

  describe('Data Types', () => {
    it('should handle zero values', () => {
      const statsWithZero = [
        { value: 0, label: 'Zero Stat', color: '#000000' }
      ];
      
      render(<StatsPanel stats={statsWithZero} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('Zero Stat')).toBeInTheDocument();
    });

    it('should handle negative values', () => {
      const statsWithNegative = [
        { value: -5, label: 'Negative Stat', color: '#ff0000' }
      ];
      
      render(<StatsPanel stats={statsWithNegative} />);
      
      expect(screen.getByText('-5')).toBeInTheDocument();
      expect(screen.getByText('Negative Stat')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      const statsWithLargeNumbers = [
        { value: 999999, label: 'Large Number', color: '#00ff00' },
        { value: 1000000, label: 'Million', color: '#0000ff' }
      ];
      
      render(<StatsPanel stats={statsWithLargeNumbers} />);
      
      expect(screen.getByText('999999')).toBeInTheDocument();
      expect(screen.getByText('1000000')).toBeInTheDocument();
    });

    it('should handle decimal numbers', () => {
      const statsWithDecimals = [
        { value: 15.5, label: 'Decimal Stat', color: '#ff6600' },
        { value: 0.33, label: 'Small Decimal', color: '#6600ff' }
      ];
      
      render(<StatsPanel stats={statsWithDecimals} />);
      
      expect(screen.getByText('15.5')).toBeInTheDocument();
      expect(screen.getByText('0.33')).toBeInTheDocument();
    });
  });

  describe('Label Handling', () => {
    it('should handle long labels', () => {
      const statsWithLongLabels = [
        { 
          value: 42, 
          label: 'This is a very long label that might wrap to multiple lines', 
          color: '#ff0000' 
        }
      ];
      
      render(<StatsPanel stats={statsWithLongLabels} />);
      
      expect(screen.getByText('This is a very long label that might wrap to multiple lines')).toBeInTheDocument();
    });

    it('should handle empty labels', () => {
      const statsWithEmptyLabel = [
        { value: 10, label: '', color: '#ff0000' }
      ];
      
      render(<StatsPanel stats={statsWithEmptyLabel} />);
      
      expect(screen.getByText('10')).toBeInTheDocument();
      
      const statLabel = document.querySelector('.stat-label');
      expect(statLabel).toHaveTextContent('');
    });

    it('should handle labels with special characters', () => {
      const statsWithSpecialChars = [
        { value: 5, label: 'Stats & More!', color: '#ff0000' },
        { value: 10, label: 'Stats (Total)', color: '#00ff00' },
        { value: 15, label: 'Stats/Percentage', color: '#0000ff' }
      ];
      
      render(<StatsPanel stats={statsWithSpecialChars} />);
      
      expect(screen.getByText('Stats & More!')).toBeInTheDocument();
      expect(screen.getByText('Stats (Total)')).toBeInTheDocument();
      expect(screen.getByText('Stats/Percentage')).toBeInTheDocument();
    });
  });

  describe('Single Stat', () => {
    it('should render single stat correctly', () => {
      const singleStat = [
        { value: 42, label: 'Single Stat', color: '#ff0000' }
      ];
      
      render(<StatsPanel stats={singleStat} />);
      
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Single Stat')).toBeInTheDocument();
      
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle undefined stats array', () => {
      expect(() => {
        render(<StatsPanel stats={undefined as any} />);
      }).not.toThrow();
    });

    it('should handle null stats array', () => {
      expect(() => {
        render(<StatsPanel stats={null as any} />);
      }).not.toThrow();
    });

    it('should handle stats with missing properties', () => {
      const malformedStats = [
        { value: 10 }, // Missing label and color
        { label: 'No Value' }, // Missing value and color
        {} // Empty object
      ] as any[];
      
      expect(() => {
        render(<StatsPanel stats={malformedStats} />);
      }).not.toThrow();
    });

    it('should handle non-numeric values', () => {
      const statsWithNonNumeric = [
        { value: 'not a number', label: 'Invalid Value', color: '#ff0000' },
        { value: null, label: 'Null Value', color: '#00ff00' },
        { value: undefined, label: 'Undefined Value', color: '#0000ff' }
      ] as any[];
      
      expect(() => {
        render(<StatsPanel stats={statsWithNonNumeric} />);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should maintain semantic structure', () => {
      render(<StatsPanel stats={mockStats} />);
      
      const statsPanel = document.querySelector('.stats-panel');
      expect(statsPanel).toBeInTheDocument();
      
      const statCards = document.querySelectorAll('.stat-card');
      statCards.forEach(card => {
        const value = card.querySelector('.stat-value');
        const label = card.querySelector('.stat-label');
        
        expect(value).toBeInTheDocument();
        expect(label).toBeInTheDocument();
      });
    });
  });
});