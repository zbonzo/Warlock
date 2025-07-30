/**
 * @fileoverview Dashboard component that displays game status including
 * current round, number of alive players, and monster health.
 */
import React from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { Player, Monster } from '@/types/game';
import './GameDashboard.css';

interface GameDashboardProps {
  round: number;
  alivePlayers: Player[];
  monster: Monster;
}

/**
 * GameDashboard component displays key game information in a horizontal layout
 */
const GameDashboard: React.FC<GameDashboardProps> = ({ round, alivePlayers, monster }) => {
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

export default GameDashboard;