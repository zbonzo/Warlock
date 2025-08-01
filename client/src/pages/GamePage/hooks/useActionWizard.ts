/**
 * @fileoverview Custom hook for managing unified ActionWizard state
 * Replaces both desktop ActionColumn and mobile MobileActionWizard logic
 */
import { useState, useEffect, useCallback } from 'react';
import { Player, Ability } from '@/types/game';
import useMediaQuery from '../../../hooks/useMediaQuery';

type TabType = 'action' | 'players' | 'history';

interface ActionWizardState {
  // State
  isMobile: boolean;
  isWizardOpen: boolean;
  currentStep: number;
  selectedAbility: Ability | null;
  selectedTarget: string | null;
  submitted: boolean;
  activeTab: TabType;
  showGameState: boolean;
  
  // Actions
  handleTabChange: (tab: TabType) => void;
  handleAbilitySelect: (ability: Ability) => void;
  handleTargetSelect: (targetId: string) => void;
  handleSubmitAction: () => void;
  handleCloseWizard: () => void;
  handleStepChange: (step: number) => void;
  resetWizard: () => void;
  
  // GameState drawer actions
  handleShowGameState: () => void;
  handleBackToActions: () => void;
  handleCloseGameState: () => void;
  
  // Setters (for external use)
  setSubmitted: (submitted: boolean) => void;
  setSelectedAbility: (ability: Ability | null) => void;
  setSelectedTarget: (target: string | null) => void;
}

/**
 * Custom hook for managing ActionWizard state (unified for desktop and mobile)
 */
export const useActionWizard = (me: Player | null): ActionWizardState => {
  // Media query for responsive behavior
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Mobile-specific navigation state
  const [activeTab, setActiveTab] = useState<TabType>('action');
  const [showGameState, setShowGameState] = useState<boolean>(false);

  // Open wizard when:
  // 1. Mobile user switches to action tab
  // 2. Desktop user is alive and not stunned (always show wizard)
  useEffect(() => {
    const shouldShowWizard = me?.['isAlive'] && !me?.statusEffects?.stunned;
    
    if (isMobile) {
      // Mobile: show wizard when action tab is active and player can act
      if (activeTab === 'action' && shouldShowWizard) {
        setIsWizardOpen(true);
        setCurrentStep(1);
      } else {
        setIsWizardOpen(false);
      }
    } else {
      // Desktop: always show wizard when player can act
      setIsWizardOpen(shouldShowWizard);
      if (shouldShowWizard) {
        setCurrentStep(1);
      }
    }
  }, [isMobile, activeTab, me?.['isAlive'], me?.statusEffects?.stunned]);

  // Reset wizard state when player dies or gets stunned
  useEffect(() => {
    if (!me?.['isAlive'] || me?.statusEffects?.stunned) {
      setIsWizardOpen(false);
      setShowGameState(false);
      setCurrentStep(1);
      setSelectedAbility(null);
      setSelectedTarget(null);
      setSubmitted(false);
      
      // On mobile, switch away from action tab
      if (isMobile && activeTab === 'action') {
        setActiveTab('players');
      }
    }
  }, [me?.['isAlive'], me?.statusEffects?.stunned, isMobile, activeTab]);

  // Reset wizard state when submitted action is processed
  useEffect(() => {
    if (submitted) {
      setCurrentStep(1);
      setSelectedAbility(null);
      setSelectedTarget(null);
    }
  }, [submitted]);

  /**
   * Handle tab change for mobile navigation
   */
  const handleTabChange = useCallback((tab: TabType) => {
    console.log('Tab change requested:', tab);
    
    if (tab === 'action') {
      // Check if player can take action
      if (!me?.['isAlive']) {
        console.log('Cannot switch to action tab - player is dead');
        return;
      }
      
      if (me?.statusEffects?.stunned) {
        console.log('Cannot switch to action tab - player is stunned');
        return;
      }
      
      setActiveTab(tab);
    } else {
      setActiveTab(tab);
    }
  }, [me?.['isAlive'], me?.statusEffects?.stunned]);

  /**
   * Handle ability selection
   */
  const handleAbilitySelect = useCallback((ability: Ability) => {
    console.log('Ability selected:', ability);
    setSelectedAbility(ability);
    // Move to step 2 automatically after ability selection
    setCurrentStep(2);
  }, []);

  /**
   * Handle target selection
   */
  const handleTargetSelect = useCallback((targetId: string) => {
    console.log('Target selected:', targetId);
    setSelectedTarget(targetId);
  }, []);

  /**
   * Handle action submission
   */
  const handleSubmitAction = useCallback(() => {
    console.log('Action submitted:', { ability: selectedAbility, target: selectedTarget });
    setSubmitted(true);
    
    // On mobile, close wizard and switch to players tab
    if (isMobile) {
      setIsWizardOpen(false);
      setActiveTab('players');
    }
  }, [selectedAbility, selectedTarget, isMobile]);

  /**
   * Show GameState drawer (mobile only) - replaces close/cancel
   */
  const handleShowGameState = useCallback(() => {
    console.log('Showing GameState drawer');
    
    if (isMobile) {
      setIsWizardOpen(false);
      setShowGameState(true);
    }
  }, [isMobile]);

  /**
   * Close GameState drawer and return to actions
   */
  const handleBackToActions = useCallback(() => {
    console.log('Back to actions from GameState');
    
    if (isMobile) {
      setShowGameState(false);
      setIsWizardOpen(true);
    }
  }, [isMobile]);

  /**
   * Close GameState drawer completely
   */
  const handleCloseGameState = useCallback(() => {
    console.log('Closing GameState drawer');
    setShowGameState(false);
  }, []);

  /**
   * Close wizard (desktop only - mobile uses GameState instead)
   */
  const handleCloseWizard = useCallback(() => {
    console.log('Closing wizard');
    
    if (!isMobile) {
      // Desktop: just reset wizard state
      setCurrentStep(1);
      setSelectedAbility(null);
      setSelectedTarget(null);
    } else {
      // Mobile: show GameState drawer instead
      handleShowGameState();
    }
  }, [isMobile, handleShowGameState]);

  /**
   * Reset wizard state (called externally)
   */
  const resetWizard = useCallback(() => {
    setCurrentStep(1);
    setSelectedAbility(null);
    setSelectedTarget(null);
    setSubmitted(false);
    setShowGameState(false);
  }, []);

  /**
   * Step change handler
   */
  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  return {
    // State
    isMobile,
    isWizardOpen,
    currentStep,
    selectedAbility,
    selectedTarget,
    submitted,
    activeTab,
    showGameState,
    
    // Actions
    handleTabChange,
    handleAbilitySelect,
    handleTargetSelect,
    handleSubmitAction,
    handleCloseWizard,
    handleStepChange,
    resetWizard,
    
    // GameState drawer actions
    handleShowGameState,
    handleBackToActions,
    handleCloseGameState,
    
    // Setters (for external use)
    setSubmitted,
    setSelectedAbility,
    setSelectedTarget,
  };
};