/**
 * @fileoverview Unified GameHeader component
 * Replaces all header implementations with a single responsive header
 */
import React from 'react';
import type { Player } from '../../../types/shared';
import './GameHeader.css';

export interface GameHeaderProps {
  player: Player;
  round: number;
  players?: Player[];
  isMobile?: boolean;
}

interface WarlockInfo {
  count: number;
  text: string;
}

const GameHeader: React.FC<GameHeaderProps> = ({ 
  player, 
  round, 
  players = [], 
  isMobile = false 
}) => {
  const alivePlayers = players.filter(p => p['isAlive']);
  const aliveCount = alivePlayers.length;
  
  const getWarlockInfo = (): WarlockInfo => {
    if (!player) return { count: 0, text: '0 Warlocks killed' };
    
    const deadWarlocks = players.filter(p => !p['isAlive'] && p['isWarlock']).length;
    const aliveWarlocks = players.filter(p => p['isAlive'] && p['isWarlock']).length;
    
    if (player.isWarlock) {
      return {
        count: aliveWarlocks - 1,
        text: `${aliveWarlocks - 1} fellow Warlocks`
      };
    } else {
      return {
        count: deadWarlocks,
        text: `${deadWarlocks} Warlocks killed`
      };
    }
  };

  const getAvatarPath = (player: Player): string => {
    if (!player?.race || !player?.class) {
      return '/images/races/random.png';
    }
    
    const race = player.race.toLowerCase();
    const playerClass = player.class.toLowerCase();
    
    return `/images/avatars/${race}/${playerClass}.png`;
  };

  const healthPercent = player?.['hp'] && player?.['maxHp'] 
    ? (player['hp'] / player['maxHp']) * 100 
    : 0;

  const getHealthColor = (percent: number): string => {
    if (percent > 70) return '#4ade80';
    if (percent > 30) return '#fbbf24';
    return '#ef4444';
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

      <div className="player-info-section">
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
          {player['name']}
        </div>
        <div className="player-details">
          <span className="player-class">{player.class}</span>
          <span className="player-race">{player.race}</span>
        </div>
      </div>

      <div className="game-info-section">
        <div className="round-info">
          Round {round}
        </div>
      </div>
      
      <div className="level-info">
        Level {player['level'] || 1}
      </div>

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
              {player['hp'] || 0}/{player['maxHp'] || 0}
            </div>
          </div>
        </div>
      </div>

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

export default GameHeader;