# AdaptabilityModal Component

A modal component that implements the Human race's "Adaptability" ability, allowing players to replace one class ability with another from a different class.

## Usage

```jsx
import AdaptabilityModal from '@components/modals/AdaptabilityModal';

<AdaptabilityModal 
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  abilities={playerAbilities}
  maxLevel={currentLevel}
  onReplaceAbility={handleReplaceAbility}
  className={currentClass}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | boolean | Yes | - | Whether the modal is currently open |
| `onClose` | function | Yes | - | Callback when modal is closed |
| `abilities` | object | Yes | - | Map of abilities by level `{ level: [abilities] }` |
| `maxLevel` | number | Yes | - | Maximum level of abilities to show |
| `onReplaceAbility` | function | Yes | - | Callback for ability replacement |
| `className` | string | Yes | - | Current class of the player |

## Features

- Multi-step wizard UI for selecting abilities to replace
- Grouped display of abilities by level
- Visual cards for abilities and classes
- Back navigation between steps
- Keyboard support (ESC to close)
- Responsive design for different screen sizes
- Animations and transitions for enhanced UX

## Component Structure

```
AdaptabilityModal/
├── AdaptabilityModal.jsx        # Main component
├── AdaptabilityModal.css        # Main component styles
├── constants.js                 # Constants and lookup data
├── components/                  # Sub-components
│   ├── AbilityCard.jsx          # Individual ability card
│   ├── AbilityCard.css
│   ├── AbilityList.jsx          # List of abilities by level
│   ├── AbilityList.css
│   ├── ClassCard.jsx            # Individual class card
│   ├── ClassCard.css
│   ├── ClassList.jsx            # Grid of available classes
│   ├── ClassList.css
│   ├── ModalStep.jsx            # Step container
│   └── ModalStep.css
├── index.js                     # Re-export file
└── README.md                    # Documentation
```

## Workflow

The modal implements a 3-step workflow:

1. **Select Ability** - Choose which ability to replace
2. **Select Class** - Choose a class to take an ability from
3. **Select New Ability** - Choose the new ability to use

## Ability Object Structure

Each ability in the `abilities` object should have this structure:

```javascript
{
  type: "slash",                // Unique identifier
  name: "Slash",                // Display name
  category: "Attack",           // Ability category
  unlockAt: 1                   // Level when ability unlocks
}
```

## Example

```jsx
// Example data
const playerAbilities = {
  1: [
    { type: 'slash', name: 'Slash', category: 'Attack', unlockAt: 1 },
    { type: 'bandage', name: 'Bandage', category: 'Heal', unlockAt: 1 }
  ],
  2: [
    { type: 'shieldWall', name: 'Shield Wall', category: 'Defense', unlockAt: 2 }
  ]
};

// Example usage
function CharacterScreen() {
  const [showModal, setShowModal] = useState(false);
  
  const handleReplaceAbility = (oldAbilityType, newAbilityType, level) => {
    console.log(`Replacing ${oldAbilityType} with ${newAbilityType} at level ${level}`);
    // Send to server, update state, etc.
  };
  
  return (
    <div>
      <button onClick={() => setShowModal(true)}>
        Use Adaptability
      </button>
      
      <AdaptabilityModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        abilities={playerAbilities}
        maxLevel={2}
        onReplaceAbility={handleReplaceAbility}
        className="Warrior"
      />
    </div>
  );
}
```

## Accessibility

- Proper focus management
- Keyboard navigation support
- Visual feedback for interactive elements
- ESC key to close modal
- Semantic HTML structure
- Appropriate ARIA attributes

## Animation Effects

- Fade-in animation for the modal overlay
- Slide-in animation for the modal content
- Subtle animations for card hover states
- Transition effects for step changes