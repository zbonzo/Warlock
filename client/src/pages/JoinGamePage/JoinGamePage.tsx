/**
 * @fileoverview Enhanced JoinGamePage with real-time duplicate name checking
 * Prevents users from joining with duplicate names by checking before they join
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import ThemeToggle from '@components/common/ThemeToggle';
import RuneButton from '../../components/ui/RuneButton';
import GameTutorial from '@components/modals/GameTutorial';
import { RANDOM_NAMES } from './constants';
import useSocket from '@hooks/useSocket';
import { SOCKET_URL } from '@config/constants';
import './JoinGamePage.css';

interface ValidationResult {
  isValid: boolean;
  error: string;
  suggestion: string;
}

interface NameCheckResponse {
  available: boolean;
  error?: string;
  suggestions?: string[];
}

interface ErrorMessage {
  message: string;
  code?: string;
}

interface JoinGamePageProps {
  onCreateGame: (name: string) => void;
  onJoinGame: (code: string, name: string) => void;
  onReconnect?: () => void;
}

/**
 * Enhanced JoinGamePage with real-time duplicate name checking
 */
const JoinGamePage: React.FC<JoinGamePageProps> = ({ onCreateGame, onJoinGame, onReconnect }) => {
  // Socket connection for checking duplicates
  const { socket, connected } = useSocket(SOCKET_URL);

  // Form state
  const [name, setName] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');

  // Validation state
  const [nameError, setNameError] = useState<string>('');
  const [nameSuggestion, setNameSuggestion] = useState<string>('');
  const [isNameValid, setIsNameValid] = useState<boolean>(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState<boolean>(false);

  // UI state
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [showCodeHelp, setShowCodeHelp] = useState<boolean>(false);
  const [isGeneratingName, setIsGeneratingName] = useState<boolean>(false);
  const [temporaryFeedback, setTemporaryFeedback] = useState<string>('');

  /**
   * Clear session data on mount
   */
  useEffect(() => {
    localStorage.removeItem('lastGameCode');
    localStorage.removeItem('lastPlayerName');
  }, []);


  /**
   * Socket event listeners for name checking
   */
  useEffect(() => {
    if (!socket) return;

    const handleNameCheckResponse = ({ available, error, suggestions }: NameCheckResponse): void => {
      setIsCheckingDuplicate(false);

      if (!available) {
        setNameError(error || 'Name is already taken in this game');
        setNameSuggestion((suggestions && suggestions[0]) || generateAlternativeName(name));
        setIsNameValid(false);
      } else {
        // Name is available, set as valid
        setIsNameValid(true);
        setNameError('');
        setNameSuggestion('');
      }
    };

    const handleErrorMessage = ({ message, code }: ErrorMessage): void => {
      setIsCheckingDuplicate(false);

      // Handle different types of errors
      if (code === 'NOT_FOUND_ERROR' || message.includes('Game not found')) {
        // Game doesn't exist, so no duplicates to worry about
        const validation = validateName(name);
        setIsNameValid(validation.isValid);
        setNameError(validation.error);
        setNameSuggestion(validation.suggestion);
      } else {
        // Other errors - show the error message
        setNameError(message || 'Unable to check name availability');
        setIsNameValid(false);
        setNameSuggestion('');
      }
    };

    socket.on('nameCheckResponse', handleNameCheckResponse);
    socket.on('errorMessage', handleErrorMessage);

    return () => {
      socket.off('nameCheckResponse', handleNameCheckResponse);
      socket.off('errorMessage', handleErrorMessage);
    };
  }, [socket, name]);

  /**
   * Debounced duplicate name checking
   */
  const checkDuplicateName = useCallback((nameToCheck: string, gameCodeToCheck: string) => {
    const debouncedCheck = debounce((name: string, code: string) => {
      if (!socket || !connected) return;

      setIsCheckingDuplicate(true);
      (socket as any).emit('checkNameAvailability', {
        playerName: name,
        gameCode: code,
      });
    }, 500);
    
    debouncedCheck(nameToCheck, gameCodeToCheck);
  }, [socket, connected]);

  /**
   * Client-side name validation
   */
  const validateName = (inputName: string): ValidationResult => {
    const trimmedName = inputName.trim();

    if (!trimmedName) {
      return {
        isValid: false,
        error: '',
        suggestion: 'Enter a name to get started',
      };
    }

    if (trimmedName.length < 2) {
      return {
        isValid: false,
        error: `Need ${2 - trimmedName.length} more character${trimmedName.length === 1 ? '' : 's'}`,
        suggestion: '',
      };
    }

    // Check for dangerous characters
    const dangerousChars = /[<>{}()&;|`$\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
    if (dangerousChars.test(trimmedName)) {
      return {
        isValid: false,
        error: 'Name contains unsafe characters',
        suggestion: trimmedName.replace(dangerousChars, ''),
      };
    }

    // Normalize for reserved word checking
    const normalizedName = trimmedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Reserved words check
    const reservedWords = [
      'monster',
      'admin',
      'warlock',
      'system',
      'you',
      'your',
      'server',
      'game',
      'host',
      'target',
      'attacker',
      'player',
      'hero',
      'character',
      'damage',
      'heal',
      'death',
      'kill',
      // Add ability names that should be blocked
      'fireball',
      'lightning',
      'slash',
      'heal',
      'shield',
      'poison',
    ];

    if (
      reservedWords.some(
        (word) => normalizedName === word || normalizedName.includes(word)
      )
    ) {
      return {
        isValid: false,
        error: 'Cannot use reserved game terms',
        suggestion: generateAlternativeName(trimmedName),
      };
    }

    // Check for only spaces/punctuation
    if (/^[\s\-']+$/.test(trimmedName)) {
      return {
        isValid: false,
        error: 'Name must contain letters or numbers',
        suggestion: 'Hero' + Math.floor(Math.random() * 99),
      };
    }

    return {
      isValid: true,
      error: '',
      suggestion: '',
    };
  };

  /**
   * Enhanced name change handler with duplicate checking
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    let newValue = e.target.value;

    // Filter dangerous characters in real-time
    newValue = newValue
      .replace(/[<>{}()&;|`$\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .substring(0, 20);

    // Prevent multiple consecutive spaces
    newValue = newValue.replace(/\s{2,}/g, ' ');

    setName(newValue);

    // Basic client-side validation first
    const validation = validateName(newValue);

    if (validation.isValid && joinCode && newValue.trim().length >= 2) {
      // Name passes basic validation and we have a game code
      // Check for duplicates in the target game
      checkDuplicateName(newValue.trim(), joinCode.trim());
      setNameError('Checking name availability...');
      setIsNameValid(false); // Temporarily invalid while checking
    } else {
      // Either failed basic validation or no game code to check against
      setIsNameValid(validation.isValid);
      setNameError(validation.error);
      setNameSuggestion(validation.suggestion);
      setIsCheckingDuplicate(false);
    }
  };

  /**
   * Enhanced game code change handler
   */
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const input = e.target.value;
    const numbersOnly = input.replace(/[^0-9]/g, '');
    const newCode = numbersOnly.slice(0, 4);

    setJoinCode(newCode);

    // If we have both name and code, check for duplicates
    if (name.trim().length >= 2 && newCode.length === 4) {
      const validation = validateName(name);
      if (validation.isValid) {
        checkDuplicateName(name.trim(), newCode);
        setNameError('Checking name availability...');
        setIsNameValid(false);
      }
    }
  };

  /**
   * Key press handler for name input
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    const char = e.key;
    if (char.length > 1) return;

    const allowedPattern = /[a-zA-Z0-9\s\-']/
    const dangerousPattern = /[<>{}()&;|`$]/;

    if (dangerousPattern.test(char)) {
      e.preventDefault();
      showTemporaryFeedback(`Character "${char}" not allowed (unsafe)`);
      return;
    }

    if (!allowedPattern.test(char)) {
      e.preventDefault();
      showTemporaryFeedback(`Character "${char}" not allowed`);
      return;
    }

    if (name.length >= 20) {
      e.preventDefault();
      showTemporaryFeedback('Maximum 20 characters');
      return;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pastedText = (e.clipboardData || (window as any).clipboardData).getData(
      'text'
    );
    const filteredText = pastedText
      .replace(/[<>{}()&;|`$\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\s{2,}/g, ' ')
      .substring(0, 20);

    const newValue = (name + filteredText).substring(0, 20);
    setName(newValue);

    if (filteredText !== pastedText) {
      showTemporaryFeedback('Some unsafe characters were removed');
    }

    // Trigger validation and duplicate checking
    if (joinCode && newValue.trim().length >= 2) {
      const validation = validateName(newValue);
      if (validation.isValid) {
        checkDuplicateName(newValue.trim(), joinCode.trim());
        setNameError('Checking name availability...');
        setIsNameValid(false);
      }
    }
  };

  const showTemporaryFeedback = (message: string): void => {
    setTemporaryFeedback(message);
    setTimeout(() => setTemporaryFeedback(''), 2000);
  };

  const useSuggestion = (): void => {
    if (nameSuggestion) {
      setName(nameSuggestion);
      // Trigger validation for the suggested name
      const validation = validateName(nameSuggestion);
      if (validation.isValid && joinCode) {
        checkDuplicateName(nameSuggestion, joinCode.trim());
        setNameError('Checking name availability...');
        setIsNameValid(false);
      } else {
        setIsNameValid(validation.isValid);
        setNameError(validation.error);
        setNameSuggestion('');
      }
    }
  };

  const generateRandomName = (): void => {
    setIsGeneratingName(true);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * RANDOM_NAMES.length);
      const randomName = RANDOM_NAMES[randomIndex];
      if (randomName) {
        setName(randomName);
      }

      // Validate and check duplicates for generated name
      if (randomName) {
        const validation = validateName(randomName);
        if (validation.isValid && joinCode) {
          checkDuplicateName(randomName, joinCode.trim());
          setNameError('Checking name availability...');
          setIsNameValid(false);
        } else {
          setIsNameValid(validation.isValid);
          setNameError(validation.error);
          setNameSuggestion(validation.suggestion);
        }
      }

      setIsGeneratingName(false);
    }, 150);
  };

  const generateAlternativeName = (originalName: string): string => {
    const letters = originalName.match(/[a-zA-Z]/g);
    if (letters && letters.length >= 2) {
      const cleanName = letters.slice(0, 8).join('');
      return cleanName + Math.floor(Math.random() * 99);
    }

    const alternatives = [
      'Hero',
      'Champion',
      'Warrior',
      'Scout',
      'Knight',
      'Guardian',
      'Ranger',
      'Fighter',
      'Defender',
      'Striker',
    ];
    const selectedAlternative = alternatives[Math.floor(Math.random() * alternatives.length)];
    return (
      (selectedAlternative || 'Player') +
      Math.floor(Math.random() * 99)
    );
  };

  const handleCreateGame = (): void => {
    if (!name || !isNameValid || isCheckingDuplicate) {
      if (!name) {
        setNameError('Please enter your name to create a game');
      }
      return;
    }

    localStorage.removeItem('lastGameCode');
    localStorage.removeItem('lastPlayerName');
    onCreateGame(name.trim());
  };

  const handleJoin = (): void => {
    if (!joinCode || !name || !isNameValid || isCheckingDuplicate) {
      if (!joinCode) {
        alert('Please enter a game code.');
        return;
      }
      if (!name) {
        setNameError('Please enter your name to join');
        return;
      }
      if (isCheckingDuplicate) {
        alert('Please wait while we check name availability.');
        return;
      }
      if (!isNameValid) {
        alert('Please fix your name first.');
        return;
      }
    }

    onJoinGame(joinCode.trim(), name.trim());
  };

  return (
    <div className="join-page-container">
      <GameTutorial
        isOpen={showTutorial}
        onComplete={() => setShowTutorial(false)}
      />

      <div className="join-card">
        <h1 className="game-logo">Warlock</h1>

        <p className="game-tagline">
          Battle monsters with friends, but beware the Warlocks among you!
        </p>

        {/* Enhanced name input section */}
        <div className="input-section">
          <label className="input-label">Your Name</label>
          <div className="input-row">
            <input
              type="text"
              className={`text-input ${
                isCheckingDuplicate
                  ? 'checking'
                  : isNameValid
                    ? 'valid'
                    : name
                      ? 'invalid'
                      : ''
              }`}
              placeholder="Enter your name"
              value={name}
              onChange={handleNameChange}
              onKeyPress={handleKeyPress}
              onPaste={handlePaste}
              maxLength={20}
              autoComplete="off"
              spellCheck="false"
              disabled={isCheckingDuplicate}
            />
            <button
              className={`dice-button ${isGeneratingName ? 'loading' : ''}`}
              onClick={generateRandomName}
              disabled={isGeneratingName || isCheckingDuplicate}
              title="Generate a random name"
            >
              {isGeneratingName ? '...' : '⚄'}
            </button>
            <div className="char-counter">{name.length}/20</div>
          </div>

          {/* Enhanced validation feedback */}
          <div className="validation-feedback">
            {temporaryFeedback && (
              <div className="temporary-feedback">{temporaryFeedback}</div>
            )}

            {!temporaryFeedback && isCheckingDuplicate && (
              <div className="checking-message">
                <span className="spinner">⏳</span> Checking if name is
                available...
              </div>
            )}

            {!temporaryFeedback && !isCheckingDuplicate && nameError && (
              <div className="error-message">{nameError}</div>
            )}

            {!temporaryFeedback &&
              !isCheckingDuplicate &&
              !nameError &&
              name &&
              isNameValid && (
                <div className="success-message">✓ Name looks good!</div>
              )}

            {/* Enhanced suggestion */}
            {nameSuggestion && !isNameValid && !isCheckingDuplicate && (
              <div className="suggestion">
                Try:
                <button
                  type="button"
                  onClick={useSuggestion}
                  className="suggestion-button"
                >
                  {nameSuggestion}
                </button>
              </div>
            )}
          </div>

          {/* Input guidelines */}
          <div className="input-hint">
            <span className="hint-text">
              Allowed: Letters (including áéíóú), numbers, spaces, hyphens (-),
              apostrophes (')
            </span>
          </div>
        </div>

        {/* Create game button */}
        {!joinCode && (
          <div className="create-game-section">
            <RuneButton
              onClick={handleCreateGame}
              disabled={!name || !isNameValid || isCheckingDuplicate}
            >
              Cast the First Rune
            </RuneButton>
          </div>
        )}

        {/* Join game section */}
        <div className="join-game-section">
          <div className="code-label-row">
            <label className="input-label">Whisper the Code</label>
            <button
              className="help-button"
              onClick={() => setShowCodeHelp(!showCodeHelp)}
            >
              ?
            </button>
          </div>

          {showCodeHelp && (
            <div className="code-help-text">
              Enter a 4-digit code whispered by the ritual master to join their circle.
              We'll check if your name is available in that game.
            </div>
          )}

          <div className="code-input-wrapper">
            <input
              type="text"
              className="code-input"
              placeholder="4-digit mystic code"
              value={joinCode}
              onChange={handleCodeChange}
            />
            {joinCode && (
              <button
                className="clear-code-button"
                onClick={() => {
                  setJoinCode('');
                  // Reset validation state since we're no longer checking a specific game
                  if (name.trim()) {
                    const validation = validateName(name);
                    setIsNameValid(validation.isValid);
                    setNameError(validation.error);
                    setNameSuggestion(validation.suggestion);
                  }
                }}
                aria-label="Clear game code"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Join game button */}
        {joinCode && (
          <RuneButton
            variant="secondary"
            onClick={handleJoin}
            disabled={!joinCode || !name || !isNameValid || isCheckingDuplicate}
          >
            {isCheckingDuplicate ? 'Checking...' : 'Take your place'}
          </RuneButton>
        )}

        {/* Tutorial button */}
        <div className="tutorial-link-container">
          <button
            className="tutorial-link"
            onClick={() => setShowTutorial(true)}
          >
            How to Play
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="join-page-footer">
        <ThemeToggle variant="dropdown" showLabel={true} />
        &copy; 2025 bonzo.dev • Play with 5+ friends for best experience
      </div>
    </div>
  );
};

/**
 * Simple debounce utility
 */
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default JoinGamePage;