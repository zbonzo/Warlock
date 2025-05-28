/**
 * @fileoverview Monster system messages
 * Messages for monster attacks, death, respawning, and scaling
 */

module.exports = {
  // Monster attack messages
  attacks: {
    monsterAttacks: 'The Monster attacks!',
    monsterLunges: 'The Monster lunges forward!',
    monsterStrikes: 'The Monster strikes with fury!',
    monsterRages: 'The Monster attacks with savage intent!',
    monsterSlashes: 'The Monster slashes with its claws!',

    // Monster attack variations
    furiousAssault: 'The Monster launches a furious assault!',
    savageStrike: 'The Monster delivers a savage strike!',
    brutalAttack: 'The Monster makes a brutal attack!',
    recklessCharge: 'The Monster charges recklessly!',
  },

  // Monster targeting messages
  targeting: {
    monsterFocuses: 'The Monster focuses on {targetName}!',
    monsterTargets: 'The Monster targets {targetName}!',
    monsterHunts: 'The Monster hunts {targetName}!',
    monsterStalks: 'The Monster stalks toward {targetName}!',

    // No target messages
    monsterNoTarget: 'The Monster looks around but finds no targets.',
    monsterSwipes: 'The Monster swipes at shadows.',
    monsterRoars: 'The Monster roars in frustration.',
    monsterConfused: 'The Monster appears confused by the lack of targets.',
    emptyBattlefield: 'The Monster finds the battlefield empty.',
  },

  // Monster death and defeat messages
  death: {
    monsterDefeated: 'The Monster has been defeated!',
    monsterFalls: 'The Monster falls with a thunderous crash!',
    monsterCollapses: 'The Monster collapses in defeat!',
    monsterVanquished: 'The Monster is vanquished!',
    finalRoar: 'The Monster lets out a final roar before collapsing!',

    // Death variations
    monsterCrumbles: "The Monster's form crumbles to dust!",
    monsterDissolves: 'The Monster dissolves into nothingness!',
    monsterBanished: 'The Monster is banished back to the void!',
    lightBanishes: 'The light banishes the Monster from this realm!',
  },

  // Monster respawn and scaling messages
  respawn: {
    monsterRespawns: 'A new Monster appears with {hp} HP!',
    newMonster: 'Another Monster emerges from the shadows!',
    darknessSpawns: 'The darkness spawns another Monster!',
    monsterRises: 'Another Monster rises to take its place!',
    evilManifests: 'The evil force manifests a new Monster!',

    // Respawn variations
    portalOpens: 'A dark portal opens and releases a new Monster!',
    shadowsCoalesce: 'The shadows coalesce into a new Monster!',
    voidSpawns: 'The void spawns a more powerful Monster!',
    darknessReforms: 'The darkness reforms into a new threat!',
  },

  // Monster scaling and progression messages
  scaling: {
    monsterGrows: 'The Monster grows stronger!',
    monsterEvolves: 'The Monster evolves into a more dangerous form!',
    powerIncreases: "The Monster's power increases!",
    threatEscalates: 'The Monster threat escalates!',

    // Level progression
    levelIncrease: 'The Monster has reached level {level}!',
    ageIncrease: 'The Monster ages and becomes more powerful!',
    strengthGrows: "The Monster's strength grows with age!",

    // Damage scaling
    damageIncreases: 'The Monster now deals {damage} damage per attack!',
    moreDeadly: 'The Monster becomes more deadly!',
    enhancedThreat: 'The Monster poses an enhanced threat!',
  },

  // Monster behavior messages
  behavior: {
    monsterHesitates: 'The Monster hesitates...',
    monsterCircles: 'The Monster circles its prey.',
    monsterGrowls: 'The Monster growls menacingly.',
    monsterWaits: 'The Monster waits for an opportunity to strike.',

    // Aggressive behavior
    monsterSnarls: 'The Monster snarls at the heroes!',
    monsterThreatens: 'The Monster makes threatening gestures!',
    monsterPostures: 'The Monster strikes an intimidating posture!',

    // Defensive behavior
    monsterRetreats: 'The Monster retreats momentarily.',
    monsterRegroups: 'The Monster regroups for another attack.',
    monsterReconsiders: 'The Monster reconsiders its approach.',
  },

  // Monster taking damage messages
  damage: {
    monsterHurt: 'The Monster is hurt by the attack!',
    monsterWounded: 'The Monster is wounded!',
    monsterBloodies: 'The Monster bleeds from its wounds!',
    monsterStaggers: 'The Monster staggers from the blow!',

    // Damage reactions
    monsterRoarsInPain: 'The Monster roars in pain!',
    monsterWhimpers: 'The Monster whimpers from the damage!',
    monsterReels: 'The Monster reels from the attack!',

    // Heavy damage
    criticalHit: 'A critical blow strikes the Monster!',
    massiveDamage: 'The Monster takes massive damage!',
    devastating: 'A devastating attack wounds the Monster severely!',
  },

  // Monster status and health messages
  status: {
    monsterHealthy: 'The Monster appears healthy and strong.',
    monsterWounded: 'The Monster shows signs of injury.',
    monsterBadlyHurt: 'The Monster is badly hurt.',
    monsterNearDeath: 'The Monster is near death.',

    // Health thresholds
    mostlyHealthy: 'The Monster has taken minor damage.',
    moderatelyWounded: 'The Monster is moderately wounded.',
    severelyDamaged: 'The Monster is severely damaged.',
    criticalCondition: 'The Monster is in critical condition.',
  },

  // Monster control and manipulation messages
  control: {
    monsterControlled: "The Monster's eyes glow with unnatural fury!",
    monsterCompelled: 'The Monster is compelled to attack!',
    monsterManipulated: 'Dark magic manipulates the Monster!',
    monsterDominated: 'The Monster is dominated by evil will!',

    // Control effects
    unnatural: 'The Monster moves with unnatural purpose!',
    possessed: 'The Monster appears possessed!',
    influenced: "External forces influence the Monster's actions!",

    // Control expiration
    controlEnds: 'The unnatural control over the Monster ends.',
    monsterFree: 'The Monster is free from external influence.',
    willRestored: "The Monster's natural will is restored.",
  },
};
