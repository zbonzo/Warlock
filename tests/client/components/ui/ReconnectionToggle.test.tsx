/**
 * @fileoverview Tests for ReconnectionToggle.tsx
 * Comprehensive test suite for the ReconnectionToggle component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReconnectionToggle from '../../../../client/src/components/ui/ReconnectionToggle';

// Mock CSS
jest.mock('../../../../client/src/components/ui/ReconnectionToggle.css', () => ({}));

// Mock reconnectionStorage
const mockReconnectionStorage = {
  getReconnectionEnabled: jest.fn(),
  setReconnectionEnabled: jest.fn(),
  clearCharacterSession: jest.fn(),
};

jest.mock('../../../../client/src/utils/reconnectionStorage', () => ({
  __esModule: true,
  default: mockReconnectionStorage,
}));

describe('ReconnectionToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to enabled state
    mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(true);
  });

  describe('Basic Rendering', () => {
    it('should render toggle label', () => {
      render(<ReconnectionToggle />);
      
      expect(screen.getByText('Reconnection Enabled')).toBeInTheDocument();
    });

    it('should render description for enabled state', () => {
      render(<ReconnectionToggle />);
      
      expect(screen.getByText('Character will persist on disconnect for testing')).toBeInTheDocument();
    });

    it('should have correct CSS class structure', () => {
      const { container } = render(<ReconnectionToggle />);
      
      expect(container.querySelector('.reconnection-toggle')).toBeInTheDocument();
      expect(container.querySelector('.flex-center-column')).toBeInTheDocument();
      expect(container.querySelector('.toggle-label')).toBeInTheDocument();
      expect(container.querySelector('.toggle-input')).toBeInTheDocument();
      expect(container.querySelector('.toggle-slider')).toBeInTheDocument();
      expect(container.querySelector('.toggle-text')).toBeInTheDocument();
      expect(container.querySelector('.toggle-description')).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      const { container } = render(<ReconnectionToggle className="custom-class" />);
      
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('should have default empty className when not provided', () => {
      const { container } = render(<ReconnectionToggle />);
      
      const toggle = container.querySelector('.reconnection-toggle');
      expect(toggle).toHaveClass('reconnection-toggle', 'flex-center-column');
    });
  });

  describe('Initial State', () => {
    it('should initialize with enabled state from storage', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(true);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      expect(screen.getByText('Reconnection Enabled')).toBeInTheDocument();
    });

    it('should initialize with disabled state from storage', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(false);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      expect(screen.getByText('Reconnection Disabled')).toBeInTheDocument();
    });

    it('should call getReconnectionEnabled on mount', () => {
      render(<ReconnectionToggle />);
      
      expect(mockReconnectionStorage.getReconnectionEnabled).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle from enabled to disabled', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(true);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      
      fireEvent.click(checkbox);
      
      expect(mockReconnectionStorage.setReconnectionEnabled).toHaveBeenCalledWith(false);
      expect(screen.getByText('Reconnection Disabled')).toBeInTheDocument();
    });

    it('should toggle from disabled to enabled', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(false);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      
      fireEvent.click(checkbox);
      
      expect(mockReconnectionStorage.setReconnectionEnabled).toHaveBeenCalledWith(true);
      expect(screen.getByText('Reconnection Enabled')).toBeInTheDocument();
    });

    it('should clear character session when disabling', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(true);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(mockReconnectionStorage.clearCharacterSession).toHaveBeenCalledTimes(1);
    });

    it('should not clear character session when enabling', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(false);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(mockReconnectionStorage.clearCharacterSession).not.toHaveBeenCalled();
    });
  });

  describe('Text and Description Updates', () => {
    it('should show enabled text and description when enabled', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(true);
      
      render(<ReconnectionToggle />);
      
      expect(screen.getByText('Reconnection Enabled')).toBeInTheDocument();
      expect(screen.getByText('Character will persist on disconnect for testing')).toBeInTheDocument();
    });

    it('should show disabled text and description when disabled', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(false);
      
      render(<ReconnectionToggle />);
      
      expect(screen.getByText('Reconnection Disabled')).toBeInTheDocument();
      expect(screen.getByText('Character leaves game on disconnect (multi-window testing)')).toBeInTheDocument();
    });

    it('should update text when toggling to disabled', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(true);
      
      render(<ReconnectionToggle />);
      
      expect(screen.getByText('Reconnection Enabled')).toBeInTheDocument();
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(screen.getByText('Reconnection Disabled')).toBeInTheDocument();
      expect(screen.getByText('Character leaves game on disconnect (multi-window testing)')).toBeInTheDocument();
    });

    it('should update text when toggling to enabled', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(false);
      
      render(<ReconnectionToggle />);
      
      expect(screen.getByText('Reconnection Disabled')).toBeInTheDocument();
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(screen.getByText('Reconnection Enabled')).toBeInTheDocument();
      expect(screen.getByText('Character will persist on disconnect for testing')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle clicks on the checkbox input', () => {
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(mockReconnectionStorage.setReconnectionEnabled).toHaveBeenCalled();
    });

    it('should handle clicks on the label', () => {
      render(<ReconnectionToggle />);
      
      const label = screen.getByText('Reconnection Enabled').closest('label');
      fireEvent.click(label!);
      
      expect(mockReconnectionStorage.setReconnectionEnabled).toHaveBeenCalled();
    });

    it('should handle multiple rapid toggles', () => {
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      
      // Toggle multiple times
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      
      expect(mockReconnectionStorage.setReconnectionEnabled).toHaveBeenCalledTimes(3);
    });

    it('should handle change events on checkbox', () => {
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.change(checkbox, { target: { checked: false } });
      
      expect(mockReconnectionStorage.setReconnectionEnabled).toHaveBeenCalledWith(false);
    });
  });

  describe('Storage Integration', () => {
    it('should set storage with correct value when enabling', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(false);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(mockReconnectionStorage.setReconnectionEnabled).toHaveBeenCalledWith(true);
    });

    it('should set storage with correct value when disabling', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(true);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      
      expect(mockReconnectionStorage.setReconnectionEnabled).toHaveBeenCalledWith(false);
    });

    it('should call clearCharacterSession only when disabling', () => {
      // Start enabled
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(true);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      
      // Disable - should clear session
      fireEvent.click(checkbox);
      expect(mockReconnectionStorage.clearCharacterSession).toHaveBeenCalledTimes(1);
      
      // Enable - should not clear session
      fireEvent.click(checkbox);
      expect(mockReconnectionStorage.clearCharacterSession).toHaveBeenCalledTimes(1); // Still just once
    });
  });

  describe('Component State Synchronization', () => {
    it('should maintain state consistency with storage calls', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(true);
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      
      // Initial state
      expect(checkbox).toBeChecked();
      expect(screen.getByText('Reconnection Enabled')).toBeInTheDocument();
      
      // Toggle to disabled
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      expect(screen.getByText('Reconnection Disabled')).toBeInTheDocument();
      
      // Toggle back to enabled
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByText('Reconnection Enabled')).toBeInTheDocument();
    });

    it('should handle storage initialization errors gracefully', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => {
        render(<ReconnectionToggle />);
      }).not.toThrow();
      
      // Should default to enabled state (true) when storage fails
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should handle storage set errors gracefully', () => {
      mockReconnectionStorage.setReconnectionEnabled.mockImplementation(() => {
        throw new Error('Storage set error');
      });
      
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      
      expect(() => {
        fireEvent.click(checkbox);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible checkbox input', () => {
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('should have proper label association', () => {
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('Reconnection Enabled').closest('label');
      
      expect(label).toContainElement(checkbox);
    });

    it('should be keyboard accessible', () => {
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      
      // Focus the checkbox
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
      
      // Space key should toggle
      fireEvent.keyDown(checkbox, { key: ' ' });
      // Note: Default checkbox behavior handles space key
    });

    it('should have descriptive text for screen readers', () => {
      render(<ReconnectionToggle />);
      
      expect(screen.getByText('Reconnection Enabled')).toBeInTheDocument();
      expect(screen.getByText('Character will persist on disconnect for testing')).toBeInTheDocument();
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should apply all required CSS classes', () => {
      const { container } = render(<ReconnectionToggle />);
      
      expect(container.querySelector('.reconnection-toggle')).toBeInTheDocument();
      expect(container.querySelector('.flex-center-column')).toBeInTheDocument();
      expect(container.querySelector('.toggle-label')).toBeInTheDocument();
      expect(container.querySelector('.flex')).toBeInTheDocument();
      expect(container.querySelector('.items-center')).toBeInTheDocument();
      expect(container.querySelector('.toggle-input')).toBeInTheDocument();
      expect(container.querySelector('.toggle-slider')).toBeInTheDocument();
      expect(container.querySelector('.toggle-text')).toBeInTheDocument();
      expect(container.querySelector('.toggle-description')).toBeInTheDocument();
    });

    it('should combine custom className with default classes', () => {
      const { container } = render(<ReconnectionToggle className="custom-class another-class" />);
      
      const toggle = container.querySelector('.reconnection-toggle');
      expect(toggle).toHaveClass('reconnection-toggle', 'flex-center-column', 'custom-class', 'another-class');
    });

    it('should handle empty custom className', () => {
      const { container } = render(<ReconnectionToggle className="" />);
      
      const toggle = container.querySelector('.reconnection-toggle');
      expect(toggle).toHaveClass('reconnection-toggle', 'flex-center-column');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined return from getReconnectionEnabled', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(undefined as any);
      
      render(<ReconnectionToggle />);
      
      // Should default to enabled (true) state
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should handle null return from getReconnectionEnabled', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue(null as any);
      
      render(<ReconnectionToggle />);
      
      // Should default to enabled (true) state
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should handle boolean string returns from storage', () => {
      mockReconnectionStorage.getReconnectionEnabled.mockReturnValue('false' as any);
      
      render(<ReconnectionToggle />);
      
      // Should treat truthy string as enabled
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should handle rapid state changes', () => {
      render(<ReconnectionToggle />);
      
      const checkbox = screen.getByRole('checkbox');
      
      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(checkbox);
      }
      
      // Should have called setReconnectionEnabled for each click
      expect(mockReconnectionStorage.setReconnectionEnabled).toHaveBeenCalledTimes(10);
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize state on mount', () => {
      render(<ReconnectionToggle />);
      
      expect(mockReconnectionStorage.getReconnectionEnabled).toHaveBeenCalledTimes(1);
    });

    it('should not call storage methods on re-render without state change', () => {
      const { rerender } = render(<ReconnectionToggle />);
      
      expect(mockReconnectionStorage.getReconnectionEnabled).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<ReconnectionToggle />);
      
      // Should not call getReconnectionEnabled again (useEffect dependency is empty)
      expect(mockReconnectionStorage.getReconnectionEnabled).toHaveBeenCalledTimes(1);
    });

    it('should handle unmounting gracefully', () => {
      const { unmount } = render(<ReconnectionToggle />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });
});