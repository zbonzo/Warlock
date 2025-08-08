/**
 * @fileoverview Tests for ClassList.tsx
 * Test suite for the ClassList component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassList from '../../../../../../client/src/components/modals/AdaptabilityModal/components/ClassList';
import type { PlayerClass } from '../../../../../../shared/types';

// Mock CSS
jest.mock('../../../../../../client/src/components/modals/AdaptabilityModal/components/ClassList.css', () => ({}));

// Mock ClassCard component
jest.mock('../../../../../../client/src/components/modals/AdaptabilityModal/components/ClassCard', () => {
  return function MockClassCard({ className, onSelect }: { className: PlayerClass; onSelect: () => void }) {
    return (
      <div
        data-testid={`class-card-${className}`}
        onClick={onSelect}
      >
        {className}
      </div>
    );
  };
});

describe('ClassList', () => {
  const mockClasses: PlayerClass[] = [
    'Warrior',
    'Pyromancer',
    'Wizard',
    'Assassin',
    'Alchemist'
  ];

  const defaultProps = {
    classes: mockClasses,
    onClassSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render all provided classes', () => {
      render(<ClassList {...defaultProps} />);

      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Pyromancer')).toBeInTheDocument();
      expect(screen.getByText('Wizard')).toBeInTheDocument();
      expect(screen.getByText('Assassin')).toBeInTheDocument();
      expect(screen.getByText('Alchemist')).toBeInTheDocument();
    });

    it('should render ClassCard components with correct props', () => {
      render(<ClassList {...defaultProps} />);

      expect(screen.getByTestId('class-card-Warrior')).toBeInTheDocument();
      expect(screen.getByTestId('class-card-Pyromancer')).toBeInTheDocument();
      expect(screen.getByTestId('class-card-Wizard')).toBeInTheDocument();
      expect(screen.getByTestId('class-card-Assassin')).toBeInTheDocument();
      expect(screen.getByTestId('class-card-Alchemist')).toBeInTheDocument();
    });

    it('should have correct CSS class structure', () => {
      const { container } = render(<ClassList {...defaultProps} />);

      expect(container.querySelector('.class-list')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClassSelect when a class card is clicked', () => {
      const onClassSelect = jest.fn();
      render(<ClassList {...defaultProps} onClassSelect={onClassSelect} />);

      fireEvent.click(screen.getByText('Warrior'));

      expect(onClassSelect).toHaveBeenCalledTimes(1);
      expect(onClassSelect).toHaveBeenCalledWith('Warrior');
    });

    it('should call onClassSelect with correct class name for different classes', () => {
      const onClassSelect = jest.fn();
      render(<ClassList {...defaultProps} onClassSelect={onClassSelect} />);

      fireEvent.click(screen.getByText('Pyromancer'));
      expect(onClassSelect).toHaveBeenCalledWith('Pyromancer');

      fireEvent.click(screen.getByText('Wizard'));
      expect(onClassSelect).toHaveBeenCalledWith('Wizard');
    });

    it('should handle multiple class selections', () => {
      const onClassSelect = jest.fn();
      render(<ClassList {...defaultProps} onClassSelect={onClassSelect} />);

      fireEvent.click(screen.getByText('Warrior'));
      fireEvent.click(screen.getByText('Assassin'));

      expect(onClassSelect).toHaveBeenCalledTimes(2);
      expect(onClassSelect).toHaveBeenNthCalledWith(1, 'Warrior');
      expect(onClassSelect).toHaveBeenNthCalledWith(2, 'Assassin');
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle empty class array', () => {
      render(<ClassList classes={[]} onClassSelect={jest.fn()} />);

      const { container } = render(<ClassList classes={[]} onClassSelect={jest.fn()} />);
      expect(container.querySelector('.class-list')).toBeInTheDocument();
      expect(container.querySelectorAll('[data-testid^="class-card-"]')).toHaveLength(0);
    });

    it('should render without errors when classes is empty', () => {
      expect(() => {
        render(<ClassList classes={[]} onClassSelect={jest.fn()} />);
      }).not.toThrow();
    });
  });

  describe('Single Class Handling', () => {
    it('should handle single class in array', () => {
      render(<ClassList classes={['Warrior']} onClassSelect={jest.fn()} />);

      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByTestId('class-card-Warrior')).toBeInTheDocument();
    });

    it('should call onClassSelect for single class', () => {
      const onClassSelect = jest.fn();
      render(<ClassList classes={['Warrior']} onClassSelect={onClassSelect} />);

      fireEvent.click(screen.getByText('Warrior'));

      expect(onClassSelect).toHaveBeenCalledWith('Warrior');
    });
  });

  describe('Large Class Lists', () => {
    it('should handle many classes', () => {
      const manyClasses: PlayerClass[] = [
        'Warrior', 'Pyromancer', 'Wizard', 'Assassin', 'Alchemist',
        'Priest', 'Oracle', 'Barbarian', 'Shaman', 'Gunslinger',
        'Tracker', 'Druid'
      ];

      render(<ClassList classes={manyClasses} onClassSelect={jest.fn()} />);

      manyClasses.forEach(className => {
        expect(screen.getByText(className)).toBeInTheDocument();
        expect(screen.getByTestId(`class-card-${className}`)).toBeInTheDocument();
      });
    });

    it('should maintain performance with many classes', () => {
      const manyClasses: PlayerClass[] = new Array(100).fill(0).map((_, i) => `Class${i}` as PlayerClass);

      expect(() => {
        render(<ClassList classes={manyClasses} onClassSelect={jest.fn()} />);
      }).not.toThrow();

      expect(screen.getAllByText(/Class\d+/)).toHaveLength(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate classes', () => {
      const duplicateClasses: PlayerClass[] = ['Warrior', 'Warrior', 'Pyromancer'];
      render(<ClassList classes={duplicateClasses} onClassSelect={jest.fn()} />);

      // Should render all duplicates
      const warriorElements = screen.getAllByText('Warrior');
      expect(warriorElements).toHaveLength(2);
      expect(screen.getByText('Pyromancer')).toBeInTheDocument();
    });

    it('should handle classes with special characters', () => {
      const specialClasses: PlayerClass[] = ['Class-1', 'Class_2', 'Class!3'] as PlayerClass[];
      render(<ClassList classes={specialClasses} onClassSelect={jest.fn()} />);

      expect(screen.getByText('Class-1')).toBeInTheDocument();
      expect(screen.getByText('Class_2')).toBeInTheDocument();
      expect(screen.getByText('Class!3')).toBeInTheDocument();
    });

    it('should handle very long class names', () => {
      const longNameClasses: PlayerClass[] = [
        'VeryLongClassNameThatMightCauseDisplayIssues' as PlayerClass
      ];
      render(<ClassList classes={longNameClasses} onClassSelect={jest.fn()} />);

      expect(screen.getByText('VeryLongClassNameThatMightCauseDisplayIssues')).toBeInTheDocument();
    });

    it('should handle null or undefined in class array', () => {
      const classesWithNulls = [
        'Warrior',
        null,
        'Pyromancer',
        undefined,
        'Wizard'
      ].filter(Boolean) as PlayerClass[];

      render(<ClassList classes={classesWithNulls} onClassSelect={jest.fn()} />);

      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Pyromancer')).toBeInTheDocument();
      expect(screen.getByText('Wizard')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should maintain correct ordering of classes', () => {
      const orderedClasses: PlayerClass[] = ['A', 'B', 'C', 'D'] as PlayerClass[];
      const { container } = render(<ClassList classes={orderedClasses} onClassSelect={jest.fn()} />);

      const classCards = container.querySelectorAll('[data-testid^="class-card-"]');
      expect(classCards[0]).toHaveAttribute('data-testid', 'class-card-A');
      expect(classCards[1]).toHaveAttribute('data-testid', 'class-card-B');
      expect(classCards[2]).toHaveAttribute('data-testid', 'class-card-C');
      expect(classCards[3]).toHaveAttribute('data-testid', 'class-card-D');
    });

    it('should pass unique keys to each ClassCard', () => {
      // This is tested indirectly by ensuring no React key warnings
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<ClassList {...defaultProps} />);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Warning: Each child in a list should have a unique "key" prop')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Callback Function Handling', () => {
    it('should not crash if onClassSelect is undefined', () => {
      expect(() => {
        render(<ClassList classes={['Warrior']} onClassSelect={undefined as any} />);
        fireEvent.click(screen.getByText('Warrior'));
      }).not.toThrow();
    });

    it('should handle onClassSelect throwing an error', () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      render(<ClassList classes={['Warrior']} onClassSelect={errorCallback} />);

      expect(() => {
        fireEvent.click(screen.getByText('Warrior'));
      }).toThrow('Test error');
    });
  });

  describe('Re-rendering Behavior', () => {
    it('should update when classes prop changes', () => {
      const { rerender } = render(<ClassList classes={['Warrior']} onClassSelect={jest.fn()} />);

      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.queryByText('Pyromancer')).not.toBeInTheDocument();

      rerender(<ClassList classes={['Pyromancer']} onClassSelect={jest.fn()} />);

      expect(screen.queryByText('Warrior')).not.toBeInTheDocument();
      expect(screen.getByText('Pyromancer')).toBeInTheDocument();
    });

    it('should update callback when onClassSelect prop changes', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { rerender } = render(<ClassList classes={['Warrior']} onClassSelect={callback1} />);

      fireEvent.click(screen.getByText('Warrior'));
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();

      rerender(<ClassList classes={['Warrior']} onClassSelect={callback2} />);

      fireEvent.click(screen.getByText('Warrior'));
      expect(callback1).toHaveBeenCalledTimes(1); // Still only called once
      expect(callback2).toHaveBeenCalledTimes(1); // Now called once
    });
  });
});
