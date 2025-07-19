import React from 'react';
import './MobileActionWizard.css';
import AbilitySelectionStep from './AbilitySelectionStep';
import TargetSelectionStep from './TargetSelectionStep';

const MobileActionWizard = ({ 
  isOpen, 
  currentStep, 
  onStepChange,
  onClose,
  me,
  monster,
  lastEvent,
  unlocked,
  racialAbility,
  alivePlayers,
  selectedAbility,
  selectedTarget,
  bloodRageActive,
  keenSensesActive,
  racialSelected,
  onAbilitySelect,
  onTargetSelect,
  onRacialAbilityUse,
  onSubmitAction,
  ...props
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="mobile-action-wizard-overlay">
      <div className="mobile-action-wizard">
        {/* Step content */}
        {currentStep === 1 && (
          <AbilitySelectionStep 
            me={me}
            unlocked={unlocked}
            racialAbility={racialAbility}
            lastEvent={lastEvent}
            selectedAbility={selectedAbility}
            bloodRageActive={bloodRageActive}
            keenSensesActive={keenSensesActive}
            racialSelected={racialSelected}
            onAbilitySelect={onAbilitySelect}
            onRacialAbilityUse={onRacialAbilityUse}
            onNext={(ability) => {
              onAbilitySelect(ability);
              onStepChange(2);
            }}
            onClose={onClose}
          />
        )}
        
        {currentStep === 2 && (
          <TargetSelectionStep
            me={me}
            monster={monster}
            alivePlayers={alivePlayers}
            selectedAbility={selectedAbility}
            selectedTarget={selectedTarget}
            keenSensesActive={keenSensesActive}
            lastEvent={lastEvent}
            onTargetSelect={onTargetSelect}
            onBack={() => onStepChange(1)}
            onSubmit={onSubmitAction}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default MobileActionWizard;