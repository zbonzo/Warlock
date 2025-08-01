/**
 * @fileoverview Refactored GamePage component using custom hooks for better separation of concerns
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@contexts/ThemeContext';
import { useAppContext } from '@contexts/AppContext';
import PlayerColumn from './components/PlayerColumn';
import HistoryColumn from './components/HistoryColumn';
import MobileNavigation from './components/MobileNavigation';
import { ActionWizard } from './components/ActionWizard';
import { GameStateDrawer } from './components/GameStateDrawer';
import AdaptabilityModal from '@components/modals/AdaptabilityModal';
import ReconnectionToggle from '../../components/ui/ReconnectionToggle';
import reconnectionStorage from '../../utils/reconnectionStorage';
import BattleResultsModal from '@components/modals/BattleResultsModal';
import DamageEffects from '@components/game/DamageEffects/DamageEffects';
import GameHeader from '@components/game/GameHeader';
import { Socket } from 'socket.io-client';

// Import types
import { Player, Monster, GameEvent } from '@/types/game';

// Import custom hooks
import {
  useRacialAbilities,
  useModalState,
  useActionWizard,
  useGameEvents,
  useCharacterUtils
} from './hooks';

import './GamePage.css';

interface GamePageProps {
  socket: Socket | null;
  gameCode: string;
  players: Player[];
  me: Player | null;
  monster: Monster | null;
  eventsLog: Array<{ turn: number; events: GameEvent[] }>;
  onSubmitAction: (abilityType: string, targetId: string) => void;
}

/**
 * GamePage component handles the main game UI and orchestrates game flow
 * Refactored with custom hooks for better maintainability
 */
