/**
 * @fileoverview Custom hook for managing modal state
 */
import { useState, useCallback } from 'react';
import { Ability, Player, GameEvent } from '@/types/game';

interface BattleResultsData {
  events?: GameEvent[];
  round?: number;
  levelUp?: any;
  winner?: string | null;
  players?: Player[];
  trophyAward?: any;
  [key: string]: any;
}

interface ModalState {
  // Adaptability Modal
  showAdaptabilityModal: boolean;
  initialModalAbilities: Ability[] | null;
  showAdaptabilityModalWithAbilities: (abilities: Ability[]) => void;
  closeAdaptabilityModal: () => void;
  
  // Battle Results Modal
  showBattleResults: boolean;
  battleResultsData: BattleResultsData | null;
  showBattleResultsModal: (resultsData: BattleResultsData) => void;
  updateBattleResultsData: (updatedData: Partial<BattleResultsData>) => void;
  closeBattleResultsModal: () => void;
}

/**
 * Custom hook for managing modal state
 */
export const useModalState = (): ModalState => {
  // Modal state
  const [showAdaptabilityModal, setShowAdaptabilityModal] = useState<boolean>(false);
  const [initialModalAbilities, setInitialModalAbilities] = useState<Ability[] | null>(null);
  const [showBattleResults, setShowBattleResults] = useState<boolean>(false);
  const [battleResultsData, setBattleResultsData] = useState<BattleResultsData | null>(null);

  /**
   * Show adaptability modal with abilities
   */
  const showAdaptabilityModalWithAbilities = useCallback((abilities: Ability[]) => {
    setInitialModalAbilities(abilities);
    setShowAdaptabilityModal(true);
  }, []);

  /**
   * Close adaptability modal
   */
  const closeAdaptabilityModal = useCallback(() => {
    setShowAdaptabilityModal(false);
    setInitialModalAbilities(null);
  }, []);

  /**
   * Show battle results modal
   */
  const showBattleResultsModal = useCallback((resultsData: BattleResultsData) => {
    setBattleResultsData(resultsData);
    setShowBattleResults(true);
  }, []);

  /**
   * Update battle results data (e.g., for trophy awards)
   */
  const updateBattleResultsData = useCallback((updatedData: Partial<BattleResultsData>) => {
    setBattleResultsData(prev => ({
      ...prev,
      ...updatedData,
    }));
  }, []);

  /**
   * Close battle results modal
   */
  const closeBattleResultsModal = useCallback(() => {
    setShowBattleResults(false);
    setBattleResultsData(null);
  }, []);

  return {
    // Adaptability Modal
    showAdaptabilityModal,
    initialModalAbilities,
    showAdaptabilityModalWithAbilities,
    closeAdaptabilityModal,
    
    // Battle Results Modal
    showBattleResults,
    battleResultsData,
    showBattleResultsModal,
    updateBattleResultsData,
    closeBattleResultsModal,
  };
};