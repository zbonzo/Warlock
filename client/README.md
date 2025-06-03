# Warlock Game Client - Development Guide

## System Overview

A React-based frontend for the multiplayer Warlock deduction game, featuring real-time gameplay, character selection, responsive design, and comprehensive game state management. Built with React 19, Socket.IO client, and a modern component architecture.

### Core User Journey
1. **Join/Create**: Enter name, create/join game with code
2. **Character Select**: Choose race and class combination
3. **Lobby**: Wait for players, see readiness status
4. **Game**: Submit actions, view results, progress through rounds
5. **End**: View results, celebrate, play again

## Architecture Map

```
client/src/
├── 🎯 ENTRY POINTS
│   ├── index.js                     # App bootstrap
│   ├── App.js                       # 🔥 Main router + socket management
│   └── App.test.js                  # Basic app tests
├── ⚙️ CONFIGURATION
│   └── config/
│       └── constants.js             # 🔥 Socket URLs, game phases, icons
├── 🎨 STYLING & THEMES
│   ├── index.css                    # Base styles
│   └── styles/
│       ├── global.css               # 🔥 CSS variables, theming, utilities
│       └── App.css                  # App-level styles
├── 🧠 STATE MANAGEMENT
│   └── contexts/
│       ├── AppContext.js            # 🔥 Global game state (screen, players, events)
│       ├── ConfigContext.js         # 🔥 Server config (races, classes, abilities)
│       └── ThemeContext.js          # Theme switching (light/dark/colorblind)
├── 🔌 HOOKS & UTILITIES
│   ├── hooks/
│   │   ├── useSocket.js             # 🔥 Socket.IO connection management
│   │   └── useMediaQuery.js         # Responsive design utility
│   ├── utils/
│   │   └── helpers.js               # Common utility functions
│   └── services/
│       └── configService.js         # 🔥 Server config API client
├── 📄 PAGES (Main Screens)
│   ├── JoinGamePage/                # 🔥 Entry point - create/join games
│   │   ├── JoinGamePage.jsx         # Main component with name validation
│   │   ├── JoinGamePage.css         # Enhanced validation styling
│   │   └── constants.js             # Random names list
│   ├── CharacterSelectPage/         # 🔥 Race/class selection
│   │   ├── CharacterSelectPage.jsx  # Character selection with validation
│   │   ├── CharacterSelectPage.css  # Selection card styling
│   │   └── constants.js             # Race/class definitions
│   ├── LobbyPage/                   # Pre-game waiting room
│   │   ├── LobbyPage.jsx            # Player list, readiness, game start
│   │   ├── LobbyPage.css            # Lobby styling with progress bars
│   ├── GamePage/                    # 🔥 Main gameplay interface
│   │   ├── GamePage.jsx             # 🔥 Game orchestration + responsive layout
│   │   ├── GamePage.css             # Main game styles + mobile header
│   │   └── components/              # Game subcomponents
│   │       ├── ActionColumn.jsx     # 🔥 Ability selection + submission
│   │       ├── ActionColumn.css     # Action UI styles
│   │       ├── PlayerColumn.jsx     # Player info display
│   │       ├── PlayerColumn.css
│   │       ├── HistoryColumn.jsx    # 🔥 Personalized event log
│   │       ├── HistoryColumn.css
│   │       ├── MobileNavigation.jsx # Mobile tab navigation
│   │       ├── MobileNavigation.css
│   │       └── index.js             # Component exports
│   └── EndPage/                     # Game results + celebration
│       ├── EndPage.jsx              # 🔥 Results display + play again
│       ├── EndPage.css              # Results styling
│       └── components/              # End page subcomponents
│           ├── Confetti.jsx         # Celebration animation
│           ├── PlayerGroup.jsx      # Team grouping display
│           └── StatsPanel.jsx       # Game statistics
├── 🎮 GAME COMPONENTS
│   └── components/game/
│       ├── AbilityCard/             # 🔥 Ability display with damage calculation
│       │   ├── AbilityCard.jsx      # Enhanced ability card with modifiers
│       │   └── AbilityCard.css      # Ability styling + cooldowns
│       ├── EventsLog/               # 🔥 Personalized event display
│       │   ├── EventsLog.jsx        # Player-perspective event filtering
│       │   └── EventsLog.css        # Event styling with color coding
│       ├── GameDashboard/           # Game status display
│       │   ├── GameDashboard.jsx    # Round, players, monster health
│       │   └── GameDashboard.css    # Dashboard styling
│       ├── PlayerCard/              # 🔥 Player status display
│       │   ├── PlayerCard.jsx       # Player info with Warlock corruption
│       │   ├── PlayerCard.css       # Player card styling + zalgo text
│       ├── RacialAbilityCard/       # Racial ability display
│       │   ├── RacialAbilityCard.jsx # Racial ability with usage limits
│       │   ├── RacialAbilityCard.css
│       │   └── racialAbilityData.js # Race mappings + utilities
│       └── TargetSelector/          # 🔥 Target selection with custom avatars
│           ├── TargetSelector.jsx   # Enhanced target selection + monster avatar
│           └── TargetSelector.css   # Target styling
├── 🔧 COMMON COMPONENTS
│   └── components/common/
│       ├── ErrorBoundary.jsx        # Error handling wrapper
│       ├── ErrorBoundary.css
│       ├── LoadingScreen.jsx        # Loading state display
│       ├── LoadingScreen.css
│       ├── ThemeToggle.jsx          # 🔥 Theme switching component
│       └── ThemeToggle.css
└── 🪟 MODALS
    └── components/modals/
        ├── AdaptabilityModal/       # 🔥 Human racial ability modal
        │   ├── AdaptabilityModal.jsx # 3-step ability replacement wizard
        │   ├── AdaptabilityModal.css # Modal styling
        │   ├── constants.js         # Modal step definitions
        │   └── components/          # Modal subcomponents
        ├── BattleResultsModal/      # 🔥 Round results display
        │   ├── BattleResultsModal.jsx # Battle results with level up
        │   ├── BattleResultsModal.css
        │   └── index.js
        └── GameTutorial/            # Game tutorial system
            ├── GameTutorialModal.jsx # Multi-step tutorial
            ├── GameTutorialModal.css
            ├── constants.js         # Tutorial step content
            └── components/
                ├── Tooltip.jsx      # Tooltip utility
                └── Tooltip.css
```

