/**
 * @fileoverview Results phase component for the game
 * Displays round results and allows players to prepare for the next round
 */
import React from 'react';
import EventsLog from '@components/game/EventsLog';
import { Player, GameEvent } from '@/types/game';
import './ResultsPhase.css';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  readyPlayers?: string[];
  players?: Player[];
}

interface ResultsPhaseProps {
  isVisible: boolean;
  me: Player;
  lastEvent: LastEventData;
  readyClicked: boolean;
  handleReadyClick: () => void;
}

/**
 * ResultsPhase handles displaying round results and the ready button
 */
const ResultsPhase: React.FC<ResultsPhaseProps> = ({ 
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
        <EventsLog events={lastEvent.events} currentPlayerId={me['id']} />
        
        {/* Ready button (only for alive players) */}
        {me['isAlive'] && (
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
              const player = lastEvent.players?.find(p => p['id'] === playerId);
              return player ? (
                <div key={playerId} className="player-ready-badge">
                  {player['name'].charAt(0)}
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPhase;