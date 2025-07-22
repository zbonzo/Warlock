/**
 * @fileoverview Custom hook for managing action selection state
 */
import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing action selection state
 * @param {Object} me - Current player data
 * @param {Array} players - All players
 * @param {Object} monster - Monster data
 * @returns {Object} Action state and handlers
 */
export const useActionState = (me, players, monster) => {
  // Action selection state
  const [actionType, setActionType] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState(null);

  // Derived values
  const unlocked = useMemo(() => me?.unlocked || [], [me?.unlocked]);
  const alivePlayers = useMemo(
    () => players.filter((p) => p.isAlive),
    [players]
  );

  /**
   * Enhanced validation function to check if current selection is valid
   */
  const isCurrentSelectionValid = useCallback(() => {
    if (!actionType || !selectedTarget) return false;

    // Check if selected ability exists and is unlocked
    const selectedAbility = unlocked.find(
      (ability) => ability.type === actionType
    );
    if (!selectedAbility) return false;

    // Check if ability is on cooldown
    const cooldown = me?.abilityCooldowns?.[selectedAbility.type] || 0;
    if (cooldown > 0) return false;

    // Check if target is valid (alive player or monster)
    if (selectedTarget === '__monster__') {
      return monster && monster.hp > 0; // Monster must be alive
    }

    const targetPlayer = alivePlayers.find((p) => p.id === selectedTarget);
    return !!targetPlayer;
  }, [
    actionType,
    selectedTarget,
    unlocked,
    me?.abilityCooldowns,
    alivePlayers,
    monster,
  ]);

  /**
   * Reset action state
   */
  const resetActionState = useCallback(() => {
    setActionType('');
    setSelectedTarget('');
    setSubmitted(false);
    setSelectedAbility(null);
  }, []);

  return {
    // State
    actionType,
    selectedTarget,
    submitted,
    selectedAbility,
    unlocked,
    alivePlayers,
    
    // Setters
    setActionType,
    setSelectedTarget,
    setSubmitted,
    setSelectedAbility,
    
    // Computed
    isCurrentSelectionValid,
    
    // Actions
    resetActionState,
  };
};