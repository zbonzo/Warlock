/**
 * @fileoverview Mobile Action Wizard component for step-based action selection
 */
import React from 'react';
import AbilitySelectionStep from './AbilitySelectionStep';
import TargetSelectionStep from './TargetSelectionStep';
import { Player, Monster, Ability } from '../../../../types/shared';
import { GameEvent } from '../../../../types/game';
import './MobileActionWizard.css';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  [key: string]: any;
}

interface MobileActionWizardProps {
  isOpen: boolean;
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  me: Player;
  monster: Monster | null;
  lastEvent: LastEventData;
  unlocked: Ability[];
  racialAbility?: Ability;
  alivePlayers: Player[];
  selectedAbility?: Ability | null;
  selectedTarget?: string | null;
  bloodRageActive: boolean;
  keenSensesActive: boolean;
  racialSelected: boolean;
  onAbilitySelect: (ability: Ability) => void;
  onTargetSelect: (targetId: string) => void;
  onRacialAbilityUse: (abilityType: string) => void;
  onSubmitAction: () => void;
}

const MobileActionWizard: React.FC<MobileActionWizardProps> = ({ 
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
}) => {
  if (!isOpen) return null;
  
  const handleAbilityNext = (ability: Ability): void => {
    onAbilitySelect(ability);
    onStepChange(2);
  };

  const handleBack = (): void => {
    onStepChange(1);
  };
  
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
            onNext={handleAbilityNext}
            onClose={onClose}
          />
        )}
        
        {currentStep === 2 && (
          <TargetSelectionStep
            me={me}
            monster={monster || undefined}
            alivePlayers={alivePlayers}
            selectedAbility={selectedAbility || undefined}
            selectedTarget={selectedTarget || undefined}
            keenSensesActive={keenSensesActive}
            lastEvent={lastEvent}
            onTargetSelect={onTargetSelect}
            onBack={handleBack}
            onSubmit={onSubmitAction}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

export default MobileActionWizard;