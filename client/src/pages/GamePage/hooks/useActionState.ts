/**
 * @fileoverview Custom hook for managing action selection state
 */
import { useState, useCallback, useMemo } from 'react';
import { Player, Monster, Ability } from '@/types/game';

interface ActionState {
  // State
  actionType: string;
  selectedTarget: string;
  submitted: boolean;
  selectedAbility: Ability | null;
  unlocked: Ability[];
  alivePlayers: Player[];
  
  // Setters
  setActionType: (type: string) => void;
  setSelectedTarget: (target: string) => void;
  setSubmitted: (submitted: boolean) => void;
  setSelectedAbility: (ability: Ability | null) => void;
  
  // Computed
  isCurrentSelectionValid: () => boolean;
  
  // Actions
  resetActionState: () => void;
}

/**
 * Custom hook for managing action selection state
 */
export const useActionState = (
  me: Player | null, 
  players: Player[], 
  monster: Monster
): ActionState => {
  // Action selection state
  const [actionType, setActionType] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);

  // Derived values
  const unlocked = useMemo(() => (me as any)?.unlocked || [], [me]);
  const alivePlayers = useMemo(
    () => players.filter((p) => p['isAlive']),
    [players]
  );

  /**
   * Enhanced validation function to check if current selection is valid
   */
  const isCurrentSelectionValid = useCallback((): boolean => {
    if (!actionType || !selectedTarget) return false;

    // Check if selected ability exists and is unlocked
    const selectedAbility = unlocked.find(
      (ability: Ability) => ability.type === actionType
    );
    if (!selectedAbility) return false;

    // Check if ability is on cooldown
    const cooldown = me?.abilityCooldowns?.[selectedAbility.type] || 0;
    if (cooldown > 0) return false;

    // Check if target is valid (alive player or monster)
    if (selectedTarget === '__monster__') {
      return monster && monster['hp'] > 0; // Monster must be alive
    }

    const targetPlayer = alivePlayers.find((p) => p['id'] === selectedTarget);
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