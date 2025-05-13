# CombatSystem

A system that manages all combat-related operations, including damage calculation, death processing, and area-of-effect abilities.

## Overview

The `CombatSystem` centralizes all combat logic for the game:
- Validates and queues player actions
- Processes damage application to players and the monster
- Handles death and resurrection mechanics
- Supports area-of-effect abilities (damage and healing)
- Integrates with other systems like WarlockSystem and StatusEffectManager

## Usage

```javascript
// Create a combat system
const combatSystem = new CombatSystem(
  players,
  monsterController,
  statusEffectManager,
  racialAbilitySystem,
  warlockSystem,
  gameStateUtils
);

// Apply damage to a player
combatSystem.applyDamageToPlayer(
  targetPlayer,
  30,                // Damage amount
  attackingPlayer,
  eventLog
);

// Apply damage to the monster
combatSystem.applyDamageToMonster(50, attackingPlayer, eventLog);

// Process all pending deaths at the end of a round
combatSystem.processPendingDeaths(eventLog);

// Apply AOE damage to multiple targets
combatSystem.applyAreaDamage(
  sourcePlayer,
  25,              // Base damage
  targetPlayers,   // Array of players
  eventLog,
  { excludeSelf: true }
);

// Apply healing to multiple targets
combatSystem.applyAreaHealing(
  sourcePlayer,
  20,              // Base healing
  targetPlayers,   // Array of players
  eventLog,
  { excludeWarlocks: true }
);