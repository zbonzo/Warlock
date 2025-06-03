/**
 * Constants for the GameTutorialModal component
 * Updated with new game mechanics and mobile-optimized content
 */

/**
 * Tutorial steps data - mobile-optimized with concise content
 * Each step has a title, content, and optional type for styling
 * @type {Array}
 */
export const TUTORIAL_STEPS = [
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
      { icon: '✨', name: 'Sanctuary', desc: 'Punishes Warlock attackers' },
    ],
  },
  {
    title: '🧠 Strategy Tips',
    content: 'Key strategies for both sides:',
    type: 'strategy',
    goodTips: [
      'Monitor who monster avoids',
      'Track healing patterns',
      'Coordinate threat management',
      'Save detection for strong suspects',
    ],
    warlockTips: [
      'Generate some threat to avoid suspicion',
      "Don't reveal hidden knowledge",
      'Help early, corrupt later',
      'Time conversions carefully',
    ],
  },
  {
    title: '🎮 Ready to Play!',
    content: "You're ready for battle!",
    type: 'ready',
    reminders: [
      'Threat system - not lowest HP',
      'Monster avoids Warlocks',
      'Use your archetype strengths',
      'Watch, learn, adapt',
    ],
  },
];

/**
 * Get a specific tutorial step
 *
 * @param {number} index - Index of the step to retrieve
 * @returns {Object|null} Tutorial step or null if not found
 */
export function getTutorialStep(index) {
  if (index >= 0 && index < TUTORIAL_STEPS.length) {
    return TUTORIAL_STEPS[index];
  }
  return null;
}
