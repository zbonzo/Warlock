import { z } from 'zod';

// Schema for effect messages
const EffectMessagesSchema = z.record(z.string(), z.string());

// Schema for effect default parameters with proper typing
const EffectDefaultsSchema = z.object({
  damage: z.number().default(0),
  armor: z.number().default(0),
  turns: z.number().default(1),
  amount: z.number().optional(),
  damageIncrease: z.number().optional(),
  damageReduction: z.number().optional(),
  healingPercent: z.number().optional(),
  healthThreshold: z.number().optional(),
}).passthrough(); // Allow additional properties

// Base effect schema with common properties
const BaseEffectSchema = z.object({
  default: EffectDefaultsSchema,
  stackable: z.boolean(),
  refreshable: z.boolean(),
  messages: EffectMessagesSchema,
});

// Extended schemas for specific effect types
const DamageEffectSchema = BaseEffectSchema.extend({
  damagePerTurn: z.boolean().optional(),
  canCauseDeath: z.boolean().optional(),
  triggersStoneDegradation: z.boolean().optional(),
  allowsActions: z.boolean().optional(),
  processAtEndOfTurn: z.boolean().optional(),
});

const ProtectionEffectSchema = BaseEffectSchema.extend({
  armorStacks: z.boolean().optional(),
  providesDetection: z.boolean().optional(),
});

const VisibilityEffectSchema = BaseEffectSchema.extend({
  preventsTargeting: z.boolean().optional(),
  allowsSelfTargeting: z.boolean().optional(),
  breaksOnAction: z.boolean().optional(),
  redirectsAttacks: z.boolean().optional(),
  affectsMonster: z.boolean().optional(),
});

const ControlEffectSchema = BaseEffectSchema.extend({
  preventsActions: z.boolean().optional(),
  preventsRacialAbilities: z.boolean().optional(),
  allowsPassiveEffects: z.boolean().optional(),
});

const ModifierEffectSchema = BaseEffectSchema.extend({
  affectsDamageCalculation: z.boolean().optional(),
  preventsHealing: z.boolean().optional(),
  hasEndEffect: z.boolean().optional(),
});

const HealingEffectSchema = BaseEffectSchema.extend({
  healsPerTurn: z.boolean().optional(),
  canOverheal: z.boolean().optional(),
  healsEndOfRound: z.boolean().optional(),
});

const PassiveEffectSchema = BaseEffectSchema.extend({
  isPermanent: z.boolean().optional(),
  isPassive: z.boolean().optional(),
  degradesOnHit: z.boolean().optional(),
  triggersOnDeath: z.boolean().optional(),
  revealsCorruption: z.boolean().optional(),
});

const SanctuaryEffectSchema = BaseEffectSchema.extend({
  reducesDamageTaken: z.boolean().optional(),
  preventsTargeting: z.boolean().optional(),
});

// Union schema for all effect types
const StatusEffectSchema = z.union([
  DamageEffectSchema,
  ProtectionEffectSchema,
  VisibilityEffectSchema,
  ControlEffectSchema,
  ModifierEffectSchema,
  HealingEffectSchema,
  PassiveEffectSchema,
  SanctuaryEffectSchema,
  BaseEffectSchema, // Fallback for basic effects
]);

// Processing order schema
const ProcessingOrderSchema = z.record(z.string(), z.number().min(1));

// Global settings schema
const GlobalSettingsSchema = z.object({
  maxEffectsPerPlayer: z.number().min(1),
  maxTurns: z.number().min(1),
  minTurns: z.number().min(1),
  processBeforeActions: z.boolean(),
  processAfterActions: z.boolean(),
  removeExpiredImmediately: z.boolean(),
  allowZeroTurnEffects: z.boolean(),
});

// Main status effects configuration schema
export const StatusEffectsConfigSchema = z.object({
  effects: z.record(z.string(), StatusEffectSchema),
  processingOrder: ProcessingOrderSchema,
  global: GlobalSettingsSchema,
});

// Refined schema with additional validation
export const StatusEffectsConfigSchemaRefined = StatusEffectsConfigSchema.refine(
  (config) => {
    // Ensure all effects in processingOrder exist in effects
    const missingEffects = Object.keys(config.processingOrder).filter(
      effectName => !config.effects[effectName]
    );
    return missingEffects.length === 0;
  },
  {
    message: "All effects in processingOrder must exist in effects",
    path: ["processingOrder"],
  }
).refine(
  (config) => {
    // Ensure maxTurns >= minTurns
    return config.global.maxTurns >= config.global.minTurns;
  },
  {
    message: "maxTurns must be >= minTurns",
    path: ["global"],
  }
).refine(
  (config) => {
    // Ensure permanent effects (-1 turns) are marked as non-refreshable
    const invalidPermanentEffects = Object.entries(config.effects).filter(
      ([_, effect]) => {
        const turns = effect.default.turns;
        return turns === -1 && effect.refreshable === true;
      }
    );
    return invalidPermanentEffects.length === 0;
  },
  {
    message: "Permanent effects (turns: -1) should not be refreshable",
    path: ["effects"],
  }
).refine(
  (config) => {
    // Ensure passive effects are marked as non-stackable
    const invalidPassiveEffects = Object.entries(config.effects).filter(
      ([_, effect]) => {
        const isPassive = (effect as any).isPassive;
        return isPassive === true && effect.stackable === true;
      }
    );
    return invalidPassiveEffects.length === 0;
  },
  {
    message: "Passive effects should not be stackable",
    path: ["effects"],
  }
);

// Type exports
export type StatusEffectsConfig = z.infer<typeof StatusEffectsConfigSchema>;
export type StatusEffect = z.infer<typeof StatusEffectSchema>;
export type ProcessingOrder = z.infer<typeof ProcessingOrderSchema>;
export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;
export type EffectDefaults = z.infer<typeof EffectDefaultsSchema>;
export type EffectMessages = z.infer<typeof EffectMessagesSchema>;

// Validation helpers
export const validateStatusEffectsConfig = (data: unknown): StatusEffectsConfig => {
  return StatusEffectsConfigSchemaRefined.parse(data);
};

export const safeValidateStatusEffectsConfig = (data: unknown) => {
  return StatusEffectsConfigSchemaRefined.safeParse(data);
};
