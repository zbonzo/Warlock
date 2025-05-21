/**
 * @fileoverview Entry point for the game where users can enter their name,
 * create a new game, or join an existing game with a code.
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import GameTutorial from '@components/modals/GameTutorial';
import { RANDOM_NAMES } from './constants';
import './JoinGamePage.css';

/**
 * JoinGamePage component serves as the entry point to the game
 *
 * @param {Object} props - Component props
 * @param {Function} props.onCreateGame - Callback when creating a new game
 * @param {Function} props.onJoinGame - Callback when joining an existing game
 * @param {Function} props.onReconnect - Callback for reconnecting to a game
 * @returns {React.ReactElement} The rendered component
 */
const JoinGamePage = ({ onCreateGame, onJoinGame, onReconnect }) => {
  const theme = useTheme();

  // Form state
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // UI state
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCodeHelp, setShowCodeHelp] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [showReconnectPrompt, setShowReconnectPrompt] = useState(false);
  const [lastGameInfo, setLastGameInfo] = useState(null);

  /**
   * Check for a previous game session on component mount
   */
  useEffect(() => {
    const lastGameCode = localStorage.getItem('lastGameCode');
    const lastPlayerName = localStorage.getItem('lastPlayerName');

    if (lastGameCode && lastPlayerName) {
      setLastGameInfo({ gameCode: lastGameCode, playerName: lastPlayerName });
      setShowReconnectPrompt(true);

      // Pre-fill the form with the saved values
      setJoinCode(lastGameCode);
      setName(lastPlayerName);
    }
  }, []);

  /**
   * Generate a random player name
   */
  const generateRandomName = () => {
    // Show loading state for visual feedback
    setIsGeneratingName(true);

    // Add slight delay to make the UI feedback visible
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * RANDOM_NAMES.length);
      setName(RANDOM_NAMES[randomIndex]);
      setIsGeneratingName(false);
    }, 150);
  };

  /**
   * Handle creating a new game
   */
  const handleCreateGame = () => {
    if (!name) {
      alert('Please enter your name to create a game.');
      return;
    }
    // If creating a new game, clear any previous session
    localStorage.removeItem('lastGameCode');
    localStorage.removeItem('lastPlayerName');
    onCreateGame(name);
  };

  /**
   * Handle joining an existing game
   */
  const handleJoin = () => {
    if (!joinCode || !name) {
      alert('Please enter a game code and your name to join.');
      return;
    }
    // Save info for potential reconnection
    localStorage.setItem('lastGameCode', joinCode);
    localStorage.setItem('lastPlayerName', name);
    onJoinGame(joinCode.trim(), name);
  };

  /**
   * Handle reconnecting to the previous game
   */
  const handleReconnect = () => {
    if (lastGameInfo) {
      onReconnect(lastGameInfo.gameCode, lastGameInfo.playerName);
    }
  };

  /**
   * Decline reconnection and clear saved game
   */
  const handleDeclineReconnect = () => {
    setShowReconnectPrompt(false);
    localStorage.removeItem('lastGameCode');
    localStorage.removeItem('lastPlayerName');
  };

  /**
   * Handle game code input changes
   *
   * @param {Object} e - Input change event
   */
  const handleCodeChange = (e) => {
    const input = e.target.value;
    const numbersOnly = input.replace(/[^0-9]/g, '');
    setJoinCode(numbersOnly.slice(0, 4));
  };

  return (
    <div className="join-page-container">
      {/* Game tutorial modal */}
      <GameTutorial
        isOpen={showTutorial}
        onComplete={() => setShowTutorial(false)}
      />

      {/* Reconnection prompt */}
      {showReconnectPrompt && (
        <div className="reconnect-prompt">
          <h3>Rejoin Previous Game?</h3>
          <p>
            You were playing as <strong>{lastGameInfo?.playerName}</strong> in
            game <strong>{lastGameInfo?.gameCode}</strong>.
          </p>
          <div className="reconnect-buttons">
            <button className="reconnect-button" onClick={handleReconnect}>
              Rejoin Game
            </button>
            <button
              className="decline-reconnect-button"
              onClick={handleDeclineReconnect}
            >
              Start Fresh
            </button>
          </div>
        </div>
      )}

      <div className="join-card">
        <h1 className="game-logo">Warlock</h1>

        <p className="game-tagline">
          Battle monsters with friends, but beware the Warlocks among you!
        </p>

        {/* Name input section */}
        <div className="input-section">
          <label className="input-label">Your Name</label>
          <div className="input-row">
            <input
              type="text"
              className="text-input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className={`dice-button ${isGeneratingName ? 'loading' : ''}`}
              onClick={generateRandomName}
              disabled={isGeneratingName}
              title="Generate a random name"
            >
              {isGeneratingName ? '...' : '⚄'}
            </button>
          </div>
        </div>

        {/* Create game button (only shown when no join code entered) */}
        {!joinCode && (
          <div className="create-game-section">
            <button
              className={`create-button ${!name ? 'disabled' : ''}`}
              onClick={handleCreateGame}
              disabled={!name}
            >
              Create New Game
            </button>
          </div>
        )}

        {/* Join game section */}
        <div className="join-game-section">
          <div className="code-label-row">
            <label className="input-label">Game Code</label>

            <button
              className="help-button"
              onClick={() => setShowCodeHelp(!showCodeHelp)}
            >
              ?
            </button>
          </div>

          {showCodeHelp && (
            <div className="code-help-text">
              Enter a 4-digit code provided by the game host to join their game.
              If you don't have a code, leave this empty and create a new game
              instead.
            </div>
          )}

          <input
            type="text"
            className="code-input"
            placeholder="4-digit game code"
            value={joinCode}
            onChange={handleCodeChange}
          />
          {joinCode && (
            <button
              className="clear-code-button"
              onClick={() => setJoinCode('')}
              aria-label="Clear game code"
            >
              ✕
            </button>
          )}
        </div>

        {/* Join game button (only shown when join code entered) */}
        {joinCode && (
          <button
            className={`join-button ${!joinCode || !name ? 'disabled' : ''}`}
            onClick={handleJoin}
            disabled={!joinCode || !name}
          >
            Join Game
          </button>
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
        &copy; 2025 bonzo.dev • Play with 5+ friends for best experience
      </div>
    </div>
  );
};

JoinGamePage.propTypes = {
  onCreateGame: PropTypes.func.isRequired,
  onJoinGame: PropTypes.func.isRequired,
  onReconnect: PropTypes.func,
};

export default JoinGamePage;
