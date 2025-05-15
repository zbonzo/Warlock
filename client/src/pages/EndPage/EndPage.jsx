/**
 * @fileoverview End game page that displays the final results
 * Shows the winner, player teams, and game statistics
 */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import Confetti from './components/Confetti';
import PlayerGroup from './components/PlayerGroup';
import StatsPanel from './components/StatsPanel';
import './EndPage.css';

/**
 * EndPage component displays the game results after a game has ended
 * 
 * @param {Object} props - Component props
 * @param {string} props.winner - Which team won ('Good' or 'Evil')
 * @param {Array} props.players - List of all players with their final state
 * @param {Function} props.onPlayAgain - Callback when player wants to play again
 * @returns {React.ReactElement} The rendered component
 */
const EndPage = ({ winner, players, onPlayAgain }) => {
  const theme = useTheme();
  const [showConfetti, setShowConfetti] = useState(false);
  
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
  
  // Separate players into teams
  const goodPlayers = players.filter(p => !p.isWarlock);
  const evilPlayers = players.filter(p => p.isWarlock);
  
  // Determine the winning team info
  const winnerDisplay = winner === 'Good' 
    ? {
        text: 'Good Players Win!',
        color: theme.colors.accent,
        description: 'All warlocks have been eliminated.'
      }
    : {
        text: 'Warlocks Win!',
        color: theme.colors.danger,
        description: 'The warlocks have corrupted or eliminated all good players.'
      };
  
  // Get survival statistics
  const survivors = players.filter(p => p.isAlive).length;
  const casualties = players.filter(p => !p.isAlive).length;
  const totalPlayers = players.length;
  
  // Get stats for StatsPanel component
  const stats = [
    { value: survivors, label: 'Survivors', color: theme.colors.primary },
    { value: casualties, label: 'Casualties', color: theme.colors.danger },
    { value: totalPlayers, label: 'Total Players', color: theme.colors.primary }
  ];
  
  return (
    <div className="end-page-container">
      {/* Confetti effect */}
      {showConfetti && <Confetti />}
      
      <div className="results-card">
        <h1 className="winner-title" style={{ color: winnerDisplay.color }}>
          {winnerDisplay.text}
        </h1>
        
        <p className="winner-description">
          {winnerDisplay.description}
        </p>
        
        <div className="team-groups">
          {/* Good players team */}
          <PlayerGroup 
            title={`Good Players (${goodPlayers.length})`}
            players={goodPlayers} 
            color={theme.colors.accent}
          />
          
          {/* Evil players team */}
          <PlayerGroup 
            title={`Warlocks (${evilPlayers.length})`}
            players={evilPlayers} 
            color={theme.colors.danger}
          />
        </div>
        
        <div className="stats-container">
          <h3 className="stats-title">
            Final Stats
          </h3>
          
          <StatsPanel stats={stats} />
        </div>
        
        <button
          className="play-again-button"
          onClick={onPlayAgain}
        >
          Play Again
        </button>
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
      isAlive: PropTypes.bool.isRequired
    })
  ).isRequired,
  onPlayAgain: PropTypes.func.isRequired
};

export default EndPage;