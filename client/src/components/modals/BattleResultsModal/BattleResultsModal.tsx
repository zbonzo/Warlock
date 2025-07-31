/**
 * @fileoverview Modal component that displays battle results after each round
 * Shows the events log and allows players to continue to the next round
 */
import React, { useState, useEffect } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import EventsLog from '@components/game/EventsLog';
import type { Player } from '../../../../shared/types';
import './BattleResultsModal.css';

export interface BattleResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: any[]; // EventsLog events - type should be defined in EventsLog component
  round: number;
  currentPlayerId: string;
  players?: Player[];
  levelUp?: {
    oldLevel: number;
    newLevel: number;
  };
  winner?: string;
  trophyAward?: {
    playerName: string;
    trophyName: string;
    trophyDescription: string;
  };
}

const BattleResultsModal: React.FC<BattleResultsModalProps> = ({
  isOpen,
  onClose,
  events,
  round,
  currentPlayerId,
  players,
  levelUp,
  winner,
  trophyAward,
}) => {
  console.log('🏆 BattleResultsModal rendered with trophyAward:', trophyAward);
  console.log('🏆 BattleResultsModal all props:', {
    isOpen,
    hasEvents: !!events,
    round,
    hasPlayers: !!players,
    levelUp,
    winner,
    trophyAward
  });
  const theme = useTheme();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setExiting(true);

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

          {trophyAward && (
            <div className="trophy-award">
              <div className="trophy-header">
                <h3>🏆 Trophy Awarded! 🏆</h3>
              </div>
              <div className="trophy-details">
                <div className="trophy-name">{trophyAward.trophyName}</div>
                <div className="trophy-recipient">Awarded to: {trophyAward.playerName}</div>
                <div className="trophy-description">"{trophyAward.trophyDescription}"</div>
              </div>
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

export default BattleResultsModal;