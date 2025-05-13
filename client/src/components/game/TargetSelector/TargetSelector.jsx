/**
 * @fileoverview Component for selecting a target from alive players or the monster
 * Used in game actions to choose where to apply an ability
 */
import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import './TargetSelector.css';

/**
 * TargetSelector component displays a list of potential targets for abilities
 * 
 * @param {Object} props - Component props
 * @param {Array} props.alivePlayers - List of alive players
 * @param {Object} props.monster - Monster data
 * @param {string} props.currentPlayerId - ID of the current player
 * @param {string} props.selectedTarget - ID of the currently selected target
 * @param {Function} props.onSelectTarget - Callback when target is selected
 * @param {boolean} props.disableMonster - Whether monster should be excluded as a target
 * @returns {React.ReactElement} The rendered component
 */
const TargetSelector = ({ 
  alivePlayers, 
  monster, 
  currentPlayerId, 
  selectedTarget, 
  onSelectTarget,
  disableMonster = false
}) => {
  const theme = useTheme();
  
  return (
    <div className="target-selector">
      <h4 className="target-selector-title">Choose Target</h4>
      
      <div className="target-list">
        {/* Player targets */}
        {alivePlayers.map(player => (
          <div 
            key={player.id}
            onClick={() => onSelectTarget(player.id)}
            className={`target-option ${selectedTarget === player.id ? 'selected' : ''} ${player.id === currentPlayerId ? 'current-player' : ''}`}
          >
            <div className={`target-avatar ${player.id === currentPlayerId ? 'current-player' : ''}`}>
              {player.id === currentPlayerId ? 'You' : player.name.charAt(0)}
            </div>
            
            <div className="target-info">
              <div className="target-name">
                {player.name}
                {player.id === currentPlayerId && ' (You)'}
              </div>
              <div className="target-health">
                HP: {player.hp}/{player.maxHp}
              </div>
            </div>
          </div>
        ))}
        
        {/* Monster target */}
        {!disableMonster && (
          <div 
            onClick={() => onSelectTarget('__monster__')}
            className={`target-option monster ${selectedTarget === '__monster__' ? 'selected' : ''}`}
          >
            <div className="target-avatar monster">
              M
            </div>
            
            <div className="target-info">
              <div className="target-name">Monster</div>
              <div className="target-health">
                HP: {monster.hp}/{monster.maxHp}
              </div>
            </div>
          </div>
        )}
        
        {/* Message when monster is disabled but was previously selected */}
        {disableMonster && selectedTarget === '__monster__' && (
          <div className="target-restriction-message">
            Keen Senses can only target players. Please select a player target.
          </div>
        )}
      </div>
    </div>
  );
};

TargetSelector.propTypes = {
  alivePlayers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      hp: PropTypes.number.isRequired,
      maxHp: PropTypes.number.isRequired
    })
  ).isRequired,
  monster: PropTypes.shape({
    hp: PropTypes.number.isRequired,
    maxHp: PropTypes.number.isRequired
  }).isRequired,
  currentPlayerId: PropTypes.string.isRequired,
  selectedTarget: PropTypes.string,
  onSelectTarget: PropTypes.func.isRequired,
  disableMonster: PropTypes.bool
};

export default TargetSelector;