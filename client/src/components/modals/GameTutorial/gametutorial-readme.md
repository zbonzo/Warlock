# GameTutorialModal Component

A modal component that provides a step-by-step tutorial for new players, explaining the game's core mechanics and rules.

## Usage

```jsx
import GameTutorialModal, { Tooltip } from '@components/modals/GameTutorialModal';

// Main tutorial modal
function GameComponent() {
  const [showTutorial, setShowTutorial] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowTutorial(true)}>
        Show Tutorial
      </button>
      
      <GameTutorialModal 
        isOpen={showTutorial}
        onComplete={() => setShowTutorial(false)}
      />
    </div>
  );
}

// Using the included Tooltip component
function GameInterface() {
  return (
    <div>
      <Tooltip content="Click to attack the monster">
        <button>Attack</button>
      </Tooltip>
    </div>
  );
}
```

## Props

### GameTutorialModal

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | boolean | Yes | - | Whether the tutorial modal is currently open |
| `onComplete` | function | Yes | - | Callback when tutorial is completed or closed |

### Tooltip

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | node | Yes | - | Element to attach tooltip to |
| `content` | string or node | Yes | - | Content to display in tooltip |
| `position` | string | No | 'top' | Position of tooltip ('top', 'right', 'bottom', 'left') |

## Features

- Multi-step tutorial with back/next navigation
- Progress indicator dots showing current step and progress
- Close button for skipping the tutorial
- Keyboard support (ESC to close)
- Smooth animations for transitions between steps
- Responsive design for different screen sizes
- Optional image support for visual explanations
- Included Tooltip component for additional UI guidance

## Tutorial Steps

The tutorial includes 5 steps covering the core game mechanics:

1. **Welcome** - Introduction to the game concept
2. **Abilities** - Explanation of player abilities and class progression
3. **Monster** - Information about monster attacks and scaling
4. **Warlocks** - Details about the Warlock mechanic and corruption
5. **Winning** - Victory conditions for both teams

## Component Structure

```
GameTutorialModal/
├── GameTutorialModal.jsx      # Main component
├── GameTutorialModal.css      # Main component styles
├── constants.js               # Tutorial steps data
├── components/                # Sub-components
│   ├── Tooltip.jsx            # Tooltip component
│   └── Tooltip.css            # Tooltip styles
├── index.js                   # Re-export file
└── README.md                  # Documentation
```

## Customizing Tutorial Content

The tutorial content is defined in the `constants.js` file and can be easily customized:

```javascript
// Add or modify steps in constants.js
export const TUTORIAL_STEPS = [
  {
    title: "Custom Step Title",
    content: "Your custom step content goes here.",
    image: "/path/to/optional/image.jpg" // Optional
  },
  // Add more steps...
];
```

## Tooltip Usage Examples

The included Tooltip component can be used throughout your UI for contextual help:

```jsx
// Basic usage
<Tooltip content="Click to attack">
  <button>Attack</button>
</Tooltip>

// Position options
<Tooltip content="Health potion" position="right">
  <div className="inventory-item">🧪</div>
</Tooltip>

// With rich content
<Tooltip content={<div>Complex <strong>formatted</strong> content</div>}>
  <button>Help</button>
</Tooltip>
```

## Accessibility

- Keyboard navigation support
- Focus management
- ARIA attributes for screen readers
- Visual indicators for current step
- Sufficient color contrast for readability
- Support for keyboard and mouse interactions

## Animation Effects

- Fade-in and scale animation for modal opening
- Smooth transitions between steps
- Subtle animations for interactive elements
- Exit animations when closing the tutorial