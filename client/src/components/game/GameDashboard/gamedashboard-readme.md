# GameDashboard Component

A top-level component that displays critical game information including current round, player count, and monster health.

## Usage

```jsx
import GameDashboard from '@components/game/GameDashboard';

<GameDashboard 
  round={currentRound} 
  alivePlayers={alivePlayers} 
  monster={monsterData} 
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `round` | number | Yes | - | Current game round number |
| `alivePlayers` | array | Yes | - | Array of currently alive player objects |
| `monster` | object | Yes | - | Monster data with hp, maxHp, and nextDamage |

## Monster Object Structure

```javascript
{
  hp: 100,           // Current monster health
  maxHp: 200,        // Maximum monster health
  nextDamage: 15     // Damage for the monster's next attack
}
```

## Features

- Displays the current game round
- Shows the number of alive players
- Visual health bar for the monster
  - Color changes to red when health is below 30%
  - Animated transitions for health changes
- Displays monster's next attack damage
- Responsive layout that adapts to mobile screens

## Example

```jsx
const gameState = {
  round: 3,
  alivePlayers: [player1, player2, player3],
  monster: {
    hp: 75,
    maxHp: 150,
    nextDamage: 18
  }
};

<GameDashboard 
  round={gameState.round}
  alivePlayers={gameState.alivePlayers}
  monster={gameState.monster}
/>
```

## Customization

The component uses CSS variables from the theme for styling. Key variables used:
- `--color-primary`: Heading color
- `--color-secondary`: Player count color
- `--color-monster`: Normal monster health color
- `--color-danger`: Low health and damage indicator color
- `--shadow-card`: Box shadow style