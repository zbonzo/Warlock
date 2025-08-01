/**
 * @fileoverview Tests for RuneButton.tsx
 * Comprehensive test suite for the RuneButton component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RuneButton from '../../../../client/src/components/ui/RuneButton';

// Mock CSS
jest.mock('../../../../client/src/components/ui/RuneButton.css', () => ({}));

describe('RuneButton', () => {
  const defaultProps = {
    children: 'Click me',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render button with children', () => {
      render(<RuneButton {...defaultProps} />);
      
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should render as button element', () => {
      render(<RuneButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should apply default CSS classes', () => {
      render(<RuneButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rune-button', 'rune-button--primary');
    });

    it('should not have disabled class by default', () => {
      render(<RuneButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('disabled');
    });
  });

  describe('Variant Styling', () => {
    it('should apply primary variant by default', () => {
      render(<RuneButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rune-button--primary');
    });

    it('should apply primary variant when explicitly set', () => {
      render(<RuneButton {...defaultProps} variant="primary" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rune-button--primary');
    });

    it('should apply secondary variant', () => {
      render(<RuneButton {...defaultProps} variant="secondary" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rune-button--secondary');
      expect(button).not.toHaveClass('rune-button--primary');
    });

    it('should apply danger variant', () => {
      render(<RuneButton {...defaultProps} variant="danger" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rune-button--danger');
      expect(button).not.toHaveClass('rune-button--primary');
    });
  });

  describe('Disabled State', () => {
    it('should not be disabled by default', () => {
      render(<RuneButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).not.toHaveClass('disabled');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<RuneButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled');
    });

    it('should not be disabled when disabled prop is false', () => {
      render(<RuneButton {...defaultProps} disabled={false} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).not.toHaveClass('disabled');
    });

    it('should apply disabled class and disabled attribute together', () => {
      render(<RuneButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled(); // HTML disabled attribute
      expect(button).toHaveClass('disabled'); // CSS class
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', () => {
      const onClick = jest.fn();
      render(<RuneButton {...defaultProps} onClick={onClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const onClick = jest.fn();
      render(<RuneButton {...defaultProps} onClick={onClick} disabled={true} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should call onClick multiple times for multiple clicks', () => {
      const onClick = jest.fn();
      render(<RuneButton {...defaultProps} onClick={onClick} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it('should work without onClick prop', () => {
      expect(() => {
        render(<RuneButton {...defaultProps} />);
        fireEvent.click(screen.getByRole('button'));
      }).not.toThrow();
    });
  });

  describe('Children Rendering', () => {
    it('should render string children', () => {
      render(<RuneButton>Simple text</RuneButton>);
      
      expect(screen.getByText('Simple text')).toBeInTheDocument();
    });

    it('should render JSX children', () => {
      render(
        <RuneButton>
          <span>Complex</span> <strong>content</strong>
        </RuneButton>
      );
      
      expect(screen.getByText('Complex')).toBeInTheDocument();
      expect(screen.getByText('content')).toBeInTheDocument();
    });

    it('should render nested elements', () => {
      render(
        <RuneButton>
          <div>
            <h3>Title</h3>
            <p>Description</p>
          </div>
        </RuneButton>
      );
      
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should render emoji children', () => {
      render(<RuneButton>🔥 Fire Button</RuneButton>);
      
      expect(screen.getByText('🔥 Fire Button')).toBeInTheDocument();
    });

    it('should handle empty children', () => {
      render(<RuneButton></RuneButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('should handle null children', () => {
      render(<RuneButton>{null}</RuneButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<RuneButton>{undefined}</RuneButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle numeric children', () => {
      render(<RuneButton>{42}</RuneButton>);
      
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('HTML Button Props', () => {
    it('should pass through native button props', () => {
      render(
        <RuneButton 
          {...defaultProps} 
          type="submit"
          name="test-button"
          value="test-value"
          id="test-id"
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('name', 'test-button');
      expect(button).toHaveAttribute('value', 'test-value');
      expect(button).toHaveAttribute('id', 'test-id');
    });

    it('should handle title attribute', () => {
      render(<RuneButton {...defaultProps} title="Button tooltip" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Button tooltip');
    });

    it('should handle aria attributes', () => {
      render(
        <RuneButton 
          {...defaultProps} 
          aria-label="Custom label"
          aria-pressed="true"
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should handle data attributes', () => {
      render(
        <RuneButton 
          {...defaultProps} 
          data-testid="custom-test-id"
          data-category="ui"
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-testid', 'custom-test-id');
      expect(button).toHaveAttribute('data-category', 'ui');
    });

    it('should handle tabIndex', () => {
      render(<RuneButton {...defaultProps} tabIndex={0} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Keyboard Interactions', () => {
    it('should be focusable', () => {
      render(<RuneButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(document.activeElement).toBe(button);
    });

    it('should not be focusable when disabled', () => {
      render(<RuneButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      expect(document.activeElement).not.toBe(button);
    });

    it('should handle Enter key press', () => {
      const onClick = jest.fn();
      render(<RuneButton {...defaultProps} onClick={onClick} />);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      
      // Note: Default button behavior handles Enter key
      // This test documents the expected behavior
    });

    it('should handle Space key press', () => {
      const onClick = jest.fn();
      render(<RuneButton {...defaultProps} onClick={onClick} />);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      
      // Note: Default button behavior handles Space key
      // This test documents the expected behavior
    });
  });

  describe('CSS Class Combinations', () => {
    it('should combine variant and disabled classes', () => {
      render(<RuneButton {...defaultProps} variant="danger" disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rune-button', 'rune-button--danger', 'disabled');
    });

    it('should apply all base classes for each variant', () => {
      const variants = ['primary', 'secondary', 'danger'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(<RuneButton variant={variant}>Test</RuneButton>);
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('rune-button', `rune-button--${variant}`);
        
        unmount();
      });
    });

    it('should handle disabled state for all variants', () => {
      const variants = ['primary', 'secondary', 'danger'] as const;
      
      variants.forEach(variant => {
        const { unmount } = render(
          <RuneButton variant={variant} disabled={true}>Test</RuneButton>
        );
        
        const button = screen.getByRole('button');
        expect(button).toHaveClass('rune-button', `rune-button--${variant}`, 'disabled');
        expect(button).toBeDisabled();
        
        unmount();
      });
    });
  });

  describe('Event Handling', () => {
    it('should handle mouse events', () => {
      const onMouseEnter = jest.fn();
      const onMouseLeave = jest.fn();
      const onMouseDown = jest.fn();
      const onMouseUp = jest.fn();
      
      render(
        <RuneButton 
          {...defaultProps}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
        />
      );
      
      const button = screen.getByRole('button');
      
      fireEvent.mouseEnter(button);
      expect(onMouseEnter).toHaveBeenCalledTimes(1);
      
      fireEvent.mouseLeave(button);
      expect(onMouseLeave).toHaveBeenCalledTimes(1);
      
      fireEvent.mouseDown(button);
      expect(onMouseDown).toHaveBeenCalledTimes(1);
      
      fireEvent.mouseUp(button);
      expect(onMouseUp).toHaveBeenCalledTimes(1);
    });

    it('should handle focus events', () => {
      const onFocus = jest.fn();
      const onBlur = jest.fn();
      
      render(
        <RuneButton 
          {...defaultProps}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      );
      
      const button = screen.getByRole('button');
      
      fireEvent.focus(button);
      expect(onFocus).toHaveBeenCalledTimes(1);
      
      fireEvent.blur(button);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard events', () => {
      const onKeyDown = jest.fn();
      const onKeyUp = jest.fn();
      
      render(
        <RuneButton 
          {...defaultProps}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
        />
      );
      
      const button = screen.getByRole('button');
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      
      fireEvent.keyUp(button, { key: 'Enter' });
      expect(onKeyUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have button role', () => {
      render(<RuneButton {...defaultProps} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support screen reader content', () => {
      render(<RuneButton aria-label="Custom button label">Visual content</RuneButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom button label');
      expect(button).toHaveTextContent('Visual content');
    });

    it('should indicate disabled state to screen readers', () => {
      render(<RuneButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
      expect(button).toBeDisabled();
    });

    it('should support aria-pressed for toggle buttons', () => {
      render(<RuneButton {...defaultProps} aria-pressed="true" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should support aria-expanded for dropdown buttons', () => {
      render(<RuneButton {...defaultProps} aria-expanded="false" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined onClick gracefully', () => {
      render(<RuneButton onClick={undefined}>Test</RuneButton>);
      
      expect(() => {
        fireEvent.click(screen.getByRole('button'));
      }).not.toThrow();
    });

    it('should handle null onClick gracefully', () => {
      render(<RuneButton onClick={null as any}>Test</RuneButton>);
      
      expect(() => {
        fireEvent.click(screen.getByRole('button'));
      }).not.toThrow();
    });

    it('should handle invalid variant values', () => {
      render(<RuneButton variant={'invalid' as any}>Test</RuneButton>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('rune-button', 'rune-button--invalid');
    });

    it('should handle boolean children', () => {
      render(<RuneButton>{true}{false}</RuneButton>);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle array children', () => {
      render(<RuneButton>{['Item 1', 'Item 2']}</RuneButton>);
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('Component Re-rendering', () => {
    it('should update when props change', () => {
      const { rerender } = render(<RuneButton variant="primary">Original</RuneButton>);
      
      let button = screen.getByRole('button');
      expect(button).toHaveClass('rune-button--primary');
      expect(button).toHaveTextContent('Original');
      
      rerender(<RuneButton variant="danger">Updated</RuneButton>);
      
      button = screen.getByRole('button');
      expect(button).toHaveClass('rune-button--danger');
      expect(button).not.toHaveClass('rune-button--primary');
      expect(button).toHaveTextContent('Updated');
    });

    it('should update disabled state correctly', () => {
      const { rerender } = render(<RuneButton disabled={false}>Test</RuneButton>);
      
      let button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      expect(button).not.toHaveClass('disabled');
      
      rerender(<RuneButton disabled={true}>Test</RuneButton>);
      
      button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled');
    });

    it('should update onClick handler correctly', () => {
      const onClick1 = jest.fn();
      const onClick2 = jest.fn();
      
      const { rerender } = render(<RuneButton onClick={onClick1}>Test</RuneButton>);
      
      let button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick1).toHaveBeenCalledTimes(1);
      expect(onClick2).not.toHaveBeenCalled();
      
      rerender(<RuneButton onClick={onClick2}>Test</RuneButton>);
      
      button = screen.getByRole('button');
      fireEvent.click(button);
      expect(onClick1).toHaveBeenCalledTimes(1); // Still only called once
      expect(onClick2).toHaveBeenCalledTimes(1); // Now called once
    });
  });
});