# RacialAbilityCard Component

A specialized card component for displaying racial abilities with usage limits, cooldowns, and visual availability states.

## Usage

```jsx
import RacialAbilityCard from '@components/game/RacialAbilityCard';

<RacialAbilityCard 
  ability={racialAbility}
  usesLeft={player.racialUsesLeft}
  cooldown={player.racialCooldown}
  disabled={someCondition}
  onUse={handleRacialAbilityUse}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `ability` | Object | Yes | - | Racial ability data object |
| `usesLeft` | number | Yes | - | Number of uses remaining |
| `cooldown` | number | Yes | - | Cooldown turns remaining |
| `disabled` | boolean | No | `false` | Whether ability is disabled for other reasons |
| `onUse` | function | Yes | - | Callback when ability is used |

## Ability Object Structure

```javascript
{
  type: "adaptability",             // Unique identifier
  name: "Adaptability",             // Display name
  description: "Change one of...",  // Descriptive text
  usageLimit: "perGame",            // "perGame" or "perRound"
  maxUses: 1                        // Maximum uses (typically 1)
}
```

## Features

- Visual card that displays racial ability details
- Color-coded by race
- Shows availability status
- Displays usage limits and cooldowns
- Visual indicators for remaining uses (for perGame abilities)
- Hover animations for available abilities
- Pulsing indicator for available abilities
- Disabled state for unavailable abilities

## Race-Specific Styling

Each race has its own color scheme:

| Race | Color |
|------|-------|
| Human | Royal Blue |
| Dwarf | Saddle Brown |
| Elf | Forest Green |
| Orc | Dark Red |
| Satyr | Dark Orchid |
| Skeleton | Charcoal |

## Extra Utilities

This component exports useful racial ability data:

```jsx
import { 
  RACE_TO_ABILITY,
  ABILITY_ICONS,
  RACE_COLORS,
  getRaceFromAbilityType,
  getAbilityTypeFromRace,
  getRaceColor
} from '@components/game/RacialAbilityCard';
```

These utilities can be used elsewhere in your application to maintain consistency in racial ability handling.

## Example

```jsx
const humanAbility = {
  type: "adaptability",
  name: "Adaptability",
  description: "Change one of your class abilities to another of the same level for the remainder of the game",
  usageLimit: "perGame",
  maxUses: 1
};

<RacialAbilityCard
  ability={humanAbility}
  usesLeft={1}
  cooldown={0}
  disabled={false}
  onUse={() => handleRacialAbility('adaptability')}
/>
```

## Relationship with AbilityCard

While RacialAbilityCard has some similarity with AbilityCard, it's optimized specifically for racial abilities with:

- Different visual layout focusing on usage and cooldown
- Specialized indicators for remaining uses
- Pulsing animation for available abilities
- Race-specific color coding