/**
 * @fileoverview Custom hook for handling game socket events
 */
import { useEffect, useRef } from 'react';

/**
 * Custom hook for managing game socket events
 * @param {Object} socket - Socket.io instance
 * @param {Object} params - Parameters object containing callbacks and state
 * @returns {Object} Event handling utilities
 */
export const useGameEvents = (socket, {
  // Callbacks
  showBattleResultsModal,
  resetActionState,
  resetMobileWizard,
  showAdaptabilityModalWithAbilities,
  setPhase,
  setReadyClicked,
  
  // State
  isMobile,
  showMobileActionWizard,
  me,
}) => {
  // Refs for validation and intervals
  const lastValidActionRef = useRef(null);
  const submissionCheckInterval = useRef(null);

  // Store valid action when it's confirmed
  useEffect(() => {
    // This will be managed by the action state hook instead
  }, []);

  // Handle player disconnections
  useEffect(() => {
    if (!socket) return;

    const handlePlayerDisconnected = (data) => {
      console.log('Player disconnected:', data);
      console.log(`${data.playerName} has left the game: ${data.message}`);
    };

    socket.on('playerDisconnected', handlePlayerDisconnected);

    return () => {
      socket.off('playerDisconnected', handlePlayerDisconnected);
    };
  }, [socket]);

  // Handle submission state management
  useEffect(() => {
    // Update submitted state based on player's actual submission status
    if (me?.submissionStatus) {
      const { hasSubmitted, isValid, validationState } = me.submissionStatus;

      // If player has submitted and it's valid, show submitted state
      if (hasSubmitted && isValid && validationState === 'valid') {
        // This will be handled by the action state hook
      }
      // If player submitted but it's now invalid, reset to selection
      else if (hasSubmitted && (!isValid || validationState === 'invalid')) {
        console.log('Action became invalid, resetting to selection...');
        resetActionState();
        setPhase('action');

        // Try to restore last valid action if recent
        if (lastValidActionRef.current) {
          const timeSinceValid = Date.now() - lastValidActionRef.current.timestamp;
          if (timeSinceValid < 30000) {
            // Will be handled by action state hook
          }
        }
      }
      // If player hasn't submitted, ensure we're in selection mode
      else if (!hasSubmitted) {
        // Will be handled by action state hook
      }
    }
  }, [me?.submissionStatus, resetActionState, setPhase]);

  // Handle round results
  useEffect(() => {
    if (!socket) return;

    const handleRoundResult = (data) => {
      console.log('Received round results:', data);

      // Show the battle results modal
      showBattleResultsModal({
        events: data.eventsLog || [],
        round: data.turn || 1,
        levelUp: data.levelUp || null,
        winner: data.winner || null,
        players: data.players || [],
      });

      // Reset states for new round (if no winner)
      if (!data.winner) {
        resetActionState();
        setReadyClicked(false);
        
        // Reset mobile wizard to ability selection
        if (isMobile && showMobileActionWizard) {
          resetMobileWizard();
        }
      }
    };

    socket.on('roundResult', handleRoundResult);

    return () => {
      socket.off('roundResult', handleRoundResult);
    };
  }, [socket, showBattleResultsModal, resetActionState, setReadyClicked, isMobile, showMobileActionWizard, resetMobileWizard]);

  // Handle game resume and state updates
  useEffect(() => {
    if (!socket) return;

    const handleResume = () => {
      console.log('Game resumed, switching to action phase');
      setPhase('action');
      resetActionState();
      setReadyClicked(false);
      
      // Reset mobile wizard to ability selection
      if (isMobile && showMobileActionWizard) {
        resetMobileWizard();
      }
    };

    const handleGameStateUpdate = (data) => {
      console.log('Game state update received:', data);
      if (data.phase) {
        setPhase(data.phase);
      }
      if (data.phase === 'action') {
        resetActionState();
        setReadyClicked(false);
        
        // Reset mobile wizard to ability selection
        if (isMobile && showMobileActionWizard) {
          resetMobileWizard();
        }
      }
    };

    socket.on('resumeGame', handleResume);
    socket.on('gameStateUpdate', handleGameStateUpdate);

    return () => {
      socket.off('resumeGame', handleResume);
      socket.off('gameStateUpdate', handleGameStateUpdate);
    };
  }, [socket, setPhase, resetActionState, setReadyClicked, isMobile, showMobileActionWizard, resetMobileWizard]);

  // Handle adaptability modal events
  useEffect(() => {
    if (!socket) return;

    const handleAdaptabilityChoose = (data) => {
      console.log('Received adaptabilityChooseAbility event in GamePage:', data);

      if (data?.abilities) {
        let abilitiesToShow = [];
        
        if (Array.isArray(data.abilities)) {
          abilitiesToShow = data.abilities;
        } else if (typeof data.abilities === 'object') {
          // Handle object format
          const numericKeys = Object.keys(data.abilities).filter(
            (key) => !isNaN(parseInt(key))
          );
          const allAbilities = [];
          
          numericKeys.forEach((level) => {
            const levelAbilities = data.abilities[level];
            if (Array.isArray(levelAbilities)) {
              allAbilities.push(...levelAbilities);
            }
          });
          
          abilitiesToShow = allAbilities;
        }

        // Fallback abilities if none found
        if (abilitiesToShow.length === 0) {
          abilitiesToShow = getFallbackAbilities();
        }

        showAdaptabilityModalWithAbilities(abilitiesToShow);
      }
    };

    socket.on('adaptabilityChooseAbility', handleAdaptabilityChoose);

    return () => {
      socket.off('adaptabilityChooseAbility', handleAdaptabilityChoose);
    };
  }, [socket, showAdaptabilityModalWithAbilities]);

  // Helper function for fallback abilities
  const getFallbackAbilities = () => [
    { type: 'strike', name: 'Strike', level: 1 },
    { type: 'fireball', name: 'Fireball', level: 1 },
    { type: 'heal', name: 'Heal', level: 1 },
    { type: 'shield', name: 'Shield', level: 1 },
  ];

  return {
    lastValidActionRef,
    submissionCheckInterval,
  };
};