const GamePage: React.FC<GamePageProps> = ({
  socket,
  gameCode,
  players,
  me,
  monster,
  eventsLog,
  onSubmitAction,
}) => {
  const theme = useTheme();
  const { addEventLog } = useAppContext();

  // Game state
  const [phase, setPhase] = useState<'action' | 'results'>('action');
  const [readyClicked, setReadyClicked] = useState<boolean>(false);

  // Custom hooks for state management
  const racialAbilities = useRacialAbilities();
  const modalState = useModalState();
  const actionWizard = useActionWizard(me);
  const characterUtils = useCharacterUtils(me, players);

  // Derived values
  const lastEvent = useMemo(
    () => eventsLog[eventsLog.length - 1] || { turn: 1, events: [] },
    [eventsLog]
  );

  // Game events handler
  useGameEvents(socket, {
    // Callbacks
    showBattleResultsModal: modalState.showBattleResultsModal,
    updateBattleResultsData: modalState.updateBattleResultsData,
    resetActionState: actionWizard.resetWizard,
    resetMobileWizard: actionWizard.resetWizard,
    showAdaptabilityModalWithAbilities: modalState.showAdaptabilityModalWithAbilities,
    setPhase: (phase: string) => setPhase(phase as 'action' | 'results'),
    setReadyClicked,
    
    // State
    isMobile: actionWizard.isMobile,
    showMobileActionWizard: actionWizard.isWizardOpen,
    me,
  });

  /**
   * Handle action submission with enhanced validation
   */
  const handleSubmitAction = (): void => {
    // Validate selection
    if (!actionWizard.selectedAbility || !actionWizard.selectedTarget) {
      console.error('Action validation failed: Missing ability or target');
      return;
    }

    const ability = actionWizard.selectedAbility;
    const isBloodRageApplied = racialAbilities.bloodRageActive && ability?.category === 'Attack';
    const isKeenSensesApplied = racialAbilities.keenSensesActive && ability?.category === 'Attack';

    console.log('Submitting action:', {
      type: ability.type,
      target: actionWizard.selectedTarget,
      bloodRage: isBloodRageApplied,
      keenSenses: isKeenSensesApplied,
    });

    // Check if racial abilities are involved - if so, emit directly to socket
    if (isBloodRageApplied || isKeenSensesApplied) {
      socket?.emit('performAction', {
        gameCode,
        actionType: ability.type,
        targetId: actionWizard.selectedTarget,
        bloodRageActive: isBloodRageApplied,
        keenSensesActive: isKeenSensesApplied,
      });

      // Also emit racial ability usage events
      if (isBloodRageApplied) {
        socket?.emit('useRacialAbility', {
          gameCode,
          targetId: me?.['id'],
          abilityType: 'bloodRage',
        });
        racialAbilities.setBloodRageActive(false);
      }

      if (isKeenSensesApplied) {
        socket?.emit('useRacialAbility', {
          gameCode,
          targetId: actionWizard.selectedTarget,
          abilityType: 'keenSenses',
        });
        racialAbilities.setKeenSensesActive(false);
      }

      racialAbilities.setRacialSelected(false);
    } else {
      // No racial abilities - use the standard submission
      onSubmitAction(ability.type, actionWizard.selectedTarget);
    }

    actionWizard.setSubmitted(true);
  };

  /**
   * Handle ready button click
   */
  const handleReadyClick = (): void => {
    setReadyClicked(true);
  };

  /**
   * Handle ability replacement from Adaptability modal
   */
  const handleReplaceAbility = (oldAbilityType: string, newAbilityType: string, level: string): void => {
    console.log('Replacing ability:', { oldAbilityType, newAbilityType, level });
    
    socket?.emit('replaceAbility', {
      gameCode,
      oldAbilityType,
      newAbilityType,
      level: parseInt(level),
    });

    modalState.closeAdaptabilityModal();
  };

  // Early return if essential data is missing
  if (!me) {
    return <div className="game-page-loading">Loading game data...</div>;
  }

  return (
    <div className="game-page" data-theme={theme.currentTheme}>

      {/* Unified Game Header - Always visible */}
      <div className={actionWizard.isMobile ? "mobile-header-container" : "desktop-header-container"}>
        <GameHeader
          player={me}
          round={lastEvent.turn}
          players={players}
          isMobile={actionWizard.isMobile}
        />
      </div>

      {/* Responsive Layout */}
      <div className={actionWizard.isMobile ? 'mobile-layout' : 'desktop-layout'}>
        {/* Desktop Grid Columns (direct children for CSS Grid) */}
          <PlayerColumn
            isVisible={!actionWizard.isMobile || (actionWizard.activeTab === 'players' && !actionWizard.isWizardOpen)}
            players={players}
            me={me}
            alivePlayers={characterUtils.alivePlayers}
            selectedTarget={actionWizard.selectedTarget}
            onTargetSelect={actionWizard.handleTargetSelect}
            isMobile={actionWizard.isMobile}
          />

          {/* Unified ActionWizard - replaces both ActionColumn and MobileActionWizard */}
          <div className="action-column-container">
            {/* Show wizard for both desktop and mobile when appropriate */}
            <ActionWizard
              isOpen={actionWizard.isWizardOpen}
              isMobile={actionWizard.isMobile}
              me={me}
              monster={monster}
              lastEvent={lastEvent}
              unlocked={me?.unlocked || []}
              alivePlayers={characterUtils.alivePlayers}
              selectedAbility={actionWizard.selectedAbility}
              selectedTarget={actionWizard.selectedTarget}
              submitted={actionWizard.submitted}
              bloodRageActive={racialAbilities.bloodRageActive}
              keenSensesActive={racialAbilities.keenSensesActive}
              racialSelected={racialAbilities.racialSelected}
              onAbilitySelect={actionWizard.handleAbilitySelect}
              onTargetSelect={actionWizard.handleTargetSelect}
              onRacialAbilityUse={racialAbilities.handleRacialAbilityUse}
              onSubmitAction={handleSubmitAction}
              onClose={actionWizard.handleCloseWizard}
              initialStep={actionWizard.currentStep}
              onStepChange={actionWizard.handleStepChange}
            />
            
            {/* Results phase for desktop when not in wizard */}
            {!actionWizard.isMobile && phase === 'results' && (
              <div className="results-phase">
                <h2 className="section-title">Round {lastEvent.turn} Results</h2>
                
                {/* Ready button */}
                {me['isAlive'] && (
                  <button
                    className={`button ready-button ${readyClicked ? 'clicked' : ''}`}
                    onClick={handleReadyClick}
                    disabled={readyClicked}
                  >
                    {readyClicked ? (
                      <>
                        <span className="ready-text">Waiting for other players...</span>
                        <span className="ready-spinner"></span>
                      </>
                    ) : (
                      <>Ready for Next Round</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          <HistoryColumn 
            isVisible={!actionWizard.isMobile || (actionWizard.activeTab === 'history' && !actionWizard.isWizardOpen)}
            eventsLog={eventsLog}
            lastEvent={lastEvent}
            currentPlayerId={me?.['id'] || ''}
            players={players}
            showAllEvents={false}
          />

        {/* Mobile Navigation - Only show on mobile */}
        {actionWizard.isMobile && (
          <MobileNavigation
            activeTab={actionWizard.activeTab}
            onTabChange={actionWizard.handleTabChange}
            isAlive={me?.['isAlive']}
            isStunned={me?.statusEffects?.stunned}
          />
        )}
      </div>

      {/* GameState Drawer - Mobile only */}
      {actionWizard.showGameState && (
        <GameStateDrawer
          isOpen={actionWizard.showGameState}
          onClose={actionWizard.handleCloseGameState}
          onBackToActions={actionWizard.handleBackToActions}
          // Player column props
          players={players}
          me={me}
          alivePlayers={characterUtils.alivePlayers}
          selectedTarget={actionWizard.selectedTarget}
          onTargetSelect={actionWizard.handleTargetSelect}
          // History column props
          eventsLog={eventsLog}
          lastEvent={lastEvent}
          currentPlayerId={me?.['id'] || ''}
        />
      )}

      {/* Adaptability Modal */}
      {modalState.showAdaptabilityModal && (
        <AdaptabilityModal
          isOpen={modalState.showAdaptabilityModal}
          onClose={modalState.closeAdaptabilityModal}
          socket={socket!}
          gameCode={gameCode}
          className={me?.class as any || ''}
          initialAbilities={modalState.initialModalAbilities as any || undefined}
        />
      )}

      {/* Battle Results Modal */}
      {modalState.showBattleResults && modalState.battleResultsData && (
        <BattleResultsModal
          isOpen={modalState.showBattleResults}
          onClose={modalState.closeBattleResultsModal}
          events={modalState.battleResultsData.events || []}
          round={modalState.battleResultsData.round || 1}
          currentPlayerId={me?.['id']}
          players={players}
          levelUp={modalState.battleResultsData.levelUp}
          winner={modalState.battleResultsData.winner || undefined}
          trophyAward={modalState.battleResultsData.trophyAward}
        />
      )}

      {/* Damage Effects */}
      <DamageEffects 
        key={`damage-${lastEvent.turn}`}
        eventsLog={eventsLog.map(log => ({ ...log, round: log.turn })) as any}
        playerName={me?.['name']}
        playerId={me?.['id']}
      />

      {/* Reconnection Toggle */}
      <ReconnectionToggle />
    </div>
  );
};

export default GamePage;