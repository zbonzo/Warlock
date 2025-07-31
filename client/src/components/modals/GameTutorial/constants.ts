/**
 * Constants for the GameTutorialModal component
 * Updated with new game mechanics, balance features, and mobile-optimized content
 */

interface TutorialHighlight {
  icon: string;
  text: string;
}

interface TutorialRace {
  emoji: string;
  name: string;
  type: string;
  ability: string;
}

interface TutorialClass {
  emoji: string;
  name: string;
  type: string;
  desc: string;
}

interface TutorialMethod {
  icon: string;
  name: string;
  desc: string;
}

interface TutorialStep {
  title: string;
  content: string;
  type: string;
  highlights?: TutorialHighlight[];
  steps?: string[];
  tips?: string[];
  formula?: string;
  rules?: string[];
  races?: TutorialRace[];
  classes?: TutorialClass[];
  strategy?: string;
  tells?: string[];
  methods?: TutorialMethod[];
  goodTips?: string[];
  warlockTips?: string[];
  reminders?: string[];
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: '🧙‍♂️ Welcome to Warlock!',
    content:
      'A multiplayer social deduction game where heroes fight monsters while hidden Warlocks try to corrupt the team.',
    type: 'welcome',
    highlights: [
      {
        icon: '🎯',
        text: 'Good Players: Defeat monsters and eliminate Warlocks',
      },
      { icon: '👹', text: 'Warlocks: Convert or eliminate all good players' },
    ],
  },
  {
    title: '🎮 How Each Round Works',
    content: 'Each round follows a simple 4-step process:',
    type: 'flow',
    steps: [
      '1. Everyone picks actions',
      '2. Actions resolve by speed',
      '3. Monster attacks someone',
      '4. Poison/effects trigger',
    ],
    tips: [
      'Shield abilities go first',
      'Monster uses threat system',
      'Some abilities have cooldowns',
      'Warlocks see everything in battle log',
    ],
  },
  {
    title: '⚔️ Monster Threat System',
    content: 'Monster attacks whoever has the highest threat (not lowest HP!)',
    type: 'threat',
    formula: 'Threat = Armor × Monster Damage + Your Damage + Healing × 0.8',
    rules: [
      'High armor = more threat when attacking',
      'Healing generates threat (80% of damage value)',
      'Monster NEVER targets Warlocks',
      'Except when Tracker uses Control Monster',
      'Threat decays 25% each round',
    ],
  },
  {
    title: '🤝 Coordination Bonuses',
    content: 'Team up for extra damage and healing!',
    type: 'coordination',
    highlights: [
      {
        icon: '⚔️',
        text: '+10% damage per teammate targeting same enemy',
      },
      {
        icon: '💚',
        text: '+10% healing per teammate healing same target',
      },
    ],
    tips: [
      'Coordinate attacks on monsters for massive damage',
      'Multiple healers can save dying teammates',
      'Works on monster attacks too!',
      'Communication is key for timing',
    ],
  },
  {
    title: '🔄 Comeback Mechanics',
    content: 'Good team gets stronger when losing!',
    type: 'comeback',
    highlights: [
      {
        icon: '⚡',
        text: 'Activates when ≤25% good players remain',
      },
      {
        icon: '💪',
        text: '+25% damage and healing for survivors',
      },
      {
        icon: '🛡️',
        text: '+1 armor and corruption resistance',
      },
    ],
    tips: [
      'Never give up - the game can turn around!',
      'Survivors become much harder to kill',
      'Focus on detection when buffed',
      'Coordinate remaining good players',
    ],
  },
  {
    title: '🧬 Races - Part 1',
    content: 'Choose your race archetype:',
    type: 'races1',
    races: [
      {
        emoji: '👩‍🌾',
        name: 'Artisan',
        type: 'Glass Cannon',
        ability: 'Adaptability: Replace one ability',
      },
      {
        emoji: '🧔‍♂️',
        name: 'Rockhewn',
        type: 'Tank',
        ability: 'Stone Armor: 8 armor, degrades when hit',
      },
      {
        emoji: '💀',
        name: 'Lich',
        type: 'Extreme Glass Cannon',
        ability: 'Undying: Resurrect once at 1 HP',
      },
    ],
  },
  {
    title: '🧬 Races - Part 2',
    content: 'More race archetypes:',
    type: 'races2',
    races: [
      {
        emoji: '🧌',
        name: 'Orc',
        type: 'Berserker',
        ability: 'Blood Rage: Double damage, hurt self',
      },
      {
        emoji: '🧝',
        name: 'Crestfallen',
        type: 'Agile Striker',
        ability: 'Moonbeam: Detect attackers when low HP',
      },
      {
        emoji: '🐐',
        name: 'Kinfolk',
        type: 'Support Healer',
        ability: 'Life Bond: Heal based on monster HP',
      },
    ],
  },
  {
    title: '🛡️ Tank Classes',
    content: 'Protect your team and control monster threat:',
    type: 'tanks',
    classes: [
      {
        emoji: '⚔️',
        name: 'Warrior',
        type: 'Pure Tank',
        desc: 'Highest armor, group shields',
      },
      {
        emoji: '✨',
        name: 'Priest',
        type: 'Support Tank',
        desc: 'High HP + armor, healing',
      },
      {
        emoji: '🌿',
        name: 'Druid',
        type: 'HP Tank',
        desc: 'Highest HP, nature magic',
      },
    ],
    strategy: 'Attack monsters to generate threat and protect your team!',
  },
  {
    title: '💥 Damage Classes',
    content: 'Deal high damage while managing threat:',
    type: 'dps',
    classes: [
      {
        emoji: '🔥',
        name: 'Pyromancer',
        type: 'Extreme DPS',
        desc: 'Highest damage, very fragile',
      },
      {
        emoji: '🥷',
        name: 'Assassin',
        type: 'Stealth Striker',
        desc: 'High damage, invisibility',
      },
      {
        emoji: '💥',
        name: 'Gunslinger',
        type: 'Ranged Striker',
        desc: 'High damage, ranged focus',
      },
    ],
    strategy: 'Deal damage without drawing too much monster threat!',
  },
  {
    title: '🔮 Support Classes',
    content: 'Provide utility and detect threats:',
    type: 'support',
    classes: [
      {
        emoji: '🔮',
        name: 'Oracle',
        type: 'Detection Specialist',
        desc: 'Warlock detection, truth magic',
      },
      {
        emoji: '🧙',
        name: 'Wizard',
        type: 'Versatile Caster',
        desc: 'Balanced magic, area attacks',
      },
      {
        emoji: '🧪',
        name: 'Alchemist',
        type: 'Utility Support',
        desc: 'Poison, traps, versatility',
      },
    ],
    strategy: "Use detection abilities wisely - they're limited!",
  },
  {
    title: '🔍 Finding Warlocks',
    content: 'Watch for these Warlock tells:',
    type: 'detection',
    tells: [
      'Monster never attacks them',
      "Healing doesn't work on them",
      'They know too much',
      'They can corrupt others',
      'Take +15% damage when detected',
      "Can't corrupt same turn as detected",
    ],
    methods: [
      {
        icon: '🔮',
        name: 'Eye of Fate',
        desc: 'Reveals Warlock, damages you if wrong',
      },
      {
        icon: '🌙',
        name: 'Moonbeam',
        desc: 'Auto-detects attackers when wounded',
      },
      {
        icon: '✨',
        name: 'Sanctuary',
        desc: 'Punishes Warlock attackers',
      },
      {
        icon: '🏹',
        name: 'Barbed Arrow',
        desc: 'Tracker ability that can reveal corruption',
      },
      {
        icon: '🔥',
        name: 'Pyroblast',
        desc: 'Pyromancer ability that burns away lies',
      },
    ],
  },
  {
    title: '🧠 Strategy Tips',
    content: 'Key strategies for both sides:',
    type: 'strategy',
    goodTips: [
      'Monitor who monster avoids',
      'Track healing patterns',
      'Coordinate attacks for damage bonuses',
      'Save detection for strong suspects',
      'Use comeback mechanics when losing',
      'Detected Warlocks are vulnerable',
    ],
    warlockTips: [
      'Generate some threat to avoid suspicion',
      "Don't reveal hidden knowledge",
      'Help early, corrupt later',
      'Avoid detection - you take +15% damage',
      "Can't corrupt when detected",
      'Time conversions carefully',
    ],
  },
  {
    title: '⚖️ Detection Consequences',
    content: 'Being detected as a Warlock has serious consequences:',
    type: 'consequences',
    highlights: [
      {
        icon: '💥',
        text: 'Take +15% damage for the rest of the turn',
      },
      {
        icon: '🚫',
        text: 'Cannot corrupt others same turn as detected',
      },
      {
        icon: '👁️',
        text: 'Detection messages are private by default',
      },
    ],
    tips: [
      'Detected Warlocks become priority targets',
      'Plan corruption attempts carefully',
      'Detection timing matters strategically',
      'Use team coordination against detected Warlocks',
    ],
  },
  {
    title: '🎮 Ready to Play!',
    content: "You're ready for battle!",
    type: 'ready',
    reminders: [
      'Threat system - not lowest HP',
      'Monster avoids Warlocks',
      'Coordinate attacks for bonuses',
      'Comeback mechanics help losing teams',
      'Detection weakens Warlocks',
      'Watch, learn, adapt',
    ],
  },
];

export function getTutorialStep(index: number): TutorialStep | null {
  if (index >= 0 && index < TUTORIAL_STEPS.length) {
    return TUTORIAL_STEPS[index];
  }
  return null;
}