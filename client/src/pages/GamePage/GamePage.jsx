/**
 * @fileoverview Enhanced GamePage component with improved action validation and state management
 */
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
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
import useMediaQuery from '@hooks/useMediaQuery';
import './GamePage.css';
import DamageEffects from '@components/game/DamageEffects/DamageEffects';
/**
 * GamePage component handles the main game UI and orchestrates game flow
 * Enhanced with better action validation and submission tracking
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

  // Action selection state
  const [actionType, setActionType] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Racial ability state
  const [bloodRageActive, setBloodRageActive] = useState(false);
  const [keenSensesActive, setKeenSensesActive] = useState(false);
  const [racialSelected, setRacialSelected] = useState(false);

  // Modal state
  const [showAdaptabilityModal, setShowAdaptabilityModal] = useState(false);
  const [initialModalAbilities, setInitialModalAbilities] = useState(null);
  const [showBattleResults, setShowBattleResults] = useState(false);
  const [battleResultsData, setBattleResultsData] = useState(null);

  // Mobile navigation state
  const [activeTab, setActiveTab] = useState('action');

  // Mobile Action Wizard state
  const [mobileActionStep, setMobileActionStep] = useState(1);
  const [showMobileActionWizard, setShowMobileActionWizard] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState(null);

  // Refs
  const prevLogLen = useRef(eventsLog.length);
  const lastValidActionRef = useRef(null);
  const submissionCheckInterval = useRef(null);

  // Media query for responsive layout
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Effect to handle initial mobile state - if on mobile and action tab is active, open wizard
  useEffect(() => {
    if (isMobile && activeTab === 'action' && !showMobileActionWizard) {
      console.log('Initial mobile action tab detected, opening wizard');
      setShowMobileActionWizard(true);
      setMobileActionStep(1);
    }
    // Reset wizard if switching to desktop
    else if (!isMobile && showMobileActionWizard) {
      console.log('Switching to desktop, closing wizard');
      setShowMobileActionWizard(false);
    }
  }, [isMobile, activeTab, showMobileActionWizard]);

  // Derived values
  const unlocked = useMemo(() => me?.unlocked || [], [me?.unlocked]);
  const alivePlayers = useMemo(
    () => players.filter((p) => p.isAlive),
    [players]
  );
  const lastEvent = useMemo(
    () => eventsLog[eventsLog.length - 1] || { turn: 1, events: [] },
    [eventsLog]
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
   * Store valid action when it's confirmed
   */
  useEffect(() => {
    if (isCurrentSelectionValid()) {
      lastValidActionRef.current = {
        actionType,
        selectedTarget,
        timestamp: Date.now(),
      };
    }
  }, [actionType, selectedTarget, isCurrentSelectionValid]);

  useEffect(() => {
    if (!socket) return;

    const handlePlayerDisconnected = (data) => {
      console.log('Player disconnected:', data);

      // Just show a console log - the disconnect event will appear in the next round results
      console.log(`${data.playerName} has left the game: ${data.message}`);

      // Optional: Show a brief toast notification that someone left
      // This is immediate feedback while they wait for the round to process
    };

    socket.on('playerDisconnected', handlePlayerDisconnected);

    return () => {
      socket.off('playerDisconnected', handlePlayerDisconnected);
    };
  }, [socket]);

  /**
   * Enhanced submission state management with validation checking
   */
  useEffect(() => {
    // Update submitted state based on player's actual submission status
    if (me?.submissionStatus) {
      const { hasSubmitted, isValid, validationState } = me.submissionStatus;

      // If player has submitted and it's valid, show submitted state
      if (hasSubmitted && isValid && validationState === 'valid') {
        setSubmitted(true);
      }
      // If player submitted but it's now invalid, reset to selection
      else if (hasSubmitted && (!isValid || validationState === 'invalid')) {
        console.log('Action became invalid, resetting to selection...');
        setSubmitted(false);
        setPhase('action');

        // Try to restore last valid action if recent
        if (lastValidActionRef.current) {
          const timeSinceValid =
            Date.now() - lastValidActionRef.current.timestamp;
          if (timeSinceValid < 30000) {
            // 30 seconds
            setActionType(lastValidActionRef.current.actionType);
            setSelectedTarget(lastValidActionRef.current.selectedTarget);
          } else {
            // Clear selections if too old
            setActionType('');
            setSelectedTarget('');
          }
        }
      }
      // If player hasn't submitted, ensure we're in selection mode
      else if (!hasSubmitted) {
        setSubmitted(false);
        if (phase === 'results') {
          setPhase('action');
        }
      }
    }
  }, [me?.submissionStatus, phase]);

  /**
   * Periodic validation check for submitted actions
   */
  useEffect(() => {
    if (submitted && me?.submissionStatus?.hasSubmitted) {
      // Start checking submission status periodically
      submissionCheckInterval.current = setInterval(() => {
        if (me?.submissionStatus?.validationState === 'invalid') {
          console.log('Detected invalid action, resetting...');
          setSubmitted(false);
          setPhase('action');
        }
      }, 1000); // Check every second

      return () => {
        if (submissionCheckInterval.current) {
          clearInterval(submissionCheckInterval.current);
          submissionCheckInterval.current = null;
        }
      };
    }
  }, [submitted, me?.submissionStatus]);

  /**
   * Convert text to Zalgo text (corrupted appearance)
   */
  const toZalgo = (text) => {
    const zalgoAbove = [
      '\u030d',
      '\u030e',
      '\u0304',
      '\u0305',
      '\u033f',
      '\u0311',
      '\u0306',
      '\u0310',
      '\u0352',
      '\u0357',
      '\u0351',
      '\u0307',
      '\u0308',
      '\u030a',
      '\u0342',
      '\u0343',
      '\u0344',
      '\u034a',
      '\u034b',
      '\u034c',
      '\u0303',
      '\u0302',
      '\u030c',
      '\u0350',
      '\u0300',
      '\u0301',
      '\u030b',
      '\u030f',
      '\u0312',
      '\u0313',
      '\u0314',
      '\u033d',
      '\u0309',
    ];
    const zalgoBelow = [
      '\u0316',
      '\u0317',
      '\u0318',
      '\u0319',
      '\u031c',
      '\u031d',
      '\u031e',
      '\u031f',
      '\u0320',
      '\u0324',
      '\u0325',
      '\u0326',
      '\u0329',
      '\u032a',
      '\u032b',
      '\u032c',
      '\u032d',
      '\u032e',
      '\u032f',
      '\u0330',
      '\u0331',
      '\u0332',
      '\u0333',
      '\u0339',
      '\u033a',
      '\u033b',
      '\u033c',
    ];

    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += text[i];
      for (let j = 0; j < Math.floor(Math.random() * 2) + 1; j++) {
        const charType = Math.floor(Math.random() * 2);
        if (charType === 0 && zalgoAbove.length > 0) {
          result += zalgoAbove[Math.floor(Math.random() * zalgoAbove.length)];
        } else if (zalgoBelow.length > 0) {
          result += zalgoBelow[Math.floor(Math.random() * zalgoBelow.length)];
        }
      }
    }
    return result;
  };

  // Generate the character title
  const getCharacterTitle = () => {
    if (!me) return 'Loading...';
    const characterString = `${me.name} - ${me.race || 'Unknown'} ${me.class || 'Unknown'}`;
    return me.isWarlock ? toZalgo(characterString) : characterString;
  };

  // Set default ability when unlocked changes
  useEffect(() => {
    if (unlocked.length && !actionType) {
      setActionType(unlocked[0].type);
    }
  }, [unlocked, actionType]);

  // Validate target when ability or players change
  useEffect(() => {
    if (selectedTarget === '__monster__') return;
    if (!alivePlayers.find((p) => p.id === selectedTarget)) {
      setSelectedTarget('');
    }
  }, [actionType, alivePlayers, selectedTarget]);

  useEffect(() => {
    if (!socket) return;

    const handleRoundResult = (data) => {
      console.log('Received round results:', data);

      // Store the battle results data
      setBattleResultsData({
        events: data.eventsLog || [],
        round: data.turn || 1,
        levelUp: data.levelUp || null,
        winner: data.winner || null,
        players: data.players || [],
      });

      // Show the battle results modal
      setShowBattleResults(true);

      // Reset submission state for new round (if no winner)
      if (!data.winner) {
        setSubmitted(false);
        setSelectedTarget('');
        setActionType('');
        setReadyClicked(false);
      }
    };

    socket.on('roundResult', handleRoundResult);

    return () => {
      socket.off('roundResult', handleRoundResult);
    };
  }, [socket]);

  // Resume game on host signal
  useEffect(() => {
    if (!socket) return;

    const handleResume = () => {
      console.log('Game resumed, switching to action phase');
      setPhase('action');
      setSubmitted(false);
      setSelectedTarget('');
      setReadyClicked(false);
      // Reset mobile wizard to ability selection
      if (isMobile && showMobileActionWizard) {
        setMobileActionStep(1);
      }
    };

    const handleGameStateUpdate = (data) => {
      console.log('Game state update received:', data);
      if (data.phase) {
        setPhase(data.phase);
      }
      if (data.phase === 'action') {
        setSubmitted(false);
        setSelectedTarget('');
        setReadyClicked(false);
        // Reset mobile wizard to ability selection
        if (isMobile && showMobileActionWizard) {
          setMobileActionStep(1);
        }
      }
    };

    socket.on('resumeGame', handleResume);
    socket.on('gameStateUpdate', handleGameStateUpdate);

    return () => {
      socket.off('resumeGame', handleResume);
      socket.off('gameStateUpdate', handleGameStateUpdate);
    };
  }, [socket, isMobile, showMobileActionWizard]);

  // Handle adaptability modal events
  useEffect(() => {
    if (!socket) return;

    const handleAdaptabilityChoose = (data) => {
      console.log(
        'Received adaptabilityChooseAbility event in GamePage:',
        data
      );

      if (data?.abilities) {
        if (Array.isArray(data.abilities)) {
          setInitialModalAbilities(data.abilities);
        } else if (typeof data.abilities === 'object') {
          // Handle object format
          const numericKeys = Object.keys(data.abilities).filter(
            (key) => !isNaN(parseInt(key))
          );
          if (numericKeys.length > 0) {
            const allAbilities = [];
            numericKeys.forEach((level) => {
              const levelAbilities = data.abilities[level];
              if (Array.isArray(levelAbilities)) {
                allAbilities.push(...levelAbilities);
              }
            });
            setInitialModalAbilities(
              allAbilities.length > 0 ? allAbilities : getFallbackAbilities()
            );
          } else {
            setInitialModalAbilities([data.abilities]);
          }
        }
      } else {
        setInitialModalAbilities(getFallbackAbilities());
      }

      setShowAdaptabilityModal(true);
    };

    const getFallbackAbilities = () => [
      { type: 'attack', name: 'Slash', category: 'Attack', unlockAt: 1 },
      {
        type: 'shieldWall',
        name: 'Shield Wall',
        category: 'Defense',
        unlockAt: 2,
      },
      { type: 'bandage', name: 'Bandage', category: 'Heal', unlockAt: 3 },
      {
        type: 'battleCry',
        name: 'Battle Cry',
        category: 'Special',
        unlockAt: 4,
      },
    ];

    socket.on('adaptabilityChooseAbility', handleAdaptabilityChoose);
    return () =>
      socket.off('adaptabilityChooseAbility', handleAdaptabilityChoose);
  }, [socket]);

  // Enhanced server unresponsiveness handling
  useEffect(() => {
    if (phase !== 'results' || !socket || !me || !readyClicked) return;

    const totalPlayers = alivePlayers.length;
    const readyPlayers = alivePlayers.filter((p) => p.isReady).length;

    if (readyPlayers > totalPlayers / 2) {
      const timer = setTimeout(() => {
        if (phase === 'results') {
          socket.emit('playerNextReady', { gameCode });
          setPhase('action');
          setSubmitted(false);
          setSelectedTarget('');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [readyClicked, phase, alivePlayers, socket, gameCode, me]);

  // Save character session for reconnection
  useEffect(() => {
    if (me && socket?.id && gameCode) {
      reconnectionStorage.saveCharacterSession(me, socket.id, gameCode);
    }
  }, [me, socket?.id, gameCode]);

  /**
   * Enhanced submit action handler with validation
   */
  const handleSubmitAction = () => {
    if (!isCurrentSelectionValid()) {
      const issues = [];
      if (!actionType) issues.push('Select an ability');
      if (!selectedTarget) issues.push('Select a target');

      const selectedAbility = unlocked.find((a) => a.type === actionType);
      if (selectedAbility && me?.abilityCooldowns?.[selectedAbility.type] > 0) {
        issues.push(
          `${selectedAbility.name} is on cooldown (${me.abilityCooldowns[selectedAbility.type]} turns)`
        );
      }

      alert(`Cannot submit action:\n• ${issues.join('\n• ')}`);
      return;
    }

    // Check for racial ability modifications
    const ability = unlocked.find((a) => a.type === actionType);
    const isBloodRageApplied =
      bloodRageActive && ability?.category === 'Attack';
    const isKeenSensesApplied =
      keenSensesActive && ability?.category === 'Attack';

    if (isBloodRageApplied || isKeenSensesApplied) {
      socket.emit('performAction', {
        gameCode,
        actionType,
        targetId: selectedTarget,
        bloodRageActive: isBloodRageApplied,
        keenSensesActive: isKeenSensesApplied,
      });

      if (isBloodRageApplied) {
        socket.emit('useRacialAbility', {
          gameCode,
          targetId: me.id,
          abilityType: 'bloodRage',
        });
        setBloodRageActive(false);
      }

      if (isKeenSensesApplied) {
        socket.emit('useRacialAbility', {
          gameCode,
          targetId: selectedTarget,
          abilityType: 'keenSenses',
        });
        setKeenSensesActive(false);
      }

      setRacialSelected(false);
    } else {
      onSubmitAction(actionType, selectedTarget);
    }

    // Don't set submitted here - wait for server confirmation
    // setSubmitted(true);
  };

  /**
   * Handle racial ability use
   */
  const handleRacialAbilityUse = (abilityType) => {
    setRacialSelected(true);

    if (abilityType === 'adaptability' && me?.race === 'Artisan') {
      socket.emit('useRacialAbility', {
        gameCode,
        targetId: me.id,
        abilityType: 'adaptability',
      });
      return;
    }

    if (abilityType === 'bloodRage') {
      setBloodRageActive(true);
      return;
    }

    if (abilityType === 'keenSenses') {
      setKeenSensesActive(true);
      return;
    }

    let targetId = me.id;
    if (['keenSenses'].includes(abilityType)) {
      if (!selectedTarget) {
        alert('Select a target first.');
        setRacialSelected(false);
        return;
      }
      targetId = selectedTarget;
    }

    socket.emit('useRacialAbility', {
      gameCode,
      targetId,
      abilityType,
    });
  };

  /**
   * Handle ready button click in results phase
   */
  const handleReadyClick = () => {
    socket.emit('playerNextReady', { gameCode });
    setReadyClicked(true);
  };

  const handleCloseBattleResults = () => {
    setShowBattleResults(false);
    setBattleResultsData(null);

    // If there was a winner, you might want to redirect or show a different screen
    if (battleResultsData?.winner) {
      // Handle game end - maybe redirect to lobby or show final results
      console.log('Game ended, winner:', battleResultsData.winner);
    }
  };

  /**
   * Handle replacing an ability with adaptability
   */
  const handleReplaceAbility = (oldAbilityType, newAbilityType, level) => {
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    socket.emit('adaptabilityReplaceAbility', {
      gameCode,
      oldAbilityType,
      newAbilityType,
      level,
    });

    setShowAdaptabilityModal(false);
  };

  /**
   * Handle mobile tab changes - opens wizard for action tab
   */
  const handleTabChange = (tab) => {
    console.log('Tab change requested:', { tab, isMobile, currentActiveTab: activeTab });
    
    if (tab === 'action' && isMobile) {
      console.log('Opening mobile action wizard');
      // Open wizard instead of showing action column
      setShowMobileActionWizard(true);
      setMobileActionStep(1);
    } else {
      console.log('Setting active tab to:', tab);
      setActiveTab(tab);
    }
  };

  /**
   * Handle wizard close
   */
  const handleCloseWizard = () => {
    console.log('Closing wizard and switching to players tab');
    setShowMobileActionWizard(false);
    setMobileActionStep(1);
    setActionType('');
    setSelectedTarget('');
    setSelectedAbility(null);
    // Switch to a different tab when closing to avoid auto-reopening
    setActiveTab('players');
  };

  /**
   * Handle ability selection in wizard
   */
  const handleWizardAbilitySelect = (ability) => {
    setSelectedAbility(ability);
    setActionType(ability.type);
  };

  // Loading state
  if (!me) {
    return (
      <div className="game-loading">
        <div className="loading-spinner"></div>
        <p>Loading game data...</p>
      </div>
    );
  }

  const characterTitle = getCharacterTitle();
  const healthPercent = (me.hp / me.maxHp) * 100;

  return (
    <div className="game-container">
      {/* Mobile Player Header - Always visible on mobile */}
      {isMobile && (
        <div className="mobile-player-header">
          <div className="mobile-character-info">
            <h2
              className={`mobile-player-name ${me.isWarlock ? 'warlock-text' : ''}`}
            >
              {me.isWarlock ? toZalgo(me.name) : me.name}
            </h2>
            <div className="mobile-character-subtitle">
              {me.race} {me.class}
            </div>
          </div>
          <div className="mobile-health-section">
            <div className="mobile-health-text">
              {me.hp}/{me.maxHp} HP
            </div>
            <div className="mobile-health-bar">
              <div
                className={`mobile-health-fill health-${
                  healthPercent < 30
                    ? 'low'
                    : healthPercent < 70
                      ? 'medium'
                      : 'high'
                }`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Character Title Section - Hidden on mobile */}
      {!isMobile && (
        <div className="character-title-section">
          <h1 className={`game-title ${me.isWarlock ? 'warlock-text' : ''}`}>
            {characterTitle}
          </h1>

          <div className="title-health-container">
            <div className="title-health-text">
              HP: {me.hp}/{me.maxHp}
            </div>
            <div className="title-health-bar">
              <div
                className={`title-health-fill health-${
                  healthPercent < 30
                    ? 'low'
                    : healthPercent < 70
                      ? 'medium'
                      : 'high'
                }`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <GameDashboard
        round={lastEvent.turn}
        alivePlayers={alivePlayers}
        monster={monster}
      />

      {/* Reconnection Toggle - Development/Testing Tool */}
      <ReconnectionToggle />

      {/* Adaptability Modal */}
      {showAdaptabilityModal && (
        <AdaptabilityModal
          isOpen={showAdaptabilityModal}
          onClose={() => {
            setShowAdaptabilityModal(false);
            setInitialModalAbilities(null);
          }}
          socket={socket}
          gameCode={gameCode}
          className={me?.class || ''}
          initialAbilities={initialModalAbilities}
        />
      )}

      {/* Mobile Action Wizard */}
      {console.log('Wizard render check:', { isMobile, showMobileActionWizard, shouldRender: isMobile && showMobileActionWizard })}
      {isMobile && showMobileActionWizard && (
        <MobileActionWizard
          isOpen={showMobileActionWizard}
          currentStep={mobileActionStep}
          onStepChange={setMobileActionStep}
          onClose={handleCloseWizard}
          me={me}
          monster={monster}
          lastEvent={lastEvent}
          unlocked={unlocked}
          racialAbility={me?.racialAbility}
          alivePlayers={alivePlayers}
          selectedAbility={selectedAbility}
          selectedTarget={selectedTarget}
          bloodRageActive={bloodRageActive}
          keenSensesActive={keenSensesActive}
          racialSelected={racialSelected}
          onAbilitySelect={handleWizardAbilitySelect}
          onTargetSelect={setSelectedTarget}
          onRacialAbilityUse={handleRacialAbilityUse}
          onSubmitAction={handleSubmitAction}
        />
      )}

      {/* Responsive Layout */}
      <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
        {isMobile && !showMobileActionWizard && (
          <MobileNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        <PlayerColumn
          isVisible={(!isMobile || activeTab === 'players') && !showMobileActionWizard}
          me={me}
          players={players}
        />

        <ActionColumn
          isVisible={(!isMobile || activeTab === 'action') && !showMobileActionWizard}
          phase={phase}
          me={me}
          lastEvent={lastEvent}
          unlocked={unlocked}
          alivePlayers={alivePlayers}
          monster={monster}
          actionType={actionType}
          selectedTarget={selectedTarget}
          submitted={submitted}
          readyClicked={readyClicked}
          racialSelected={racialSelected}
          bloodRageActive={bloodRageActive}
          keenSensesActive={keenSensesActive}
          players={players}
          onSetActionType={setActionType}
          onSelectTarget={setSelectedTarget}
          onRacialAbilityUse={handleRacialAbilityUse}
          onSubmitAction={handleSubmitAction}
          onReadyClick={handleReadyClick}
        />
        {showBattleResults && battleResultsData && (
          <BattleResultsModal
            isOpen={showBattleResults}
            onClose={handleCloseBattleResults}
            events={battleResultsData.events}
            round={battleResultsData.round}
            currentPlayerId={me?.id || ''}
            players={battleResultsData.players}
            levelUp={battleResultsData.levelUp}
            winner={battleResultsData.winner}
          />
        )}

        <HistoryColumn
          isVisible={(!isMobile || activeTab === 'history') && !showMobileActionWizard}
          eventsLog={eventsLog}
          currentPlayerId={me?.id || ''}
          players={players}
          showAllEvents={false}
        />
      </div>
      <DamageEffects
        eventsLog={eventsLog}
        playerName={me?.name || ''}
        playerId={me?.id || ''}
      />
    </div>
  );
};

GamePage.propTypes = {
  socket: PropTypes.object.isRequired,
  gameCode: PropTypes.string.isRequired,
  players: PropTypes.array.isRequired,
  me: PropTypes.object,
  monster: PropTypes.shape({
    hp: PropTypes.number.isRequired,
    maxHp: PropTypes.number.isRequired,
    nextDamage: PropTypes.number.isRequired,
  }).isRequired,
  eventsLog: PropTypes.array.isRequired,
  onSubmitAction: PropTypes.func.isRequired,
};

export default GamePage;
