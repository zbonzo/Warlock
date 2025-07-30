import { z } from 'zod';

// Schema for race attributes
const RaceAttributesSchema = z.object({
  hpModifier: z.number().min(0.1).max(5.0),
  armorModifier: z.number().min(0.1).max(5.0),
  damageModifier: z.number().min(0.1).max(5.0),
  compatibleClasses: z.array(z.string().min(1)).min(1),
  description: z.string().min(1),
});

// Schema for racial ability parameters
const RacialAbilityParamsSchema = z.record(z.string(), z.union([
  z.string(),
  z.number(),
  z.boolean(),
]));

// Schema for racial abilities
const RacialAbilitySchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  usageLimit: z.enum(['passive', 'perGame', 'perRound', 'perTurn']),
  maxUses: z.number().min(0),
  cooldown: z.number().min(0),
  effect: z.string().min(1),
  target: z.enum(['Self', 'Single', 'Multi']),
  params: RacialAbilityParamsSchema,
});

// Main races configuration schema
export const RacesConfigSchema = z.object({
  availableRaces: z.array(z.string().min(1)).min(1),
  raceAttributes: z.record(z.string(), RaceAttributesSchema),
  racialAbilities: z.record(z.string(), RacialAbilitySchema),
});

// Refined schema with additional validation
export const RacesConfigSchemaRefined = RacesConfigSchema.refine(
  (config) => {
    // Ensure all races in availableRaces have attributes
    const missingAttributes = config.availableRaces.filter(
      raceName => !config.raceAttributes[raceName]
    );
    return missingAttributes.length === 0;
  },
  {
    message: "All races in availableRaces must have corresponding raceAttributes",
    path: ["raceAttributes"],
  }
).refine(
  (config) => {
    // Ensure all races in availableRaces have racial abilities
    const missingAbilities = config.availableRaces.filter(
      raceName => !config.racialAbilities[raceName]
    );
    return missingAbilities.length === 0;
  },
  {
    message: "All races in availableRaces must have corresponding racialAbilities",
    path: ["racialAbilities"],
  }
).refine(
  (config) => {
    // Validate passive abilities have 0 maxUses
    const invalidPassiveAbilities = Object.entries(config.racialAbilities).filter(
      ([_, ability]) => ability.usageLimit === 'passive' && ability.maxUses !== 0
    );
    return invalidPassiveAbilities.length === 0;
  },
  {
    message: "Passive abilities must have maxUses set to 0",
    path: ["racialAbilities"],
  }
).refine(
  (config) => {
    // Validate limited use abilities have maxUses > 0
    const invalidLimitedAbilities = Object.entries(config.racialAbilities).filter(
      ([_, ability]) => ability.usageLimit !== 'passive' && ability.maxUses <= 0
    );
    return invalidLimitedAbilities.length === 0;
  },
  {
    message: "Non-passive abilities must have maxUses greater than 0",
    path: ["racialAbilities"],
  }
);

// Type exports
export type RacesConfig = z.infer<typeof RacesConfigSchema>;
export type RaceAttributes = z.infer<typeof RaceAttributesSchema>;
export type RacialAbility = z.infer<typeof RacialAbilitySchema>;
export type UsageLimit = z.infer<typeof RacialAbilitySchema>['usageLimit'];
export type AbilityTarget = z.infer<typeof RacialAbilitySchema>['target'];

// Validation helpers
export const validateRacesConfig = (data: unknown): RacesConfig => {
  return RacesConfigSchemaRefined.parse(data);
};

export const safeValidateRacesConfig = (data: unknown) => {
  return RacesConfigSchemaRefined.safeParse(data);
};