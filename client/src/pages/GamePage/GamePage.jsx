/**
 * @fileoverview Refactored GamePage component using custom hooks for better separation of concerns
 */
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import { useAppContext } from '@contexts/AppContext';
import GameDashboard from '@components/game/GameDashboard';
import PlayerColumn from './components/PlayerColumn';
import ActionColumn from './components/ActionColumn';
import HistoryColumn from './components/HistoryColumn';
import MobileNavigation from './components/MobileNavigation';
import { MobileActionWizard } from './components/MobileActionWizard';
import AdaptabilityModal from '@components/modals/AdaptabilityModal';
import ReconnectionToggle from '../../components/ui/ReconnectionToggle';
import reconnectionStorage from '../../utils/reconnectionStorage';
import BattleResultsModal from '@components/modals/BattleResultsModal';
import DamageEffects from '@components/game/DamageEffects/DamageEffects';

// Import custom hooks
import {
  useActionState,
  useRacialAbilities,
  useModalState,
  useMobileState,
  useGameEvents,
  useCharacterUtils
} from './hooks';

import './GamePage.css';

/**
 * GamePage component handles the main game UI and orchestrates game flow
 * Refactored with custom hooks for better maintainability
 */
const GamePage = ({
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
  const [phase, setPhase] = useState('action');
  const [readyClicked, setReadyClicked] = useState(false);

  // Custom hooks for state management
  const actionState = useActionState(me, players, monster);
  const racialAbilities = useRacialAbilities();
  const modalState = useModalState();
  const mobileState = useMobileState(me);
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
    resetActionState: actionState.resetActionState,
    resetMobileWizard: mobileState.resetMobileWizard,
    showAdaptabilityModalWithAbilities: modalState.showAdaptabilityModalWithAbilities,
    setPhase,
    setReadyClicked,
    
    // State
    isMobile: mobileState.isMobile,
    showMobileActionWizard: mobileState.showMobileActionWizard,
    me,
  });

  /**
   * Handle action submission with enhanced validation
   */
  const handleSubmitAction = () => {
    // Validate selection
    if (!actionState.isCurrentSelectionValid()) {
      const issues = [];
      if (!actionState.actionType) issues.push('No ability selected');
      if (!actionState.selectedTarget) issues.push('No target selected');
      
      const selectedAbility = actionState.unlocked.find((a) => a.type === actionState.actionType);
      if (!selectedAbility) issues.push('Selected ability not available');
      
      console.error('Action validation failed:', issues);
      return;
    }

    const ability = actionState.unlocked.find((a) => a.type === actionState.actionType);
    const isBloodRageApplied = racialAbilities.bloodRageActive && ability?.category === 'Attack';
    const isKeenSensesApplied = racialAbilities.keenSensesActive && ability?.category === 'Attack';

    console.log('Submitting action:', {
      type: actionState.actionType,
      target: actionState.selectedTarget,
      bloodRage: isBloodRageApplied,
      keenSenses: isKeenSensesApplied,
    });

    // Check if racial abilities are involved - if so, emit directly to socket
    if (isBloodRageApplied || isKeenSensesApplied) {
      socket.emit('performAction', {
        gameCode,
        actionType: actionState.actionType,
        targetId: actionState.selectedTarget,
        bloodRageActive: isBloodRageApplied,
        keenSensesActive: isKeenSensesApplied,
      });

      // Also emit racial ability usage events
      if (isBloodRageApplied) {
        socket.emit('useRacialAbility', {
          gameCode,
          targetId: me.id,
          abilityType: 'bloodRage',
        });
        racialAbilities.setBloodRageActive(false);
      }

      if (isKeenSensesApplied) {
        socket.emit('useRacialAbility', {
          gameCode,
          targetId: actionState.selectedTarget,
          abilityType: 'keenSenses',
        });
        racialAbilities.setKeenSensesActive(false);
      }

      racialAbilities.setRacialSelected(false);
    } else {
      // No racial abilities - use the standard submission
      onSubmitAction(actionState.actionType, actionState.selectedTarget);
    }

    actionState.setSubmitted(true);
  };

  /**
   * Handle ready button click
   */
  const handleReadyClick = () => {
    setReadyClicked(true);
  };

  /**
   * Handle ability replacement from Adaptability modal
   */
  const handleReplaceAbility = (oldAbilityType, newAbilityType, level) => {
    console.log('Replacing ability:', { oldAbilityType, newAbilityType, level });
    
    socket?.emit('replaceAbility', {
      gameCode,
      oldAbilityType,
      newAbilityType,
      level: parseInt(level),
    });

    modalState.closeAdaptabilityModal();
  };

  /**
   * Handle mobile wizard ability selection
   */
  const handleWizardAbilitySelect = (ability) => {
    console.log('Mobile wizard ability selected:', ability);
    actionState.setSelectedAbility(ability);
    actionState.setActionType(ability.type);
    
    // Move to target selection step
    mobileState.setMobileActionStep(2);
  };

  return (
    <div className="game-page" data-theme={theme.name}>
      <div className="game-header">
        <GameDashboard 
          round={lastEvent.turn}
          alivePlayers={characterUtils.alivePlayers}
          monster={monster} 
        />
      </div>

      {/* Mobile Player Header - Always visible on mobile (except when action wizard is open) */}
      {mobileState.isMobile && !mobileState.showMobileActionWizard && (
        <div className="mobile-player-header">
          <div className="mobile-character-info">
            <h2 className={`mobile-player-name ${me?.isWarlock ? 'warlock-text' : ''}`}>
              {characterUtils.getCharacterTitle()}
            </h2>
            <div className="mobile-health-bar">
              <div className="mobile-health-fill" style={{ width: `${characterUtils.healthPercent}%` }}></div>
              <span className="mobile-health-text">{me?.hp || 0}/{me?.maxHp || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Character Title Section - Hidden on mobile */}
      {!mobileState.isMobile && (
        <div className="character-title-section">
          <h1 className={`game-title ${me?.isWarlock ? 'warlock-text' : ''}`}>
            {characterUtils.getCharacterTitle()}
          </h1>
          <div className="desktop-health-info">
            <div className="health-bar">
              <div className="health-fill" style={{ width: `${characterUtils.healthPercent}%` }}></div>
            </div>
            <span className="health-text">{me?.hp || 0}/{me?.maxHp || 0}</span>
          </div>
        </div>
      )}

      {/* Responsive Layout */}
      <div className={mobileState.isMobile ? 'mobile-layout' : 'desktop-layout'}>
        {/* Desktop Grid Columns (direct children for CSS Grid) */}
          <PlayerColumn
            isVisible={(!mobileState.isMobile || mobileState.activeTab === 'players') && !mobileState.showMobileActionWizard}
            players={players}
            me={me}
            alivePlayers={characterUtils.alivePlayers}
            selectedTarget={actionState.selectedTarget}
            onTargetSelect={actionState.setSelectedTarget}
            isMobile={mobileState.isMobile}
          />

          <ActionColumn
            isVisible={(!mobileState.isMobile || mobileState.activeTab === 'action') && !mobileState.showMobileActionWizard}
            phase={phase}
            players={players}
            monster={monster}
            me={me}
            lastEvent={lastEvent}
            unlocked={actionState.unlocked}
            alivePlayers={characterUtils.alivePlayers}
            actionType={actionState.actionType}
            selectedTarget={actionState.selectedTarget}
            submitted={actionState.submitted}
            bloodRageActive={racialAbilities.bloodRageActive}
            keenSensesActive={racialAbilities.keenSensesActive}
            racialSelected={racialAbilities.racialSelected}
            readyClicked={readyClicked}
            onSetActionType={actionState.setActionType}
            onSelectTarget={actionState.setSelectedTarget}
            onSubmitAction={handleSubmitAction}
            onRacialAbilityUse={racialAbilities.handleRacialAbilityUse}
            onReadyClick={handleReadyClick}
          />

          <HistoryColumn 
            isVisible={(!mobileState.isMobile || mobileState.activeTab === 'history') && !mobileState.showMobileActionWizard}
            eventsLog={eventsLog}
            lastEvent={lastEvent}
            currentPlayerId={me?.id || ''}
            players={players}
            showAllEvents={false}
          />

        {/* Mobile Navigation - Only show on mobile */}
        {mobileState.isMobile && (
          <MobileNavigation
            activeTab={mobileState.activeTab}
            onTabChange={mobileState.handleTabChange}
            isAlive={me?.isAlive}
            isStunned={me?.statusEffects?.stunned}
          />
        )}
      </div>

      {/* Mobile Action Wizard */}
      {mobileState.showMobileActionWizard && (
        <MobileActionWizard
          isOpen={mobileState.showMobileActionWizard}
          currentStep={mobileState.mobileActionStep}
          onStepChange={mobileState.setMobileActionStep}
          onClose={mobileState.handleCloseWizard}
          me={me}
          monster={monster}
          lastEvent={lastEvent}
          unlocked={actionState.unlocked}
          racialAbility={me?.race?.ability}
          alivePlayers={characterUtils.alivePlayers}
          selectedAbility={actionState.selectedAbility}
          selectedTarget={actionState.selectedTarget}
          bloodRageActive={racialAbilities.bloodRageActive}
          keenSensesActive={racialAbilities.keenSensesActive}
          racialSelected={racialAbilities.racialSelected}
          onAbilitySelect={handleWizardAbilitySelect}
          onTargetSelect={actionState.setSelectedTarget}
          onRacialAbilityUse={racialAbilities.handleRacialAbilityUse}
          onSubmitAction={handleSubmitAction}
        />
      )}

      {/* Adaptability Modal */}
      {modalState.showAdaptabilityModal && (
        <AdaptabilityModal
          isOpen={modalState.showAdaptabilityModal}
          onClose={modalState.closeAdaptabilityModal}
          socket={socket}
          gameCode={gameCode}
          className={me?.class || ''}
          abilities={modalState.initialModalAbilities}
          onReplaceAbility={handleReplaceAbility}
        />
      )}

      {/* Battle Results Modal */}
      {modalState.showBattleResults && (
        <BattleResultsModal
          isOpen={modalState.showBattleResults}
          onClose={modalState.closeBattleResultsModal}
          battleData={modalState.battleResultsData}
        />
      )}

      {/* Damage Effects */}
      <DamageEffects 
        key={`damage-${lastEvent.turn}`}
        eventsLog={eventsLog}
        playerName={me?.name}
        playerId={me?.id}
      />

      {/* Reconnection Toggle */}
      <ReconnectionToggle
        gameCode={gameCode}
        playerName={me?.name}
        isConnected={socket?.connected}
        onReconnectionChange={(enabled) => {
          if (enabled) {
            reconnectionStorage.setReconnectionData(gameCode, me?.name);
          } else {
            reconnectionStorage.clearReconnectionData();
          }
        }}
      />
    </div>
  );
};

GamePage.propTypes = {
  socket: PropTypes.object,
  gameCode: PropTypes.string.isRequired,
  players: PropTypes.array.isRequired,
  me: PropTypes.object,
  monster: PropTypes.object,
  eventsLog: PropTypes.array.isRequired,
  onSubmitAction: PropTypes.func.isRequired,
};

export default GamePage;