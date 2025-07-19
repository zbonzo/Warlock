Current Mobile Interface

Single step: Players see both ability selection AND target selection on the same screen
Users scroll through abilities and targets simultaneously
Can be overwhelming on small screens with limited space

Proposed Two-Step Mobile Interface
Step 1: "Choose Ability"

Focus: Pure ability selection screen
Shows player info at top (Round, Name, Level, HP)
Displays racial ability (if available) prominently
Lists class abilities organized by level (Lvl 1, Lvl 2, etc.)
Clean, focused interface with just ability cards
Action: Select which ability to use

Step 2: "Choose Target"

Focus: Pure target selection screen
Same player info header for consistency
Shows Monster as primary target (with health bar, next attack info)
Lists all alive players as potential targets
Each player shows their current HP status
Distinguishes between "Ready" and "Not Ready" players
Actions: Select target + option to "Change Attack" (go back to step 1)

Benefits of This Approach

Better Mobile UX: Each step has a single, clear purpose
Less Cognitive Load: Users focus on one decision at a time
Cleaner Layout: More space for each element on small screens
Progressive Disclosure: Information revealed when needed
Easy Navigation: Clear forward/back flow between steps

This would replace the current mobile action tab with a wizard-style flow that guides users through ability selection first, then target selection, making the mobile experience much more intuitive and less cluttered.

Technical Specification: Two-Step Mobile Action Interface
Overview
Transform the current single-screen mobile action interface into a two-step wizard that separates ability selection from target selection for better mobile UX.
Current Architecture Analysis
Current State Management (GamePage.jsx)

// Current mobile state
const [activeTab, setActiveTab] = useState('action'); // 'action', 'players', 'history'
const [actionType, setActionType] = useState('');
const [selectedTarget, setSelectedTarget] = useState('');

Current Mobile Flow

User taps "Actions" tab
ActionColumn renders with both abilities and targets visible
User selects ability and target on same screen
User submits action

New Architecture Requirements
1. Enhanced State Management
Add to GamePage.jsx:

// NEW: Action wizard state for mobile
const [mobileActionStep, setMobileActionStep] = useState(1); // 1 = abilities, 2 = targets
const [mobileSelectedAbility, setMobileSelectedAbility] = useState(null); // Store full ability object
const [showMobileActionWizard, setShowMobileActionWizard] = useState(false);

// Modified: Update activeTab handling
const [activeTab, setActiveTab] = useState('action'); // Keep existing, but 'action' now triggers wizard on mobile

2. New Component Structure
Create: src/pages/GamePage/components/MobileActionWizard/

MobileActionWizard/
├── MobileActionWizard.jsx      // Main wizard container
├── MobileActionWizard.css      // Wizard-specific styles
├── AbilitySelectionStep.jsx    // Step 1: Choose ability
├── AbilitySelectionStep.css    
├── TargetSelectionStep.jsx     // Step 2: Choose target  
├── TargetSelectionStep.css
├── MobilePlayerHeader.jsx      // Reusable player info header
├── MobilePlayerHeader.css
└── index.js                    // Export barrel

3. Component Specifications
3.1 MobileActionWizard.jsx (Main Container)
Purpose: Orchestrates the two-step flow and manages step transitions
Props Interface:

{
  isOpen: boolean,                    // Whether wizard is active
  onClose: () => void,               // Close wizard callback
  currentStep: number,               // 1 or 2
  onStepChange: (step: number) => void,
  
  // Player data
  me: Object,                        // Current player
  monster: Object,                   // Monster data
  lastEvent: Object,                 // Current round info
  
  // Abilities
  unlocked: Array,                   // Available abilities
  racialAbility: Object,             // Racial ability if any
  
  // Current selections
  selectedAbility: Object,           // Currently selected ability
  selectedTarget: string,            // Currently selected target ID
  
  // Players
  alivePlayers: Array,              // Available targets
  
  // Status
  bloodRageActive: boolean,
  keenSensesActive: boolean,
  racialSelected: boolean,
  
  // Callbacks
  onAbilitySelect: (ability: Object) => void,
  onTargetSelect: (targetId: string) => void,
  onRacialAbilityUse: (type: string) => void,
  onSubmitAction: () => void,
}

