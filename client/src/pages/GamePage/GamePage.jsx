/**
 * @fileoverview Main game interface component that orchestrates game phases,
 * manages shared state, and handles responsive layout.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@contexts/ThemeContext';
import GameDashboard from '@components/game/GameDashboard';
import PlayerColumn from './components/PlayerColumn';
import ActionColumn from './components/ActionColumn';
import HistoryColumn from './components/HistoryColumn';
import MobileNavigation from './components/MobileNavigation';
import AdaptabilityModal from '@components/modals/AdaptabilityModal';
import useMediaQuery from '@hooks/useMediaQuery';
import './GamePage.css';

/**
 * GamePage component handles the main game UI and orchestrates game flow
 * 
 * @param {Object} props - Component props
 * @param {Object} props.socket - Socket.io connection
 * @param {string} props.gameCode - Game room code
 * @param {Array} props.players - List of all players
 * @param {Object} props.me - Current player data
 * @param {Object} props.monster - Monster data
 * @param {Array} props.eventsLog - Game event history
 * @param {Function} props.onSubmitAction - Callback for submitting actions
 * @returns {React.ReactElement} The rendered component
 */
const GamePage = ({
  socket,
  gameCode,
  players,
  me,
  monster,
  eventsLog,
  onSubmitAction
}) => {
  const theme = useTheme();
  
  // Game state
  const [phase, setPhase] = useState('action'); // 'action' or 'results'
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
  
  // Mobile navigation state
  const [activeTab, setActiveTab] = useState('action');
  
  // Refs
  const prevLogLen = useRef(eventsLog.length);
  
  // Media query for responsive layout
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Derived values
  const unlocked = useMemo(() => me?.unlocked || [], [me?.unlocked]);
  const alivePlayers = useMemo(() => 
    players.filter(p => p.isAlive),
    [players]
  );
  const lastEvent = useMemo(() => 
    eventsLog[eventsLog.length - 1] || { turn: 1, events: [] },
    [eventsLog]
  );

  // Set default ability when unlocked changes
  useEffect(() => {
    if (unlocked.length && !actionType) {
      setActionType(unlocked[0].type);
    }
  }, [unlocked, actionType]);

  // Validate target when ability or players change
  useEffect(() => {
    if (selectedTarget === '__monster__') return;
    if (!alivePlayers.find(p => p.id === selectedTarget)) {
      setSelectedTarget('');
    }
  }, [actionType, alivePlayers, selectedTarget]);

  // Switch to results phase when new event log arrives
  useEffect(() => {
    if (eventsLog.length > prevLogLen.current) {
      prevLogLen.current = eventsLog.length;
      setPhase('results');
      setReadyClicked(false);
    }
  }, [eventsLog]);

  // Resume game on host signal
  useEffect(() => {
    if (!socket) return;
    
    const handleResume = () => {
      setPhase('action');
      setSubmitted(false);
      setSelectedTarget('');
    };
    
    socket.on('resumeGame', handleResume);
    return () => socket.off('resumeGame', handleResume);
  }, [socket]);
  
  // Handle adaptability modal events
 useEffect(() => {
  if (!socket) return;
  
const handleAdaptabilityChoose = (data) => {
  console.log("Received adaptabilityChooseAbility event in GamePage:", data);
  
  // Process abilities data regardless of format
  if (data) {
    if (data.abilities) {
      // Could be an array or an object with level keys
      if (Array.isArray(data.abilities)) {
        // Already an array, use directly
        setInitialModalAbilities(data.abilities);
      } else if (typeof data.abilities === 'object') {
        // It's an object, might be keyed by level
        try {
          // Check if it has numeric keys (levels)
          const numericKeys = Object.keys(data.abilities)
            .filter(key => !isNaN(parseInt(key)));
          
          if (numericKeys.length > 0) {
            // Extract abilities from each level and flatten
            const allAbilities = [];
            numericKeys.forEach(level => {
              const levelAbilities = data.abilities[level];
              if (Array.isArray(levelAbilities) && levelAbilities.length > 0) {
                allAbilities.push(...levelAbilities);
              }
            });
            
            if (allAbilities.length > 0) {
              setInitialModalAbilities(allAbilities);
            } else {
              // No abilities found in level keys, use fallback
              console.warn("No abilities found in levels, using fallback");
              setInitialModalAbilities([
                { type: 'attack', name: 'Slash', category: 'Attack', unlockAt: 1 },
                { type: 'shieldWall', name: 'Shield Wall', category: 'Defense', unlockAt: 2 },
                { type: 'bandage', name: 'Bandage', category: 'Heal', unlockAt: 3 },
                { type: 'battleCry', name: 'Battle Cry', category: 'Special', unlockAt: 4 }
              ]);
            }
          } else {
            // No level keys, pass the object as is
            console.warn("No level keys found, using raw abilities object");
            setInitialModalAbilities([data.abilities]);
          }
        } catch (err) {
          console.error("Error processing abilities object:", err);
          // Fallback to default abilities
          setInitialModalAbilities([
            { type: 'attack', name: 'Slash', category: 'Attack', unlockAt: 1 },
            { type: 'shieldWall', name: 'Shield Wall', category: 'Defense', unlockAt: 2 },
            { type: 'bandage', name: 'Bandage', category: 'Heal', unlockAt: 3 },
            { type: 'battleCry', name: 'Battle Cry', category: 'Special', unlockAt: 4 }
          ]);
        }
      } else {
        console.error("Abilities is neither an array nor an object:", data.abilities);
        // Fallback to default abilities
        setInitialModalAbilities([
          { type: 'attack', name: 'Slash', category: 'Attack', unlockAt: 1 },
          { type: 'shieldWall', name: 'Shield Wall', category: 'Defense', unlockAt: 2 },
          { type: 'bandage', name: 'Bandage', category: 'Heal', unlockAt: 3 },
          { type: 'battleCry', name: 'Battle Cry', category: 'Special', unlockAt: 4 }
        ]);
      }
    } else {
      console.error("Data does not contain abilities property:", data);
      // Fallback to default abilities
      setInitialModalAbilities([
        { type: 'attack', name: 'Slash', category: 'Attack', unlockAt: 1 },
        { type: 'shieldWall', name: 'Shield Wall', category: 'Defense', unlockAt: 2 },
        { type: 'bandage', name: 'Bandage', category: 'Heal', unlockAt: 3 },
        { type: 'battleCry', name: 'Battle Cry', category: 'Special', unlockAt: 4 }
      ]);
    }
  } else {
    console.error("Received null or undefined data");
    // Fallback to default abilities
    setInitialModalAbilities([
      { type: 'attack', name: 'Slash', category: 'Attack', unlockAt: 1 },
      { type: 'shieldWall', name: 'Shield Wall', category: 'Defense', unlockAt: 2 },
      { type: 'bandage', name: 'Bandage', category: 'Heal', unlockAt: 3 },
      { type: 'battleCry', name: 'Battle Cry', category: 'Special', unlockAt: 4 }
    ]);
  }
  
  setShowAdaptabilityModal(true);
};
  
  socket.on('adaptabilityChooseAbility', handleAdaptabilityChoose);
  
  return () => {
    socket.off('adaptabilityChooseAbility', handleAdaptabilityChoose);
  };
}, [socket, setInitialModalAbilities, setShowAdaptabilityModal]);
  // Handle server unresponsiveness during results phase
  useEffect(() => {
    // Skip if conditions aren't met
    if (phase !== 'results' || !socket || !me || !readyClicked) return;
    
    const totalPlayers = alivePlayers.length;
    const readyPlayers = alivePlayers.filter(p => p.isReady).length;
    
    // If majority is ready, force next round after delay
    if (readyPlayers > totalPlayers / 2) {
      const timer = setTimeout(() => {
        if (phase === 'results') {
          // Try server action first
          socket.emit('playerNextReady', { gameCode });
          
          // Then fall back to local state change
          setPhase('action');
          setSubmitted(false);
          setSelectedTarget('');
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [readyClicked, phase, alivePlayers, socket, gameCode, me]);

  /**
   * Handle submitting an action
   */
  const handleSubmitAction = () => {
    if (!actionType || !selectedTarget) return;
  
    // Check for racial ability modifications
    const ability = unlocked.find(a => a.type === actionType);
    const isBloodRageApplied = bloodRageActive && ability?.category === 'Attack';
    const isKeenSensesApplied = keenSensesActive && ability?.category === 'Attack';
    
    if (isBloodRageApplied || isKeenSensesApplied) {
      // Send action with racial flags
      socket.emit('performAction', { 
        gameCode, 
        actionType, 
        targetId: selectedTarget,
        bloodRageActive: isBloodRageApplied,
        keenSensesActive: isKeenSensesApplied
      });
      
      // Mark appropriate racial ability as used
      if (isBloodRageApplied) {
        socket.emit('useRacialAbility', { 
          gameCode, 
          targetId: me.id,
          abilityType: 'bloodRage'
        });
        setBloodRageActive(false);
      }
      
      if (isKeenSensesApplied) {
        socket.emit('useRacialAbility', { 
          gameCode, 
          targetId: selectedTarget,
          abilityType: 'keenSenses'
        });
        setKeenSensesActive(false);
      }
      
      setRacialSelected(false);
    } else {
      // Normal action without racial modification
      onSubmitAction(actionType, selectedTarget);
    }
    
    setSubmitted(true);
  };

  /**
   * Handle racial ability use
   */
  const handleRacialAbilityUse = (abilityType) => {
    setRacialSelected(true);

    // Handle Human adaptability
    if (abilityType === 'adaptability' && me?.race === 'Human') {
      console.log("Human adaptability ability used");
      socket.emit('useRacialAbility', { 
        gameCode, 
        targetId: me.id,
        abilityType: 'adaptability'
      });
      
      // No need to immediately show the modal here.
      // The server will respond with 'adaptabilityChooseAbility' event
      // which will trigger the modal through the useEffect handler above
      return;
    }
    
    // Handle Orc blood rage
    if (abilityType === 'bloodRage') {
      setBloodRageActive(true);
      return;
    }
    
    // Handle Elf keen senses
    if (abilityType === 'keenSenses') {
      setKeenSensesActive(true);
      return;
    }

    // For other abilities
    let targetId = me.id; // Default to self
    
    // For abilities that need to target others
    if (['keenSenses'].includes(abilityType)) {
      if (!selectedTarget) {
        alert('Select a target first.');
        setRacialSelected(false);
        return;
      }
      targetId = selectedTarget;
    }
    
    // Send the racial ability action to the server
    socket.emit('useRacialAbility', { 
      gameCode, 
      targetId,
      abilityType 
    });
  };

  /**
   * Handle ready button click in results phase
   */
  const handleReadyClick = () => {
    socket.emit('playerNextReady', { gameCode });
    setReadyClicked(true);
  };

  /**
   * Handle replacing an ability with adaptability
   */
  const handleReplaceAbility = (oldAbilityType, newAbilityType, level) => {
    if (!socket) {
      console.error("Socket not connected");
      return;
    }
    
    console.log("Replacing ability:", oldAbilityType, "with", newAbilityType, "at level", level);
    
    socket.emit('adaptabilityReplaceAbility', {
      gameCode,
      oldAbilityType,
      newAbilityType,
      level
    });
    
    setShowAdaptabilityModal(false);
  };

  // Loading state
  if (!me) return (
    <div className="game-loading">
      <div className="loading-spinner"></div>
      <p>Loading game data...</p>
    </div>
  );

  return (
    <div className="game-container">
      <h1 className="game-title">Warlock</h1>
      
      <GameDashboard 
        round={lastEvent.turn} 
        alivePlayers={alivePlayers} 
        monster={monster} 
      />

      {/* Adaptability Modal */}
      {showAdaptabilityModal && (
        <AdaptabilityModal
          isOpen={showAdaptabilityModal}
          onClose={() => {
            setShowAdaptabilityModal(false);
            setInitialModalAbilities(null); // Clear data when modal closes
          }}
          socket={socket}
          gameCode={gameCode}
          className={me?.class || ''}
          initialAbilities={initialModalAbilities} // Pass the abilities data as a prop
        />
      )}
      
      {/* Responsive Layout */}
      <div className={isMobile ? "mobile-layout" : "desktop-layout"}>
        {isMobile && (
          <MobileNavigation 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
        )}
        
        <PlayerColumn 
          isVisible={!isMobile || activeTab === 'players'}
          me={me}
          players={players}
        />
        
        <ActionColumn 
          isVisible={!isMobile || activeTab === 'action'}
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
          
          // Action handlers
          onSetActionType={setActionType}
          onSelectTarget={setSelectedTarget}
          onRacialAbilityUse={handleRacialAbilityUse}
          onSubmitAction={handleSubmitAction}
          onReadyClick={handleReadyClick}
        />
        
        <HistoryColumn 
          isVisible={!isMobile || activeTab === 'history'}
          eventsLog={eventsLog}
        />
      </div>
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
    nextDamage: PropTypes.number.isRequired
  }).isRequired,
  eventsLog: PropTypes.array.isRequired,
  onSubmitAction: PropTypes.func.isRequired
};

export default GamePage;