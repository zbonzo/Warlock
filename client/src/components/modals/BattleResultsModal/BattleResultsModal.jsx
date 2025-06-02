/**
 * @fileoverview Modal component that displays battle results after each round
 * Shows the events log and allows players to continue to the next round
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import EventsLog from '@components/game/EventsLog';
import './BattleResultsModal.css';

// You'll need to add this import to your GamePage.jsx:
// import BattleResultsModal from '@components/modals/BattleResultsModal';

/**
 * BattleResultsModal component displays round results in a modal
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is currently open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Array} props.events - Array of events to display
 * @param {number} props.round - Current round number
 * @param {string} props.currentPlayerId - ID of the current player
 * @param {Array} props.players - Array of all players
 * @param {Object} props.levelUp - Level up information (if any)
 * @param {string} props.winner - Winner of the game (if any)
 * @returns {React.ReactElement|null} The rendered component or null if closed
 */
const BattleResultsModal = ({
  isOpen,
  onClose,
  events,
  round,
  currentPlayerId,
  players,
  levelUp,
  winner,
}) => {
  const theme = useTheme();
  const [exiting, setExiting] = useState(false);

  // Close the modal when ESC is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Don't render if modal is not open
  if (!isOpen) return null;

  /**
   * Handle modal close with exit animation
   */
  const handleClose = () => {
    setExiting(true);

    // Wait for exit animation to complete
    setTimeout(() => {
      setExiting(false);
      onClose();
    }, 300);
  };

  return (
    <div className={`battle-results-overlay ${exiting ? 'exiting' : ''}`}>
      <div className="battle-results-modal">
        <div className="battle-results-header">
          <h2 className="battle-results-title">Round {round} Results</h2>

          {levelUp && (
            <div className="level-up-banner">
              — The heroes grow stronger — Level {levelUp.newLevel} —
            </div>
          )}

          {winner && (
            <div className={`game-over-banner ${winner.toLowerCase()}`}>
              Game Over! {winner === 'Good' ? 'Heroes' : 'Warlocks'} Win!
            </div>
          )}
        </div>

        <div className="battle-results-content">
          <EventsLog
            events={events}
            currentPlayerId={currentPlayerId}
            players={players}
          />
        </div>

        <div className="battle-results-footer">
          {!winner ? (
            <button className="continue-button" onClick={handleClose}>
              Continue to Next Round
            </button>
          ) : (
            <button className="game-over-button" onClick={handleClose}>
              Close
            </button>
          )}
        </div>

        <button
          className="close-button-x"
          onClick={handleClose}
          aria-label="Close battle results"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

BattleResultsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  events: PropTypes.array.isRequired,
  round: PropTypes.number.isRequired,
  currentPlayerId: PropTypes.string.isRequired,
  players: PropTypes.arrayOf(PropTypes.object),
  levelUp: PropTypes.shape({
    oldLevel: PropTypes.number,
    newLevel: PropTypes.number,
  }),
  winner: PropTypes.string,
};

export default BattleResultsModal;

