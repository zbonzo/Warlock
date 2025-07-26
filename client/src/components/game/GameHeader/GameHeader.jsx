/**
 * @fileoverview Unified GameHeader component
 * Replaces all header implementations with a single responsive header
 */
import React from 'react';
import PropTypes from 'prop-types';
import './GameHeader.css';

/**
 * Unified GameHeader component
 * @param {Object} props - Component props
 * @param {Object} props.player - Current player data
 * @param {number} props.round - Current round number
 * @param {Array} props.players - All players array
 * @param {boolean} props.isMobile - Whether on mobile device
 * @returns {React.ReactElement} The rendered component
 */
const GameHeader = ({ player, round, players = [], isMobile = false }) => {
  // Calculate player statistics
  const alivePlayers = players.filter(p => p.isAlive);
  const aliveCount = alivePlayers.length;
  
  // Calculate warlock information
  const getWarlockInfo = () => {
    if (!player) return { count: 0, text: '0 Warlocks killed' };
    
    const deadWarlocks = players.filter(p => !p.isAlive && p.isWarlock).length;
    const aliveWarlocks = players.filter(p => p.isAlive && p.isWarlock).length;
    
    if (player.isWarlock) {
      return {
        count: aliveWarlocks - 1, // Exclude self
        text: `${aliveWarlocks - 1} fellow Warlocks`
      };
    } else {
      return {
        count: deadWarlocks,
        text: `${deadWarlocks} Warlocks killed`
      };
    }
  };

  // Generate avatar image path
  const getAvatarPath = (player) => {
    if (!player?.race || !player?.class) {
      return '/images/races/random.png';
    }
    
    const race = player.race.toLowerCase();
    const playerClass = player.class.toLowerCase();
    
    return `/images/avatars/${race}/${playerClass}.png`;
  };

  // Calculate health percentage
  const healthPercent = player?.hp && player?.maxHp 
    ? (player.hp / player.maxHp) * 100 
    : 0;

  // Get health bar color based on percentage
  const getHealthColor = (percent) => {
    if (percent > 70) return '#4ade80'; // Green
    if (percent > 30) return '#fbbf24'; // Yellow
    return '#ef4444'; // Red
  };

  const warlockInfo = getWarlockInfo();
  const avatarPath = getAvatarPath(player);
  const healthColor = getHealthColor(healthPercent);

  if (!player) return null;

  return (
    <div 
      className={`game-header-content ${isMobile ? 'mobile' : 'desktop'}`}
      style={{
        backgroundImage: `url(${avatarPath})`,
        backgroundSize: 'contain',
        backgroundPosition: 'left bottom',
        backgroundRepeat: 'no-repeat'
      }}
    >

      {/* Mobile Corruption Indicator - only on mobile when player is warlock */}
      {isMobile && player.isWarlock && (
        <div 
          className="mobile-corruption-indicator"
          style={{
            backgroundImage: 'url(/images/warlock/corruption.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.3
          }}
        />
      )}

      {/* Player Info Section */}
      <div className="player-info-section">
        {/* Warlock corruption overlay - desktop only */}
        {!isMobile && player.isWarlock && (
          <div 
            className="corruption-overlay"
            style={{
              backgroundImage: 'url(/images/warlock/corruption.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.5
            }}
          />
        )}
        
        <div className="player-name">
          {player.name}
        </div>
        <div className="player-details">
          <span className="player-class">{player.class}</span>
          <span className="player-race">{player.race}</span>
        </div>
      </div>

      {/* Game Info Section */}
      <div className="game-info-section">
        <div className="round-info">
          Round {round}
        </div>
      </div>
      
      {/* Level Info - separate on desktop */}
      <div className="level-info">
        Level {player.level || 1}
      </div>

      {/* Status Effects Section */}
      <div className="status-effects-section">
        {player.statusEffects?.armor && (
          <div className="status-effect armor">
            <span className="status-icon">🛡️</span>
            <span className="status-value">{player.statusEffects.armor}</span>
          </div>
        )}
        {player.statusEffects?.stunned && (
          <div className="status-effect stunned">
            <span className="status-icon">💫</span>
          </div>
        )}
        {player.statusEffects?.blessed && (
          <div className="status-effect blessed">
            <span className="status-icon">✨</span>
          </div>
        )}
      </div>

      {/* Health Bar Section */}
      <div className="health-section">
        <div className="health-bar-container">
          <div className="health-bar">
            <div 
              className="health-fill"
              style={{
                width: `${healthPercent}%`,
                backgroundColor: healthColor,
                transform: `scaleX(${healthPercent / 100})`,
                transformOrigin: 'left'
              }}
            />
            <div className="health-text">
              {player.hp || 0}/{player.maxHp || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section (mobile bottom, desktop right) */}
      <div className="stats-section">
        <div className="player-count">
          {aliveCount} Players Alive
        </div>
        <div className="warlock-count">
          {warlockInfo.text}
        </div>
      </div>
    </div>
  );
};

GameHeader.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string.isRequired,
    race: PropTypes.string,
    class: PropTypes.string,
    level: PropTypes.number,
    hp: PropTypes.number,
    maxHp: PropTypes.number,
    isAlive: PropTypes.bool,
    isWarlock: PropTypes.bool,
  }),
  round: PropTypes.number.isRequired,
  players: PropTypes.arrayOf(PropTypes.object),
  isMobile: PropTypes.bool,
};

export default GameHeader;