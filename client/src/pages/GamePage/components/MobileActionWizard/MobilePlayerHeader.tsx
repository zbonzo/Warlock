/**
 * @fileoverview Mobile player header component showing player status and health
 */
import React from 'react';
import { Player } from '@/types/game';
import './MobilePlayerHeader.css';

interface MobilePlayerHeaderProps {
  me: Player;
  round: number;
  currentStep?: number;
  totalSteps?: number;
}

const MobilePlayerHeader: React.FC<MobilePlayerHeaderProps> = ({ 
  me, 
  round, 
  currentStep = 1, 
  totalSteps = 2 
}) => {
  const healthPercent = (me['hp'] / me['maxHp']) * 100;
  
  const getHealthClass = (percent: number): string => {
    if (percent < 30) return 'health-low';
    if (percent < 70) return 'health-medium';
    return 'health-high';
  };
  
  return (
    <div className="mobile-player-header">
      {/* Round info */}
      <div className="round-info">
        Round {round}
      </div>
      
      {/* Player info */}
      <div className="player-info">
        <h3 className="player-name">{me['name']}</h3>
        <div className="player-details">
          {me.race} {me.class} • Level {(me as any).level || 1}
        </div>
      </div>
      
      {/* Health bar */}
      <div className="health-section">
        <div className="health-text">{me['hp']}/{me['maxHp']} HP</div>
        <div className="health-bar">
          <div 
            className={`health-fill ${getHealthClass(healthPercent)}`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>
      
      {/* Status effects if any */}
      {me.statusEffects && Object.keys(me.statusEffects).length > 0 && (
        <div className="status-effects">
          {Object.entries(me.statusEffects).map(([effect, data]) => (
            <div key={effect} className="status-effect-badge">
              {effect}
              {(data as any)?.turns && ` (${(data as any).turns})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobilePlayerHeader;