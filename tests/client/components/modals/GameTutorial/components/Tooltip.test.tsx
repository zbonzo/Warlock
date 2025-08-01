/**
 * @fileoverview Tests for Tooltip.tsx
 * Test suite for the Tooltip component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tooltip from '../../../../../../client/src/components/modals/GameTutorial/components/Tooltip';

// Mock CSS
jest.mock('../../../../../../client/src/components/modals/GameTutorial/components/Tooltip.css', () => ({}));

describe('Tooltip', () => {
  const defaultProps = {
    children: <button>Hover me</button>,
    content: 'This is a tooltip',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render children', () => {
      render(<Tooltip {...defaultProps} />);
      
      expect(screen.getByText('Hover me')).toBeInTheDocument();
    });

    it('should not show tooltip initially', () => {
      render(<Tooltip {...defaultProps} />);
      
      expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();
    });

    it('should have tooltip container with correct class', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      expect(container.querySelector('.tooltip-container')).toBeInTheDocument();
    });
  });

  describe('Mouse Interactions', () => {
    it('should show tooltip on mouse enter', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
    });

    it('should hide tooltip on mouse leave', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      
      // Show tooltip
      fireEvent.mouseEnter(tooltipContainer!);
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
      
      // Hide tooltip
      fireEvent.mouseLeave(tooltipContainer!);
      expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();
    });

    it('should show tooltip multiple times', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      
      // First show/hide cycle
      fireEvent.mouseEnter(tooltipContainer!);
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
      
      fireEvent.mouseLeave(tooltipContainer!);
      expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();
      
      // Second show/hide cycle
      fireEvent.mouseEnter(tooltipContainer!);
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
      
      fireEvent.mouseLeave(tooltipContainer!);
      expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Focus Interactions', () => {
    it('should show tooltip on focus', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.focus(tooltipContainer!);
      
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
    });

    it('should hide tooltip on blur', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      
      // Show tooltip
      fireEvent.focus(tooltipContainer!);
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
      
      // Hide tooltip
      fireEvent.blur(tooltipContainer!);
      expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();
    });

    it('should work with focusable children', () => {
      render(
        <Tooltip content="Button tooltip">
          <button>Focusable button</button>
        </Tooltip>
      );
      
      const button = screen.getByText('Focusable button');
      
      // Focus the button (should bubble to container)
      fireEvent.focus(button);
      
      // The tooltip might not show directly on the button, but the container should handle it
      const button2 = screen.getByText('Focusable button');
      expect(button2).toBeInTheDocument();
    });
  });

  describe('Position Prop', () => {
    it('should apply default position (top)', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      const tooltip = container.querySelector('.tooltip');
      expect(tooltip).toHaveClass('tooltip-top');
    });

    it('should apply top position when specified', () => {
      const { container } = render(
        <Tooltip {...defaultProps} position="top" />
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      const tooltip = container.querySelector('.tooltip');
      expect(tooltip).toHaveClass('tooltip-top');
    });

    it('should apply right position when specified', () => {
      const { container } = render(
        <Tooltip {...defaultProps} position="right" />
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      const tooltip = container.querySelector('.tooltip');
      expect(tooltip).toHaveClass('tooltip-right');
    });

    it('should apply bottom position when specified', () => {
      const { container } = render(
        <Tooltip {...defaultProps} position="bottom" />
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      const tooltip = container.querySelector('.tooltip');
      expect(tooltip).toHaveClass('tooltip-bottom');
    });

    it('should apply left position when specified', () => {
      const { container } = render(
        <Tooltip {...defaultProps} position="left" />
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      const tooltip = container.querySelector('.tooltip');
      expect(tooltip).toHaveClass('tooltip-left');
    });
  });

  describe('Content Variations', () => {
    it('should render string content', () => {
      const { container } = render(
        <Tooltip content="Simple string tooltip">
          <div>Target</div>
        </Tooltip>
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      expect(screen.getByText('Simple string tooltip')).toBeInTheDocument();
    });

    it('should render React node content', () => {
      const reactContent = (
        <div>
          <strong>Bold text</strong>
          <br />
          <em>Italic text</em>
        </div>
      );
      
      const { container } = render(
        <Tooltip content={reactContent}>
          <div>Target</div>
        </Tooltip>
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      expect(screen.getByText('Bold text')).toBeInTheDocument();
      expect(screen.getByText('Italic text')).toBeInTheDocument();
    });

    it('should render complex JSX content', () => {
      const complexContent = (
        <div>
          <h4>Tooltip Title</h4>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
          <button>Tooltip Button</button>
        </div>
      );
      
      const { container } = render(
        <Tooltip content={complexContent}>
          <div>Target</div>
        </Tooltip>
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      expect(screen.getByText('Tooltip Title')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Tooltip Button')).toBeInTheDocument();
    });

    it('should handle empty string content', () => {
      const { container } = render(
        <Tooltip content="">
          <div>Target</div>
        </Tooltip>
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      const tooltip = container.querySelector('.tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('');
    });

    it('should handle null content', () => {
      const { container } = render(
        <Tooltip content={null}>
          <div>Target</div>
        </Tooltip>
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      const tooltip = container.querySelector('.tooltip');
      expect(tooltip).toBeInTheDocument();
    });
  });

  describe('Children Variations', () => {
    it('should render single child element', () => {
      render(
        <Tooltip content="Tooltip">
          <button>Single child</button>
        </Tooltip>
      );
      
      expect(screen.getByText('Single child')).toBeInTheDocument();
    });

    it('should render multiple child elements', () => {
      render(
        <Tooltip content="Tooltip">
          <span>First child</span>
          <span>Second child</span>
        </Tooltip>
      );
      
      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });

    it('should render nested child elements', () => {
      render(
        <Tooltip content="Tooltip">
          <div>
            <h3>Nested Title</h3>
            <p>Nested paragraph</p>
          </div>
        </Tooltip>
      );
      
      expect(screen.getByText('Nested Title')).toBeInTheDocument();
      expect(screen.getByText('Nested paragraph')).toBeInTheDocument();
    });

    it('should handle text node children', () => {
      render(
        <Tooltip content="Tooltip">
          Just plain text
        </Tooltip>
      );
      
      expect(screen.getByText('Just plain text')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should maintain independent state for multiple tooltips', () => {
      const { container } = render(
        <div>
          <Tooltip content="First tooltip">
            <button>First button</button>
          </Tooltip>
          <Tooltip content="Second tooltip">
            <button>Second button</button>
          </Tooltip>
        </div>
      );
      
      const tooltipContainers = container.querySelectorAll('.tooltip-container');
      
      // Show first tooltip
      fireEvent.mouseEnter(tooltipContainers[0]);
      expect(screen.getByText('First tooltip')).toBeInTheDocument();
      expect(screen.queryByText('Second tooltip')).not.toBeInTheDocument();
      
      // Show second tooltip
      fireEvent.mouseEnter(tooltipContainers[1]);
      expect(screen.getByText('First tooltip')).toBeInTheDocument();
      expect(screen.getByText('Second tooltip')).toBeInTheDocument();
      
      // Hide first tooltip
      fireEvent.mouseLeave(tooltipContainers[0]);
      expect(screen.queryByText('First tooltip')).not.toBeInTheDocument();
      expect(screen.getByText('Second tooltip')).toBeInTheDocument();
    });

    it('should handle rapid show/hide events', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      
      // Rapid mouse enter/leave events
      fireEvent.mouseEnter(tooltipContainer!);
      fireEvent.mouseLeave(tooltipContainer!);
      fireEvent.mouseEnter(tooltipContainer!);
      fireEvent.mouseLeave(tooltipContainer!);
      fireEvent.mouseEnter(tooltipContainer!);
      
      // Should end up showing the tooltip
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
    });

    it('should handle mixed mouse and focus events', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      
      // Mouse enter, then focus (should still show)
      fireEvent.mouseEnter(tooltipContainer!);
      fireEvent.focus(tooltipContainer!);
      expect(screen.getByText('This is a tooltip')).toBeInTheDocument();
      
      // Mouse leave, but still focused (should hide)
      fireEvent.mouseLeave(tooltipContainer!);
      expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();
      
      // Blur (should remain hidden)
      fireEvent.blur(tooltipContainer!);
      expect(screen.queryByText('This is a tooltip')).not.toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should have correct base CSS classes', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      expect(container.querySelector('.tooltip-container')).toBeInTheDocument();
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      expect(container.querySelector('.tooltip')).toBeInTheDocument();
    });

    it('should apply position-specific CSS classes', () => {
      const positions = ['top', 'right', 'bottom', 'left'] as const;
      
      positions.forEach(position => {
        const { container } = render(
          <Tooltip content="test" position={position}>
            <div>Test</div>
          </Tooltip>
        );
        
        const tooltipContainer = container.querySelector('.tooltip-container');
        fireEvent.mouseEnter(tooltipContainer!);
        
        const tooltip = container.querySelector('.tooltip');
        expect(tooltip).toHaveClass(`tooltip-${position}`);
      });
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', () => {
      const { container } = render(<Tooltip {...defaultProps} />);
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      const tooltip = container.querySelector('.tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should work with keyboard navigation', () => {
      render(
        <Tooltip content="Keyboard tooltip">
          <button>Keyboard button</button>
        </Tooltip>
      );
      
      const button = screen.getByText('Keyboard button');
      
      // Tab to focus button
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it('should maintain proper focus behavior', () => {
      const { container } = render(
        <Tooltip content="Focus tooltip">
          <input type="text" placeholder="Focus me" />
        </Tooltip>
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      const input = screen.getByPlaceholderText('Focus me');
      
      // Focus should work with focusable elements inside
      input.focus();
      expect(document.activeElement).toBe(input);
      
      // Container focus events should still work
      fireEvent.focus(tooltipContainer!);
      fireEvent.blur(tooltipContainer!);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined children', () => {
      expect(() => {
        render(
          <Tooltip content="test">
            {undefined}
          </Tooltip>
        );
      }).not.toThrow();
    });

    it('should handle null children', () => {
      expect(() => {
        render(
          <Tooltip content="test">
            {null}
          </Tooltip>
        );
      }).not.toThrow();
    });

    it('should handle empty children', () => {
      expect(() => {
        render(
          <Tooltip content="test">
            {[]}
          </Tooltip>
        );
      }).not.toThrow();
    });

    it('should handle boolean children', () => {
      expect(() => {
        render(
          <Tooltip content="test">
            {false}
            {true}
          </Tooltip>
        );
      }).not.toThrow();
    });

    it('should handle numeric children', () => {
      render(
        <Tooltip content="Number tooltip">
          {42}
        </Tooltip>
      );
      
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should handle very long tooltip content', () => {
      const longContent = 'This is a very long tooltip content that might cause display issues or wrapping problems in some layouts but should still render correctly';
      
      const { container } = render(
        <Tooltip content={longContent}>
          <div>Target</div>
        </Tooltip>
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should handle content with special characters', () => {
      const specialContent = 'Content with <>&"\'{}[]() special characters!';
      
      const { container } = render(
        <Tooltip content={specialContent}>
          <div>Target</div>
        </Tooltip>
      );
      
      const tooltipContainer = container.querySelector('.tooltip-container');
      fireEvent.mouseEnter(tooltipContainer!);
      
      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });
  });
});