🔥 = Most frequently modified files

---

## Quick Reference: File Selection Guide

### UI/UX Issues
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Theme/styling problems | `styles/global.css` | `contexts/ThemeContext.js` |
| Responsive design issues | `hooks/useMediaQuery.js` | Component-specific CSS files |
| Component styling | Component `.css` file | `styles/global.css` |
| Mobile layout problems | `GamePage/components/MobileNavigation.jsx` | `GamePage/GamePage.css` |

### Game Flow & Navigation
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Screen transitions | `App.js` | `contexts/AppContext.js` |
| Socket connection issues | `hooks/useSocket.js` | `config/constants.js` |
| Game state management | `contexts/AppContext.js` | `App.js` |
| Page routing problems | `App.js` | Individual page components |

### Character System & Configuration
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Race/class data loading | `contexts/ConfigContext.js` | `services/configService.js` |
| Character selection logic | `CharacterSelectPage/CharacterSelectPage.jsx` | `CharacterSelectPage/constants.js` |
| Ability display issues | `components/game/AbilityCard/AbilityCard.jsx` | `contexts/ConfigContext.js` |
| Racial abilities | `components/game/RacialAbilityCard/` | `components/modals/AdaptabilityModal/` |

### Gameplay Mechanics
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Action submission | `GamePage/components/ActionColumn.jsx` | `GamePage/GamePage.jsx` |
| Target selection | `components/game/TargetSelector/TargetSelector.jsx` | `GamePage/components/ActionColumn.jsx` |
| Event display | `components/game/EventsLog/EventsLog.jsx` | `GamePage/components/HistoryColumn.jsx` |
| Player status display | `components/game/PlayerCard/PlayerCard.jsx` | `GamePage/components/PlayerColumn.jsx` |
| Battle results | `components/modals/BattleResultsModal/` | `GamePage/GamePage.jsx` |

### Real-time Features
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Socket event handling | `App.js` | `hooks/useSocket.js` |
| Real-time updates | `contexts/AppContext.js` | Component event handlers |
| Connection management | `hooks/useSocket.js` | `config/constants.js` |
| Reconnection logic | `App.js` | `hooks/useSocket.js` |

