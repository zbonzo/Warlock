import { z } from 'zod';

// Monster configuration schemas
const DamageScalingSchema = z.object({
  ageMultiplier: z.number().min(0),
  maxAge: z.number().nullable(),
});

const MonsterTargetingSchema = z.object({
  preferLowestHp: z.boolean(),
  useThreatSystem: z.boolean(),
  canAttackInvisible: z.boolean(),
  fallbackToHighestHp: z.boolean(),
  canAttackWarlock: z.boolean(),
});

const ThreatSystemSchema = z.object({
  enabled: z.boolean(),
  armorMultiplier: z.number().min(0),
  damageMultiplier: z.number().min(0),
  healingMultiplier: z.number().min(0),
  decayRate: z.number().min(0).max(1),
  monsterDeathReduction: z.number().min(0).max(1),
  avoidLastTargetRounds: z.number().min(0),
  enableTiebreaker: z.boolean(),
  fallbackToLowestHp: z.boolean(),
  minimumThreatThreshold: z.number().min(0),
  logThreatChanges: z.boolean(),
});

const MonsterSchema = z.object({
  baseHp: z.number().min(1),
  baseDamage: z.number().min(0),
  baseAge: z.number().min(0),
  hpPerLevel: z.number().min(0),
  useExponentialScaling: z.boolean(),
  hpScalingMultiplier: z.number().min(0),
  damageScaling: DamageScalingSchema,
  targeting: MonsterTargetingSchema,
  threat: ThreatSystemSchema,
});

// Player configuration schemas
const ArmorSchema = z.object({
  reductionRate: z.number().min(0).max(1),
  maxReduction: z.number().min(0).max(1),
  minReduction: z.number().min(-5).max(1),
});

const LevelUpSchema = z.object({
  hpIncrease: z.number().min(0),
  damageIncrease: z.number().min(0),
  fullHealOnLevelUp: z.boolean(),
});

const AntiDetectionSchema = z.object({
  enabled: z.boolean(),
  alwaysHealWarlocks: z.boolean(),
  detectionChance: z.number().min(0).max(1),
  requireActualHealing: z.boolean(),
  applyToHealingOverTime: z.boolean(),
  logDetections: z.boolean(),
});

const HealingSchema = z.object({
  modifierBase: z.number().min(0),
  warlockSelfHealOnly: z.boolean(),
  rejectWarlockHealing: z.boolean(),
  antiDetection: AntiDetectionSchema,
});

const DeathSchema = z.object({
  pendingDeathSystem: z.boolean(),
  allowResurrection: z.boolean(),
});

const PlayerSchema = z.object({
  armor: ArmorSchema,
  levelUp: LevelUpSchema,
  healing: HealingSchema,
  death: DeathSchema,
});

// Coordination bonus schema
const CoordinationBonusSchema = z.object({
  enabled: z.boolean(),
  damageBonus: z.number().min(0),
  healingBonus: z.number().min(0),
  appliesToMonster: z.boolean(),
  maxBonusTargets: z.number().min(1),
  announceCoordination: z.boolean(),
});

// Warlock configuration schemas
const ConversionSchema = z.object({
  baseChance: z.number().min(0).max(1),
  maxChance: z.number().min(0).max(1),
  scalingFactor: z.number().min(0),
  preventLevelUpCorruption: z.boolean(),
  maxCorruptionsPerRound: z.number().min(0),
  maxCorruptionsPerPlayer: z.number().min(0),
  corruptionCooldown: z.number().min(0),
  aoeModifier: z.number().min(0).max(1),
  randomModifier: z.number().min(0).max(1),
  untargetedModifier: z.number().min(0).max(1),
});

const CorruptionSchema = z.object({
  canCorruptWhenDetected: z.boolean(),
  detectionDamagePenalty: z.number().min(0),
  corruptionIsPublic: z.boolean(),
  detectionPenaltyDuration: z.number().min(0),
});

const WarlockScalingSchema = z.object({
  enabled: z.boolean(),
  playersPerWarlock: z.number().min(1),
  minimumWarlocks: z.number().min(0),
  maximumWarlocks: z.number().min(1),
  scalingMethod: z.enum(['linear', 'exponential', 'custom']),
  customScaling: z.record(z.string(), z.number().min(0)),
});

const WinConditionsSchema = z.object({
  allWarlocksGone: z.enum(['Good', 'Evil']),
  allPlayersWarlocks: z.enum(['Good', 'Evil']),
  majorityThreshold: z.number().min(0).max(1),
});

