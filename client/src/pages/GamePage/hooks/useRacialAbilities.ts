/**
 * @fileoverview Custom hook for managing racial ability state
 */
import { useState, useCallback } from 'react';

interface RacialAbilitiesState {
  // State
  bloodRageActive: boolean;
  keenSensesActive: boolean;
  racialSelected: boolean;
  
  // Setters
  setBloodRageActive: (active: boolean) => void;
  setKeenSensesActive: (active: boolean) => void;
  setRacialSelected: (selected: boolean) => void;
  
  // Actions
  handleRacialAbilityUse: (abilityType: string) => void;
  resetRacialStates: () => void;
}

/**
 * Custom hook for managing racial ability state
 */
export const useRacialAbilities = (): RacialAbilitiesState => {
  // Racial ability state
  const [bloodRageActive, setBloodRageActive] = useState<boolean>(false);
  const [keenSensesActive, setKeenSensesActive] = useState<boolean>(false);
  const [racialSelected, setRacialSelected] = useState<boolean>(false);

  /**
   * Handle racial ability usage
   */
  const handleRacialAbilityUse = useCallback((abilityType: string) => {
    /* eslint-disable-next-line no-console */
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