/**
 * @fileoverview Unified ActionWizard component that works for both desktop and mobile
 * Uses a step-based approach: ability selection → target selection → submission
 * Renders as drawer on mobile, inline content on desktop
 */
import React, { useState, useEffect, useCallback } from 'react';
import AbilitySelectionStep from './AbilitySelectionStep';
import TargetSelectionStep from './TargetSelectionStep';
import { Player, Monster, Ability, GameEvent } from '@/types/game';
import './ActionWizard.css';

interface LastEventData {
  turn: number;
  events: GameEvent[];
  [key: string]: any;
}

interface ActionWizardProps {
  // Visibility and state
  isOpen: boolean;
  isMobile: boolean;
  
  // Game state
  me: Player;
  monster: Monster | null;
  lastEvent: LastEventData;
  unlocked: Ability[];
  alivePlayers: Player[];
  
  // Current selections
  selectedAbility?: Ability | null;
  selectedTarget?: string | null;
  submitted?: boolean;
  submittedPlayers?: string[];
  
  // Racial ability state
  bloodRageActive?: boolean;
  keenSensesActive?: boolean;
  racialSelected?: boolean;
  
  // Callbacks
  onAbilitySelect: (ability: Ability) => void;
  onTargetSelect: (targetId: string) => void;
  onRacialAbilityUse: (abilityType: string) => void;
  onSubmitAction: () => void;
  onClose: () => void;
  
  // Additional props for step control
  initialStep?: number;
  onStepChange?: (step: number) => void;
}

/**
 * Unified ActionWizard component - no header, just the wizard steps
 * This component handles the step flow logic and renders the appropriate step
 */