const WarlockSchema = z.object({
  conversion: ConversionSchema,
  corruption: CorruptionSchema,
  scaling: WarlockScalingSchema,
  winConditions: WinConditionsSchema,
});

// Comeback mechanics schema
const ComebackMechanicsSchema = z.object({
  enabled: z.boolean(),
  threshold: z.number().min(0).max(100),
  damageIncrease: z.number().min(0),
  healingIncrease: z.number().min(0),
  armorIncrease: z.number().min(0),
  corruptionResistance: z.number().min(0).max(100),
  announceActivation: z.boolean(),
});

// Stone armor schema
const StoneArmorSchema = z.object({
  initialValue: z.number(),
  degradationPerHit: z.number().min(0),
  minimumValue: z.number(),
  allowNegative: z.boolean(),
});

// Combat configuration schemas
const ActionOrderRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
});

const ActionOrderSchema = z.object({
  ultraFast: ActionOrderRangeSchema,
  defensive: ActionOrderRangeSchema,
  special: ActionOrderRangeSchema,
  attacks: ActionOrderRangeSchema,
  healing: ActionOrderRangeSchema,
});

const DefaultOrdersSchema = z.object({
  attack: z.number().min(0),
  defense: z.number().min(0),
  heal: z.number().min(0),
  special: z.number().min(0),
});

const CombatSchema = z.object({
  actionOrder: ActionOrderSchema,
  defaultOrders: DefaultOrdersSchema,
});

// Ability variance schema
const AbilityVarianceSchema = z.object({
  critChance: z.number().min(0).max(1),
  failChance: z.number().min(0).max(1),
  ultraFailChance: z.number().min(0).max(1),
  critMultiplier: z.number().min(0),
});

// Game code schema
const GameCodeSchema = z.object({
  minValue: z.number().min(0),
  maxValue: z.number().min(0),
  length: z.number().min(1),
});

// Rate limiting schemas
const ActionLimitSchema = z.object({
  limit: z.number().min(0),
  window: z.number().min(0),
});

const RateLimitingSchema = z.object({
  defaultLimit: z.number().min(0),
  defaultTimeWindow: z.number().min(0),
  actionLimits: z.record(z.string(), ActionLimitSchema),
});

// Main game balance configuration schema
export const GameBalanceConfigSchema = z.object({
  monster: MonsterSchema,
  player: PlayerSchema,
  coordinationBonus: CoordinationBonusSchema,
  warlock: WarlockSchema,
  comebackMechanics: ComebackMechanicsSchema,
  stoneArmor: StoneArmorSchema,
  combat: CombatSchema,
  abilityVariance: AbilityVarianceSchema,
  gameCode: GameCodeSchema,
  rateLimiting: RateLimitingSchema,
});

// Refined schema with additional validation
export const GameBalanceConfigSchemaRefined = GameBalanceConfigSchema.refine(
  (config) => {
    // Ensure max conversion chance >= base conversion chance
    return config.warlock.conversion.maxChance >= config.warlock.conversion.baseChance;
  },
  {
    message: "Maximum conversion chance must be >= base conversion chance",
    path: ["warlock", "conversion"],
  }
).refine(
  (config) => {
    // Ensure game code max >= min
    return config.gameCode.maxValue >= config.gameCode.minValue;
  },
  {
    message: "Game code max value must be >= min value",
    path: ["gameCode"],
  }
).refine(
  (config) => {
    // Ensure action order ranges are valid (min <= max)
    const actionOrder = config.combat.actionOrder;
    return Object.values(actionOrder).every(range => range.min <= range.max);
  },
  {
    message: "Action order ranges must have min <= max",
    path: ["combat", "actionOrder"],
  }
).refine(
  (config) => {
    // Ensure maximum warlocks >= minimum warlocks
    return config.warlock.scaling.maximumWarlocks >= config.warlock.scaling.minimumWarlocks;
  },
  {
    message: "Maximum warlocks must be >= minimum warlocks",
    path: ["warlock", "scaling"],
  }
);

// Type exports
export type GameBalanceConfig = z.infer<typeof GameBalanceConfigSchema>;
export type MonsterConfig = z.infer<typeof MonsterSchema>;
export type PlayerConfig = z.infer<typeof PlayerSchema>;
export type WarlockConfig = z.infer<typeof WarlockSchema>;
export type CombatConfig = z.infer<typeof CombatSchema>;

// Validation helpers
export const validateGameBalanceConfig = (data: unknown): GameBalanceConfig => {
  return GameBalanceConfigSchemaRefined.parse(data);
};

export const safeValidateGameBalanceConfig = (data: unknown) => {
  return GameBalanceConfigSchemaRefined.safeParse(data);
};