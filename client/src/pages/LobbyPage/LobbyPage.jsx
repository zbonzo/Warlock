/**
 * @fileoverview Reorganized Lobby page component where players wait before game starts
 * Displays players, their readiness status, and allows the host to start the game
 */
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './LobbyPage.css';
import RuneButton from '../../components/ui/RuneButton';
import PlayerCard from '../../components/common/PlayerCard/PlayerCard';

/**
 * LobbyPage component displays the pre-game lobby where players wait
 *
 * @param {Object} props - Component props
 * @param {Array} props.players - List of players in the lobby
 * @param {string} props.gameCode - Game room code
 * @param {boolean} props.isHost - Whether current player is the host
 * @param {string} props.currentPlayerId - ID of the current player
 * @param {Function} props.onStartGame - Callback when host starts the game
 * @returns {React.ReactElement} The rendered component
 */
const LobbyPage = ({ players, gameCode, isHost, currentPlayerId, onStartGame }) => {
  const theme = useTheme();
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const codeInputRef = useRef(null);

  // Check if all players have selected a race and class
  const allReady = players.every((p) => p.race && p.class);

  // Count players who have completed character selection
  const readyCount = players.filter((p) => p.race && p.class).length;

  /**
   * Fallback copy method using document.execCommand
   */
  const fallbackCopy = () => {
    // Create a temporary input element
    const el = document.createElement('textarea');
    el.value = gameCode;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();

    // Try to copy using document.execCommand
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (err) {
      console.error('execCommand error', err);
    }

    document.body.removeChild(el);

    if (copied) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  /**
   * Helper to copy game code to clipboard
   * Tries modern Clipboard API with fallback to execCommand
   */
  const copyGameCode = () => {
    // Try using the clipboard API first
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(gameCode)
          .then(() => {
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
          })
          .catch((err) => {
            console.error('Failed to copy: ', err);
            fallbackCopy();
          });
      } else {
        // Fall back to selection method
        fallbackCopy();
      }
    } catch (err) {
      console.error('Copy failed: ', err);
      fallbackCopy();
    }
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1 className="lobby-title">Preparing the betrayal</h1>

        <div className="game-code-display" onClick={copyGameCode}>
          <div className="game-code">Code: {gameCode}</div>
          <button className="copy-button">
            {copiedCode ? (
              <>
                <span className="copy-icon">✓</span>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <span className="copy-icon">📋</span>
                <span>Copy</span>
              </>
            )}
          </button>
          {/* Hidden input for fallback copy method */}
          <input
            ref={codeInputRef}
            type="text"
            value={gameCode}
            readOnly
            className="hidden-input"
          />
        </div>

        {/* Start Game Button moved up here */}
        {isHost ? (
          <RuneButton
            onClick={onStartGame}
            disabled={!allReady}
          >
            {allReady ? 'Begin the Quest' : 'Waiting for all players...'}
          </RuneButton>
        ) : (
          <div className="waiting-host-message">
            Waiting for host to start the game...
          </div>
        )}

        {!allReady && (
          <div className="player-help-message">
            All players must select a race and class before the game can start.
          </div>
        )}

        {/* Player Readiness in its own section */}
        <div className="readiness-indicator">
          <div className="readiness-top-row">
            <div className="player-count-row">
              <div className="player-count">
                {players.length} {players.length === 1 ? 'Player' : 'Players'}{' '}
                in Lobby
              </div>
            </div>

            <div className="readiness-bar-container">
              <div
                className={`readiness-bar ${allReady ? 'all-ready' : ''}`}
                style={{ width: `${(readyCount / players.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="readiness-count">
            {readyCount} of {players.length} players ready
          </div>
        </div>

        {/* Player Cards Grid */}
        <div className="lobby-players-grid">
          {players.map((player) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isHost = player.id === players[0]?.id;
            
            return (
              <div key={player.id} className="lobby-player-wrapper">
                {isHost && (
                  <div className="host-badge-card">HOST</div>
                )}
                <PlayerCard
                  player={{
                    ...player,
                    hp: player.hp || 100,
                    maxHp: player.maxHp || 100,
                    isAlive: true
                  }}
                  isCurrentPlayer={isCurrentPlayer}
                  size="medium"
                  showStatusEffects={false}
                />
                <div className="player-status-overlay">
                  {player.race && player.class ? (
                    <span className="status-badge ready">Ready</span>
                  ) : (
                    <span className="status-badge selecting">Selecting</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="instructions-card">
        <h3 className="instructions-title">Game Instructions</h3>

        <ul className="instructions-list">
          <li>Share the game code with your friends so they can join</li>
          <li>Everyone must select a character race and class</li>
          <li>One random player will secretly be a Warlock</li>
          <li>Work together to defeat the monster, but beware the Warlock!</li>
          <li>
            The Warlock can convert other players when attacking or being healed
          </li>
          <li>Good players win by eliminating all Warlocks</li>
          <li>Warlocks win by converting or eliminating all good players</li>
        </ul>
      </div>
    </div>
  );
};

LobbyPage.propTypes = {
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      race: PropTypes.string,
      class: PropTypes.string,
      isReady: PropTypes.bool,
    })
  ).isRequired,
  gameCode: PropTypes.string.isRequired,
  isHost: PropTypes.bool.isRequired,
  currentPlayerId: PropTypes.string,
  onStartGame: PropTypes.func.isRequired,
};

export default LobbyPage;


