"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeValidateAbilitiesMap = exports.safeValidateAbility = exports.validateAbilitiesMap = exports.validateAbility = exports.AbilitySchemaRefined = exports.AbilitiesMapSchema = exports.AbilitySchema = void 0;
const zod_1 = require("zod");
// Base schemas for nested objects
const ButtonTextSchema = zod_1.z.object({
    ready: zod_1.z.string(),
    submitted: zod_1.z.string(),
});
const PoisonEffectSchema = zod_1.z.object({
    damage: zod_1.z.number().min(0),
    turns: zod_1.z.number().min(1),
});
const BleedEffectSchema = zod_1.z.object({
    damage: zod_1.z.number().min(0),
    turns: zod_1.z.number().min(1),
});
const VulnerabilityEffectSchema = zod_1.z.object({
    damageIncrease: zod_1.z.number().min(0),
    turns: zod_1.z.number().min(1),
});
const HealingOverTimeSchema = zod_1.z.object({
    amount: zod_1.z.number().min(0),
    turns: zod_1.z.number().min(1),
});
// Params schema for different ability types
const AbilityParamsSchema = zod_1.z.record(zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.number(),
    zod_1.z.boolean(),
    PoisonEffectSchema,
    BleedEffectSchema,
    VulnerabilityEffectSchema,
    HealingOverTimeSchema,
]));
// Main ability schema
exports.AbilitySchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    category: zod_1.z.enum(['Attack', 'Defense', 'Heal', 'Special']),
    effect: zod_1.z.string().nullable(),
    target: zod_1.z.enum(['Single', 'Self', 'Multi']),
    params: AbilityParamsSchema,
    order: zod_1.z.number().min(0),
    cooldown: zod_1.z.number().min(0),
    flavorText: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).min(1),
    buttonText: ButtonTextSchema.optional(),
});
// Schema for the abilities collection
exports.AbilitiesMapSchema = zod_1.z.record(zod_1.z.string(), exports.AbilitySchema);
// Refined schema with additional validation
exports.AbilitySchemaRefined = exports.AbilitySchema.refine((ability) => ability.id === ability.id.toLowerCase(), {
    message: "Ability ID must be lowercase",
    path: ["id"],
}).refine((ability) => {
    // Validate that effect matches expected patterns
    const validEffects = [
        null, 'poison', 'bleed', 'vulnerable', 'healingOverTime', 'shielded',
        'invisible', 'spiritGuard', 'deathMark', 'stun', 'selfDamage', 'passive',
        'lifesteal', 'controlMonster', 'reveal', 'sanctuary', 'poisonTrap',
        'rage', 'teleport', 'decoy', 'soulburn', 'timeManipulation'
    ];
    return validEffects.includes(ability.effect);
}, {
    message: "Effect must be a valid effect type",
    path: ["effect"],
}).refine((ability) => {
    // Validate that cooldown abilities have appropriate order values
    if (ability.cooldown > 0 && ability.order < 100) {
        return ability.category === 'Defense' || ability.category === 'Special';
    }
    return true;
}, {
    message: "Low order values should typically be reserved for defense/special abilities",
    path: ["order"],
});
// Validation helpers
const validateAbility = (data) => {
    return exports.AbilitySchemaRefined.parse(data);
};
exports.validateAbility = validateAbility;
const validateAbilitiesMap = (data) => {
    return exports.AbilitiesMapSchema.parse(data);
};
exports.validateAbilitiesMap = validateAbilitiesMap;
// Safe validation that returns errors instead of throwing
const safeValidateAbility = (data) => {
    return exports.AbilitySchemaRefined.safeParse(data);
};
exports.safeValidateAbility = safeValidateAbility;
const safeValidateAbilitiesMap = (data) => {
    return exports.AbilitiesMapSchema.safeParse(data);
};
exports.safeValidateAbilitiesMap = safeValidateAbilitiesMap;
