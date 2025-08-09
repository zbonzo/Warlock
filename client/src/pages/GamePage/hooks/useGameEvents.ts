/**
 * @fileoverview Custom hook for handling game socket events
 */
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Player, Ability, GameEvent } from '@/types/game';
import { useAppContext } from '@contexts/AppContext';

interface GameEventsParams {
  // Callbacks
  showBattleResultsModal: (data: BattleResultsData) => void;
  updateBattleResultsData: (data: BattleResultsData) => void;
  resetActionState: () => void;
  resetMobileWizard: () => void;
  showAdaptabilityModalWithAbilities: (abilities: Ability[]) => void;
  setPhase: (phase: string) => void;
  setReadyClicked: (ready: boolean) => void;
  
  // State
  isMobile: boolean;
  showMobileActionWizard: boolean;
  me: Player | null;
}

interface LevelUpData {
  playerId: string;
  newLevel: number;
  abilities?: Ability[];
}

interface RoundResultData {
  events?: GameEvent[];
  eventsLog?: GameEvent[];
  round?: number;
  turn?: number;
  winner: string | null;
  players: Player[];
  levelUp?: LevelUpData;
}

interface TrophyData {
  playerId: string;
  trophyId: string;
  trophyName: string;
  playerName?: string;
  trophyDescription?: string;
}

interface GameStateUpdateData {
  players?: Player[];
  monster?: any;
  phase?: string;
  round?: number;
}

interface PhaseChangedData {
  phase: string;
  timestamp?: string;
}

interface BattleResultsData {
  events: GameEvent[];
  round: number;
  levelUp: LevelUpData | null;
  winner: string | null;
  players: Player[];
  trophyAward?: TrophyData;
}

interface GameEventsReturn {
  lastValidActionRef: React.MutableRefObject<any>;
  submissionCheckInterval: React.MutableRefObject<NodeJS.Timeout | null>;
}

/**
 * Custom hook for managing game socket events
 */
