# Player Class

A model representing a player in the game, managing their state, abilities, status effects, and racial abilities.

## Overview

The `Player` class represents a single player and encapsulates:

- Basic attributes (HP, armor, etc.)
- Status effects (poison, protection, etc.)
- Racial ability state and effects
- Damage and healing calculations
- Player life state management

## Usage

```javascript
// Create a new player
const player = new Player('socket123', 'PlayerName');

// Set up player's race ability
player.setRacialAbility({
  type: 'adaptability',
  name: 'Adaptability',
  usageLimit: 'perGame',
  maxUses: 1,
});

// Apply status effects
player.applyStatusEffect('poison', { damage: 5, turns: 3 });

// Take damage (with armor calculation)
const damageDealt = player.takeDamage(20);

// Heal player
const amountHealed = player.heal(15);

// Use racial ability
if (player.canUseRacialAbility()) {
  player.useRacialAbility();
}

// Process effects at end of round
player.processRacialCooldowns();
```

## Key Components

### Properties

- `id`, `name` - Player identification
- `race`, `class` - Character selection
- `hp`, `maxHp`, `armor` - Combat stats
- `damageMod` - Damage modifier from race and class
- `isWarlock`, `isAlive` - Player state
- `statusEffects` - Active status effects
- `abilities`, `unlocked` - Class abilities
- `racialAbility`, `racialUsesLeft`, `racialCooldown` - Racial ability state

### Methods

- `hasStatusEffect()`, `applyStatusEffect()`, `removeStatusEffect()` - Status effect management
- `getEffectiveArmor()`, `calculateDamageReduction()` - Armor calculations
- `modifyDamage()`, `getHealingModifier()` - Damage and healing modifiers
- `canUseRacialAbility()`, `useRacialAbility()` - Racial ability usage
- `processRacialCooldowns()` - Process ongoing effects
- `takeDamage()`, `heal()` - HP management methods

## Status Effects

The following status effects are supported:

- `poison` - Deals damage over time
- `shielded` - Provides additional armor
- `invisible` - Prevents being targeted
- `stunned` - Prevents action

## Racial Abilities

Racial abilities can have two usage limits:

- `perGame` - Can only be used once per game
- `perRound` - Recharges every round

Each ability also has its own special effects, tracked in `racialEffects`.
