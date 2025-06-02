/**
 * @fileoverview Dashboard component that displays game status including
 * current round, number of alive players, and monster health.
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './GameDashboard.css';

/**
 * GameDashboard component displays key game information in a horizontal layout
 * 
 * @param {Object} props - Component props
 * @param {number} props.round - Current game round number
 * @param {Array} props.alivePlayers - Array of currently alive players
 * @param {Object} props.monster - Monster data object with hp and maxHp
 * @returns {React.ReactElement} The rendered component
 */
const GameDashboard = ({ round, alivePlayers, monster }) => {
  const theme = useTheme();
  const healthPercent = (monster.hp / monster.maxHp) * 100;
  const isLowHealth = healthPercent < 30;
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-section">
        <h3 className="dashboard-heading">Round {round}</h3>
      </div>
      
      <div className="dashboard-section">
        <h3 className="dashboard-heading">Players</h3>
        <div className="players-count">
          <span>{alivePlayers.length}</span> alive
        </div>
      </div>
      
      <div className="dashboard-section">
        <h3 className="dashboard-heading">Monster</h3>
        <div className="health-bar-container">
          <div 
            className={`health-bar-fill ${isLowHealth ? 'low-health' : ''}`}
            style={{ width: `${healthPercent}%` }}
          />
          <div className="health-bar-text">
            {monster.hp}/{monster.maxHp}
          </div>
        </div>
        <div className="damage-indicator">
          Next strike: {monster.nextDamage}
        </div>
      </div>
    </div>
  );
};

GameDashboard.propTypes = {
  round: PropTypes.number.isRequired,
  alivePlayers: PropTypes.array.isRequired,
  monster: PropTypes.shape({
    hp: PropTypes.number.isRequired,
    maxHp: PropTypes.number.isRequired,
    nextDamage: PropTypes.number.isRequired
  }).isRequired
};

export default GameDashboard;

