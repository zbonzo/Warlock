/**
 * @fileoverview Custom hook for managing mobile-specific UI state
 */
import { useState, useEffect, useCallback } from 'react';
import useMediaQuery from '../../../hooks/useMediaQuery';
import type { Player } from '../../../types/shared';

interface UseMobileStateReturn {
  // State
  isMobile: boolean;
  activeTab: string;
  mobileActionStep: number;
  showMobileActionWizard: boolean;
  
  // Setters
  setActiveTab: (tab: string) => void;
  setMobileActionStep: (step: number) => void;
  setShowMobileActionWizard: (show: boolean) => void;
  
  // Actions
  handleTabChange: (tab: string) => void;
  handleCloseWizard: () => void;
  resetMobileWizard: () => void;
}

/**
 * Custom hook for managing mobile state and mobile action wizard
 * @param {Player} me - Current player data
 * @returns {UseMobileStateReturn} Mobile state and handlers
 */
export const useMobileState = (me?: Player): UseMobileStateReturn => {
  // Mobile navigation state
  const [activeTab, setActiveTab] = useState('action');

  // Mobile Action Wizard state
  const [mobileActionStep, setMobileActionStep] = useState(1);
  const [showMobileActionWizard, setShowMobileActionWizard] = useState(false);

  // Media query for responsive layout
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Effect to handle initial mobile state - if on mobile and action tab is active, open wizard
  useEffect(() => {
    if (isMobile && activeTab === 'action' && !showMobileActionWizard) {
      // Don't open wizard if player is stunned or dead
      if (!me?.['isAlive'] || me?.['statusEffects']?.['stunned']) {
        /* eslint-disable-next-line no-console */
        console.log('Cannot open wizard - player is stunned or dead');
        setActiveTab('players'); // Redirect to players tab instead
        return;
      }
      
      /* eslint-disable-next-line no-console */
      console.log('Initial mobile action tab detected, opening wizard');
      setShowMobileActionWizard(true);
      setMobileActionStep(1);
    }
    // Reset wizard if switching to desktop
    else if (!isMobile && showMobileActionWizard) {
      /* eslint-disable-next-line no-console */
      console.log('Switching to desktop, closing wizard');
      setShowMobileActionWizard(false);
    }
    // Close wizard if player becomes stunned or dies
    else if (showMobileActionWizard && (!me?.['isAlive'] || me?.['statusEffects']?.['stunned'])) {
      /* eslint-disable-next-line no-console */
      console.log('Closing wizard - player became stunned or dead');
      setShowMobileActionWizard(false);
      setActiveTab('players'); // Switch to players tab
    }
  }, [isMobile, activeTab, showMobileActionWizard, me?.['isAlive'], me?.['statusEffects']?.['stunned']]);

  /**
   * Handle tab change for mobile navigation
   * @param {string} tab - Tab name to switch to
   */
  const handleTabChange = useCallback((tab: string) => {
    /* eslint-disable-next-line no-console */
    console.log('Tab change requested:', tab);
    
    if (tab === 'action') {
      // Check if player can take action
      if (!me?.['isAlive']) {
        /* eslint-disable-next-line no-console */
        console.log('Cannot switch to action tab - player is dead');
        return;
      }
      
      if (me?.['statusEffects']?.['stunned']) {
        /* eslint-disable-next-line no-console */
        console.log('Cannot switch to action tab - player is stunned');
        return;
      }
      
      setActiveTab(tab);
      
      // Open mobile action wizard for mobile users
      if (isMobile) {
        setShowMobileActionWizard(true);
        setMobileActionStep(1);
      }
    } else {
      setActiveTab(tab);
      
      // Close mobile action wizard when switching away from action
      if (showMobileActionWizard) {
        setShowMobileActionWizard(false);
      }
    }
  }, [isMobile, me?.['isAlive'], me?.['statusEffects']?.['stunned'], showMobileActionWizard]);

  /**
   * Close mobile action wizard
   */
  const handleCloseWizard = useCallback(() => {
    /* eslint-disable-next-line no-console */
    console.log('Closing mobile action wizard');
    setShowMobileActionWizard(false);
    
    // Switch to players tab when closing wizard
    if (activeTab === 'action') {
      setActiveTab('players');
    }
  }, [activeTab]);

  /**
   * Reset mobile wizard state
   */
  const resetMobileWizard = useCallback(() => {
    setMobileActionStep(1);
    setShowMobileActionWizard(false);
  }, []);

  return {
    // State
    isMobile,
    activeTab,
    mobileActionStep,
    showMobileActionWizard,
    
    // Setters
    setActiveTab,
    setMobileActionStep,
    setShowMobileActionWizard,
    
    // Actions
    handleTabChange,
    handleCloseWizard,
    resetMobileWizard,
  };
};