### Validation & Error Handling
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Name validation | `JoinGamePage/JoinGamePage.jsx` | `JoinGamePage/constants.js` |
| Input validation | Component-specific validation | `utils/helpers.js` |
| Error display | `components/common/ErrorBoundary.jsx` | Component error states |
| Form validation | Individual form components | `styles/global.css` |

---

## Component Deep Dive

### Core Game Flow Components

**App.js** - The central orchestrator:
- Manages all context providers (Config, App, Theme)
- Routes between game phases based on `screen` state
- Handles all major socket event listeners
- Provides callbacks for screen transitions
- Manages reconnection and play-again logic

**GamePage.jsx** - The main gameplay interface:
- Orchestrates three-column desktop layout vs mobile tabs
- Manages action submission and validation
- Handles racial ability activation
- Coordinates real-time updates between components
- Implements responsive design patterns

### State Management System

**AppContext** - Central game state using useReducer:
```javascript
const state = {
  screen: 'join',           // Current game phase
  gameCode: '',             // Game room code  
  playerName: '',           // Player name
  players: [],              // All players in game
  eventsLog: [],            // Game event history
  monster: {},              // Monster state
  selectedRace: null,       // Character selection
  selectedClass: null,
  winner: null,             // Game winner
  isHost: false            // Host status
};
```

**ConfigContext** - Server configuration management:
- Loads races, classes, abilities from server
- Provides compatibility validation
- Caches configuration data
- Offers helper functions for race/class logic

**ThemeContext** - Theme system:
- Supports light, dark, and colorblind themes
- System preference detection
- CSS variable updates
- localStorage persistence

### Game-Specific Components

**AbilityCard** - Enhanced ability display:
- Shows modified damage values using server's calculation system
- Displays cooldown information and availability
- Handles racial vs class ability distinction
- Provides detailed effect descriptions

**EventsLog** - Personalized event display:
- Filters events based on player perspective
- Shows different messages for attacker vs target vs observer
- Secure ID-based filtering (prevents name spoofing)
- Warlock players see unfiltered "full view"

**PlayerCard** - Player status with Warlock detection:
- Visual health bars with color coding
- Status effects display
- Zalgo text corruption for Warlocks (to Warlock viewers)
- Armor and stat information

**TargetSelector** - Enhanced target selection:
- Custom canvas-drawn avatars for players
- Dynamic monster avatar based on health
- Race color backgrounds with class emoji indicators
- Target validation and filtering

### Modal System

**AdaptabilityModal** - Multi-step ability replacement:
- Three-step wizard interface (select ability → select class → select new ability)
- Server integration for ability data
- Responsive design with mobile optimization
- Error handling and validation

**BattleResultsModal** - Round results display:
- Shows events with enhanced EventsLog
- Level up notifications with animations
- Game end detection and winner display
- Continue/close functionality

### Responsive Design Patterns

**Desktop Layout** (>768px):
- Three-column CSS Grid: Players | Actions | History
- Full character title with health bar
- Comprehensive ability and target selection

**Mobile Layout** (≤768px):
- Tabbed interface with MobileNavigation
- Fixed header with player info and health
- Swipe-friendly tab navigation
- Condensed UI elements

### Real-time Communication

**Socket Event Patterns**:
```javascript
// Outgoing events (client → server)
socket.emit('createGame', { playerName });
socket.emit('joinGame', { gameCode, playerName });
socket.emit('selectCharacter', { gameCode, race, className });
socket.emit('performAction', { gameCode, actionType, targetId });
socket.emit('useRacialAbility', { gameCode, targetId, abilityType });

// Incoming events (server → client)
socket.on('gameCreated', ({ gameCode }) => {});
socket.on('playerList', ({ players }) => {});
socket.on('gameStarted', (payload) => {});
socket.on('roundResult', (payload) => {});
```

---

## Development Patterns

### Adding New Features

**New Game Phase**:
1. Add to `GAME_PHASES` in `config/constants.js`
2. Create page component in `pages/`
3. Add routing case in `App.js`
4. Update context actions if needed

**New Modal**:
1. Create modal component in `components/modals/`
2. Add modal state to parent component
3. Implement open/close handlers
4. Add ESC key and backdrop click handling

**New Game Component**:
1. Create component in `components/game/`
2. Follow established prop patterns
3. Add responsive CSS
4. Export from appropriate index.js

### Styling Guidelines

