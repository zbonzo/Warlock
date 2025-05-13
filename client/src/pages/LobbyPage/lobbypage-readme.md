# LobbyPage Component

A lobby waiting room component where players gather before the game starts. It displays a list of players, their readiness status, and allows the host to start the game when everyone is ready.

## Usage

```jsx
import LobbyPage from '@pages/LobbyPage';

<LobbyPage 
  players={lobbyPlayers} 
  gameCode="1234" 
  isHost={true} 
  onStartGame={handleStartGame} 
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `players` | array | Yes | - | List of players in the lobby |
| `gameCode` | string | Yes | - | Unique game room code |
| `isHost` | boolean | Yes | - | Whether current player is the host |
| `onStartGame` | function | Yes | - | Callback when host starts game |

## Features

- Displays a shareable game code with copy-to-clipboard functionality
- Shows player count and readiness status
- Toggle to show/hide player race and class details
- Visual distinction for the host player
- Readiness indicator with progress bar
- Start game button (visible only to host)
- Game instructions section
- Responsive design for different screen sizes

## Player Object Structure

Each player in the `players` array should have the following structure:

```javascript
{
  id: "player123",         // Unique player identifier
  name: "PlayerName",      // Display name
  race: "Human",           // Selected race (or null if not selected)
  class: "Warrior",        // Selected class (or null if not selected)
  isReady: true            // Whether player is ready (optional)
}
```

## Component Structure

```
LobbyPage/
├── LobbyPage.jsx     # Main component implementation
├── LobbyPage.css     # Component styles
├── index.js          # Re-export file
└── README.md         # Documentation
```

## Game Flow

1. Players join the lobby and are displayed in the player list
2. Each player selects a character (in the CharacterSelectPage)
3. The lobby displays which players are ready
4. When all players are ready, the host can start the game
5. Upon game start, all players transition to the GamePage

## Example

```jsx
const players = [
  { id: "p1", name: "Alice", race: "Elf", class: "Wizard" },
  { id: "p2", name: "Bob", race: "Dwarf", class: null },
  { id: "p3", name: "Charlie", race: null, class: null }
];

const handleStartGame = () => {
  socket.emit('startGame', { gameCode: '1234' });
};

<LobbyPage 
  players={players}
  gameCode="1234"
  isHost={true}
  onStartGame={handleStartGame}
/>
```

## Accessibility

- Proper color contrast for readability
- Keyboard-navigable interface
- Clear visual feedback for interactive elements
- Responsive design for different screen sizes
- Appropriate ARIA attributes

## Animation Effects

- Fade-in animation for the main card
- Slide-up animation for instructions card
- Hover effects for player rows
- Smooth transitions for toggle switches and buttons

## Clipboard API Usage

The component uses the modern Clipboard API with fallback mechanisms:
1. First attempts `navigator.clipboard.writeText()`
2. Falls back to `document.execCommand('copy')` if the modern API fails
3. Properly handles errors and shows user feedback