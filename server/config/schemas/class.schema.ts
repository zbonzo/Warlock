import { z } from 'zod';

// Schema for class attributes
const ClassAttributesSchema = z.object({
  hpModifier: z.number().min(0.1).max(5.0),
  armorModifier: z.number().min(0.1).max(5.0),
  damageModifier: z.number().min(0.1).max(5.0),
  description: z.string().min(1),
});

// Schema for ability progression (4 levels)
const AbilityProgressionSchema = z.object({
  level1: z.string().min(1),
  level2: z.string().min(1),
  level3: z.string().min(1),
  level4: z.string().min(1),
});

// Valid class categories
const ClassCategorySchema = z.enum(['Melee', 'Caster', 'Ranged']);

// Main classes configuration schema
export const ClassesConfigSchema = z.object({
  availableClasses: z.array(z.string().min(1)).min(1),
  classCategories: z.record(ClassCategorySchema, z.array(z.string().min(1))),
  classAttributes: z.record(z.string(), ClassAttributesSchema),
  classAbilityProgression: z.record(z.string(), AbilityProgressionSchema),
});

// Refined schema with additional validation
export const ClassesConfigSchemaRefined = ClassesConfigSchema.refine(
  (config) => {
    // Ensure all classes in availableClasses have attributes
    const missingAttributes = config.availableClasses.filter(
      className => !config.classAttributes[className]
    );
    return missingAttributes.length === 0;
  },
  {
    message: "All classes in availableClasses must have corresponding classAttributes",
    path: ["classAttributes"],
  }
).refine(
  (config) => {
    // Ensure all classes in availableClasses have ability progression
    const missingProgression = config.availableClasses.filter(
      className => !config.classAbilityProgression[className]
    );
    return missingProgression.length === 0;
  },
  {
    message: "All classes in availableClasses must have corresponding classAbilityProgression",
    path: ["classAbilityProgression"],
  }
).refine(
  (config) => {
    // Ensure all classes in categories exist in availableClasses
    const allCategorizedClasses = Object.values(config.classCategories).flat();
    const invalidClasses = allCategorizedClasses.filter(
      className => !config.availableClasses.includes(className)
    );
    return invalidClasses.length === 0;
  },
  {
    message: "All classes in categories must exist in availableClasses",
    path: ["classCategories"],
  }
).refine(
  (config) => {
    // Ensure all classes are categorized
    const categorizedClasses = new Set(Object.values(config.classCategories).flat());
    const uncategorizedClasses = config.availableClasses.filter(
      className => !categorizedClasses.has(className)
    );
    return uncategorizedClasses.length === 0;
  },
  {
    message: "All classes must be assigned to a category",
    path: ["classCategories"],
  }
);

// Type exports
export type ClassesConfig = z.infer<typeof ClassesConfigSchema>;
export type ClassAttributes = z.infer<typeof ClassAttributesSchema>;
export type AbilityProgression = z.infer<typeof AbilityProgressionSchema>;
export type ClassCategory = z.infer<typeof ClassCategorySchema>;

// Validation helpers
export const validateClassesConfig = (data: unknown): ClassesConfig => {
  return ClassesConfigSchemaRefined.parse(data);
};

export const safeValidateClassesConfig = (data: unknown) => {
  return ClassesConfigSchemaRefined.safeParse(data);
};