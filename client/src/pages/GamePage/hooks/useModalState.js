/**
 * @fileoverview Custom hook for managing modal state
 */
import { useState, useCallback } from 'react';

/**
 * Custom hook for managing modal state
 * @returns {Object} Modal state and handlers
 */
export const useModalState = () => {
  // Modal state
  const [showAdaptabilityModal, setShowAdaptabilityModal] = useState(false);
  const [initialModalAbilities, setInitialModalAbilities] = useState(null);
  const [showBattleResults, setShowBattleResults] = useState(false);
  const [battleResultsData, setBattleResultsData] = useState(null);

  /**
   * Show adaptability modal with abilities
   * @param {Array} abilities - Available abilities for selection
   */
  const showAdaptabilityModalWithAbilities = useCallback((abilities) => {
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
   * @param {Object} resultsData - Battle results data
   */
  const showBattleResultsModal = useCallback((resultsData) => {
    setBattleResultsData(resultsData);
    setShowBattleResults(true);
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
    closeBattleResultsModal,
  };
};