export const useGameEvents = (
  socket: Socket | null, 
  params: GameEventsParams
): GameEventsReturn => {
  const { addEventLog } = useAppContext();
  const {
    // Callbacks
    showBattleResultsModal,
    updateBattleResultsData,
    resetActionState,
    resetMobileWizard,
    showAdaptabilityModalWithAbilities,
    setPhase,
    setReadyClicked,
    
    // State
    isMobile,
    showMobileActionWizard,
    me,
  } = params;

  // Refs for validation and intervals
  const lastValidActionRef = useRef<any>(null);
  const submissionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Store valid action when it's confirmed
  useEffect(() => {
    // This will be managed by the action state hook instead
  }, []);

  // Handle player disconnections
  useEffect(() => {
    if (!socket) return;

    const handlePlayerDisconnected = (data: { playerId: string; playerName: string; message?: string }) => {
      /* eslint-disable-next-line no-console */
      console.log('Player disconnected:', data);
      /* eslint-disable-next-line no-console */
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
    if ((me as any)?.submissionStatus) {
      const { hasSubmitted, isValid, validationState } = (me as any).submissionStatus;

      /* eslint-disable-next-line no-console */
      console.log('🔍 Submission status changed:', {
        hasSubmitted,
        isValid,
        validationState,
        meId: me?.['id'],
        meName: me?.['name'],
        trigger: 'submissionStatus effect'
      });

      // If player has submitted and it's valid, show submitted state
      if (hasSubmitted && isValid && validationState === 'valid') {
        /* eslint-disable-next-line no-console */
        console.log('🔍 Valid submission detected - keeping current state');
        // This will be handled by the action state hook
      }
      // If player submitted but it's now invalid, reset to selection
      else if (hasSubmitted && (!isValid || validationState === 'invalid')) {
        /* eslint-disable-next-line no-console */
        console.log('⚠️ Action became invalid, resetting to selection...', {
          hasSubmitted,
          isValid,
          validationState
        });
        resetActionState();
        setPhase('action');

        // Try to restore last valid action if recent
        if (lastValidActionRef.current) {
          const timeSinceValid = Date.now() - lastValidActionRef.current.timestamp;
          if (timeSinceValid < 30000) {
            /* eslint-disable-next-line no-console */
            console.log('🔍 Recent valid action found, could restore');
            // Will be handled by action state hook
          }
        }
      }
      // If player hasn't submitted, ensure we're in selection mode
      else if (!hasSubmitted) {
        /* eslint-disable-next-line no-console */
        console.log('🔍 No submission yet - selection mode');
        // Will be handled by action state hook
      }
    }
  }, [me, resetActionState, setPhase]);

  // Handle round results
  useEffect(() => {
    if (!socket) return;

    const handleRoundResult = (data: RoundResultData) => {
      /* eslint-disable-next-line no-console */
      console.log('Received round results:', data);

      // Show the battle results modal
      showBattleResultsModal({
        events: data.eventsLog || data.events || [],
        round: data.turn || data.round || 1,
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

  // Handle trophy awards
  useEffect(() => {
    if (!socket) return;

    const handleTrophyAwarded = (trophyData: TrophyData) => {
      /* eslint-disable-next-line no-console */
      console.log('🏆 CLIENT RECEIVED trophyAwarded event:', trophyData);
      /* eslint-disable-next-line no-console */
      console.log('🏆 Trophy data structure:', {
        playerName: trophyData?.playerName,
        trophyName: trophyData?.trophyName,
        trophyDescription: trophyData?.trophyDescription,
        dataType: typeof trophyData,
        keys: Object.keys(trophyData || {})
      });
      
      // Update the battle results modal with trophy data
      updateBattleResultsData({ 
        events: [], 
        round: 0, 
        levelUp: null, 
        winner: null, 
        players: [], 
        trophyAward: trophyData 
      });
      /* eslint-disable-next-line no-console */
      console.log('🏆 Updated battle results with trophy data');
    };

    socket.on('trophyAwarded', handleTrophyAwarded);

    return () => {
      socket.off('trophyAwarded', handleTrophyAwarded);
    };
  }, [socket, updateBattleResultsData]);

  // Handle game resume and state updates
  useEffect(() => {
    if (!socket) return;

    const handleResume = () => {
      /* eslint-disable-next-line no-console */
      console.log('Game resumed, switching to action phase');
      setPhase('action');
      resetActionState();
      setReadyClicked(false);
      
      // Reset mobile wizard to ability selection
      if (isMobile && showMobileActionWizard) {
        resetMobileWizard();
      }
    };

    const handleGameStateUpdate = (data: GameStateUpdateData) => {
      /* eslint-disable-next-line no-console */
      console.log('Game state update received:', data);
      
      // Find the current player in the updated game state
      const currentPlayerId = me?.['id'];
      const updatedPlayerData = data.players?.find((p: Player) => p['id'] === currentPlayerId);
      const hasSubmittedAction = updatedPlayerData?.['hasSubmittedAction'] || false;
      
      /* eslint-disable-next-line no-console */
      console.log('🔍 Game state update - player status:', {
        playerId: currentPlayerId,
        hasSubmittedAction,
        localSubmitted: me?.['hasSubmittedAction'],
        phase: data.phase
      });
      
      if (data.phase) {
        setPhase(data.phase);
      }
      
      // Only reset if we're in action phase AND the player hasn't submitted yet
      if (data.phase === 'action' && !hasSubmittedAction) {
        /* eslint-disable-next-line no-console */
        console.log('🔍 Resetting action state - player has not submitted');
        resetActionState();
        setReadyClicked(false);
        
        // Reset mobile wizard to ability selection
        if (isMobile && showMobileActionWizard) {
          resetMobileWizard();
        }
      } else if (data.phase === 'action' && hasSubmittedAction) {
        /* eslint-disable-next-line no-console */
        console.log('🔍 Keeping current state - player already submitted');
      }
    };

    const handlePhaseChanged = (data: PhaseChangedData) => {
      /* eslint-disable-next-line no-console */
      console.log('Phase changed:', data);
      if (data.phase) {
        setPhase(data.phase);
      }
    };

    const handleRoundResults = (data: any) => {
      /* eslint-disable-next-line no-console */
      console.log('🎯 [CLIENT] Round results received:', data);
      /* eslint-disable-next-line no-console */
      console.log('🎯 [CLIENT] Round results structure:', {
        hasResults: !!data.results,
        hasLog: !!data.results?.log,
        logLength: data.results?.log?.length || 0,
        hasPlayers: !!data.results?.players,
        playersCount: data.results?.players?.length || 0,
        roundSummary: data.results?.roundSummary,
        success: data.results?.success,
        playerActions: data.results?.playerActions,
        monsterAction: data.results?.monsterAction
      });
      
      if (data.results && data.results.log) {
        /* eslint-disable-next-line no-console */
        console.log('🎯 [CLIENT] Showing battle results modal with events:', data.results.log);
        
        // Extract round number from server data - try different sources
        const roundNumber = data.results.round || data.round || 1;
        /* eslint-disable-next-line no-console */
        console.log('🎯 [CLIENT] Round number extracted:', { 
          fromResults: data.results.round, 
          fromData: data.round, 
          final: roundNumber 
        });
        
        // Add to events log for history
        addEventLog({ 
          turn: roundNumber, 
          events: data.results.log 
        });
        /* eslint-disable-next-line no-console */
        console.log('🎯 [CLIENT] Added events to log for round:', roundNumber);
        
        // Show battle results
        showBattleResultsModal({
          events: data.results.log,
          round: roundNumber,
          levelUp: data.results.levelUp || null,
          winner: data.results.winner || null,
          players: data.results.players || [],
        });
      } else {
        /* eslint-disable-next-line no-console */
        console.warn('⚠️ [CLIENT] No log data in round results!');
      }
      
      // Reset states for new round (if no winner)
      if (!data.results?.winner) {
        /* eslint-disable-next-line no-console */
        console.log('🎯 [CLIENT] No winner, resetting for next round');
        resetActionState();
        setReadyClicked(false);
        
        // Reset mobile wizard to ability selection
        if (isMobile && showMobileActionWizard) {
          resetMobileWizard();
        }
      }
      
      if (data.newPhase) {
        /* eslint-disable-next-line no-console */
        console.log('🎯 [CLIENT] Setting phase to:', data.newPhase);
        setPhase(data.newPhase);
      }
    };

    socket.on('resumeGame', handleResume);
    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('phase:changed', handlePhaseChanged);
    socket.on('round:results', handleRoundResults);

    return () => {
      socket.off('resumeGame', handleResume);
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('phase:changed', handlePhaseChanged);
      socket.off('round:results', handleRoundResults);
    };
  }, [socket, setPhase, resetActionState, setReadyClicked, isMobile, showMobileActionWizard, resetMobileWizard, showBattleResultsModal, me, addEventLog]);

  // Handle adaptability modal events
  useEffect(() => {
    if (!socket) return;

    const handleAdaptabilityChoose = (data: any) => {
      /* eslint-disable-next-line no-console */
      console.log('Received adaptabilityChooseAbility event in GamePage:', data);

      if (data?.abilities) {
        let abilitiesToShow: Ability[] = [];
        
        if (Array.isArray(data.abilities)) {
          abilitiesToShow = data.abilities;
        } else if (typeof data.abilities === 'object') {
          // Handle object format
          const numericKeys = Object.keys(data.abilities).filter(
            (key) => !isNaN(parseInt(key))
          );
          const allAbilities: Ability[] = [];
          
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
  const getFallbackAbilities = (): Ability[] => [
    { type: 'strike', name: 'Strike', category: 'Attack' } as Ability,
    { type: 'fireball', name: 'Fireball', category: 'Attack' } as Ability,
    { type: 'heal', name: 'Heal', category: 'Heal' } as Ability,
    { type: 'shield', name: 'Shield', category: 'Defense' } as Ability,
  ];

  return {
    lastValidActionRef,
    submissionCheckInterval,
  };
};