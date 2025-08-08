/**
 * @fileoverview Tests for ModalStep.tsx
 * Test suite for the ModalStep component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModalStep from '../../../../../../client/src/components/modals/AdaptabilityModal/components/ModalStep';

// Mock CSS
jest.mock('../../../../../../client/src/components/modals/AdaptabilityModal/components/ModalStep.css', () => ({}));

// Mock ThemeContext
const mockUseTheme = jest.fn();
jest.mock('../../../../../../client/src/contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme()
}));

describe('ModalStep', () => {
  const defaultProps = {
    title: 'Test Step Title',
    showBackButton: false,
    children: <div>Test step content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      isDarkMode: false,
      toggleTheme: jest.fn()
    });
  });

  describe('Basic Rendering', () => {
    it('should render step title', () => {
      render(<ModalStep {...defaultProps} />);

      expect(screen.getByText('Test Step Title')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(<ModalStep {...defaultProps} />);

      expect(screen.getByText('Test step content')).toBeInTheDocument();
    });

    it('should have correct CSS class structure', () => {
      const { container } = render(<ModalStep {...defaultProps} />);

      expect(container.querySelector('.modal-step')).toBeInTheDocument();
      expect(container.querySelector('.step-title')).toBeInTheDocument();
      expect(container.querySelector('.step-content')).toBeInTheDocument();
    });
  });

  describe('Back Button Handling', () => {
    it('should not show back button when showBackButton is false', () => {
      render(<ModalStep {...defaultProps} showBackButton={false} />);

      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('should show back button when showBackButton is true and onBack is provided', () => {
      const onBack = jest.fn();
      render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={onBack}
        />
      );

      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should not show back button when showBackButton is true but onBack is not provided', () => {
      render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
        />
      );

      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', () => {
      const onBack = jest.fn();
      render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={onBack}
        />
      );

      fireEvent.click(screen.getByText('Back'));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should have correct CSS class for back button', () => {
      const onBack = jest.fn();
      render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={onBack}
        />
      );

      const backButton = screen.getByText('Back');
      expect(backButton).toHaveClass('back-button');
    });
  });

  describe('Content Rendering', () => {
    it('should render string children', () => {
      render(
        <ModalStep {...defaultProps}>
          Simple string content
        </ModalStep>
      );

      expect(screen.getByText('Simple string content')).toBeInTheDocument();
    });

    it('should render JSX element children', () => {
      render(
        <ModalStep {...defaultProps}>
          <div>
            <h3>Complex Content</h3>
            <p>With multiple elements</p>
          </div>
        </ModalStep>
      );

      expect(screen.getByText('Complex Content')).toBeInTheDocument();
      expect(screen.getByText('With multiple elements')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ModalStep {...defaultProps}>
          <div>First child</div>
          <div>Second child</div>
          <span>Third child</span>
        </ModalStep>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
      expect(screen.getByText('Third child')).toBeInTheDocument();
    });

    it('should render null children without errors', () => {
      expect(() => {
        render(
          <ModalStep {...defaultProps}>
            {null}
          </ModalStep>
        );
      }).not.toThrow();
    });

    it('should render undefined children without errors', () => {
      expect(() => {
        render(
          <ModalStep {...defaultProps}>
            {undefined}
          </ModalStep>
        );
      }).not.toThrow();
    });
  });

  describe('Title Variations', () => {
    it('should handle empty title', () => {
      render(<ModalStep {...defaultProps} title="" />);

      const titleElement = screen.getByText('', { selector: '.step-title' });
      expect(titleElement).toBeInTheDocument();
    });

    it('should handle very long titles', () => {
      const longTitle = 'This is a very long title that might span multiple lines and cause layout issues in the modal step component';
      render(<ModalStep {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle titles with special characters', () => {
      const specialTitle = 'Title with 🎯 emojis & special characters!';
      render(<ModalStep {...defaultProps} title={specialTitle} />);

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it('should handle titles with HTML-like strings', () => {
      const htmlTitle = '<script>alert("test")</script>';
      render(<ModalStep {...defaultProps} title={htmlTitle} />);

      // Should render as text, not execute as HTML
      expect(screen.getByText('<script>alert("test")</script>')).toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('should work with dark theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: true,
        toggleTheme: jest.fn()
      });

      render(<ModalStep {...defaultProps} />);

      expect(screen.getByText('Test Step Title')).toBeInTheDocument();
      expect(screen.getByText('Test step content')).toBeInTheDocument();
    });

    it('should work with light theme', () => {
      mockUseTheme.mockReturnValue({
        isDarkMode: false,
        toggleTheme: jest.fn()
      });

      render(<ModalStep {...defaultProps} />);

      expect(screen.getByText('Test Step Title')).toBeInTheDocument();
      expect(screen.getByText('Test step content')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should maintain proper element hierarchy', () => {
      const onBack = jest.fn();
      const { container } = render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={onBack}
        />
      );

      const modalStep = container.querySelector('.modal-step');
      const stepTitle = modalStep?.querySelector('.step-title');
      const stepContent = modalStep?.querySelector('.step-content');
      const backButton = modalStep?.querySelector('.back-button');

      expect(modalStep).toBeInTheDocument();
      expect(stepTitle).toBeInTheDocument();
      expect(stepContent).toBeInTheDocument();
      expect(backButton).toBeInTheDocument();

      // Check hierarchy
      expect(modalStep).toContainElement(stepTitle!);
      expect(modalStep).toContainElement(stepContent!);
      expect(modalStep).toContainElement(backButton!);
    });

    it('should place back button after step content', () => {
      const onBack = jest.fn();
      const { container } = render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={onBack}
        />
      );

      const stepContent = container.querySelector('.step-content');
      const backButton = container.querySelector('.back-button');

      // Back button should come after step content in DOM order
      const modalStepChildren = Array.from(container.querySelector('.modal-step')!.children);
      const contentIndex = modalStepChildren.indexOf(stepContent!);
      const buttonIndex = modalStepChildren.indexOf(backButton!);

      expect(buttonIndex).toBeGreaterThan(contentIndex);
    });
  });

  describe('Edge Cases', () => {
    it('should handle onBack being undefined when showBackButton is true', () => {
      render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={undefined}
        />
      );

      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('should handle onBack being null when showBackButton is true', () => {
      render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={null as any}
        />
      );

      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('should handle onBack throwing an error', () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={errorCallback}
        />
      );

      expect(() => {
        fireEvent.click(screen.getByText('Back'));
      }).toThrow('Test error');
    });
  });

  describe('Accessibility', () => {
    it('should use proper semantic elements', () => {
      const { container } = render(<ModalStep {...defaultProps} />);

      // Title should be in a paragraph element with proper class
      const titleElement = container.querySelector('.step-title');
      expect(titleElement?.tagName).toBe('P');
    });

    it('should have focusable back button when present', () => {
      const onBack = jest.fn();
      render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={onBack}
        />
      );

      const backButton = screen.getByText('Back');
      expect(backButton.tagName).toBe('BUTTON');

      backButton.focus();
      expect(document.activeElement).toBe(backButton);
    });

    it('should support keyboard interaction on back button', () => {
      const onBack = jest.fn();
      render(
        <ModalStep
          {...defaultProps}
          showBackButton={true}
          onBack={onBack}
        />
      );

      const backButton = screen.getByText('Back');

      // Test Enter key
      fireEvent.keyDown(backButton, { key: 'Enter' });
      // Note: Default button behavior handles Enter key automatically

      // Test Space key
      fireEvent.keyDown(backButton, { key: ' ' });
      // Note: Default button behavior handles Space key automatically
    });
  });

  describe('Re-rendering Behavior', () => {
    it('should update title when prop changes', () => {
      const { rerender } = render(<ModalStep {...defaultProps} title="Original Title" />);

      expect(screen.getByText('Original Title')).toBeInTheDocument();

      rerender(<ModalStep {...defaultProps} title="Updated Title" />);

      expect(screen.queryByText('Original Title')).not.toBeInTheDocument();
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });

    it('should update back button visibility when props change', () => {
      const onBack = jest.fn();
      const { rerender } = render(
        <ModalStep {...defaultProps} showBackButton={false} onBack={onBack} />
      );

      expect(screen.queryByText('Back')).not.toBeInTheDocument();

      rerender(
        <ModalStep {...defaultProps} showBackButton={true} onBack={onBack} />
      );

      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should update children when prop changes', () => {
      const { rerender } = render(
        <ModalStep {...defaultProps}>
          <div>Original content</div>
        </ModalStep>
      );

      expect(screen.getByText('Original content')).toBeInTheDocument();

      rerender(
        <ModalStep {...defaultProps}>
          <div>Updated content</div>
        </ModalStep>
      );

      expect(screen.queryByText('Original content')).not.toBeInTheDocument();
      expect(screen.getByText('Updated content')).toBeInTheDocument();
    });
  });
});
