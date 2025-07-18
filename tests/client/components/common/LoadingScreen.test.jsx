/**
 * @fileoverview Tests for LoadingScreen component
 * Tests loading spinner and message display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingScreen from '@client/components/common/LoadingScreen';

describe('LoadingScreen', () => {
  it('should render without crashing', () => {
    render(<LoadingScreen />);
    
    expect(screen.getByRole('status', { hidden: true }) || document.querySelector('.loading-screen')).toBeInTheDocument();
  });

  it('should display loading spinner', () => {
    render(<LoadingScreen />);
    
    const spinner = document.querySelector('.loading-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('should display provided message', () => {
    const testMessage = 'Loading game data...';
    render(<LoadingScreen message={testMessage} />);
    
    expect(screen.getByText(testMessage)).toBeInTheDocument();
  });

  it('should display message with correct class', () => {
    const testMessage = 'Loading configuration...';
    render(<LoadingScreen message={testMessage} />);
    
    const messageElement = screen.getByText(testMessage);
    expect(messageElement).toHaveClass('loading-message');
  });

  it('should render without message when none provided', () => {
    render(<LoadingScreen />);
    
    const messageElement = document.querySelector('.loading-message');
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toBeEmptyDOMElement();
  });

  it('should render with empty message', () => {
    render(<LoadingScreen message="" />);
    
    const messageElement = document.querySelector('.loading-message');
    expect(messageElement).toBeInTheDocument();
    expect(messageElement).toBeEmptyDOMElement();
  });

  it('should handle long messages', () => {
    const longMessage = 'This is a very long loading message that should still display correctly without breaking the layout or causing any issues with the component rendering';
    render(<LoadingScreen message={longMessage} />);
    
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('should handle special characters in message', () => {
    const specialMessage = 'Loading... 50% complete! 🎮';
    render(<LoadingScreen message={specialMessage} />);
    
    expect(screen.getByText(specialMessage)).toBeInTheDocument();
  });

  it('should have proper container structure', () => {
    render(<LoadingScreen message="Test message" />);
    
    const container = document.querySelector('.loading-screen');
    expect(container).toBeInTheDocument();
    
    const spinner = container.querySelector('.loading-spinner');
    const message = container.querySelector('.loading-message');
    
    expect(spinner).toBeInTheDocument();
    expect(message).toBeInTheDocument();
  });

  it('should apply loading screen class', () => {
    render(<LoadingScreen />);
    
    const container = document.querySelector('.loading-screen');
    expect(container).toHaveClass('loading-screen');
  });

  it('should apply spinner class', () => {
    render(<LoadingScreen />);
    
    const spinner = document.querySelector('.loading-spinner');
    expect(spinner).toHaveClass('loading-spinner');
  });
});