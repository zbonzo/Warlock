# Warlock Game Client

A React-based frontend for the multiplayer Warlock game, featuring real-time gameplay, character selection, responsive design, and comprehensive game state management.

## Architecture Overview

The client follows a component-based architecture with React, using context for state management and Socket.IO for real-time communication:

```
client/src/
├── components/       # Reusable UI components
├── contexts/         # React context providers
├── hooks/           # Custom React hooks
├── pages/           # Main application screens
├── services/        # External API services
├── styles/          # Global styles and themes
├── utils/           # Utility functions
└── config/          # Client configuration
```

## Core Architecture

### 🚀 Entry Points

#### `App.js`

Main application component that:

- Wraps the app with context providers (Theme, Config, App)
- Manages game phase routing (JOIN → CHARACTER_SELECT → LOBBY → GAME → END)
- Handles socket event listeners and game state updates
- Provides error boundary and loading states

#### `index.js`

Application bootstrap that renders the App component with React.StrictMode.

### 🎨 Styling & Theming

#### Global Styles (`styles/`)

##### `global.css`

- CSS custom properties for theming
- Three theme modes: light, dark, colorblind
- Component base styles (buttons, cards, forms)
- Responsive breakpoints and utilities

##### `App.css`

- Application-level styles
- Page transition animations
- Utility classes for common patterns

#### Theme System (`contexts/ThemeContext.js`)

- **Theme Management**: Light, dark, and colorblind themes
- **Auto Detection**: System preference detection
- **Persistence**: LocalStorage integration
- **CSS Variables**: Dynamic theme switching with custom properties

### 🔧 Configuration & Services

#### Configuration Context (`contexts/ConfigContext.js`)

Provides centralized access to game configuration:

- Race and class data from server
- Compatibility mappings
- Racial abilities
- Helper functions for validation

#### Config Service (`services/configService.js`)

Handles server communication for configuration:

- Caching layer for performance
- API endpoints for races, classes, abilities
- Error handling and retry logic

### 🎮 Game State Management

#### App Context (`contexts/AppContext.js`)

Central state management using React useReducer:

```javascript
const state = {
  screen: 'join', // Current game phase
  gameCode: '', // Game room code
  playerName: '', // Player name
  players: [], // All players in game
  eventsLog: [], // Game event history
  monster: {}, // Monster state
  selectedRace: null, // Character selection
  selectedClass: null,
};
```

**Key Actions:**

- `setScreen()` - Navigate between game phases
- `setPlayers()` - Update player list
- `addEventLog()` - Add new game events
- `setMonster()` - Update monster state
- `resetGame()` - Clear state for new game

### 🌐 Real-time Communication

#### Socket Hook (`hooks/useSocket.js`)

Custom hook for Socket.IO management:

- Connection state tracking
- Event listener management
- Automatic reconnection handling
- Error handling and logging

**Key Features:**

- Prevents multiple socket instances
- Cleanup on unmount
- Connection status monitoring
- Emit/subscribe pattern

### 📱 Responsive Design

#### Media Query Hook (`hooks/useMediaQuery.js`)

Custom hook for responsive design:

- SSR-safe implementation
- Dynamic breakpoint detection
- Smooth transitions between layouts

#### Responsive Patterns

- **Desktop**: Three-column grid layout
- **Mobile**: Tabbed interface with navigation
- **Breakpoints**: 768px for mobile, 992px for tablet

## Page Components (`pages/`)

### 🚪 JoinGamePage

Entry point where players can create or join games:

**Features:**

- Player name input with random generation
- Game code validation (4-digit format)
- Create new game or join existing
- Reconnection prompt for previous sessions
- Game tutorial access

**Key Functions:**

```javascript
onCreateGame(playerName); // Create new game
onJoinGame(gameCode, name); // Join existing game
onReconnect(code, name); // Reconnect to previous game
```

### 🎭 CharacterSelectPage

Character creation interface:

**Features:**

- Race and class selection with visual cards
- Compatibility validation between race/class
- Random suggestions for valid combinations
- Description display for selected options
- Visual feedback for invalid combinations

**Integration:**

- Uses ConfigContext for race/class data
- Validates combinations server-side
- Stores selections in AppContext

### 🏛️ LobbyPage

Pre-game waiting room:

**Features:**

- Player readiness tracking with progress bar
- Game code sharing with copy functionality
- Player list with role indicators (host/player)
- Start game button (host only)
- Game instructions display

**State Management:**

- Monitors player character selection completion
- Shows readiness indicators
- Handles host permissions

### 🎯 GamePage

Main gameplay interface with comprehensive game management:

**Layout:**

- **Desktop**: Three-column layout (Players | Actions | History)
- **Mobile**: Tabbed interface with navigation

**Key Features:**

- Real-time action submission with validation
- Racial ability integration
- Battle results modal
- Enhanced submission tracking
- Adaptability modal for Human racial ability

**State Management:**

