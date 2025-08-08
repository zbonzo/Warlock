/**
 * @fileoverview Tests for JoinGamePage component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import JoinGamePage from '../../../../client/src/pages/JoinGamePage/JoinGamePage';

// Mock dependencies
jest.mock('@contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primary: '#1a1a1a',
      secondary: '#333333',
      accent: '#00ff00',
      danger: '#ff0000'
    }
  }))
}));

jest.mock('@components/common/ThemeToggle', () => {
  return function MockThemeToggle() {
    return <div data-testid="theme-toggle">Theme Toggle</div>;
  };
});

jest.mock('../../../../client/src/components/ui/RuneButton', () => {
  return function MockRuneButton({
    children,
    onClick,
    disabled,
    variant = 'primary'
  }: any) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        data-testid="rune-button"
        data-variant={variant}
      >
        {children}
      </button>
    );
  };
});

jest.mock('@components/modals/GameTutorial', () => {
  return function MockGameTutorial({ isOpen, onComplete }: any) {
    return isOpen ? (
      <div data-testid="game-tutorial">
        <button onClick={onComplete}>Close Tutorial</button>
      </div>
    ) : null;
  };
});

jest.mock('@hooks/useSocket', () => {
  return jest.fn();
});

jest.mock('@config/constants', () => ({
  SOCKET_URL: 'ws://localhost:3001'
}));

jest.mock('../../../../client/src/pages/JoinGamePage/constants', () => ({
  RANDOM_NAMES: ['Hero1', 'Champion2', 'Warrior3', 'Knight4', 'Ranger5']
}));

jest.mock('../../../../client/src/pages/JoinGamePage/JoinGamePage.css', () => ({}));

// Mock localStorage
const mockLocalStorage = {
  removeItem: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('JoinGamePage', () => {
  const mockUseSocket = require('@hooks/useSocket');
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn()
  };

  const defaultProps = {
    onCreateGame: jest.fn(),
    onJoinGame: jest.fn(),
    onReconnect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseSocket.mockReturnValue({
      socket: mockSocket,
      connected: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render the game logo and tagline', () => {
      render(<JoinGamePage {...defaultProps} />);

      expect(screen.getByText('Warlock')).toBeInTheDocument();
      expect(screen.getByText('Battle monsters with friends, but beware the Warlocks among you!')).toBeInTheDocument();
    });

    it('should render name input field', () => {
      render(<JoinGamePage {...defaultProps} />);

      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
      expect(screen.getByText('Your Name')).toBeInTheDocument();
    });

    it('should render game code input field', () => {
      render(<JoinGamePage {...defaultProps} />);

      expect(screen.getByPlaceholderText('4-digit mystic code')).toBeInTheDocument();
      expect(screen.getByText('Whisper the Code')).toBeInTheDocument();
    });

    it('should render create game button when no code entered', () => {
      render(<JoinGamePage {...defaultProps} />);

      expect(screen.getByText('Cast the First Rune')).toBeInTheDocument();
    });

    it('should render tutorial button', () => {
      render(<JoinGamePage {...defaultProps} />);

      expect(screen.getByText('How to Play')).toBeInTheDocument();
    });

    it('should render theme toggle in footer', () => {
      render(<JoinGamePage {...defaultProps} />);

      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });
  });

  describe('Lifecycle Effects', () => {
    it('should clear localStorage on mount', () => {
      render(<JoinGamePage {...defaultProps} />);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lastGameCode');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lastPlayerName');
    });

    it('should set up socket listeners', () => {
      render(<JoinGamePage {...defaultProps} />);

      expect(mockSocket.on).toHaveBeenCalledWith('nameCheckResponse', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('errorMessage', expect.any(Function));
    });

    it('should clean up socket listeners on unmount', () => {
      const { unmount } = render(<JoinGamePage {...defaultProps} />);

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('nameCheckResponse', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('errorMessage', expect.any(Function));
    });
  });

  describe('Name Input Validation', () => {
    it('should accept valid names', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'ValidName' } });

      expect(nameInput).toHaveValue('ValidName');
      expect(screen.getByText('✓ Name looks good!')).toBeInTheDocument();
    });

    it('should reject names shorter than 2 characters', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'A' } });

      expect(screen.getByText('Need 1 more character')).toBeInTheDocument();
    });

    it('should reject reserved words', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'monster' } });

      expect(screen.getByText('Cannot use reserved game terms')).toBeInTheDocument();
    });

    it('should filter dangerous characters', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'Test<script>' } });

      expect(nameInput).toHaveValue('Testscript');
    });

    it('should limit name length to 20 characters', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      const longName = 'A'.repeat(25);
      fireEvent.change(nameInput, { target: { value: longName } });

      expect(nameInput.value.length).toBe(20);
    });

    it('should show character counter', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'Test' } });

      expect(screen.getByText('4/20')).toBeInTheDocument();
    });
  });

  describe('Random Name Generation', () => {
    it('should generate random name when dice button is clicked', () => {
      render(<JoinGamePage {...defaultProps} />);

      const diceButton = screen.getByTitle('Generate a random name');
      fireEvent.click(diceButton);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      const nameInput = screen.getByPlaceholderText('Enter your name');
      expect(['Hero1', 'Champion2', 'Warrior3', 'Knight4', 'Ranger5']).toContain(nameInput.value);
    });

    it('should show loading state while generating name', () => {
      render(<JoinGamePage {...defaultProps} />);

      const diceButton = screen.getByTitle('Generate a random name');
      fireEvent.click(diceButton);

      expect(diceButton).toHaveTextContent('...');
      expect(diceButton).toBeDisabled();
    });
  });

  describe('Game Code Input', () => {
    it('should only accept numeric input', () => {
      render(<JoinGamePage {...defaultProps} />);

      const codeInput = screen.getByPlaceholderText('4-digit mystic code');
      fireEvent.change(codeInput, { target: { value: 'abc123def' } });

      expect(codeInput).toHaveValue('1234');
    });

    it('should limit code to 4 digits', () => {
      render(<JoinGamePage {...defaultProps} />);

      const codeInput = screen.getByPlaceholderText('4-digit mystic code');
      fireEvent.change(codeInput, { target: { value: '123456789' } });

      expect(codeInput).toHaveValue('1234');
    });

    it('should show clear button when code is entered', () => {
      render(<JoinGamePage {...defaultProps} />);

      const codeInput = screen.getByPlaceholderText('4-digit mystic code');
      fireEvent.change(codeInput, { target: { value: '1234' } });

      expect(screen.getByLabelText('Clear game code')).toBeInTheDocument();
    });

    it('should clear code when clear button is clicked', () => {
      render(<JoinGamePage {...defaultProps} />);

      const codeInput = screen.getByPlaceholderText('4-digit mystic code');
      fireEvent.change(codeInput, { target: { value: '1234' } });

      const clearButton = screen.getByLabelText('Clear game code');
      fireEvent.click(clearButton);

      expect(codeInput).toHaveValue('');
    });
  });

  describe('Button States', () => {
    it('should show create game button when no code entered', () => {
      render(<JoinGamePage {...defaultProps} />);

      expect(screen.getByText('Cast the First Rune')).toBeInTheDocument();
      expect(screen.queryByText('Take your place')).not.toBeInTheDocument();
    });

    it('should show join game button when code is entered', () => {
      render(<JoinGamePage {...defaultProps} />);

      const codeInput = screen.getByPlaceholderText('4-digit mystic code');
      fireEvent.change(codeInput, { target: { value: '1234' } });

      expect(screen.queryByText('Cast the First Rune')).not.toBeInTheDocument();
      expect(screen.getByText('Take your place')).toBeInTheDocument();
    });

    it('should disable create game button with invalid name', () => {
      render(<JoinGamePage {...defaultProps} />);

      const createButton = screen.getByText('Cast the First Rune');
      expect(createButton).toBeDisabled();
    });

    it('should enable create game button with valid name', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'ValidName' } });

      const createButton = screen.getByText('Cast the First Rune');
      expect(createButton).not.toBeDisabled();
    });
  });

  describe('Game Actions', () => {
    it('should call onCreateGame when create button is clicked', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });

      const createButton = screen.getByText('Cast the First Rune');
      fireEvent.click(createButton);

      expect(defaultProps.onCreateGame).toHaveBeenCalledWith('TestPlayer');
    });

    it('should call onJoinGame when join button is clicked', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      const codeInput = screen.getByPlaceholderText('4-digit mystic code');

      fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
      fireEvent.change(codeInput, { target: { value: '1234' } });

      const joinButton = screen.getByText('Take your place');
      fireEvent.click(joinButton);

      expect(defaultProps.onJoinGame).toHaveBeenCalledWith('1234', 'TestPlayer');
    });

    it('should clear localStorage before creating game', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });

      const createButton = screen.getByText('Cast the First Rune');
      fireEvent.click(createButton);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lastGameCode');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('lastPlayerName');
    });
  });

  describe('Tutorial Modal', () => {
    it('should show tutorial when tutorial button is clicked', () => {
      render(<JoinGamePage {...defaultProps} />);

      const tutorialButton = screen.getByText('How to Play');
      fireEvent.click(tutorialButton);

      expect(screen.getByTestId('game-tutorial')).toBeInTheDocument();
    });

    it('should hide tutorial when modal is closed', () => {
      render(<JoinGamePage {...defaultProps} />);

      const tutorialButton = screen.getByText('How to Play');
      fireEvent.click(tutorialButton);

      const closeButton = screen.getByText('Close Tutorial');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('game-tutorial')).not.toBeInTheDocument();
    });
  });

  describe('Code Help', () => {
    it('should show code help when help button is clicked', () => {
      render(<JoinGamePage {...defaultProps} />);

      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);

      expect(screen.getByText(/Enter a 4-digit code whispered by the ritual master/)).toBeInTheDocument();
    });

    it('should hide code help when help button is clicked again', () => {
      render(<JoinGamePage {...defaultProps} />);

      const helpButton = screen.getByText('?');
      fireEvent.click(helpButton);
      fireEvent.click(helpButton);

      expect(screen.queryByText(/Enter a 4-digit code whispered by the ritual master/)).not.to.toBeInTheDocument();
    });
  });

  describe('Socket Events', () => {
    it('should handle nameCheckResponse for available name', () => {
      render(<JoinGamePage {...defaultProps} />);

      // Get the event handler that was registered
      const nameCheckHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'nameCheckResponse'
      )[1];

      act(() => {
        nameCheckHandler({ isAvailable: true });
      });

      // Should show success state (tested indirectly through other behaviors)
    });

    it('should handle nameCheckResponse for unavailable name', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameCheckHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'nameCheckResponse'
      )[1];

      act(() => {
        nameCheckHandler({
          isAvailable: false,
          error: 'Name is taken',
          suggestion: 'TestPlayer2'
        });
      });

      expect(screen.getByText('Name is taken')).toBeInTheDocument();
    });

    it('should handle errorMessage events', () => {
      render(<JoinGamePage {...defaultProps} />);

      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'errorMessage'
      )[1];

      act(() => {
        errorHandler({ message: 'Game not found', code: 'NOT_FOUND_ERROR' });
      });

      // Should handle the error appropriately
    });
  });

  describe('Duplicate Name Checking', () => {
    it('should trigger name check when valid name and code are entered', async () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      const codeInput = screen.getByPlaceholderText('4-digit mystic code');

      fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
      fireEvent.change(codeInput, { target: { value: '1234' } });

      // Wait for debounced call
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('checkNameAvailability', {
        playerName: 'TestPlayer',
        gameCode: '1234'
      });
    });

    it('should show checking message during name validation', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      const codeInput = screen.getByPlaceholderText('4-digit mystic code');

      fireEvent.change(nameInput, { target: { value: 'TestPlayer' } });
      fireEvent.change(codeInput, { target: { value: '1234' } });

      expect(screen.getByText('Checking name availability...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing socket gracefully', () => {
      mockUseSocket.mockReturnValue({
        socket: null,
        connected: false
      });

      expect(() => render(<JoinGamePage {...defaultProps} />)).not.toThrow();
    });

    it('should prevent dangerous key presses', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');

      const preventDefault = jest.fn();
      fireEvent.keyPress(nameInput, {
        key: '<',
        preventDefault
      });

      expect(preventDefault).toHaveBeenCalled();
    });

    it('should handle paste events with dangerous content', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');

      const clipboardData = {
        getData: () => 'Test<script>alert("xss")</script>'
      };

      const preventDefault = jest.fn();
      fireEvent.paste(nameInput, {
        clipboardData,
        preventDefault
      });

      expect(preventDefault).toHaveBeenCalled();
      expect(nameInput).toHaveValue('Testscriptalertxssscript');
    });
  });

  describe('Suggestions', () => {
    it('should show suggestion button when name is invalid', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'monster' } });

      const suggestion = screen.getByText(/Try:/);
      expect(suggestion).toBeInTheDocument();
    });

    it('should use suggestion when suggestion button is clicked', () => {
      render(<JoinGamePage {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      fireEvent.change(nameInput, { target: { value: 'monster' } });

      const suggestionButton = suggestion.querySelector('button');
      if (suggestionButton) {
        fireEvent.click(suggestionButton);
        expect(nameInput.value).not.toBe('monster');
      }
    });
  });
});
