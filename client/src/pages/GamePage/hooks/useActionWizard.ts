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
    
    /* eslint-disable-next-line no-console */
    console.log('🔍 useActionWizard effect:', {
      shouldShowWizard,
      isMobile,
      activeTab,
      submitted,
      currentStep,
      isAlive: me?.['isAlive'],
      stunned: me?.statusEffects?.stunned,
      trigger: 'wizard visibility check'
    });
    
    if (isMobile) {
      // Mobile: show wizard when action tab is active and player can act
      if (activeTab === 'action' && shouldShowWizard) {
        setIsWizardOpen(true);
        // Only reset to step 1 if not already submitted
        if (!submitted) {
          /* eslint-disable-next-line no-console */
          console.log('🔍 Mobile: Resetting to step 1 (not submitted)');
          setCurrentStep(1);
        }
      } else {
        setIsWizardOpen(false);
      }
    } else {
      // Desktop: always show wizard when player can act
      setIsWizardOpen(shouldShowWizard);
      if (shouldShowWizard && !submitted) {
        // Only reset to step 1 if not already submitted
        /* eslint-disable-next-line no-console */
        console.log('🔍 Desktop: Resetting to step 1 (not submitted)');
        setCurrentStep(1);
      }
    }
  }, [isMobile, activeTab, me, submitted, currentStep]);

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
  }, [me, isMobile, activeTab]);

  // Don't reset wizard state when submitted - keep it open for waiting
  // The wizard will be reset when the round actually processes

  /**
   * Handle tab change for mobile navigation
   */
  const handleTabChange = useCallback((tab: TabType) => {
    /* eslint-disable-next-line no-console */
    console.log('Tab change requested:', tab);
    
    if (tab === 'action') {
      // Check if player can take action
      if (!me?.['isAlive']) {
        /* eslint-disable-next-line no-console */
        console.log('Cannot switch to action tab - player is dead');
        return;
      }
      
      if (me?.statusEffects?.stunned) {
        /* eslint-disable-next-line no-console */
        console.log('Cannot switch to action tab - player is stunned');
        return;
      }
      
      setActiveTab(tab);
    } else {
      setActiveTab(tab);
    }
  }, [me]);

  /**
   * Handle ability selection (don't auto-advance to step 2 - use Continue button)
   */
  const handleAbilitySelect = useCallback((ability: Ability) => {
    /* eslint-disable-next-line no-console */
    console.log('Ability selected:', ability);
    setSelectedAbility(ability);
    // Don't automatically move to step 2 - wait for Continue button
  }, []);

  /**
   * Handle target selection
   */
  const handleTargetSelect = useCallback((targetId: string) => {
    /* eslint-disable-next-line no-console */
    console.log('Target selected:', targetId);
    setSelectedTarget(targetId);
  }, []);

  /**
   * Handle action submission (keep wizard open for waiting state)
   */
  const handleSubmitAction = useCallback(() => {
    /* eslint-disable-next-line no-console */
    console.log('🔍 handleSubmitAction called:', { 
      ability: selectedAbility?.name || 'none', 
      target: selectedTarget,
      currentStep,
      wasSubmitted: submitted
    });
    setSubmitted(true);
    
    // Keep wizard open to show waiting state
    // Don't switch away from action tab - let player see the waiting state
  }, [selectedAbility, selectedTarget, currentStep, submitted]);

  /**
   * Show GameState drawer (mobile only) - replaces close/cancel
   */
  const handleShowGameState = useCallback(() => {
    /* eslint-disable-next-line no-console */
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
    /* eslint-disable-next-line no-console */
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
    /* eslint-disable-next-line no-console */
    console.log('Closing GameState drawer');
    setShowGameState(false);
  }, []);

  /**
   * Close wizard (desktop only - mobile uses GameState instead)
   */
  const handleCloseWizard = useCallback(() => {
    /* eslint-disable-next-line no-console */
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
    /* eslint-disable-next-line no-console */
    console.log('🔍 resetWizard called!', {
      previousStep: currentStep,
      previousAbility: selectedAbility?.name || 'none',
      previousTarget: selectedTarget,
      previousSubmitted: submitted,
      stackTrace: new Error().stack
    });
    setCurrentStep(1);
    setSelectedAbility(null);
    setSelectedTarget(null);
    setSubmitted(false);
    setShowGameState(false);
  }, [currentStep, selectedAbility, selectedTarget, submitted]);

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