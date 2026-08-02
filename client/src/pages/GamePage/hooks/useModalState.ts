/**
 * @fileoverview Custom hook for managing modal state
 */
import { useState, useCallback } from 'react';
import { Player, GameEvent } from '@/types/game';

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
  const [showBattleResults, setShowBattleResults] = useState<boolean>(false);
  const [battleResultsData, setBattleResultsData] = useState<BattleResultsData | null>(null);

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
    // Battle Results Modal
    showBattleResults,
    battleResultsData,
    showBattleResultsModal,
    updateBattleResultsData,
    closeBattleResultsModal,
  };
};