# JoinGamePage Component

The entry point component for the game, where users can enter their name, create a new game, or join an existing game with a code.

## Usage

```jsx
import JoinGamePage from '@pages/JoinGamePage';

<JoinGamePage 
  onCreateGame={handleCreateGame}
  onJoinGame={handleJoinGame}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onCreateGame` | function | Yes | - | Callback when creating a new game |
| `onJoinGame` | function | Yes | - | Callback when joining an existing game |

## Features

- Enter player name or generate a random one
- Create a new game
- Join an existing game with a code
- Game tutorial access
- Visual feedback and animations
- Responsive design for different screen sizes
- Help text for game codes

## Component Structure

```
JoinGamePage/
├── JoinGamePage.jsx     # Main component
├── JoinGamePage.css     # Component styles
├── constants.js         # Constants (random names)
├── index.js             # Re-export
└── README.md            # Documentation
```

## Dependencies

- `@contexts/ThemeContext` - Provides theme colors and styles
- `@components/modals/GameTutorial` - Tutorial modal component

## User Flow

1. **Enter Name**: User enters their name or clicks dice button for a random name
2. **Create or Join**:
   - If no game code entered: User clicks "Create New Game"
   - If game code entered: User clicks "Join Game"
3. **How to Play**: User can click "How to Play" to see game rules

## Example

```jsx
const handleCreateGame = (playerName) => {
  // Emit 'createGame' socket event
  socket.emit('createGame', { playerName });
};

const handleJoinGame = (gameCode, playerName) => {
  // Emit 'joinGame' socket event
  socket.emit('joinGame', { gameCode, playerName });
};

<JoinGamePage 
  onCreateGame={handleCreateGame}
  onJoinGame={handleJoinGame}
/>
```

## Accessibility

- Properly labeled form elements
- Visual feedback for interactive elements
- Keyboard navigation support
- Focus indicators for input fields

## Animation Effects

- Card appearance animation
- Logo floating animation
- Button ripple effects
- Help text slide down animation
- Join button fade in

## Error Handling

The component validates user input before submission:
- Alerts if name is missing when creating a game
- Alerts if name or game code is missing when joining a game
- Prevents button clicks when required fields are empty