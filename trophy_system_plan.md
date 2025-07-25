# Random Trophy System Implementation Plan

This document outlines the plan to implement a random, end-of-game trophy system to add flavor and recognition for players.

## 1. Stat Tracking (The Foundation)

To award trophies, we first need to track relevant player statistics throughout the game.

*   **File to Modify:** `server/models/Player.js`
*   **Implementation:** Add a `stats` object to the `Player` class constructor. This object will hold various metrics that are updated during gameplay.

**Example `Player.js` modification:**
```javascript
// In the Player class constructor
this.stats = {
  totalDamageDealt: 0,
  totalHealingDone: 0,
  damageTaken: 0,
  corruptionsPerformed: 0, // For Warlocks
  abilitiesUsed: 0,
  monsterKills: 0, // For the player who lands the last hit
  timesDied: 0,
  selfHeals: 0,
  highestSingleHit: 0,
};
```
These stats will be incremented by the relevant game systems (`CombatSystem.js`, `AbilityRegistry.js`, etc.) as actions are performed.

## 2. Trophy Definitions (The Possibilities)

A dedicated configuration file will define all possible trophies, making the system easily expandable.

*   **New File:** `server/config/trophies.js`
*   **Structure:** The file will export an array of trophy objects. Each object will contain the trophy's name, its description, and a `getWinner` function that determines which player (if any) earned it based on the final player stats.

**Example `trophies.js`:**
```javascript
// server/config/trophies.js
module.exports = [
  {
    name: "The Gladiator",
    description: "Dealt the most damage to the monster.",
    getWinner: (players) => {
      // Return the player with the highest `totalDamageDealt`
    }
  },
  {
    name: "The Savior",
    description: "Healed the most HP for their teammates.",
    getWinner: (players) => {
      // Return the player with the highest `totalHealingDone`
    }
  },
  {
    name: "The Punching Bag",
    description: "Took the most damage from the monster.",
    getWinner: (players) => {
      // Return the player with the highest `damageTaken`
    }
  },
  {
    name: "The Pacifist",
    description: "Dealt zero damage the entire game.",
    getWinner: (players) => {
      // Return a player with `totalDamageDealt` of 0, if any exist.
    }
  },
  {
    name: "Master of Deception",
    description: "Survived the entire game as a Warlock without being revealed.",
    getWinner: (players, gameResult) => {
      // Find a winning, unrevealed warlock.
    }
  }
];
```

## 3. Awarding Logic (The Ceremony)

This logic will execute at the end of the game to select and award a single, random trophy.

*   **File to Modify:** `server/services/gameService.js` (likely within or called from `checkGameWinConditions` or a new `endGame` function).
*   **Process:**
    1.  When the game concludes, gather the list of all players with their final stats.
    2.  Create an `earnedTrophies` list. Iterate through every trophy definition in `trophies.js`.
    3.  For each trophy, call its `getWinner(players)` function. If a winner is returned, add an object `{ trophy, winner }` to the `earnedTrophies` list.
    4.  If the `earnedTrophies` list is not empty, randomly select **one** item from it.
    5.  The player associated with that randomly selected item is the final recipient. This ensures that even if a player qualifies for multiple trophies, only one is awarded, and it's a surprise.

## 4. Announcing the Winner (The Reveal)

The final step is to communicate the result to the clients.

*   **File to Modify:** `server/services/gameService.js`
*   **Implementation:** Add the trophy information to the payload of the `gameOver` socket event that is sent to all clients.

**Example `gameOver` payload:**
```json
{
  "winner": "Good",
  "players": [ /* final player states */ ],
  "trophyAward": {
    "playerName": "Zac",
    "trophyName": "The Gladiator",
    "trophyDescription": "Dealt the most damage to the monster."
  }
}
```

## End-of-Game Screen ASCII Art Mockup

The client UI would then use this data to render the final screen.

```ascii
+------------------------------------------------------------------------+
|                                                                        |
|                           ++ G A M E  O V E R ++                         |
|                                                                        |
|                  T H E  G O O D  T E A M  I S  V I C T O R I O U S !     |
|                                                                        |
|------------------------------------------------------------------------|
|                           F I N A L  S C O R E S                         |
|                                                                        |
|   Player      Class         Damage      Healing      Status            |
|   -------------------------------------------------------------------- |
|   Zac         Barbarian     1520        0            SURVIVED          |
|   Gemini      Cleric        450         1890         SURVIVED          |
|   Bot-Alice   Rogue (NPC)   980         0            ELIMINATED        |
|   Bot-Bob     Warlock (NPC) 666         300          ELIMINATED        |
|                                                                        |
|------------------------------------------------------------------------|
|                       E N D  O F  G A M E  T R O P H Y                   |
|                                                                        |
|                          .--------------------.                        |
|                         /                      \                       |
|                        |                        |                       |
|                        |      THE GLADIATOR     |                       |
|                        |                        |                       |
|                         \____________________/                         |
|                                (Zac)                                   |
|                                                                        |
|             "Dealt the most damage to the monster."                    |
|                                                                        |
+------------------------------------------------------------------------+

```
This structure provides a clear and engaging summary of the game's outcome while highlighting a special player achievement.
