# EndPage Component

A celebratory game-end screen that displays the final results, showing which team won and providing player statistics.

## Usage

```jsx
import EndPage from '@pages/EndPage';

<EndPage 
  winner="Good" 
  players={gameResults.players} 
  onPlayAgain={handlePlayAgain} 
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `winner` | string | Yes | - | Which team won ('Good' or 'Evil') |
| `players` | array | Yes | - | List of all players with their final state |
| `onPlayAgain` | function | Yes | - | Callback when player wants to play again |

## Features

- Celebratory confetti animation for the winning team
- Distinct visual styling for Good vs Evil victories
- Players grouped by their teams (Good players vs Warlocks)
- Visual indicators for alive and dead players
- Game statistics summary (survivors, casualties, total players)
- Play Again button to restart the game
- Responsive layout for different screen sizes
- Animations and visual effects

## Component Structure

```
EndPage/
├── EndPage.jsx           # Main component implementation
├── EndPage.css           # Main component styles
├── components/           # Subcomponents
│   ├── Confetti.jsx      # Confetti animation effect
│   ├── Confetti.css
│   ├── PlayerGroup.jsx   # Player team display component
│   ├── PlayerGroup.css
│   ├── StatsPanel.jsx    # Statistics display component
│   └── StatsPanel.css
├── index.js              # Re-export file
└── README.md             # Documentation
```

## Player Object Structure

Each player in the `players` array should have at least these properties:

```javascript
{
  id: "player1",              // Unique identifier
  name: "PlayerName",         // Display name
  race: "Human",              // Player's race
  class: "Warrior",           // Player's class
  isWarlock: false,           // Whether player was on warlock team
  isAlive: true               // Whether player survived
}
```

## Example

```jsx
const gameResults = {
  winner: 'Good',
  players: [
    { id: 'p1', name: 'Alice', race: 'Elf', class: 'Wizard', isWarlock: false, isAlive: true },
    { id: 'p2', name: 'Bob', race: 'Dwarf', class: 'Warrior', isWarlock: false, isAlive: false },
    { id: 'p3', name: 'Charlie', race: 'Orc', class: 'Shaman', isWarlock: true, isAlive: false }
  ]
};

const handlePlayAgain = () => {
  // Reset game state and navigate back to lobby
  resetGameState();
  navigate('/lobby');
};

<EndPage 
  winner={gameResults.winner}
  players={gameResults.players}
  onPlayAgain={handlePlayAgain}
/>
```

## Confetti Effect

The component includes a celebratory confetti animation that:
- Appears automatically when the component mounts
- Uses the theme colors for a cohesive visual style
- Animates for 5 seconds before disappearing
- Creates a festive atmosphere for the winning team

## Accessibility

- Color is not the only means of distinguishing information
- Text has sufficient contrast against backgrounds
- Focus indicators for interactive elements
- Semantic HTML structure
- Responsive design that works on different screen sizes

## Animation Effects

- Confetti falling animation
- Fade-in and slide-up animations for the results card
- Hover effects for interactive elements
- Smooth transitions for enhanced user experience