# EventsLog Component

A component for displaying game events in a scrollable, color-coded log format.

## Usage

```jsx
import EventsLog from '@components/game/EventsLog';

<EventsLog events={eventMessages} />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `events` | string[] | Yes | - | Array of event messages to display |

## Features

- Auto-scrolls to the bottom when new events are added
- Color-codes events based on their content
- Alternating background colors for even/odd entries for better readability
- Custom scrollbar styling
- Empty state message when no events are present

## Example

```jsx
const eventMessages = [
  "Game started!",
  "Player 1 uses Fireball on Monster.",
  "Monster attacks Player 2 for 15 damage!",
  "Warlock has converted Player 3!",
  "Player 4 healed Player 2 for 20 HP.",
  "Player 5 has died!"
];

<EventsLog events={eventMessages} />
```

## Event Type Color Coding

The component automatically detects different types of events and applies appropriate styling:

- **Warlock events**: Purple, bold
- **Attack events**: Red
- **Heal events**: Green
- **Defense events**: Blue
- **Monster events**: Dark red
- **Death events**: Orange, bold
- **Regular events**: Default text color

## Customization

The component uses CSS variables from the theme context for its colors. To customize the appearance, modify the color variables in your theme context.