/**
 * @fileoverview Enhanced End game page that displays the final results with complete game history
 * Shows the winner, player teams, game statistics, and unredacted battle log
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import Confetti from './components/Confetti';
import FinalScoresTable from './components/FinalScoresTable';
import HistoryColumn from '@pages/GamePage/components/HistoryColumn';
import './EndPage.css';
import RuneButton from '../../components/ui/RuneButton';

/**
 * EndPage component displays the game results after a game has ended
 *
 * @param {Object} props - Component props
 * @param {string} props.winner - Which team won ('Good' or 'Evil')
 * @param {Array} props.players - List of all players with their final state
 * @param {Array} props.eventsLog - Complete game history
 * @param {Function} props.onPlayAgain - Callback when player wants to play again
 * @returns {React.ReactElement} The rendered component
 */
const EndPage = ({
  winner,
  players,
  eventsLog,
  gameCode,
  playerName,
  socket,
  trophyAward,
  onPlayAgain,
}) => {
  const handlePlayAgain = () => {
    if (!socket || !gameCode || !playerName) {
      console.error('Missing required data for play again');
      return;
    }

    // Emit playAgain event with the same game code
    socket.emit('playAgain', {
      gameCode: gameCode, // Reuse the same game code
      playerName: playerName,
    });
  };
  const theme = useTheme();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showGameOver, setShowGameOver] = useState(true);

  useEffect(() => {
    // Scroll to the top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setShowConfetti(true);

    // Hide confetti after 5 seconds to reduce animation load
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Show confetti effect when component mounts
  useEffect(() => {
    setShowConfetti(true);

    // Hide confetti after 5 seconds to reduce animation load
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.removeItem('lastPlayerName');
  }, []);

  // Alternating text animation
  useEffect(() => {
    const interval = setInterval(() => {
      setShowGameOver(prev => !prev);
    }, 3000); // Switch every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Note: Player separation now handled in FinalScoresTable component

  // Determine the winning team info
  const winnerDisplay =
    winner === 'Good'
      ? {
          text: 'Good Players Win!',
          color: theme.colors.accent,
          description: 'All warlocks have been eliminated.',
        }
      : {
          text: 'Warlocks Win!',
          color: theme.colors.danger,
          description:
            'The warlocks have corrupted or eliminated all good players.',
        };

  // Filter trophy award for the winning team
  const displayTrophy = React.useMemo(() => {
    if (!trophyAward || !players || !winner) return null;
    
    // Find the trophy recipient
    const recipient = players.find(p => p.name === trophyAward.playerName);
    if (!recipient) return null;
    
    // Check if trophy recipient is on the winning team
    const recipientIsWinner = 
      (winner === 'Good' && !recipient.isWarlock) || 
      (winner === 'Evil' && recipient.isWarlock);
    
    // Only show trophy if recipient is on the winning team
    return recipientIsWinner ? trophyAward : null;
  }, [trophyAward, players, winner]);

  // Note: Stats display now handled in FinalScoresTable component

  return (
    <div className="end-page-container">
      {/* Confetti effect */}
      {showConfetti && <Confetti />}

      <div className="results-card">
        <div className="title-container">
          <h1 
            className={`animated-title ${showGameOver ? 'visible' : 'hidden'}`}
          >
            ++ GAME OVER ++
          </h1>
          <h1 
            className={`animated-title winner-result ${!showGameOver ? 'visible' : 'hidden'}`}
            style={{ color: winnerDisplay.color }}
          >
            {winnerDisplay.text}
          </h1>
        </div>

        {/* Trophy Display */}
        {displayTrophy && (
          <div className="trophy-display">
            <div className="trophy-header">
              <h2>Trophy Awarded!</h2>
            </div>
            <div className="trophy-content">
              <div className="trophy-avatar">
                {/* Player Avatar - find the recipient player to get their avatar */}
                {(() => {
                  const recipient = players.find(p => p.name === displayTrophy.playerName);
                  
                  // Generate avatar image path
                  const getAvatarPath = (player) => {
                    if (!player?.race || !player?.class) {
                      return '/images/races/random.png';
                    }
                    
                    const race = player.race.toLowerCase();
                    const playerClass = player.class.toLowerCase();
                    
                    return `/images/avatars/${race}/${playerClass}.png`;
                  };
                  
                  const avatarPath = recipient ? getAvatarPath(recipient) : '/images/races/random.png';
                  
                  return (
                    <div 
                      className="player-avatar"
                      style={{
                        backgroundImage: `url(${avatarPath})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }}
                      title={recipient ? `${recipient.race} ${recipient.class}` : 'Player Avatar'}
                    />
                  );
                })()}
              </div>
              <div className="trophy-details">
                <div className="trophy-name">{displayTrophy.trophyName}</div>
                <div className="trophy-recipient">Awarded to: {displayTrophy.playerName}</div>
                <div className="trophy-description">"{displayTrophy.trophyDescription}"</div>
              </div>
              <div className="trophy-emoji">
                🏆
              </div>
            </div>
          </div>
        )}

        {/* Final Scores Table */}
        <FinalScoresTable players={players} />

        {/* Game History Toggle */}
        <div className="history-toggle-container">
          <RuneButton
            variant="secondary"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Seal the Chronicle' : 'Unveil the Chronicle'}
          </RuneButton>
        </div>

        {/* Complete Game History */}
        {showHistory && eventsLog.length > 0 && (
          <div className="complete-history-container">
            <HistoryColumn
              isVisible={true}
              eventsLog={eventsLog}
              currentPlayerId="unredacted" // Special ID for unredacted view
              players={players}
              showAllEvents={true} // Show all events without filtering
            />
          </div>
        )}

        <div className="action-buttons">
          <RuneButton onClick={handlePlayAgain} variant="secondary">
            Reawaken the Circle ({gameCode})
          </RuneButton>
          <RuneButton onClick={() => window.location.href = '/'}>
            Forge a New Circle
          </RuneButton>
        </div>
      </div>
    </div>
  );
};

EndPage.propTypes = {
  winner: PropTypes.oneOf(['Good', 'Evil']).isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      race: PropTypes.string,
      class: PropTypes.string,
      isWarlock: PropTypes.bool.isRequired,
      isAlive: PropTypes.bool.isRequired,
    })
  ).isRequired,
  eventsLog: PropTypes.arrayOf(
    PropTypes.shape({
      turn: PropTypes.number.isRequired,
      events: PropTypes.array.isRequired,
    })
  ),
  trophyAward: PropTypes.shape({
    playerName: PropTypes.string,
    trophyName: PropTypes.string,
    trophyDescription: PropTypes.string,
  }),
  onPlayAgain: PropTypes.func.isRequired,
};

export default EndPage;