```javascript
const [phase, setPhase] = useState('action');
const [actionType, setActionType] = useState('');
const [selectedTarget, setSelectedTarget] = useState('');
const [submitted, setSubmitted] = useState(false);
```

**Action Validation:**

- Cooldown checking
- Target availability validation
- Real-time feedback
- Server confirmation tracking

### 🏆 EndPage

Game results and statistics:

**Features:**

- Winner announcement with team display
- Player statistics (survivors, casualties)
- Complete game history toggle
- Confetti celebration animation
- Play again functionality

## Game Components (`components/game/`)

### 🃏 AbilityCard

Enhanced ability display with comprehensive information:

**Features:**

- Cooldown tracking and visualization
- Category-based styling and icons
- Racial vs class ability distinction
- Availability states and validation
- Rich tooltips with effect descriptions

**Props:**

```javascript
{
  ability: Object,        // Ability data
  selected: boolean,      // Selection state
  onSelect: Function,     // Selection handler
  abilityCooldown: number // Remaining cooldown
}
```

### 👤 PlayerCard

Player information display with warlock detection:

**Features:**

- Health bar with color coding
- Status effect indicators
- Zalgo text for corrupted players (warlocks)
- Armor and stat display
- Death overlay

**Special Effects:**

- Warlock text corruption with zalgo characters
- Animated status effects
- Real-time health updates

### 🎯 TargetSelector

Enhanced target selection with custom avatars:

**Features:**

- Monster avatar with health-based appearance
- Player avatars with race/class indicators
- Target validation and filtering
- Visual feedback for selection
- Accessibility support

**Custom Avatars:**

- Race color backgrounds
- Class emoji indicators
- Player initials overlay
- Dynamic monster appearance

### 📜 EventsLog

Personalized event history display:

**Features:**

- Player-specific message filtering
- Template processing for dynamic content
- Event categorization and styling
- Warlock view vs normal view
- Auto-scroll and responsive design

**Message Types:**

- Attack/damage events
- Healing and support
- Status effect changes
- Death and resurrection
- Warlock activities

### 🎮 GameDashboard

Real-time game status display:

**Features:**

- Current round indicator
- Player count tracking
- Monster health visualization
- Damage preview

## Modal Components (`components/modals/`)

### 🔄 AdaptabilityModal

Complex multi-step modal for Human racial ability:

**Features:**

- Three-step wizard interface
- Ability selection with filtering
- Class browsing with icons
- Server integration for ability replacement
- Responsive design with mobile optimization

**Workflow:**

1. Select ability to replace
2. Choose class to take from
3. Select new ability

### 📊 BattleResultsModal

Round results display:

**Features:**

- Event replay with animations
- Level up notifications
- Winner announcements
- Continue/close actions

### 📚 GameTutorialModal

Interactive game tutorial:

**Features:**

- Multi-step tutorial with navigation
- Progress indicators
- Optional image support
- Responsive design

## Common Components (`components/common/`)

### 🌓 ThemeToggle

Advanced theme switching component:

**Variants:**

- **Simple**: Toggle between light/dark
- **Dropdown**: All themes with selection
- **Buttons**: Button group interface

**Features:**

- Smooth transitions
- Icon indicators
- Label support
- Accessibility compliance

### ⚠️ ErrorBoundary

Application error handling:

**Features:**

- Graceful error catching
- User-friendly error display
- Technical details toggle
- Recovery options

### 📊 LoadingScreen

Loading state component:

**Features:**

- Spinner animation
- Customizable messages
- Theme integration

## Custom Hooks (`hooks/`)

### 🔌 useSocket

Socket.IO connection management:

```javascript
const { socket, connected, socketId, emit, on } = useSocket(url);
```

**Features:**

- Connection state tracking
- Event listener management
- Cleanup on unmount
- Error handling

### 📱 useMediaQuery

Responsive design hook:

```javascript
const isMobile = useMediaQuery('(max-width: 768px)');
```

**Features:**

- SSR-safe implementation
- Dynamic updates
- Cross-browser compatibility

## Configuration (`config/constants.js`)

### Socket & API URLs

```javascript
export const SOCKET_URL = /* Environment-based URL detection */;
export const API_URL = /* API endpoint configuration */;
```

### Game Constants

```javascript
export const GAME_PHASES = {
  JOIN: 'join',
  CHARACTER_SELECT: 'charSelect',
  LOBBY: 'lobby',
  GAME: 'game',
  END: 'end',
};
```

### UI Icons & Assets

```javascript
export const ICONS = {
  RACES: { Human: '👩‍🌾', Dwarf: '🧔‍♂️' /* ... */ },
  CLASSES: { Warrior: '⚔️', Wizard: '🧙' /* ... */ },
  ABILITIES: { attack: '⚔️', heal: '💚' /* ... */ },
};
```

## Key Features

### 🎯 Real-time Gameplay

