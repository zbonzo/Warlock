# CharacterSelectPage Component

A component that allows players to select their character's race and class, with automatic validation of compatible combinations.

## Usage

```jsx
import CharacterSelectPage from '@pages/CharacterSelectPage';

<CharacterSelectPage 
  playerName="Player1"
  gameCode="1234"
  selectedRace={currentRace}
  selectedClass={currentClass}
  onSelectRace={handleRaceSelect}
  onSelectClass={handleClassSelect}
  onConfirm={handleConfirm}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `playerName` | string | Yes | - | Player's name to display in welcome message |
| `gameCode` | string | Yes | - | Game code to display |
| `selectedRace` | string | No | `null` | Currently selected race ID |
| `selectedClass` | string | No | `null` | Currently selected class ID |
| `onSelectRace` | function | Yes | - | Callback when race is selected `(raceId) => void` |
| `onSelectClass` | function | Yes | - | Callback when class is selected `(classId) => void` |
| `onConfirm` | function | Yes | - | Callback when selection is confirmed `(race, class) => void` |

## Features

- Grid-based selection of races and classes with visual cards
- Automatic random suggestion of valid race/class combinations
- Dynamic filtering of incompatible options based on initial selection
- Visual feedback for selected and disabled options
- Confirmation button that's only enabled for valid combinations
- Status message that provides feedback on selection validity
- Responsive design for different screen sizes
- Animations for enhanced user experience

## Character Options

### Available Races

The component provides 6 races to choose from, each with a visual icon:
- Human 👤
- Dwarf 🧔‍♂️
- Elf 🧝
- Orc 👹
- Satyr 👺
- Skeleton 💀

### Available Classes

The component provides 12 classes to choose from, each with a unique icon and color:
- Warrior ⚔️
- Pyromancer 🔥
- Wizard 🧙
- Assassin 🗡️
- Rogue 👥
- Priest ✝️
- Oracle 🔮
- Seer 👁️
- Shaman 🌪️
- Gunslinger 🔫
- Tracker 🏹
- Druid 🌿

## Compatibility Logic

Not all race/class combinations are valid. The component handles the compatibility with these features:
- Automatic filtering of incompatible options
- Visual disabling of incompatible options
- Resetting incompatible selections when needed
- Status message explaining compatibility requirements

## Component Structure

```
CharacterSelectPage/
├── CharacterSelectPage.jsx    # Main component
├── CharacterSelectPage.css    # Styles
├── constants.js               # Race and class data
├── index.js                   # Re-export file
└── README.md                  # Documentation
```

## Example

```jsx
import React, { useState } from 'react';
import CharacterSelectPage from '@pages/CharacterSelectPage';

function GameSetup({ gameCode, playerName, onCharacterConfirm }) {
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  
  const handleConfirm = (race, cls) => {
    onCharacterConfirm({ race, class: cls });
  };
  
  return (
    <CharacterSelectPage 
      playerName={playerName}
      gameCode={gameCode}
      selectedRace={selectedRace}
      selectedClass={selectedClass}
      onSelectRace={setSelectedRace}
      onSelectClass={setSelectedClass}
      onConfirm={handleConfirm}
    />
  );
}
```

## Exported Constants

The component also exports constants that can be used in other components:

```jsx
import { RACES, CLASSES, CLASS_TO_RACES, getCompatibleClasses } from '@pages/CharacterSelectPage';

// Use the race data elsewhere
const raceNames = RACES.map(race => race.label);
```

## Accessibility

- Visual indicators for selected and disabled states
- Status messages for selection feedback
- Keyboard navigable interface
- Appropriate contrast for text readability
- Responsive design that works on different screen sizes