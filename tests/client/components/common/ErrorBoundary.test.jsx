/**
 * @fileoverview Tests for ErrorBoundary component
 * Tests error catching, fallback UI, and error handling
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '@client/components/common/ErrorBoundary';

// Mock console.error to avoid cluttering test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Mock window.location.reload
const mockReload = jest.fn();
Object.defineProperty(window, 'location', {
  value: {
    reload: mockReload
  },
  writable: true
});

// Test component that throws an error
const ThrowError = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Test component that throws an error with custom message
const ThrowCustomError = ({ shouldThrow = false, errorMessage = 'Custom error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReload.mockClear();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render children component without error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should catch and display error when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should display generic error message when error has no message', () => {
    const ThrowEmptyError = () => {
      throw new Error();
    };

    render(
      <ErrorBoundary>
        <ThrowEmptyError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('should display custom error message', () => {
    const customErrorMessage = 'Custom error occurred';
    
    render(
      <ErrorBoundary>
        <ThrowCustomError shouldThrow={true} errorMessage={customErrorMessage} />
      </ErrorBoundary>
    );

    expect(screen.getByText(customErrorMessage)).toBeInTheDocument();
  });

  it('should render reload button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload application/i });
    expect(reloadButton).toBeInTheDocument();
  });

  it('should call window.location.reload when reload button is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload application/i });
    fireEvent.click(reloadButton);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should display technical details in collapsible section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const detailsElement = screen.getByText('Technical Details');
    expect(detailsElement).toBeInTheDocument();
    
    // Check if it's a details element
    const details = detailsElement.closest('details');
    expect(details).toBeInTheDocument();
  });

  it('should expand technical details when clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const detailsElement = screen.getByText('Technical Details');
    const details = detailsElement.closest('details');
    
    // Initially closed
    expect(details).not.toHaveAttribute('open');
    
    // Click to expand
    fireEvent.click(detailsElement);
    
    // Should be open now
    expect(details).toHaveAttribute('open');
  });

  it('should log error to console when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'Application Error:',
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('should have proper error boundary styling classes', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const errorBoundary = document.querySelector('.error-boundary');
    expect(errorBoundary).toBeInTheDocument();
    
    const errorContainer = document.querySelector('.error-container');
    expect(errorContainer).toBeInTheDocument();
    
    const errorTitle = document.querySelector('.error-title');
    expect(errorTitle).toBeInTheDocument();
    
    const errorMessage = document.querySelector('.error-message');
    expect(errorMessage).toBeInTheDocument();
    
    const errorActions = document.querySelector('.error-actions');
    expect(errorActions).toBeInTheDocument();
    
    const errorDetails = document.querySelector('.error-details');
    expect(errorDetails).toBeInTheDocument();
  });

  it('should display error stack trace in technical details', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const detailsElement = screen.getByText('Technical Details');
    fireEvent.click(detailsElement);
    
    // Check if error details are displayed
    const errorText = screen.getByText(/Error: Test error message/);
    expect(errorText).toBeInTheDocument();
  });

  it('should handle multiple children', () => {
    render(
      <ErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should catch error from any child in the tree', () => {
    render(
      <ErrorBoundary>
        <div>
          <div>
            <ThrowError shouldThrow={true} />
          </div>
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
  });

  it('should reset error state when handleReset is called', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error state should be shown
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    
    // Click reload button
    const reloadButton = screen.getByRole('button', { name: /reload application/i });
    fireEvent.click(reloadButton);
    
    // Reload should be called
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('should handle null error gracefully', () => {
    // Create a custom error boundary for testing
    class TestErrorBoundary extends ErrorBoundary {
      constructor(props) {
        super(props);
        this.state = { hasError: true, error: null, errorInfo: null };
      }
    }

    render(
      <TestErrorBoundary>
        <div>Test content</div>
      </TestErrorBoundary>
    );

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });
});