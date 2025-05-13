# GamePage Component

The main game interface component that orchestrates the game UI and manages gameplay flow.

## Overview

GamePage is the central component that coordinates all game-related UI elements and interactions. It's responsible for:

1. Managing the overall game state and phase (action or results)
2. Coordinating communication between subcomponents
3. Handling socket events for the game
4. Managing responsive layout for desktop and mobile views

## Structure

GamePage consists of three main columns in desktop view, with a tabbed interface in mobile view:

1. **Player Column**: Shows player information and status
2. **Action Column**: Displays actions, abilities, and target selection
3. **History Column**: Shows game event history

## Usage

```jsx
import GamePage from './GamePage';

<GamePage 
  socket={socketConnection}
  gameCode="1234"
  players={playersArray}
  me={currentPlayerObject}
  monster={monsterObject}
  eventsLog={eventLogArray}
  onSubmitAction={handleSubmitAction}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `socket` | Object | Yes | - | Socket.io connection object |
| `gameCode` | string | Yes | - | Game room code |
| `players` | Array | Yes | - | List of all players |
| `me` | Object | No | - | Current player data |
| `monster` | Object | Yes | - | Monster data |
| `eventsLog` | Array | Yes | - | Game event history |
| `onSubmitAction` | function | Yes | - | Callback for submitting actions |

## Game Flow

The GamePage handles two main phases:

1. **Action Phase**: Players select abilities and targets
2. **Results Phase**: Players view the outcome of the round and prepare for next round

The component automatically transitions between these phases based on:
- New events in the `eventsLog`
- Server "resumeGame" events
- Player readiness for the next round

## Racial Abilities

The component manages special racial ability activations:

- **Blood Rage** (Orc): Enhances the next attack with double damage
- **Keen Senses** (Elf): Reveals a target's true nature (whether they are a Warlock)
- **Adaptability** (Human): Opens a modal to change abilities

## Responsive Design

- Uses CSS Grid for desktop layout (`desktop-layout`)
- Switches to a tabbed interface on mobile (`mobile-layout`)
- Uses the `useMediaQuery` hook for responsive rendering
- Provides a mobile navigation component for tab switching

## Component Dependencies

### Internal Components
- `PlayerColumn`: Displays player info including current player status
- `ActionColumn`: Manages ability selection, targeting, and action submission
- `HistoryColumn`: Shows complete event history organized by rounds
- `MobileNavigation`: Provides tab navigation for mobile view

### External Components
- `GameDashboard`: Shows round, player count, and monster status
- `AbilityCard`: Displays individual ability cards
- `RacialAbilityCard`: Shows racial abilities with special styling
- `AdaptabilityModal`: Modal for Human racial ability
- `EventsLog`: Displays event logs for results phase
- `PlayerCard`: Shows individual player information

## File Structure

```
GamePage/
├── GamePage.jsx               # Main component
├── GamePage.css               # Component styles
├── index.js                   # Re-export file
├── README.md                  # Documentation
└── components/                # Child components
    ├── ActionColumn.jsx
    ├── ActionColumn.css
    ├── PlayerColumn.jsx
    ├── PlayerColumn.css
    ├── HistoryColumn.jsx
    ├── HistoryColumn.css
    ├── MobileNavigation.jsx
    ├── MobileNavigation.css
    └── index.js
```

## Implementation Details

### State Management

The component manages several types of state:
- **Game phase**: `action` or `results`
- **Action selection**: Ability type and target
- **Racial ability activation**: Blood Rage, Keen Senses, etc.
- **UI state**: Mobile tabs, modal visibility, submission status

### Socket Events

The component listens for and emits several socket events:
- `resumeGame`: Transitions from results to action phase
- `adaptabilityChooseAbility`: Opens the adaptability modal
- `adaptabilityComplete`: Handles ability replacement completion
- `playerNextReady`: Marks the player as ready for the next round
- `useRacialAbility`: Activates racial abilities
- `performAction`: Submits player actions

### Fallback Mechanism

The component includes a fallback mechanism to handle potential server delays:
1. Tracks when players mark themselves as ready
2. If majority is ready but server doesn't respond, forces transition after delay
3. Falls back to client-side phase transition if necessary
4. Ensures game progression even with occasional network issues

## Accessibility

- Proper heading hierarchy with semantic HTML
- ARIA attributes for interactive elements
- Focus management for modal content
- Color contrast following WCAG guidelines
- Keyboard navigation support