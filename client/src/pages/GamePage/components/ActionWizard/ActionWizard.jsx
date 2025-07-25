/**
 * @fileoverview Unified ActionWizard component that works for both desktop and mobile
 * Uses a step-based approach: ability selection → target selection → submission
 * Renders as drawer on mobile, inline content on desktop
 */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import AbilitySelectionStep from './AbilitySelectionStep';
import TargetSelectionStep from './TargetSelectionStep';
import './ActionWizard.css';

/**
 * Unified ActionWizard component - no header, just the wizard steps
 * This component handles the step flow logic and renders the appropriate step
 */
const ActionWizard = ({
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
  submitted,
  
  // Racial ability state
  bloodRageActive,
  keenSensesActive,
  racialSelected,
  
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
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset step when wizard opens
  useEffect(() => {
    if (isOpen && currentStep !== 1) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  // Reset submitting state when submitted changes
  useEffect(() => {
    if (submitted) {
      setIsSubmitting(false);
    }
  }, [submitted]);

  // Handle step changes with validation
  const handleStepChange = useCallback((step) => {
    // Validate step transitions
    if (step === 2 && !selectedAbility) {
      console.warn('ActionWizard: Cannot go to step 2 without selecting ability');
      setCurrentStep(1);
      return;
    }
    
    setCurrentStep(step);
    if (onStepChange) {
      onStepChange(step);
    }
  }, [onStepChange, selectedAbility]);

  // Handle ability selection and move to next step
  const handleAbilitySelect = useCallback((ability) => {
    onAbilitySelect(ability);
    handleStepChange(2);
  }, [onAbilitySelect, handleStepChange]);

  // Handle going back to ability selection
  const handleBack = useCallback(() => {
    handleStepChange(1);
  }, [handleStepChange]);

  // Handle submission with loading state
  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    onSubmitAction();
    
    // Auto-reset submitting state after timeout
    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  }, [isSubmitting, onSubmitAction]);

  // Don't render if not open
  if (!isOpen) return null;

  // Validate current step and reset if invalid
  const validatedStep = currentStep === 2 && !selectedAbility ? 1 : currentStep;
  if (validatedStep !== currentStep) {
    console.warn('ActionWizard: Invalid step detected, resetting to step 1');
    setCurrentStep(1);
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
          isMobile={isMobile}
        />
      )}

      {/* Step 2: Target Selection */}
      {validatedStep === 2 && selectedAbility && (
        <TargetSelectionStep
          me={me}
          monster={monster}
          alivePlayers={alivePlayers}
          selectedAbility={selectedAbility}
          selectedTarget={selectedTarget}
          keenSensesActive={keenSensesActive}
          lastEvent={lastEvent}
          onTargetSelect={onTargetSelect}
          onBack={handleBack}
          onSubmit={handleSubmit}
          onClose={onClose}
          isMobile={isMobile}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

ActionWizard.propTypes = {
  // Visibility and state
  isOpen: PropTypes.bool.isRequired,
  isMobile: PropTypes.bool.isRequired,
  
  // Game state
  me: PropTypes.object.isRequired,
  monster: PropTypes.object,
  lastEvent: PropTypes.object.isRequired,
  unlocked: PropTypes.array.isRequired,
  alivePlayers: PropTypes.array.isRequired,
  
  // Current selections
  selectedAbility: PropTypes.object,
  selectedTarget: PropTypes.string,
  submitted: PropTypes.bool,
  
  // Racial ability state
  bloodRageActive: PropTypes.bool,
  keenSensesActive: PropTypes.bool,
  racialSelected: PropTypes.bool,
  
  // Callbacks
  onAbilitySelect: PropTypes.func.isRequired,
  onTargetSelect: PropTypes.func.isRequired,
  onRacialAbilityUse: PropTypes.func.isRequired,
  onSubmitAction: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  
  // Additional props
  initialStep: PropTypes.number,
  onStepChange: PropTypes.func,
};

export default ActionWizard;