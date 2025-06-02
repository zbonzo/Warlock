# Warlock Game Server - Development Guide

## System Overview

A real-time multiplayer deduction game where players collaborate to defeat monsters while secretly-assigned Warlocks try to corrupt the group. Built with Node.js, Socket.IO, and a modular event-driven architecture.

### Core Game Loop
1. **Setup**: Players join, select race/class, host starts
2. **Action Phase**: All players submit actions simultaneously  
3. **Resolution**: Actions execute in order, monster attacks, effects process
4. **Progression**: Check wins, level up, repeat

## Architecture Map

```
server/
├── 🎯 ENTRY POINTS
│   ├── index.js                    # App entry point
│   └── server.js                   # Express + Socket.IO setup
├── ⚙️ CONFIGURATION  
│   ├── index.js                    # Config aggregator
│   ├── gameBalance.js              # 🔥 Core balance (damage, scaling, conversion)
│   ├── statusEffects.js            # Status effect rules
│   ├── character/                  # Character system
│   │   ├── index.js                # Character config aggregator  
│   │   ├── races.js                # 🔥 6 races + racial abilities
│   │   ├── classes.js              # 🔥 12 classes + ALL abilities
│   │   └── playerSettings.js       # Base player stats
│   ├── messages/                   # All game text
│   │   ├── index.js                # Message system + formatting
│   │   ├── core.js                 # Errors, success, events
│   │   ├── combat.js               # Damage/death messages
│   │   ├── abilities/              # Ability-specific text
│   │   │   ├── attacks.js, defense.js, healing.js
│   │   │   ├── special.js, racial.js
│   │   ├── warlock.js, monster.js, player.js, ui.js
│   └── environments/               # Dev/prod overrides
├── 🎮 CONTROLLERS (Socket Event Handlers)
│   ├── GameController.js           # 🔥 Game lifecycle (create/start/actions)
│   ├── playerController.js         # Player join/disconnect/character
│   └── MonsterController.js        # 🔥 Monster AI and behavior
├── 🛡️ MIDDLEWARE
│   └── validation.js               # Input validation
├── 🏗️ MODELS (Game Entities)
│   ├── GameRoom.js                 # 🔥 Central game state coordinator
│   ├── Player.js                   # 🔥 Player entity (stats/abilities/effects)
│   ├── AbilityRegistry.js          # Maps ability types → handlers
│   └── systems/                    # Game subsystems
│       ├── SystemsFactory.js       # 🔥 Dependency injection for all systems
│       ├── CombatSystem.js         # 🔥 Damage calculation + death processing  
│       ├── StatusEffectManager.js  # 🔥 Poison/buffs/debuffs lifecycle
│       ├── WarlockSystem.js        # 🔥 Conversion mechanics + win conditions
│       ├── RacialAbilitySystem.js  # Racial ability processing
│       ├── GameStateUtils.js       # Common game state queries
│       └── abilityHandlers/        # Individual ability implementations
│           ├── index.js            # Registers all handlers
│           ├── attackAbilities.js  # Damage-dealing abilities
│           ├── defenseAbilities.js # Shields/invisibility  
│           ├── healAbilities.js    # Healing abilities
│           ├── specialAbilities.js # Detection/stun/utility
│           ├── racialAbilities.js  # Race-specific abilities
│           └── abilityRegistryUtils.js # Registration helpers
├── 🔧 SERVICES
│   └── gameService.js              # 🔥 High-level game management
├── 🛠️ UTILITIES  
│   ├── errorHandler.js             # Centralized error handling
│   └── logger.js                   # Logging utility
├── 🔗 SHARED
│   └── gameChecks.js               # Reusable validation
└── 🌐 ROUTES
    └── configRoutes.js             # REST API for configuration
```

🔥 = Most frequently modified files

---

## Quick Reference: File Selection Guide

### Game Balance & Rules
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Adjust damage/HP | `config/gameBalance.js` | `config/character/classes.js` |
| Warlock conversion rates | `config/gameBalance.js` | `models/systems/WarlockSystem.js` |
| Status effect rules | `config/statusEffects.js` | `models/systems/StatusEffectManager.js` |
| Combat mechanics | `models/systems/CombatSystem.js` | `config/gameBalance.js` |

### Character System  
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Add new race | `config/character/races.js` | `models/systems/abilityHandlers/racialAbilities.js` |
| Add new class | `config/character/classes.js` | Appropriate `abilityHandlers/*.js` |
| Modify abilities | `config/character/classes.js` | `models/systems/abilityHandlers/` |
| Race/class compatibility | `config/character/races.js` | `config/character/index.js` |

### Game Flow & Events
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Socket events | `server.js` | Appropriate controller |
| Game lifecycle | `controllers/GameController.js` | `services/gameService.js` |
| Player actions | `models/GameRoom.js` | `models/Player.js` |
| Round processing | `models/GameRoom.js` | `models/systems/SystemsFactory.js` |

### Abilities & Effects
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Attack abilities | `models/systems/abilityHandlers/attackAbilities.js` | `config/messages/abilities/attacks.js` |
| Healing abilities | `models/systems/abilityHandlers/healAbilities.js` | `config/messages/abilities/healing.js` |
| Status effects | `models/systems/StatusEffectManager.js` | `config/statusEffects.js` |
| Racial abilities | `models/systems/abilityHandlers/racialAbilities.js` | `config/character/races.js` |

