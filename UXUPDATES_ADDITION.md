# Addition to UXUPDATES.md - Show All Abilities with Lock State

## Updated AbilitySelectionStep.jsx Implementation

The ability selection step should show ALL 4 class abilities, not just unlocked ones. Locked abilities should be visually distinct:

```jsx
const AbilitySelectionStep = ({
  me, unlocked, racialAbility, lastEvent, 
  selectedAbility, bloodRageActive, keenSensesActive,
  onAbilitySelect, onRacialAbilityUse, onNext, onClose
}) => {
  
  // Get ALL abilities for the player's class, not just unlocked
  const allClassAbilities = config.classStats[me.class]?.abilities || [];
  
  const handleAbilitySelect = (ability) => {
    // Only allow selection of unlocked abilities
    if (isAbilityUnlocked(ability, unlocked)) {
      setSelectedAbility(ability);
    }
  };
  
  const isAbilityUnlocked = (ability, unlockedAbilities) => {
    return unlockedAbilities.some(u => u.type === ability.type);
  };
  
  const isAbilityOnCooldown = (ability) => {
    return me.abilityCooldowns?.[ability.type] > 0;
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
        
        {/* Racial ability section - unchanged */}
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
        
        {/* Class abilities section - UPDATED */}
        <div className="class-abilities-section">
          <h3>Class Abilities</h3>
          
          {/* Show ALL abilities grouped by level */}
          {groupAllAbilitiesByLevel(allClassAbilities).map(([level, abilities]) => (
            <div key={level} className="ability-level-group">
              <h4>Level {level}</h4>
              <div className="abilities-grid">
                {abilities.map(ability => {
                  const isUnlocked = isAbilityUnlocked(ability, unlocked);
                  const onCooldown = isUnlocked && isAbilityOnCooldown(ability);
                  const isSelectable = isUnlocked && !onCooldown;
                  
                  return (
                    <AbilityCard
                      key={ability.type}
                      ability={ability}
                      selected={selectedAbility?.type === ability.type}
                      onSelect={() => handleAbilitySelect(ability)}
                      locked={!isUnlocked}
                      cooldown={onCooldown ? me.abilityCooldowns[ability.type] : 0}
                      player={me}
                      isMobile={true}
                      isSelectable={isSelectable}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Enhancement indicators - unchanged */}
        {(bloodRageActive || keenSensesActive) && (
          <div className="enhancements-active">
            {/* Show active enhancements */}
          </div>
        )}
      </div>
      
      {/* Navigation - unchanged */}
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
```

## Updated AbilityCard Component

The AbilityCard component needs to handle the locked state:

```jsx
const AbilityCard = ({ 
  ability, 
  selected, 
  onSelect, 
  locked = false, 
  cooldown = 0, 
  player, 
  isMobile,
  isSelectable = true 
}) => {
  const handleClick = () => {
    if (!locked && !cooldown && isSelectable) {
      onSelect();
    }
  };
  
  return (
    <div 
      className={`
        ability-card 
        ${selected ? 'selected' : ''} 
        ${locked ? 'locked' : ''} 
        ${cooldown > 0 ? 'on-cooldown' : ''}
        ${!isSelectable ? 'not-selectable' : ''}
        ${isMobile ? 'mobile' : ''}
      `}
      onClick={handleClick}
    >
      {/* Lock overlay for locked abilities */}
      {locked && (
        <div className="lock-overlay">
          <div className="lock-icon">🔒</div>
          <div className="unlock-text">Unlocks at Level {ability.unlockAt}</div>
        </div>
      )}
      
      {/* Cooldown overlay for abilities on cooldown */}
      {!locked && cooldown > 0 && (
        <div className="cooldown-overlay">
          <div className="cooldown-number">{cooldown}</div>
          <div className="cooldown-text">rounds</div>
        </div>
      )}
      
      {/* Ability content */}
      <div className="ability-content">
        <div className="ability-icon">{getAbilityIcon(ability)}</div>
        <div className="ability-name">{ability.name}</div>
        <div className="ability-category">{ability.category}</div>
        
        {/* Show description for unlocked abilities */}
        {!locked && (
          <div className="ability-description">
            {ability.description}
          </div>
        )}
        
        {/* Show damage/effect for unlocked abilities */}
        {!locked && ability.damage && (
          <div className="ability-damage">
            Damage: {ability.damage}
          </div>
        )}
      </div>
      
      {/* Selection indicator */}
      {selected && isSelectable && (
        <div className="selection-indicator">✓</div>
      )}
    </div>
  );
};
```

## Additional CSS for Locked State

```css
/* Locked ability styling */
.ability-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--color-neutral-dark);
  position: relative;
}

.ability-card.locked .ability-content {
  filter: grayscale(100%);
}

.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: inherit;
  z-index: 1;
}

.lock-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.unlock-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 0 8px;
}

/* Ensure locked cards can't be selected */
.ability-card.locked:hover {
  border-color: var(--color-border);
  transform: none;
}

/* Mobile-specific locked styling */
.ability-card.mobile.locked {
  min-height: 120px; /* Ensure space for lock overlay */
}

/* Cooldown styling for comparison */
.ability-card.on-cooldown {
  opacity: 0.8;
  cursor: not-allowed;
}

.cooldown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: inherit;
  z-index: 1;
}
```

## Utility Function Update

```javascript
// Group ALL abilities by level (not just unlocked)
const groupAllAbilitiesByLevel = (abilities) => {
  const grouped = abilities.reduce((acc, ability) => {
    const level = ability.unlockAt || 1;
    if (!acc[level]) acc[level] = [];
    acc[level].push(ability);
    return acc;
  }, {});
  
  return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
};
```

## Benefits of Showing Locked Abilities

1. **Progression Visibility**: Players can see what abilities they'll unlock at higher levels
2. **Goal Setting**: Creates anticipation and goals for players to work towards
3. **Learning Opportunity**: Players can read about future abilities and plan strategies
4. **Consistent Layout**: UI doesn't shift as abilities unlock - all 4 slots are always visible
5. **Clear State**: Lock icon and greyed out state clearly communicate unavailability

This approach ensures players always see their full progression path while maintaining clear visual distinction between available and locked abilities.