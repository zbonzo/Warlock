/**
 * Error boundary component to gracefully handle unexpected errors
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component captures errors in the component tree
 * and displays a fallback UI instead of crashing the application
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Log error details when caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console or an error reporting service
    console.error('Application Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  /**
   * Handle error reset
   */
  handleReset = (): void => {
    // Reset the error state
    this.setState({ hasError: false, error: null, errorInfo: null });

    // Attempt to reload the application
    window.location.reload();
  };

  render(): ReactNode {
    // If there's an error, show the fallback UI
    if (this.state.hasError) {
      return (
        <div className="error-boundary full-screen-center">
          <div className="error-container">
            <h1 className="error-title">Oops! Something went wrong</h1>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="error-actions">
              <button className="error-reset-button" onClick={this.handleReset}>
                Reload Application
              </button>
            </div>
            {/* Technical details (collapsed by default) */}
            <details className="error-details">
              <summary>Technical Details</summary>
              <pre>{this.state.error?.toString()}</pre>
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </details>
          </div>
        </div>
      );
    }

    // If there's no error, render the children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
