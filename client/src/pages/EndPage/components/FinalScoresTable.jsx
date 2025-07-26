/**
 * @fileoverview Final Scores table component for displaying player statistics at game end
 * Shows all players with their stats, highlighting warlocks in red and players in green
 */
import React from 'react';
import PropTypes from 'prop-types';
import './FinalScoresTable.css';

/**
 * FinalScoresTable component displays all players with their game statistics
 * 
 * @param {Object} props - Component props
 * @param {Array} props.players - List of all players with their final state and stats
 * @returns {React.ReactElement} The rendered component
 */
const FinalScoresTable = ({ players }) => {
  // Sort players by whether they're alive, then by warlock status, then by name
  const sortedPlayers = [...players].sort((a, b) => {
    // First sort by alive status (alive players first)
    if (a.isAlive !== b.isAlive) {
      return b.isAlive - a.isAlive;
    }
    // Then sort by warlock status (players first)
    if (a.isWarlock !== b.isWarlock) {
      return a.isWarlock - b.isWarlock;
    }
    // Finally sort alphabetically by name
    return a.name.localeCompare(b.name);
  });

  const getPlayerRowClass = (player) => {
    let classes = 'player-row';
    if (player.isWarlock) {
      classes += ' warlock-row';
    } else {
      classes += ' player-row-good';
    }
    if (!player.isAlive) {
      classes += ' dead-row';
    }
    return classes;
  };

  const getClassIcon = (playerClass) => {
    // Map class names to icons - these would ideally be imported from a constants file
    const classIcons = {
      warrior: '⚔️',
      priest: '✨',
      wizard: '🔮',
      tracker: '🏹',
      oracle: '👁️',
      assassin: '🗡️',
      barbarian: '🪓',
      pyromancer: '🔥',
      shaman: '🌿',
      druid: '🍃',
      alchemist: '⚗️',
      gunslinger: '🔫'
    };
    return classIcons[playerClass?.toLowerCase()] || '⚔️';
  };

  return (
    <div className="final-scores-container">
      <h3 className="final-scores-title">FINAL SCORES</h3>
      
      <div className="scores-table">
        <div className="table-header">
          <div className="header-player">PLAYER</div>
          <div className="header-stat">💀</div>
          <div className="header-stat">⚔️</div>
          <div className="header-stat">❤️</div>
          <div className="header-stat">🟣</div>
        </div>
        
        {sortedPlayers.map(player => (
          <div key={player.id} className={getPlayerRowClass(player)}>
            <div className="player-info">
              <span className="class-icon">{getClassIcon(player.class)}</span>
              <span className="player-name">{player.name}</span>
              {!player.isAlive && <span className="death-indicator">💀</span>}
            </div>
            <div className="player-stat">{player.stats?.kills || 0}</div>
            <div className="player-stat">{player.stats?.totalDamageDealt || 0}</div>
            <div className="player-stat">{player.stats?.totalHealingDone || 0}</div>
            <div className="player-stat">{player.stats?.corruptionsPerformed || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

FinalScoresTable.propTypes = {
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      race: PropTypes.string,
      class: PropTypes.string,
      isWarlock: PropTypes.bool.isRequired,
      isAlive: PropTypes.bool.isRequired,
      stats: PropTypes.shape({
        kills: PropTypes.number,
        totalDamageDealt: PropTypes.number,
        totalHealingDone: PropTypes.number,
        corruptionsPerformed: PropTypes.number
      })
    })
  ).isRequired
};

export default FinalScoresTable;