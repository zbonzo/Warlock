import React from 'react';
import './MobilePlayerHeader.css';

const MobilePlayerHeader = ({ me, round, currentStep, totalSteps }) => {
  const healthPercent = (me.hp / me.maxHp) * 100;
  
  const getHealthClass = (percent) => {
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
        <h3 className="player-name">{me.name}</h3>
        <div className="player-details">
          {me.race} {me.class} • Level {me.level || 1}
        </div>
      </div>
      
      {/* Health bar */}
      <div className="health-section">
        <div className="health-text">{me.hp}/{me.maxHp} HP</div>
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
              {data.duration && ` (${data.duration})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobilePlayerHeader;