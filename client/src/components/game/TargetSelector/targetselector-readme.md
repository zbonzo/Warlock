# TargetSelector Component

A component for selecting a target (player or monster) when performing game actions.

## Usage

```jsx
import TargetSelector from '@components/game/TargetSelector';

<TargetSelector 
  alivePlayers={alivePlayers}
  monster={monster}
  currentPlayerId={currentUser.id}
  selectedTarget={selectedTarget}
  onSelectTarget={handleTargetSelect}
  disableMonster={isAbilityPlayerOnly}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `alivePlayers` | Array | Yes | - | List of alive players |
| `monster` | Object | Yes | - | Monster data |
| `currentPlayerId` | string | Yes | - | ID of the current player |
| `selectedTarget` | string | No | - | ID of the currently selected target |
| `onSelectTarget` | function | Yes | - | Callback when target is selected |
| `disableMonster` | boolean | No | `false` | Whether monster should be excluded as a target |

## Required Data Structures

### Player Object
Each player in the `alivePlayers` array should have at least:
```javascript
{
  id: "player1",              // Unique identifier
  name: "Player Name",        // Display name
  hp: 75,                     // Current health
  maxHp: 100                  // Maximum health
}
```

### Monster Object
```javascript
{
  hp: 150,                    // Current health
  maxHp: 200                  // Maximum health
}
```

## Features

- Shows a list of valid targets with health information
- Visual highlighting for the selected target
- Special styling for the current player ("You")
- Special styling for the monster
- Option to disable monster as a target
- Helpful message when monster target is restricted
- Hover effects and animations for better user interaction
- Subtle pulse animation for the selected target
- Responsive design for mobile screens

## Events

- `onSelectTarget`: Fired when a target is clicked, passing the target ID
  - For players, this is their player ID
  - For the monster, this is the string `"__monster__"`

## Example

```jsx
const gameState = {
  alivePlayers: [
    { id: 'p1', name: 'Alice', hp: 80, maxHp: 100 },
    { id: 'p2', name: 'Bob', hp: 65, maxHp: 90 },
    { id: 'p3', name: 'Charlie', hp: 50, maxHp: 85 }
  ],
  monster: { hp: 120, maxHp: 200 }
};

function MyComponent() {
  const [target, setTarget] = useState('');
  
  return (
    <TargetSelector
      alivePlayers={gameState.alivePlayers}
      monster={gameState.monster}
      currentPlayerId="p1"
      selectedTarget={target}
      onSelectTarget={setTarget}
    />
  );
}
```

## Accessibility

- Interactive elements have appropriate hover and focus states
- Adequate color contrast for text readability
- Semantic HTML structure