# Warlock Game Server

A real-time multiplayer browser game where players collaborate to defeat monsters while hidden Warlocks attempt to corrupt and eliminate the good players.

## 🎮 Game Overview

**Warlock** is a social deduction game with RPG elements where:

- Players choose from 12 different classes (Warrior, Wizard, Assassin, etc.)
- Players select from 6 different races (Human, Elf, Dwarf, Orc, Satyr, Skeleton)
- Each turn, players use abilities to attack monsters or help teammates
- Hidden Warlocks try to convert other players to their cause
- Good players win by defeating all monsters; Warlocks win by converting the majority

### Key Features

- **Real-time multiplayer** with Socket.IO
- **Rich ability system** with 60+ unique abilities
- **Status effects** (poison, invisibility, stunning, etc.)
- **Racial abilities** for added strategy
- **Scaling difficulty** as the game progresses
- **Reconnection support** for dropped connections

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/zbonzo/Warlock.git
cd warlock-game

# Install dependencies
npm install

# Start development server
npm run dev
```

The server will start on `http://localhost:3001`

### Environment Setup

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3001
LOG_LEVEL=debug
GAME_TIMEOUT_MINUTES=30
```

## 🏗️ Architecture

### Server Structure

```
server/
├── config/           # Game configuration and balance
├── controllers/      # Socket event handlers
├── middleware/       # Validation and rate limiting
├── models/          # Game entities and systems
├── services/        # Business logic
├── utils/           # Utilities and helpers
└── tests/           # Test suites
```

### Key Systems

- **GameRoom**: Manages individual game instances
- **Player**: Handles player state and abilities
- **CombatSystem**: Processes damage and death
- **WarlockSystem**: Manages conversion mechanics
- **StatusEffectManager**: Handles temporary effects
- **MonsterController**: AI and scaling difficulty

## 🔧 Development

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:controllers

# Watch mode for development
npm run test:watch
```

### Code Quality

```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Validate everything (runs in CI)
npm run validate
```

### Documentation

```bash
# Generate API documentation
npm run docs:generate

# Serve documentation locally
npm run docs:serve
```

## 📡 API Reference

### Socket Events

#### Client → Server

- `createGame` - Create a new game room
- `joinGame` - Join an existing game
- `selectCharacter` - Choose race and class
- `startGame` - Begin the game (host only)
- `performAction` - Use an ability
- `useRacialAbility` - Use racial ability

#### Server → Client

- `gameCreated` - Game room created successfully
- `playerList` - Updated player information
- `gameStarted` - Game has begun
- `roundResult` - Results of a game round
- `errorMessage` - Error occurred

### HTTP Endpoints

- `GET /api/config` - Basic configuration
- `GET /api/config/races` - Available races
- `GET /api/config/classes` - Available classes
- `GET /health` - Server health check

See [API Documentation](./docs/api/) for complete details.

## 🎯 Game Rules

### Setup

1. 3-20 players join a game room
2. Each player selects a race and class combination
3. Host starts the game
4. One player is randomly assigned as the initial Warlock

### Gameplay

1. **Action Phase**: All players simultaneously choose abilities
2. **Resolution Phase**: Actions resolve in order of priority
3. **Monster Phase**: Monster attacks the lowest HP player
4. **Status Phase**: Poison, buffs, and other effects process
5. Repeat until win condition met

### Win Conditions

- **Good Wins**: All Warlocks eliminated OR certain special conditions
- **Evil Wins**: Warlocks become majority of remaining players

### Character Examples

#### Warrior (Human)

- **Slash**: Basic attack dealing solid damage
- **Shield Wall**: Gain armor for protection
- **Battle Cry**: Protect all allies with armor boost

#### Assassin (Elf)

- **Backstab**: High damage single attack
- **Shadow Veil**: Become invisible to avoid targeting
- **Death Mark**: Poison target and become invisible

## 🧪 Testing Strategy

### Test Coverage

- **Unit Tests**: Individual functions and methods (90%+ coverage)
- **Integration Tests**: System interactions and workflows
- **End-to-End Tests**: Complete game scenarios
- **Performance Tests**: Load testing with multiple games

### Critical Test Areas

1. **Game Flow**: Creation → Character Selection → Combat → Win Conditions
2. **Ability System**: All 60+ abilities work correctly
3. **Warlock Mechanics**: Conversion rates and detection
4. **Error Handling**: Invalid inputs and edge cases
5. **Reconnection**: Players can rejoin after disconnection

### Running Tests

```bash
# Full test suite with coverage report
npm run test:coverage

# Test specific areas
npm run test:controllers
npm run test:models
npm run test:integration

# Continuous testing during development
npm run test:watch
```

## 🚀 Deployment

### Production Build

```bash
# Install production dependencies
npm ci --only=production

# Start production server
npm start
```

### Environment Variables

```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
GAME_TIMEOUT_MINUTES=45
ALLOWED_ORIGINS=https://yourdomain.com
```

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server/ ./server/
EXPOSE 3001
CMD ["npm", "start"]
```

## 📊 Monitoring

### Health Checks

- `GET /health` - Basic server status
- Socket connection monitoring
- Game room count tracking
- Memory usage alerts

### Logging

- Structured logging with timestamps
- Configurable log levels
- Error aggregation and alerting
- Performance metrics

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run validate`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- Follow existing code style (enforced by Prettier)
- Write tests for new features
- Update documentation as needed
- Ensure CI passes before submitting PR

### Adding New Features

#### New Abilities

1. Add ability definition to `server/config/character/classes.js`
2. Create handler in `server/models/systems/abilityHandlers/`
3. Register handler in the appropriate category file
4. Write unit tests for the ability
5. Update documentation

#### New Classes/Races

1. Add to configuration files
2. Update compatibility mappings
3. Create racial abilities if needed
4. Add to test fixtures
5. Update documentation

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Development Guide](./docs/development/)
- [API Documentation](./docs/api/)
- [Game Mechanics](./docs/game/)
- [Architecture Overview](./server/README.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 📞 Support

- Create an issue for bug reports
- Join our Discord for discussions (link)
- Check the documentation for common questions

## 🏆 Acknowledgments

- Inspired by social deduction games like Mafia and Werewolf
- Built with Socket.IO for real-time communication
- Extensive testing with Jest
- CI/CD powered by GitHub Actions
- Gemini, Claude, ChatGPT, CodeRabbit. The real MVPs
