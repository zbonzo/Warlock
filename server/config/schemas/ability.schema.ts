import { z } from 'zod';

// Base schemas for nested objects
const ButtonTextSchema = z.object({
  ready: z.string(),
  submitted: z.string(),
});

const PoisonEffectSchema = z.object({
  damage: z.number().min(0),
  turns: z.number().min(1),
});

const BleedEffectSchema = z.object({
  damage: z.number().min(0),
  turns: z.number().min(1),
});

const VulnerabilityEffectSchema = z.object({
  damageIncrease: z.number().min(0),
  turns: z.number().min(1),
});

const HealingOverTimeSchema = z.object({
  amount: z.number().min(0),
  turns: z.number().min(1),
});

// Params schema for different ability types
const AbilityParamsSchema = z.record(z.string(), z.union([
  z.string(),
  z.number(),
  z.boolean(),
  PoisonEffectSchema,
  BleedEffectSchema,
  VulnerabilityEffectSchema,
  HealingOverTimeSchema,
]));

// Main ability schema
export const AbilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['Attack', 'Defense', 'Heal', 'Special']),
  effect: z.string().nullable(),
  target: z.enum(['Single', 'Self', 'Multi']),
  params: AbilityParamsSchema,
  order: z.number().min(0),
  cooldown: z.number().min(0),
  flavorText: z.string(),
  tags: z.array(z.string()).min(1),
  buttonText: ButtonTextSchema.optional(),
});

// Schema for the abilities collection
export const AbilitiesMapSchema = z.record(z.string(), AbilitySchema);

// Refined schema with additional validation
export const AbilitySchemaRefined = AbilitySchema.refine(
  (ability) => ability.id === ability.id.toLowerCase(),
  {
    message: "Ability ID must be lowercase",
    path: ["id"],
  }
).refine(
  (ability) => {
    // Validate that effect matches expected patterns
    const validEffects = [
      null, 'poison', 'bleed', 'vulnerable', 'healingOverTime', 'shielded', 
      'invisible', 'spiritGuard', 'deathMark', 'stun', 'selfDamage', 'passive',
      'lifesteal', 'controlMonster', 'reveal', 'sanctuary', 'poisonTrap',
      'rage', 'teleport', 'decoy', 'soulburn', 'timeManipulation'
    ];
    return validEffects.includes(ability.effect);
  },
  {
    message: "Effect must be a valid effect type",
    path: ["effect"],
  }
).refine(
  (ability) => {
    // Validate that cooldown abilities have appropriate order values
    if (ability.cooldown > 0 && ability.order < 100) {
      return ability.category === 'Defense' || ability.category === 'Special';
    }
    return true;
  },
  {
    message: "Low order values should typically be reserved for defense/special abilities",
    path: ["order"],
  }
);

// Export type inference from schema
export type Ability = z.infer<typeof AbilitySchema>;
export type AbilitiesMap = z.infer<typeof AbilitiesMapSchema>;
export type ButtonText = z.infer<typeof ButtonTextSchema>;

// Validation helpers
export const validateAbility = (data: unknown): Ability => {
  return AbilitySchemaRefined.parse(data);
};

export const validateAbilitiesMap = (data: unknown): AbilitiesMap => {
  return AbilitiesMapSchema.parse(data);
};

// Safe validation that returns errors instead of throwing
export const safeValidateAbility = (data: unknown) => {
  return AbilitySchemaRefined.safeParse(data);
};

export const safeValidateAbilitiesMap = (data: unknown) => {
  return AbilitiesMapSchema.safeParse(data);
};