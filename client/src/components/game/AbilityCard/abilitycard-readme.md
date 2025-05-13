# AbilityCard Component

A reusable card component for displaying game abilities in the Warlock game.

## Usage

```jsx
import AbilityCard from '@components/game/AbilityCard';

// Regular ability
<AbilityCard
  ability={abilityObject}
  selected={selectedAbility === abilityObject.type}
  onSelect={handleAbilitySelect}
/>

// Racial ability
<AbilityCard
  ability={racialAbilityObject}
  selected={racialSelected}
  onSelect={handleRacialAbilityUse}
  isRacial={true}
  raceName={player.race}
  usesLeft={player.racialUsesLeft}
  cooldown={player.racialCooldown}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `ability` | Object | Yes | - | The ability data object |
| `selected` | boolean | Yes | - | Whether this ability is currently selected |
| `onSelect` | function | Yes | - | Callback function when ability is selected |
| `isRacial` | boolean | No | `false` | Whether this is a racial ability |
| `raceName` | string | No | `null` | Race name for racial abilities |
| `usesLeft` | number | No | `null` | Number of uses left for racial abilities |
| `cooldown` | number | No | `null` | Cooldown turns left for racial abilities |

## Ability Object Structure

```javascript
{
  type: 'fireball',            // Unique identifier
  name: 'Fireball',            // Display name
  category: 'Attack',          // Category (Attack, Defense, Heal, Special)
  effect: 'poison',            // Effect type (optional)
  target: 'Single',            // Target type (Single, Multi, Self)
  params: {                    // Ability parameters
    damage: 30,                // Damage amount
    poison: {                  // Additional effects
      damage: 5,
      turns: 2
    }
  },
  description: '...',          // Description text (for racial abilities)
  usageLimit: 'perGame'        // Usage limit (for racial abilities)
}
```

## Visual Features

- Color-coded by ability category or race
- Icons for different ability types
- Visual feedback for selected state
- Disabled appearance for unavailable racial abilities
- Hover and active state animations
