/**
 * @fileoverview Results phase component for the game
 * Displays round results and allows players to prepare for the next round
 */
import React from 'react';
import PropTypes from 'prop-types';
import EventsLog from '@components/game/EventsLog';
import './ResultsPhase.css';

/**
 * ResultsPhase handles displaying round results and the ready button
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether this phase is currently visible
 * @param {Object} props.me - Current player data
 * @param {Object} props.lastEvent - Most recent event data
 * @param {boolean} props.readyClicked - Whether player has clicked ready
 * @param {Function} props.handleReadyClick - Callback for ready button click
 * @returns {React.ReactElement|null} The rendered component or null if not visible
 */
const ResultsPhase = ({ 
  isVisible,
  me,
  lastEvent,
  readyClicked,
  handleReadyClick
}) => {
  // Don't render anything if not visible
  if (!isVisible) return null;
  
  return (
    <div className="results-phase">
      <h2 className="section-title">
        Round {lastEvent.turn} Results
      </h2>
      
      <div className="results-content">
        {/* Events log for this round */}
        <EventsLog events={lastEvent.events} />
        
        {/* Ready button (only for alive players) */}
        {me.isAlive && (
          <button
            className={`button ready-button ${readyClicked ? 'clicked' : ''}`}
            onClick={handleReadyClick}
            disabled={readyClicked}
          >
            {readyClicked ? (
              <>
                <span className="ready-text">Waiting for other players...</span>
                <span className="ready-spinner"></span>
              </>
            ) : (
              <>Ready for Next Round</>
            )}
          </button>
        )}
        
        {/* Info message about readiness */}
        <div className="ready-info">
          <p>Players ready for next round will be shown here.</p>
          <div className="player-ready-indicators">
            {lastEvent.readyPlayers && lastEvent.readyPlayers.map(playerId => {
              const player = lastEvent.players?.find(p => p.id === playerId);
              return player ? (
                <div key={playerId} className="player-ready-badge">
                  {player.name.charAt(0)}
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

ResultsPhase.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  me: PropTypes.object.isRequired,
  lastEvent: PropTypes.shape({
    turn: PropTypes.number.isRequired,
    events: PropTypes.array.isRequired,
    readyPlayers: PropTypes.array,
    players: PropTypes.array
  }).isRequired,
  readyClicked: PropTypes.bool.isRequired,
  handleReadyClick: PropTypes.func.isRequired
};

export default ResultsPhase;

