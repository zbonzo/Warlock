# WarlockSystem

A system that manages all warlock-related game mechanics, including conversion, tracking, and win conditions.

## Overview

The `WarlockSystem` centralizes all warlock logic for the game:
- Handles initial warlock assignment
- Tracks warlock count and status
- Manages the conversion mechanic
- Provides utility functions for warlock-related queries

## Usage

```javascript
// Create a warlock system
const warlockSystem = new WarlockSystem(players, gameStateUtils);

// Assign the initial warlock
warlockSystem.assignInitialWarlock();

// Check if a player is a warlock
const isWarlock = warlockSystem.isPlayerWarlock('player1');

// Attempt to convert a player to a warlock
const conversionSuccess = warlockSystem.attemptConversion(
  warlockPlayer,  // The warlock attempting conversion
  targetPlayer,   // The target to convert
  eventLog        // Array to record events
);

// Handle warlock count when a warlock player dies
warlockSystem.decrementWarlockCount();

// Get the current number of warlocks
const warlockCount = warlockSystem.getWarlockCount();