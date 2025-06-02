/**
 * @fileoverview Tests for the App component
 * Tests basic rendering and functionality
 */
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the socket hook
jest.mock('./hooks/useSocket', () => ({
  __esModule: true,
  default: () => ({
    connected: false,
    socketId: null,
    emit: jest.fn(),
    on: jest.fn(() => jest.fn()),
    socket: null
  })
}));

describe('App Component', () => {
  test('renders the join game page by default', () => {
    render(<App />);
    
    // Check for the game title on the join page
    const titleElement = screen.getByText(/Warlock/i);
    expect(titleElement).toBeInTheDocument();
    
    // Check for the join game form
    const joinFormElement = screen.getByPlaceholderText(/Enter your name/i);
    expect(joinFormElement).toBeInTheDocument();
  });
  
  test('includes the ThemeProvider', () => {
    render(<App />);
    
    // Check for themed elements with CSS variables
    const appContainer = document.querySelector('.app-container');
    expect(appContainer).toHaveStyle('font-family: var(--font-body)');
  });
});

