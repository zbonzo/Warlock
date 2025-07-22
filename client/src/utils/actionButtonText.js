/**
 * @fileoverview Dynamic action button text based on selected abilities
 * Provides atmospheric button text for different abilities and states
 * Button text sourced from abilities configuration
 */

/**
 * Mapping of ability types to their atmospheric button text
 * This mirrors the buttonText properties defined in server/config/character/abilities.js
 */
const ABILITY_BUTTON_TEXT = {
  // Attack abilities - Basic
  attack: {
    ready: 'Draw Blade',
    submitted: 'Strike Ready'
  },
  fireball: {
    ready: 'Ignite Flame',
    submitted: 'Fire Burning'
  },
  magicMissile: {
    ready: 'Focus Arcane',
    submitted: 'Magic Charged'
  },
  backstab: {
    ready: 'Find Opening',
    submitted: 'Shadow Strike'
  },
  poisonStrike: {
    ready: 'Coat Blade',
    submitted: 'Venom Ready'
  },
  holyBolt: {
    ready: 'Channel Divine',
    submitted: 'Light Focused'
  },
  psychicBolt: {
    ready: 'Focus Mind',
    submitted: 'Psychic Locked'
  },
  recklessStrike: {
    ready: 'Abandon Defense',
    submitted: 'All Out Attack'
  },
  lightningBolt: {
    ready: 'Call Lightning',
    submitted: 'Storm Bound'
  },
  pistolShot: {
    ready: 'Take Aim',
    submitted: 'Locked and Loaded'
  },
  preciseShot: {
    ready: 'Take Careful Aim',
    submitted: 'Shot Lined Up'
  },
  clawSwipe: {
    ready: 'Bare Claws',
    submitted: 'Primal Fury'
  },

  // Attack abilities - Advanced
  pyroblast: {
    ready: 'Summon Inferno',
    submitted: 'Volcano Erupts'
  },
  arcaneBarrage: {
    ready: 'Weave Barrage',
    submitted: 'Magic Torrents'
  },
  twinStrike: {
    ready: 'Dual Wield',
    submitted: 'Blades Dance'
  },
  shiv: {
    ready: 'Quick Stab',
    submitted: 'Blade Strikes'
  },
  aimedShot: {
    ready: 'Mark Weakness',
    submitted: 'Targeting Set'
  },
  barbedArrow: {
    ready: 'Nock Arrow',
    submitted: 'Bowstring Taut'
  },

  // Attack abilities - AOE
  infernoBlast: {
    ready: 'Unleash Inferno',
    submitted: 'Flames Spread'
  },
  meteorShower: {
    ready: 'Call Stars',
    submitted: 'Meteors Fall'
  },
  deathMark: {
    ready: 'Mark for Death',
    submitted: 'Doom Sealed'
  },
  chainLightning: {
    ready: 'Chain Storm',
    submitted: 'Lightning Arcs'
  },
  ricochetRound: {
    ready: 'Angle Shot',
    submitted: 'Trajectory Set'
  },
  sweepingStrike: {
    ready: 'Wide Arc',
    submitted: 'Sweeping Blow'
  },

  // Heal abilities
  bandage: {
    ready: 'Dress Wounds',
    submitted: 'Bandaging'
  },
  cauterize: {
    ready: 'Sear Wounds',
    submitted: 'Flame Heals'
  },
  swiftMend: {
    ready: 'Quick Mend',
    submitted: 'Light Flows'
  },
  heal: {
    ready: 'Channel Light',
    submitted: 'Healing Flow'
  },
  ancestralHeal: {
    ready: 'Commune Spirits',
    submitted: 'Ancestors Guide'
  },
  rejuvenation: {
    ready: 'Nature\'s Touch',
    submitted: 'Life Renewed'
  },

  // Defense abilities
  shieldWall: {
    ready: 'Raise Guard',
    submitted: 'Shield Wall'
  },
  arcaneShield: {
    ready: 'Weave Protection',
    submitted: 'Barrier Cast'
  },
  shadowVeil: {
    ready: 'Embrace Darkness',
    submitted: 'Shadows Dance'
  },
  smokeBomb: {
    ready: 'Ready Reflexes',
    submitted: 'Poised to Evade'
  },
  divineShield: {
    ready: 'Blessed Ward',
    submitted: 'Divine Grace'
  },
  spiritGuard: {
    ready: 'Summon Spirits',
    submitted: 'Guardians Watch'
  },
  totemShield: {
    ready: 'Plant Totems',
    submitted: 'Wards Active'
  },
  smokeScreen: {
    ready: 'Create Cover',
    submitted: 'Smoke Deployed'
  },
  camouflage: {
    ready: 'Fade to Shadow',
    submitted: 'Vanished'
  },
  barkskin: {
    ready: 'Harden Skin',
    submitted: 'Bark Armor'
  },

  // Special abilities
  battleCry: {
    ready: 'Rally Allies',
    submitted: 'War Cry'
  },
  poisonTrap: {
    ready: 'Set Trap',
    submitted: 'Trap Armed'
  },
  fatesEye: {
    ready: 'Peer Beyond',
    submitted: 'Visions Clear'
  },
  sanctuaryOfTruth: {
    ready: 'Consecrate Ground',
    submitted: 'Sanctuary Blessed'
  },
  thirstyBlade: {
    ready: 'Blood Pact',
    submitted: 'Blade Hungers'
  },
  controlMonster: {
    ready: 'Tame Beast',
    submitted: 'Will Bent'
  },
  entangle: {
    ready: 'Call the Wild',
    submitted: 'Nature Awakened'
  },
  
  // Default fallbacks
  default: {
    ready: 'Submit Action',
    submitted: 'Action Locked'
  }
};

/**
 * Get atmospheric button text for a given ability type and state
 * @param {string} abilityType - The type of ability selected
 * @param {boolean} isSubmitted - Whether the action has been submitted
 * @param {boolean} isSubmitting - Whether the action is currently submitting
 * @returns {string} The button text to display
 */
export const getActionButtonText = (abilityType, isSubmitted, isSubmitting = false) => {
  if (isSubmitting) {
    return 'Casting...';
  }
  
  const abilityText = ABILITY_BUTTON_TEXT[abilityType] || ABILITY_BUTTON_TEXT.default;
  
  return isSubmitted ? abilityText.submitted : abilityText.ready;
};

/**
 * Get the button variant based on ability type and state
 * @param {string} abilityType - The type of ability selected
 * @param {boolean} isSubmitted - Whether the action has been submitted
 * @returns {string} The button variant ('primary', 'secondary', 'danger')
 */
export const getActionButtonVariant = (abilityType, isSubmitted) => {
  if (isSubmitted) {
    return 'secondary'; // Orange glow for submitted state
  }
  
  // Determine variant based on ability type
  if (abilityType?.includes('heal') || abilityType?.includes('regeneration')) {
    return 'primary'; // Purple for healing
  }
  
  if (['pistolShot', 'swordStrike', 'fireBlast', 'lightningBolt'].includes(abilityType)) {
    return 'primary'; // Purple for main attacks
  }
  
  return 'primary'; // Default to primary
};

export default {
  getActionButtonText,
  getActionButtonVariant
};