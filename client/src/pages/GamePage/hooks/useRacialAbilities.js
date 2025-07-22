/**
 * @fileoverview Custom hook for managing racial ability state
 */
import { useState, useCallback } from 'react';

/**
 * Custom hook for managing racial ability state
 * @returns {Object} Racial ability state and handlers
 */
export const useRacialAbilities = () => {
  // Racial ability state
  const [bloodRageActive, setBloodRageActive] = useState(false);
  const [keenSensesActive, setKeenSensesActive] = useState(false);
  const [racialSelected, setRacialSelected] = useState(false);

  /**
   * Handle racial ability usage
   * @param {string} abilityType - Type of racial ability
   */
  const handleRacialAbilityUse = useCallback((abilityType) => {
    console.log('Racial ability used:', abilityType);
    
    if (abilityType === 'bloodRage') {
      setBloodRageActive(true);
    } else if (abilityType === 'keenSenses') {
      setKeenSensesActive(true);
    }
    
    setRacialSelected(true);
    
    // Note: Racial abilities modify the main action, they don't submit separate actions
    // The racial state will be included when the main action is submitted
  }, []);

  /**
   * Reset racial ability states
   */
  const resetRacialStates = useCallback(() => {
    setBloodRageActive(false);
    setKeenSensesActive(false);
    setRacialSelected(false);
  }, []);

  return {
    // State
    bloodRageActive,
    keenSensesActive,
    racialSelected,
    
    // Setters
    setBloodRageActive,
    setKeenSensesActive,
    setRacialSelected,
    
    // Actions
    handleRacialAbilityUse,
    resetRacialStates,
  };
};