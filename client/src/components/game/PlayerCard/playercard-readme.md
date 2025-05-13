# PlayerCard Component

A component to display player information including name, race, class, health, armor, and status effects.

## Usage

```jsx
import PlayerCard from '@components/game/PlayerCard';

<PlayerCard 
  player={playerData}
  isCurrentPlayer={isCurrentUser}
  canSeeWarlock={userIsWarlock}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `player` | Object | Yes | - | Player data object |
| `isCurrentPlayer` | boolean | Yes | - | Whether this card represents the current user |
| `canSeeWarlock` | boolean | No | `false` | Whether warlock status should be visible |

## Player Object Structure

```javascript
{
  name: "Player1",               // Player's display name
  race: "Human",                 // Player's race
  class: "Wizard",               // Player's class
  hp: 75,                        // Current health points
  maxHp: 100,                    // Maximum health points
  armor: 2,                      // Base armor value
  isAlive: true,                 // Whether player is alive
  isWarlock: false,              // Whether player is a warlock
  statusEffects: {               // Active status effects
    poison: {                    // Effect type
      damage: 5,                 // Effect-specific data
      turns: 2
    },
    protected: {
      armor: 3,
      turns: 1
    }
  }
}
```

## Features

- Displays player's name, race, and class
- Visual health bar that changes color based on health percentage
  - Green: >70%
  - Orange: 30-70%
  - Red: <30%
- Shows base armor value when applicable
- Displays active status effects with icons and durations
- Special indicator for warlock status (only visible if `canSeeWarlock` is true)
- Visual overlay for dead players
- Hover animations and interactive elements
- Tooltip information for status effects

## Status Effects

The component handles several types of status effects:

| Effect | Icon | Color | Display |
|--------|------|-------|---------|
| Poison | ☠️ | Red | Shows damage and turns remaining |
| Protected | 🛡️ | Blue | Shows added armor and turns remaining |
| Invisible | 👻 | Orange | Shows turns remaining |
| Stunned | ⚡ | Purple | Shows turns remaining |

## Example

```jsx
const playerData = {
  name: "Gandalf",
  race: "Human",
  class: "Wizard",
  hp: 65,
  maxHp: 80,
  armor: 1,
  isAlive: true,
  isWarlock: false,
  statusEffects: {
    protected: {
      armor: 2,
      turns: 1
    }
  }
};

<PlayerCard 
  player={playerData}
  isCurrentPlayer={false}
  canSeeWarlock={true}
/>
```

## Customization

The component uses CSS variables from the theme for styling. Key variables used:
- `--color-accent`: High health color
- `--color-secondary`: Medium health color
- `--color-danger`: Low health color
- `--color-primary`: Used for armor and protected status
- `--color-warlock`: Used for warlock indicator