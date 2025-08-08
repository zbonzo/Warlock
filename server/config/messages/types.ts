/**
 * @fileoverview TypeScript types for message configuration
 */

export interface AttackMessages {
  // Basic attack failure messages
  attackInvisible: string;
  attackInvalidTarget: string;
  attackDeadTarget: string;

  // Poison-related messages
  poisonStrike: string;
  poisonApplied: string;

  // Multi-hit attack messages
  multiHitAnnounce: string;
  multiHitSummary: string;
  multiHitMissed: string;
  multiHitIndividual: string;
  multiHitMiss: string;

  // Vulnerability messages
  vulnerabilityApplied: string;
  vulnerabilityStrike: string;

  // Area of Effect messages
  aoeAnnounce: string;
  aoeNoTargets: string;

  // Death Mark specific
  deathMarkPoison: string;
  deathMarkInvalidTarget: string;

  // Poison Trap messages
  poisonTrapAnnounce: string;
  poisonTrapCaught: string;

  // General failure messages
  targetNotFound: string;
  targetDead: string;
  noTargetsAvailable: string;
}

export interface DefenseMessages {
  // Shield messages
  holyShield: string;
  shieldProtect: string;
  shieldStrike: string;

  // Evasion/Stealth messages
  evasionActivate: string;
  invisibilityFade: string;
  stealthBreak: string;

  // Defense outcome messages
  defenseSuccess: string;
  defensePartial: string;
  defenseFailed: string;
}

export interface HealingMessages {
  // Basic healing
  healSelf: string;
  healOther: string;
  healFailed: string;

  // Regeneration
  regenerationApplied: string;
  regenerationTick: string;

  // Conditional healing
  conditionalHeal: string;
  groupHeal: string;

  // Healing failures
  healDeadTarget: string;
  healFullHealth: string;
}

export interface SpecialMessages {
  // Status application
  statusApplied: string;
  statusResisted: string;
  statusCleared: string;

  // Special mechanics
  adaptabilityGained: string;
  coordinationBonus: string;

  // Ultimate abilities
  ultimateActivated: string;
  ultimateReady: string;
  ultimateOnCooldown: string;
}

export interface RacialMessages {
  // Racial ability activations
  racialActivated: string;
  racialPassive: string;
  racialTriggered: string;

  // Racial-specific outcomes
  racialSuccess: string;
  racialFailed: string;
}

export interface CombatMessages {
  // Turn flow
  turnStart: string;
  turnEnd: string;
  turnSkipped: string;

  // Combat outcomes
  damageDealt: string;
  damageMitigated: string;
  damageEvaded: string;

  // Critical hits
  criticalHit: string;
  criticalMiss: string;
}

export interface StatusEffectMessages {
  // Application
  effectApplied: string;
  effectRefreshed: string;
  effectResisted: string;

  // Expiration
  effectExpired: string;
  effectCleansed: string;

  // Periodic effects
  effectTick: string;
  effectProc: string;
}

export interface PlayerMessages {
  // Connection
  playerJoined: string;
  playerLeft: string;
  playerReconnected: string;

  // Game state
  playerReady: string;
  playerNotReady: string;
  playerWaiting: string;

  // Character selection
  characterSelected: string;
  characterChanged: string;
}

export interface UIMessages {
  // Game flow
  gameStarting: string;
  gameStarted: string;
  gameEnded: string;

  // Round flow
  roundStarting: string;
  roundEnded: string;

  // Action prompts
  selectAction: string;
  selectTarget: string;
  confirmAction: string;
}

export interface ServerMessages {
  // Connection logs
  socketConnected: string;
  socketDisconnected: string;
  socketError: string;

  // Game logs
  gameCreated: string;
  gameDestroyed: string;
  gameStateChanged: string;

  // Error logs
  validationError: string;
  runtimeError: string;
  criticalError: string;
}

export interface MessageConfig {
  // Core messages (backward compatibility)
  errors: Record<string, string>;
  success: Record<string, string>;
  events: Record<string, string>;
  privateMessages: Record<string, string>;
  winConditions: Record<string, string>;

  // Organized message categories
  abilities: {
    attacks: AttackMessages;
    defense: DefenseMessages;
    healing: HealingMessages;
    special: SpecialMessages;
    racial: RacialMessages;
  };

  // System messages
  combat: CombatMessages;
  statusEffects: StatusEffectMessages;
  warlock: Record<string, string>;
  monster: Record<string, string>;

  // Player and UI
  player: PlayerMessages;
  ui: UIMessages;
  server: ServerMessages;
}