### Error Handling & Validation
| Task | Primary Files | Supporting Files |
|------|---------------|------------------|
| Input validation | `middleware/validation.js` | `shared/gameChecks.js` |
| Error messages | `utils/errorHandler.js` | `config/messages/core.js` |
| Socket error handling | `server.js` | `utils/errorHandler.js` |

---

## Human Guide: Understanding the System

### Character System Deep Dive

**Races (6 total)** - Each has unique passive or active abilities:
- **Human**: Adaptability - Replace one class ability permanently
- **Dwarf**: Stone Armor - Starts with armor that degrades when hit
- **Elf**: Moonbeam - When wounded, attacks reveal if attacker is Warlock  
- **Orc**: Blood Rage - Double next attack damage, take self-damage
- **Satyr**: Life Bond - Heal based on monster's remaining HP each turn
- **Skeleton**: Undying - Resurrect once at 1 HP when killed

**Classes (12 total)** - Each has 4 abilities unlocked by level:
- **Melee**: Warrior (tank), Assassin (stealth), Alchemist (poison), Barbarian (rage)
- **Caster**: Pyromancer (fire), Wizard (arcane), Priest (healing), Oracle (detection), Shaman (lightning), Druid (nature)
- **Ranged**: Gunslinger (guns), Tracker (bow + monster control)

### Core Mechanics

**Warlock System**: 
- 1-5 players secretly assigned as Warlocks based on player count
- Warlocks try to corrupt others through combat
- Conversion chance increases with Warlock population
- Win by majority corruption OR eliminating all good players

**Combat Flow**:
1. All actions submitted simultaneously
2. Actions execute by `order` property (shields first, then attacks, then healing)
3. Monster targets highest threat player (with avoidance rules)
4. Status effects process (poison damage, effect countdown)
5. Deaths processed (including Undying resurrection)

**Key Formulas**:
- **Armor**: 10% damage reduction per point, 90% max reduction
- **Monster Scaling**: Base 100 HP + 25 per level, damage = base × (age + 2)
- **Player Scaling**: +20% HP and +25% damage per level
- **Threat**: `((armor × monsterDamage) + totalDamage + healing) × decayRate`


**Threat System**:
- Players generate threat through damage, healing, and abilities
- High-armor players generate amplified threat when attacking monsters
- Monster targets highest threat player (with avoidance rules)
- 25% threat decay per round prevents infinite buildup
- 50% threat reduction on monster death for repositioning opportunities

### Development Patterns

**Adding New Content**:
1. **New Ability**: Define in `classes.js` → Implement handler → Add messages
2. **New Race**: Define in `races.js` → Implement racial ability → Add to compatibility  
3. **New Status Effect**: Define in `statusEffects.js` → Update manager → Add messages

**Debugging Common Issues**:
- **Action not working**: Check ability definition + handler registration + validation
- **Damage wrong**: Check `CombatSystem.js` + `Player.modifyDamage()` + balance config
- **Effect not applying**: Check `StatusEffectManager.js` + effect definition
- **Conversion issues**: Check `WarlockSystem.js` + balance settings

### Message System
All game text centralized in `config/messages/` with placeholder support:
```javascript
messages.formatMessage("Player {playerName} takes {damage} damage", {
  playerName: "Alice", 
  damage: 15
}); // "Player Alice takes 15 damage"
```

### System Dependencies
- `GameRoom` orchestrates everything via `SystemsFactory`
- `SystemsFactory` handles dependency injection between systems
- `AbilityRegistry` maps ability types to handler functions
- All systems use `GameStateUtils` for common queries

---

## Common Development Scenarios

### Scenario: "I want to add a new attack ability"
**Needs**: 
- `config/character/classes.js` (to add ability definition)
- `models/systems/abilityHandlers/attackAbilities.js` (to implement handler)  
- `config/messages/abilities/attacks.js` (for ability messages)

### Scenario: "Players are complaining Warlocks convert too often"
**Needs**:
- `config/gameBalance.js` (conversion rates and limits)
- `models/systems/WarlockSystem.js` (conversion logic)

### Scenario: "I need to fix a bug where poison doesn't work"
**Needs**:
- `models/systems/StatusEffectManager.js` (poison processing)
- `config/statusEffects.js` (poison configuration)
- `models/Player.js` (if poison affects player stats)

### Scenario: "I want to add a new race"
**Needs**:
- `config/character/races.js` (race definition)
- `models/systems/abilityHandlers/racialAbilities.js` (racial ability implementation)
- `config/messages/abilities/racial.js` (racial ability messages)
- `config/character/index.js` (if compatibility changes needed)

### Scenario: "Tanks can't hold aggro effectively"
**Needs**:
- `config/gameBalance.js` (increase `armorMultiplier` or reduce `decayRate`)
- `models/systems/MonsterController.js` (check threat calculation logic)

---

## Testing & Deployment

**Local Development**:
```bash
npm run dev          # Nodemon with Babel
npm start            # Production start
```

**Key Environment Variables**:
- `NODE_ENV`: development/production/test
- `PORT`: Server port (default 3001)  
- `LOG_LEVEL`: ERROR/WARN/INFO/DEBUG

**Architecture Benefits**:
- ✅ **Modular**: Systems are independent and testable
- ✅ **Configurable**: Balance changes don't require code changes
- ✅ **Extensible**: New abilities/races follow established patterns  
- ✅ **Maintainable**: Clear separation of concerns
- ✅ **Real-time**: Socket.IO handles all client communication