**CSS Variables** - All colors use CSS custom properties:
```css
:root {
  --color-primary: #4a2c82;
  --color-secondary: #ff7b25;
  --color-accent: #2cb978;
  --color-danger: #e84855;
  /* ... */
}
```

**Responsive Patterns**:
- Use `useMediaQuery` hook for conditional rendering
- Mobile-first CSS with min-width media queries
- Component-level responsive classes (.hide-on-mobile, .show-on-mobile)

**Animation Standards**:
- Use CSS transitions for state changes
- Keyframe animations for complex effects
- Respect user motion preferences
- Performance-conscious animations

### State Update Patterns

**Context Updates**:
```javascript
// Use context actions for state changes
const { setScreen, setPlayers, addEventLog } = useAppContext();

// Batch related updates
setPlayers(newPlayers);
addEventLog(newEvent);
setScreen('game');
```

**Socket Event Handling**:
```javascript
useEffect(() => {
  if (!socket) return;
  
  const handleEvent = (data) => {
    // Process data
    updateState(data);
  };
  
  socket.on('eventName', handleEvent);
  return () => socket.off('eventName', handleEvent);
}, [socket]);
```

### Error Handling Patterns

**Component Level**:
- Use ErrorBoundary for component trees
- Implement graceful degradation
- Show user-friendly error messages
- Provide recovery actions where possible

**Async Operations**:
- Handle loading states with LoadingScreen
- Catch and display network errors
- Implement retry mechanisms
- Validate data before using

---

## Common Development Scenarios

### Scenario: "I need to add a new ability type display"
**Needs**: 
- `components/game/AbilityCard/AbilityCard.jsx` (display logic)
- `components/game/AbilityCard/AbilityCard.css` (styling)
- `config/constants.js` (icon mapping if needed)

### Scenario: "The mobile layout is broken on the game page"
**Needs**:
- `GamePage/GamePage.jsx` (responsive logic)
- `GamePage/GamePage.css` (mobile styles)
- `GamePage/components/MobileNavigation.jsx` (tab system)
- `hooks/useMediaQuery.js` (breakpoint detection)

### Scenario: "Players can't see the right events in the history"
**Needs**:
- `components/game/EventsLog/EventsLog.jsx` (filtering logic)
- `GamePage/components/HistoryColumn.jsx` (integration)
- `contexts/AppContext.js` (event state management)

### Scenario: "Themes aren't switching properly"
**Needs**:
- `contexts/ThemeContext.js` (theme logic)
- `styles/global.css` (CSS variables)
- `components/common/ThemeToggle.jsx` (UI component)

### Scenario: "Socket connection is unstable"
**Needs**:
- `hooks/useSocket.js` (connection management)
- `App.js` (event handling)
- `config/constants.js` (URL configuration)

### Scenario: "Character selection validation is broken"
**Needs**:
- `CharacterSelectPage/CharacterSelectPage.jsx` (selection logic)
- `contexts/ConfigContext.js` (compatibility data)
- `services/configService.js` (server communication)

### Scenario: "Battle results modal doesn't show level ups"
**Needs**:
- `components/modals/BattleResultsModal/BattleResultsModal.jsx` (modal logic)
- `GamePage/GamePage.jsx` (modal triggering)
- `contexts/AppContext.js` (event data management)

---

## Testing & Development

**Local Development**:
```bash
npm start           # Development server
npm run build       # Production build
npm test            # Run tests
```

**Key Dependencies**:
- React 19.1.0 (latest features)
- Socket.IO Client 4.8.1 (real-time communication)
- Axios 1.9.0 (HTTP requests)
- React Testing Library (testing)

**Browser Support**:
- Modern browsers (Chrome 88+, Firefox 85+, Safari 14+)
- ES6+ features required
- CSS Custom Properties support needed
- WebSocket support required

**Environment Variables**:
- `REACT_APP_API_URL`: Server API endpoint
- `REACT_APP_SOCKET_URL`: Socket.IO server URL
- `NODE_ENV`: development/production

**Architecture Benefits**:
- ✅ **Responsive**: Desktop and mobile optimized
- ✅ **Real-time**: Socket.IO integration throughout
- ✅ **Themeable**: Comprehensive theming system
- ✅ **Accessible**: WCAG-compliant design
- ✅ **Modular**: Component-based architecture
- ✅ **Performant**: Optimized rendering and state management