const ActionWizard: React.FC<ActionWizardProps> = ({
  // Visibility and state
  isOpen,
  isMobile,
  
  // Game state
  me,
  monster,
  lastEvent,
  unlocked,
  alivePlayers,
  
  // Current selections
  selectedAbility,
  selectedTarget,
  submitted = false,
  submittedPlayers = [],
  
  // Racial ability state
  bloodRageActive = false,
  keenSensesActive = false,
  racialSelected = false,
  
  // Callbacks
  onAbilitySelect,
  onTargetSelect,
  onRacialAbilityUse,
  onSubmitAction,
  onClose,
  
  // Additional props for step control
  initialStep = 1,
  onStepChange,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset step when wizard opens (but not if already submitted)
  useEffect(() => {
    const serverHasSubmittedAction = me?.['hasSubmittedAction'] || false;
    
    console.log('🔍 useEffect[isOpen,submitted,selectedAbility]:', {
      isOpen,
      submitted,
      currentStep,
      selectedAbility: selectedAbility?.name || 'none',
      serverHasSubmittedAction,
      trigger: 'wizard open effect'
    });
    
    if (isOpen && !submitted && !serverHasSubmittedAction) {
      // Only reset to step 1 if we're not in a submitted state (local or server)
      if (currentStep !== 1 && !selectedAbility) {
        console.warn('⚠️ Resetting to step 1 from useEffect', {
          reason: 'Wizard opened without ability selected',
          currentStep,
          selectedAbility: (selectedAbility as any)?.name || 'none',
          serverHasSubmittedAction
        });
        setCurrentStep(1);
      }
    } else if (serverHasSubmittedAction && currentStep === 1) {
      // If server says we submitted but we're on step 1, force to step 2
      console.log('🔍 Server has submission, forcing step 2');
      setCurrentStep(2);
    }
  }, [isOpen, submitted, selectedAbility, me]);

  // Reset submitting state when submitted changes and ensure we stay on step 2
  useEffect(() => {
    console.log('🔍 useEffect[submitted,currentStep]:', {
      submitted,
      currentStep,
      isSubmitting,
      trigger: 'submitted state change'
    });
    
    if (submitted) {
      setIsSubmitting(false);
      // Keep the wizard on step 2 (target selection) after submission
      if (currentStep !== 2) {
        console.log('🔍 Forcing step 2 due to submitted state');
        setCurrentStep(2);
      }
    }
  }, [submitted, currentStep]);

  // Handle step changes with validation
  const handleStepChange = useCallback((step: number): void => {
    // Validate step transitions (allow if already submitted)
    if (step === 2 && !selectedAbility && !submitted) {
      console.warn('ActionWizard: Cannot go to step 2 without selecting ability');
      setCurrentStep(1);
      return;
    }
    
    setCurrentStep(step);
    if (onStepChange) {
      onStepChange(step);
    }
  }, [onStepChange, selectedAbility, submitted]);

  // Handle ability selection (don't auto-advance)
  const handleAbilitySelect = useCallback((ability: Ability): void => {
    onAbilitySelect(ability);
  }, [onAbilitySelect]);

  // Handle Continue button click
  const handleContinue = useCallback((): void => {
    if (selectedAbility) {
      handleStepChange(2);
    }
  }, [selectedAbility, handleStepChange]);

  // Handle going back to ability selection
  const handleBack = useCallback((): void => {
    handleStepChange(1);
  }, [handleStepChange]);

  // Handle submission with loading state (but don't close wizard)
  const handleSubmit = useCallback((): void => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    onSubmitAction();
    
    // Auto-reset submitting state after timeout
    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
    
    // Don't close the wizard - stay on target selection step
    // The wizard should remain open until all players have submitted
  }, [isSubmitting, onSubmitAction]);

  // Don't render if not open
  if (!isOpen) return null;

  // DEBUG: Log all relevant state before validation
  console.log('🔍 ActionWizard Render Debug:', {
    currentStep,
    selectedAbility: selectedAbility?.name || 'none',
    selectedTarget,
    submitted,
    isOpen,
    isSubmitting,
    meId: me?.['id'],
    meName: me?.['name'],
    hasSubmittedAction: me?.['hasSubmittedAction'],
    timestamp: new Date().toISOString()
  });

  // Validate current step and reset if invalid (but not if already submitted)
  let validatedStep = currentStep;
  
  // Only validate and potentially reset if not submitted AND not hasSubmittedAction
  const serverHasSubmittedAction = me?.['hasSubmittedAction'] || false;
  
  if (!submitted && !serverHasSubmittedAction) {
    const shouldReset = currentStep === 2 && !selectedAbility;
    console.log('🔍 Step Validation:', {
      currentStep,
      hasSelectedAbility: !!selectedAbility,
      shouldReset,
      submitted,
      serverHasSubmittedAction
    });
    
    validatedStep = shouldReset ? 1 : currentStep;
    if (validatedStep !== currentStep) {
      console.warn('⚠️ ActionWizard: Invalid step detected, resetting to step 1', {
        reason: 'No ability selected for step 2',
        currentStep,
        validatedStep,
        selectedAbility: selectedAbility?.name || 'none',
        stackTrace: new Error().stack
      });
      setCurrentStep(1);
    }
  } else {
    // If submitted OR server says hasSubmittedAction, always stay on step 2 to show the waiting state
    console.log('🔍 Submitted/HasSubmittedAction state - forcing step 2', {
      submitted,
      serverHasSubmittedAction
    });
    validatedStep = 2;
  }

  // Determine container class based on mobile/desktop
  const containerClass = `action-wizard ${isMobile ? 'action-wizard--mobile' : 'action-wizard--desktop'}`;

  return (
    <div className={containerClass}>
      {/* Step 1: Ability Selection */}
      {validatedStep === 1 && (
        <AbilitySelectionStep
          me={me}
          unlocked={unlocked}
          racialAbility={me?.racialAbility}
          lastEvent={lastEvent}
          selectedAbility={selectedAbility}
          bloodRageActive={bloodRageActive}
          keenSensesActive={keenSensesActive}
          racialSelected={racialSelected}
          onAbilitySelect={handleAbilitySelect}
          onRacialAbilityUse={onRacialAbilityUse}
          onClose={onClose}
          onContinue={handleContinue}
          isMobile={isMobile}
        />
      )}

      {/* Step 2: Target Selection */}
      {validatedStep === 2 && (selectedAbility || submitted) && (
        <TargetSelectionStep
          me={me}
          monster={monster}
          alivePlayers={alivePlayers}
          selectedAbility={selectedAbility || null}
          selectedTarget={selectedTarget}
          keenSensesActive={keenSensesActive}
          lastEvent={lastEvent}
          onTargetSelect={onTargetSelect}
          onBack={handleBack}
          onSubmit={handleSubmit}
          onClose={onClose}
          isMobile={isMobile}
          isSubmitting={isSubmitting}
          submitted={submitted}
          submittedPlayers={submittedPlayers}
        />
      )}
    </div>
  );
};

export default ActionWizard;