- **Socket.IO Integration**: Seamless real-time communication
- **Action Validation**: Client-side validation with server confirmation
- **State Synchronization**: Automatic state updates across clients
- **Reconnection Support**: Robust reconnection with session recovery

### 🎨 Advanced UI/UX

- **Theme System**: Light, dark, and colorblind-friendly themes
- **Responsive Design**: Desktop and mobile optimized layouts
- **Animations**: Smooth transitions and visual feedback
- **Accessibility**: WCAG compliant with keyboard navigation

### 🔧 State Management

- **React Context**: Centralized state with useReducer
- **Persistent Storage**: LocalStorage for user preferences
- **Cache Management**: Smart caching for configuration data
- **Error Recovery**: Graceful error handling with recovery options

### 🎮 Game Integration

- **Ability System**: Full ability display with cooldowns and effects
- **Status Effects**: Visual status effect tracking
- **Warlock Mechanics**: Special UI for warlock players
- **Character System**: Complete race/class integration

### 📱 Mobile Experience

- **Tabbed Interface**: Optimized mobile navigation
- **Touch Interactions**: Touch-friendly controls
- **Responsive Modals**: Mobile-optimized modal interfaces
- **Performance**: Optimized for mobile devices

## Development Workflow

### 🛠️ Adding New Features

#### 1. New Game Phases

```javascript
// 1. Add to constants
export const GAME_PHASES = {
  // ... existing phases
  NEW_PHASE: 'newPhase'
};

// 2. Create page component
// pages/NewPhasePage/NewPhasePage.jsx

// 3. Add to App.js routing
case GAME_PHASES.NEW_PHASE:
  return <NewPhasePage />;
```

#### 2. New Abilities

```javascript
// 1. Add icon to constants
ICONS.ABILITIES.newAbility = '🆕';

// 2. Update AbilityCard styling
// 3. Add effect descriptions
// 4. Test with server integration
```

#### 3. New UI Components

```javascript
// 1. Create component with props
const NewComponent = ({ prop1, prop2, onAction }) => {
  // Implementation
};

// 2. Add PropTypes validation
NewComponent.propTypes = {
  prop1: PropTypes.string.isRequired,
  // ...
};

// 3. Export and document
```

### 🧪 Testing Integration

The client is designed for easy integration testing:

```javascript
// Mock socket for testing
jest.mock('./hooks/useSocket', () => ({
  __esModule: true,
  default: () => ({
    connected: true,
    emit: jest.fn(),
    on: jest.fn(() => jest.fn()),
  }),
}));
```

### 🎛️ Configuration

#### Environment Variables

```bash
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_SOCKET_URL=http://localhost:3001
```

#### Build Configuration

- **Babel**: ES6+ support with module aliases
- **CSS**: Custom properties for theming
- **Bundle**: Optimized production builds

## API Integration

### 🔗 Server Communication

#### Socket Events (Client → Server)

```javascript
socket.emit('createGame', { playerName });
socket.emit('joinGame', { gameCode, playerName });
socket.emit('selectCharacter', { gameCode, race, className });
socket.emit('performAction', { gameCode, actionType, targetId });
socket.emit('useRacialAbility', { gameCode, targetId, abilityType });
```

#### Socket Events (Server → Client)

```javascript
socket.on('gameCreated', ({ gameCode }) => {});
socket.on('playerList', ({ players }) => {});
socket.on('gameStarted', (payload) => {});
socket.on('roundResult', (payload) => {});
socket.on('errorMessage', ({ message }) => {});
```

#### REST Endpoints

```javascript
GET /api/config              // Basic configuration
GET /api/config/races        // Available races
GET /api/config/classes      // Available classes
GET /api/config/compatibility // Race-class mappings
GET /api/config/abilities/:className // Class abilities
```

## Performance Considerations

### 🚀 Optimization Strategies

- **Component Memoization**: React.memo for expensive renders
- **Context Splitting**: Separate contexts for different concerns
- **Lazy Loading**: Dynamic imports for modals and pages
- **Image Optimization**: Optimized assets and lazy loading
- **Bundle Splitting**: Code splitting for better loading

### 📊 Monitoring

- **Error Tracking**: Comprehensive error boundaries
- **Performance Metrics**: Web Vitals integration
- **Connection Monitoring**: Socket connection status
- **State Validation**: Runtime state checking

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **Features**: ES6+, CSS Custom Properties, WebSocket
- **Fallbacks**: Graceful degradation for older browsers

## Deployment

### 🏗️ Build Process

```bash
npm run build              # Production build
npm run test              # Run test suite
npm run analyze           # Bundle analysis
```

### 🌐 Production Considerations

- **Static Hosting**: Compatible with CDN deployment
- **Environment Variables**: Runtime configuration
- **Error Monitoring**: Integration with error services
- **Performance**: Optimized for production environments

This client architecture provides a robust, scalable, and maintainable foundation for the Warlock game frontend, with comprehensive integration points for server communication and rich interactive gameplay features.
