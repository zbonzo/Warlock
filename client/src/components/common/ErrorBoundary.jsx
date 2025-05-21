/**
 * client/src/components/common/ErrorBoundary.jsx
 * Error boundary component to gracefully handle unexpected errors
 */
import React from 'react';
import PropTypes from 'prop-types';
import './ErrorBoundary.css';

/**
 * ErrorBoundary component captures errors in the component tree
 * and displays a fallback UI instead of crashing the application
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  /**
   * Update state when error is caught
   * @param {Error} error - The error that was thrown
   * @returns {Object} New state with error information
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Log error details when caught
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - React error info object
   */
  componentDidCatch(error, errorInfo) {
    // Log error to console or an error reporting service
    console.error('Application Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  /**
   * Handle error reset
   */
  handleReset = () => {
    // Reset the error state
    this.setState({ hasError: false, error: null, errorInfo: null });

    // Attempt to reload the application
    window.location.reload();
  };

  render() {
    // If there's an error, show the fallback UI
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
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

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