Structure:

const MobileActionWizard = ({ isOpen, currentStep, onStepChange, ...props }) => {
  if (!isOpen) return null;
  
  return (
    <div className="mobile-action-wizard-overlay">
      <div className="mobile-action-wizard">
        {/* Progress indicator */}
        <div className="wizard-progress">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
          <div className="progress-line"></div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
        </div>
        
        {/* Step content */}
        {currentStep === 1 && (
          <AbilitySelectionStep 
            {...props}
            onNext={(ability) => {
              props.onAbilitySelect(ability);
              onStepChange(2);
            }}
            onClose={props.onClose}
          />
        )}
        
        {currentStep === 2 && (
          <TargetSelectionStep
            {...props}
            onBack={() => onStepChange(1)}
            onSubmit={props.onSubmitAction}
            onClose={props.onClose}
          />
        )}
      </div>
    </div>
  );
};

3.2 MobilePlayerHeader.jsx (Reusable Header)
Purpose: Consistent player info display across both steps
Structure:

const MobilePlayerHeader = ({ me, monster, round, currentStep, totalSteps }) => {
  const healthPercent = (me.hp / me.maxHp) * 100;
  
  return (
    <div className="mobile-player-header">
      {/* Step indicator */}
      <div className="step-indicator">
        Step {currentStep} of {totalSteps}
      </div>
      
      {/* Round info */}
      <div className="round-info">
        Round {round}
      </div>
      
      {/* Player info */}
      <div className="player-info">
        <h3 className="player-name">{me.name}</h3>
        <div className="player-details">
          {me.race} {me.class} • Level {me.level || 1}
        </div>
      </div>
      
      {/* Health bar */}
      <div className="health-section">
        <div className="health-text">{me.hp}/{me.maxHp} HP</div>
        <div className="health-bar">
          <div 
            className={`health-fill ${getHealthClass(healthPercent)}`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>
      
      {/* Status effects if any */}
      {me.statusEffects && Object.keys(me.statusEffects).length > 0 && (
        <div className="status-effects">
          {/* Render status effect icons */}
        </div>
      )}
    </div>
  );
};

3.3 AbilitySelectionStep.jsx (Step 1)
Purpose: Pure ability selection interface
Key Features:

Racial ability prominently displayed at top
Class abilities grouped by level
Clear ability descriptions with cooldown info
Large, touch-friendly cards

Structure:

const AbilitySelectionStep = ({
  me, unlocked, racialAbility, lastEvent, 
  selectedAbility, bloodRageActive, keenSensesActive,
  onAbilitySelect, onRacialAbilityUse, onNext, onClose
}) => {
  
  const handleAbilitySelect = (ability) => {
    setSelectedAbility(ability);
  };
  
  const handleContinue = () => {
    if (!selectedAbility) {
      alert('Please select an ability first');
      return;
    }
    onNext(selectedAbility);
  };
  
  return (
    <div className="ability-selection-step">
      <MobilePlayerHeader 
        me={me} 
        round={lastEvent.turn}
        currentStep={1}
        totalSteps={2}
      />
      
      <div className="step-content">
        <h2 className="step-title">Choose Your Ability</h2>
        
        {/* Racial ability section */}
        {racialAbility && (
          <div className="racial-section">
            <h3>Racial Ability</h3>
            <RacialAbilityCard
              ability={racialAbility}
              usesLeft={me.racialUsesLeft}
              cooldown={me.racialCooldown}
              onUse={() => onRacialAbilityUse(racialAbility.type)}
            />
          </div>
        )}
        
        {/* Class abilities section */}
        <div className="class-abilities-section">
          <h3>Class Abilities</h3>
          
          {/* Group abilities by level */}
          {groupAbilitiesByLevel(unlocked).map(([level, abilities]) => (
            <div key={level} className="ability-level-group">
              <h4>Level {level}</h4>
              <div className="abilities-grid">
                {abilities.map(ability => (
                  <AbilityCard
                    key={ability.type}
                    ability={ability}
                    selected={selectedAbility?.type === ability.type}
                    onSelect={() => handleAbilitySelect(ability)}
                    abilityCooldown={me.abilityCooldowns?.[ability.type] || 0}
                    player={me}
                    isMobile={true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Enhancement indicators */}
        {(bloodRageActive || keenSensesActive) && (
          <div className="enhancements-active">
            {/* Show active enhancements */}
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <div className="step-navigation">
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button 
          className="btn-primary"
          onClick={handleContinue}
          disabled={!selectedAbility}
        >
          Choose Target →
        </button>
      </div>
    </div>
  );
};

3.4 TargetSelectionStep.jsx (Step 2)
Purpose: Pure target selection interface
Key Features:

Monster prominently displayed first
Player targets with health status
Clear indication of ready/not ready players
Ability to change attack (go back)

Structure:

const TargetSelectionStep = ({
  me, monster, alivePlayers, selectedAbility, selectedTarget,
  keenSensesActive, onTargetSelect, onBack, onSubmit, onClose
}) => {
  
  const handleSubmit = () => {
    if (!selectedTarget) {
      alert('Please select a target first');
      return;
    }
    onSubmit();
  };
  
  return (
    <div className="target-selection-step">
      <MobilePlayerHeader 
        me={me} 
        round={lastEvent.turn}
        currentStep={2}
        totalSteps={2}
      />
      
      <div className="step-content">
        <h2 className="step-title">Choose Your Target</h2>
        
        {/* Selected ability reminder */}
        <div className="selected-ability-reminder">
          <div className="ability-icon">{getAbilityIcon(selectedAbility)}</div>
          <div className="ability-info">
            <strong>{selectedAbility.name}</strong>
            <div className="ability-category">{selectedAbility.category}</div>
          </div>
          <button className="change-ability-btn" onClick={onBack}>
            Change
          </button>
        </div>
        
        {/* Target options */}
        <div className="targets-section">
          <h3>Available Targets</h3>
          
          {/* Monster target */}
          {!keenSensesActive && (
            <div className="monster-target-section">
              <h4>Monster</h4>
              <div 
                className={`target-card monster-target ${selectedTarget === '__monster__' ? 'selected' : ''}`}
                onClick={() => onTargetSelect('__monster__')}
              >
                <MonsterAvatar monster={monster} />
                <div className="target-info">
                  <div className="target-name">Monster</div>
                  <div className="target-health">
                    HP: {monster.hp}/{monster.maxHp}
                  </div>
                  <div className="monster-threat">
                    Next attack: {monster.nextDamage} damage
                  </div>
                </div>
                {selectedTarget === '__monster__' && (
                  <div className="selection-indicator">✓</div>
                )}
              </div>
            </div>
          )}
          
          {/* Player targets */}
          <div className="player-targets-section">
            <h4>Players</h4>
            <div className="player-targets-grid">
              {alivePlayers.map(player => (
                <div
                  key={player.id}
                  className={`target-card player-target ${selectedTarget === player.id ? 'selected' : ''} ${player.id === me.id ? 'self' : ''}`}
                  onClick={() => onTargetSelect(player.id)}
                >
                  <CustomAvatar player={player} />
                  <div className="target-info">
                    <div className="target-name">
                      {player.name}
                      {player.id === me.id && ' (You)'}
                    </div>
                    <div className="target-health">
                      HP: {player.hp}/{player.maxHp}
                    </div>
                    <div className="target-status">
                      {player.hasSubmittedAction ? (
                        <span className="ready">Ready ✓</span>
                      ) : (
                        <span className="not-ready">Not Ready</span>
                      )}
                    </div>
                  </div>
                  {selectedTarget === player.id && (
                    <div className="selection-indicator">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="step-navigation">
        <button className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button 
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!selectedTarget}
        >
          Submit Action
        </button>
      </div>
    </div>
  );
};

4. Integration Changes
4.1 Update GamePage.jsx
Modified State Management:

// Add new state
const [mobileActionStep, setMobileActionStep] = useState(1);
const [showMobileActionWizard, setShowMobileActionWizard] = useState(false);

// Modified mobile tab handling
const handleTabChange = (tab) => {
  if (tab === 'action' && isMobile) {
    // Open wizard instead of showing action column
    setShowMobileActionWizard(true);
    setMobileActionStep(1);
  } else {
    setActiveTab(tab);
  }
};

// Add wizard close handler
const handleCloseWizard = () => {
  setShowMobileActionWizard(false);
  setMobileActionStep(1);
  setActionType('');
  setSelectedTarget('');
};

Render Changes:

return (
  <div className="game-container">
    {/* Existing mobile header */}
    {isMobile && <MobilePlayerHeader />}
    
    {/* Existing dashboard */}
    <GameDashboard />
    
    {/* Mobile Action Wizard - NEW */}
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
        alivePlayers={alivePlayers}
        selectedAbility={selectedAbility}
        selectedTarget={selectedTarget}
        // ... other props
        onAbilitySelect={(ability) => {
          setActionType(ability.type);
          setSelectedAbility(ability);
        }}
        onTargetSelect={setSelectedTarget}
        onSubmitAction={handleSubmitAction}
        onRacialAbilityUse={handleRacialAbilityUse}
      />
    )}
    
    {/* Modified layout - hide action column on mobile when wizard is open */}
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {isMobile && !showMobileActionWizard && (
        <MobileNavigation 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
      )}
      
      <PlayerColumn
        isVisible={(!isMobile || activeTab === 'players') && !showMobileActionWizard}
        // ... props
      />
      
      <ActionColumn
        isVisible={(!isMobile || activeTab === 'action') && !showMobileActionWizard}
        // ... props
      />
      
      <HistoryColumn
        isVisible={(!isMobile || activeTab === 'history') && !showMobileActionWizard}
        // ... props
      />
    </div>
  </div>
);

4.2 Update MobileNavigation.jsx
Handle Action Tab Differently:

const handleTabClick = (tab) => {
  if (tab === 'action') {
    // Let parent handle this (will open wizard on mobile)
    onTabChange(tab);
  } else {
    onTabChange(tab);
  }
};

5. Styling Specifications
5.1 MobileActionWizard.css
Full-screen overlay approach:

.mobile-action-wizard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.mobile-action-wizard {
  background-color: var(--color-surface);
  width: 100%;
  max-height: 90vh;
  border-radius: 12px 12px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUpFromBottom 0.3s ease-out;
}

.wizard-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: var(--color-neutral);
  border-bottom: 1px solid var(--color-border);
}

.step {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--color-text-muted);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.step.active {
  background-color: var(--color-primary);
}

.progress-line {
  width: 40px;
  height: 2px;
  background-color: var(--color-border);
  margin: 0 8px;
}

@keyframes slideUpFromBottom {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

5.2 Step-Specific Styles
Large touch targets, clear hierarchy:

.step-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.step-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.target-card {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 80px; /* Touch-friendly */
}

.target-card.selected {
  border-color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb), 0.1);
}

.step-navigation {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.step-navigation button {
  flex: 1;
  padding: 16px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
}

6. Utility Functions
Helper functions to support the new interface:

// Group abilities by unlock level
const groupAbilitiesByLevel = (abilities) => {
  const grouped = abilities.reduce((acc, ability) => {
    const level = ability.unlockAt || 1;
    if (!acc[level]) acc[level] = [];
    acc[level].push(ability);
    return acc;
  }, {});
  
  return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
};

// Get ability icon
const getAbilityIcon = (ability) => {
  // Implementation from existing AbilityCard
};

// Get health class for color coding
const getHealthClass = (healthPercent) => {
  if (healthPercent < 30) return 'health-low';
  if (healthPercent < 70) return 'health-medium';
  return 'health-high';
};

7. Testing Considerations
Key test scenarios:

Wizard opens when tapping "Actions" on mobile
Step 1 shows all abilities with proper status
Step 2 shows all valid targets
Back navigation preserves selections
Submit only works with valid selections
Wizard closes properly on cancel/submit
Desktop interface remains unchanged
Racial abilities work in wizard
Cooldowns display correctly
Enhancement indicators work

8. Backwards Compatibility
Ensure no breaking changes:

Desktop interface completely unaffected
All existing functionality preserved
Same API contracts maintained
Fallback to current interface if wizard fails

This specification provides a complete technical blueprint for implementing the two-step mobile action interface while maintaining all existing functionality and ensuring a smooth, intuitive mobile experience.