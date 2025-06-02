/**
 * @fileoverview Action phase component for the game
 * Handles player ability selection, targeting, and action submission
 */
import React from 'react';
import PropTypes from 'prop-types';
import AbilityCard from '@components/game/AbilityCard';
import RacialAbilityCard from '@components/game/RacialAbilityCard';
import TargetSelector from '@components/game/TargetSelector';
import './ActionPhase.css';

/**
 * ActionPhase handles the ability selection and targeting UI
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether this phase is currently visible
 * @param {Object} props.me - Current player data
 * @param {Array} props.unlocked - Unlocked abilities for the player
 * @param {Array} props.alivePlayers - List of currently alive players
 * @param {Object} props.monster - Monster data
 * @param {string} props.actionType - Currently selected ability type
 * @param {string} props.selectedTarget - Currently selected target ID
 * @param {boolean} props.submitted - Whether an action has been submitted
 * @param {boolean} props.racialSelected - Whether a racial ability is selected
 * @param {boolean} props.bloodRageActive - Whether Blood Rage is active
 * @param {boolean} props.keenSensesActive - Whether Keen Senses is active
 * @param {Function} props.setActionType - Callback to set the selected ability
 * @param {Function} props.setSelectedTarget - Callback to set the selected target
 * @param {Function} props.handleSubmitAction - Callback to submit an action
 * @param {Function} props.handleRacialAbilityUse - Callback to use a racial ability
 * @returns {React.ReactElement|null} The rendered component or null if not visible
 */
const ActionPhase = ({ 
  isVisible,
  me,
  unlocked,
  alivePlayers,
  monster,
  actionType,
  selectedTarget,
  submitted,
  racialSelected,
  bloodRageActive,
  keenSensesActive,
  setActionType,
  setSelectedTarget,
  handleSubmitAction,
  handleRacialAbilityUse
}) => {
  // Don't render anything if not visible
  if (!isVisible) return null;
  
  // If player is dead, show dead message
  if (!me.isAlive) {
    return (
      <div className="action-phase dead-player">
        <div className="dead-message card">
          <h3 className="section-title danger">
            You are dead
          </h3>
          <p>You can only watch as the remaining players continue the battle.</p>
          <div className="skull-icon">💀</div>
        </div>
      </div>
    );
  }
  
  // If player has already submitted an action, show waiting message
  if (submitted) {
    return (
      <div className="action-phase">
        <div className="submit-message card">
          <h3 className="section-title">
            Action submitted
          </h3>
          <p>Waiting for other players to take their actions...</p>
          <div className="waiting-spinner"></div>
        </div>
      </div>
    );
  }
  
  // Handle action submission
  const onSubmitAction = () => {
    if (!selectedTarget) {
      alert('Select a target.');
      return;
    }
    if (!actionType) {
      alert('Select an ability.');
      return;
    }
    
    handleSubmitAction(actionType, selectedTarget);
  };
  
  return (
    <div className="action-phase">
      <h2 className="section-title">
        Choose Action
      </h2>
      
      <div className="action-selection">
        {/* Racial Ability Card */}
        {me.racialAbility && (
          <RacialAbilityCard
            ability={me.racialAbility}
            usesLeft={me.racialUsesLeft}
            cooldown={me.racialCooldown}
            disabled={submitted}
            onUse={handleRacialAbilityUse}
          />
        )}

        {/* Class Ability Cards */}
        <h3 className="section-title secondary">
          Your Abilities
        </h3>
        
        <div className="ability-list">
          {unlocked.map(ability => (
            <AbilityCard
              key={ability.type}
              ability={ability}
              selected={actionType === ability.type}
              onSelect={setActionType}
            />
          ))}
        </div>
        
        {/* Racial Enhancement Indicators */}
        {(bloodRageActive || keenSensesActive) && (
          <div className={`racial-enhancement ${bloodRageActive ? 'blood-rage' : ''} ${keenSensesActive ? 'keen-senses' : ''}`}>
            {bloodRageActive && (
              <div className="enhancement-badge blood-rage-badge">
                <span className="enhancement-icon">💢</span>
                <span className="enhancement-text">Blood Rage Active</span>
              </div>
            )}
            
            {keenSensesActive && (
              <div className="enhancement-badge keen-senses-badge">
                <span className="enhancement-icon">👁️</span>
                <span className="enhancement-text">Keen Senses Active</span>
              </div>
            )}
          </div>
        )}
        
        {/* Target Selector */}
        <TargetSelector
          alivePlayers={alivePlayers}
          monster={monster}
          currentPlayerId={me.id}
          selectedTarget={selectedTarget}
          onSelectTarget={setSelectedTarget}
          disableMonster={keenSensesActive} 
        />
        
        {/* Submit Button */}
        <button
          className="button action-button"
          onClick={onSubmitAction}
          disabled={!actionType || !selectedTarget}
        >
          Submit Action
        </button>
      </div>
    </div>
  );
};

ActionPhase.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  me: PropTypes.object.isRequired,
  unlocked: PropTypes.array.isRequired,
  alivePlayers: PropTypes.array.isRequired,
  monster: PropTypes.object.isRequired,
  actionType: PropTypes.string,
  selectedTarget: PropTypes.string,
  submitted: PropTypes.bool.isRequired,
  racialSelected: PropTypes.bool.isRequired,
  bloodRageActive: PropTypes.bool.isRequired,
  keenSensesActive: PropTypes.bool.isRequired,
  setActionType: PropTypes.func.isRequired,
  setSelectedTarget: PropTypes.func.isRequired,
  handleSubmitAction: PropTypes.func.isRequired,
  handleRacialAbilityUse: PropTypes.func.isRequired
};

export default ActionPhase;

