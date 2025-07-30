import { z } from 'zod';

// Schema for message templates (all strings with potential placeholders)
const MessageTemplateSchema = z.string().min(1);

// Schema for nested message categories
const MessageCategorySchema = z.record(z.string(), MessageTemplateSchema);

// Schema for ability messages (nested structure)
const AbilityMessagesSchema = z.object({
  attacks: MessageCategorySchema,
  defense: MessageCategorySchema,
  healing: MessageCategorySchema,
  special: MessageCategorySchema,
  racial: MessageCategorySchema,
});

// Schema for server log messages (hierarchical by level)
const ServerLogMessagesSchema = z.object({
  info: MessageCategorySchema,
  warn: MessageCategorySchema,
  error: MessageCategorySchema,
  debug: MessageCategorySchema,
});

// Main messages configuration schema
export const MessagesConfigSchema = z.object({
  errors: MessageCategorySchema,
  success: MessageCategorySchema,
  events: MessageCategorySchema,
  privateMessages: MessageCategorySchema,
  winConditions: MessageCategorySchema,
  abilities: AbilityMessagesSchema,
  combat: MessageCategorySchema,
  statusEffects: MessageCategorySchema,
  warlock: MessageCategorySchema,
  monster: MessageCategorySchema,
  player: MessageCategorySchema,
  ui: MessageCategorySchema,
  serverLogMessages: ServerLogMessagesSchema,
});

// Refined schema with additional validation
export const MessagesConfigSchemaRefined = MessagesConfigSchema.refine(
  (config) => {
    // Ensure all message templates contain valid placeholder syntax
    const allMessages: string[] = [];
    
    // Flatten all messages for validation
    const flattenMessages = (obj: any, path: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          allMessages.push(value);
        } else if (typeof value === 'object' && value !== null) {
          flattenMessages(value, currentPath);
        }
      }
    };
    
    flattenMessages(config);
    
    // Check for invalid placeholder syntax (unclosed braces, etc.)
    const invalidPlaceholders = allMessages.filter(message => {
      // Count opening and closing braces
      const openBraces = (message.match(/{/g) || []).length;
      const closeBraces = (message.match(/}/g) || []).length;
      return openBraces !== closeBraces;
    });
    
    return invalidPlaceholders.length === 0;
  },
  {
    message: "All message templates must have balanced placeholder braces {}",
    path: ["messages"],
  }
).refine(
  (config) => {
    // Ensure required error messages exist
    const requiredErrors = [
      'gameNotFound',
      'playerNotFound',
      'invalidAction',
      'playerDead'
    ];
    
    const missingErrors = requiredErrors.filter(
      errorKey => !config.errors[errorKey]
    );
    
    return missingErrors.length === 0;
  },
  {
    message: "Required error messages must be present",
    path: ["errors"],
  }
).refine(
  (config) => {
    // Ensure all ability categories have at least one message
    const abilityCategories = Object.values(config.abilities);
    const emptyCategories = abilityCategories.filter(
      category => Object.keys(category).length === 0
    );
    
    return emptyCategories.length === 0;
  },
  {
    message: "All ability categories should have at least one message",
    path: ["abilities"],
  }
);

// Type exports
export type MessagesConfig = z.infer<typeof MessagesConfigSchema>;
export type MessageCategory = z.infer<typeof MessageCategorySchema>;
export type AbilityMessages = z.infer<typeof AbilityMessagesSchema>;
export type ServerLogMessages = z.infer<typeof ServerLogMessagesSchema>;

// Validation helpers
export const validateMessagesConfig = (data: unknown): MessagesConfig => {
  return MessagesConfigSchemaRefined.parse(data);
};

export const safeValidateMessagesConfig = (data: unknown) => {
  return MessagesConfigSchemaRefined.safeParse(data);
};