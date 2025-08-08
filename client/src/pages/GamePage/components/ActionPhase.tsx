/**
 * @fileoverview Action phase component for the game
 * Handles player ability selection, targeting, and action submission
 */
import React from 'react';
import AbilityCard from '@components/game/AbilityCard';
import RacialAbilityCard from '@components/game/RacialAbilityCard';
import TargetSelector from '@components/game/TargetSelector';
import { Player, Monster, Ability } from '@/types/game';
import './ActionPhase.css';

interface ActionPhaseProps {
  isVisible: boolean;
  me: Player;
  unlocked: Ability[];
  alivePlayers: Player[];
  monster: Monster;
  actionType?: string | null;
  selectedTarget?: string | null;
  submitted: boolean;
  racialSelected: boolean;
  bloodRageActive: boolean;
  keenSensesActive: boolean;
  setActionType: (type: string) => void;
  setSelectedTarget: (targetId: string) => void;
  handleSubmitAction: (actionType: string, targetId: string) => void;
  handleRacialAbilityUse: (abilityType: string) => void;
}

/**
 * ActionPhase handles the ability selection and targeting UI
 */
const ActionPhase: React.FC<ActionPhaseProps> = ({ 
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
  if (!me['isAlive']) {
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
  const onSubmitAction = (): void => {
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
            usesLeft={me.racialUsesLeft ?? 0}
            cooldown={me.racialCooldown ?? 0}
            disabled={submitted}
            onUse={() => handleRacialAbilityUse(me.racialAbility?.type || '')}
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
          currentPlayerId={me['id']}
          selectedTarget={selectedTarget || undefined}
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

export default ActionPhase;