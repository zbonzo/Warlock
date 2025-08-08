import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  MessagesConfig,
  MessageCategory,
  AbilityMessages,
  ServerLogMessages,
  validateMessagesConfig,
  safeValidateMessagesConfig
} from '../schemas/messages.schema.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MessageContext {
  playerName?: string;
  targetName?: string;
  attackerName?: string;
  actorName?: string;
  abilityName?: string;
  damage?: number;
  healing?: number;
  armor?: number;
  turns?: number;
  amount?: number;
  gameCode?: string;
  maxPlayers?: number;
  minPlayers?: number;
  actionType?: string;
  hitCount?: number;
  totalDamage?: number;
  hits?: number;
  hitNumber?: number;
  level?: number;
  [key: string]: any;
}

export class MessagesLoader {
  private messagesConfig: MessagesConfig;
  private dataPath: string;
  private lastModified: number = 0;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(__dirname, '../data/messages.json');
    this.messagesConfig = {} as MessagesConfig;
    this.loadMessages();
  }

  /**
   * Load messages from JSON file with validation
   */
  private loadMessages(): void {
    try {
      // Check if file exists
      if (!fs.existsSync(this.dataPath)) {
        throw new Error(`Messages data file not found at: ${this.dataPath}`);
      }

      // Check if file has been modified
      const stats = fs.statSync(this.dataPath);
      if (stats.mtimeMs <= this.lastModified) {
        return; // No need to reload
      }

      // Read and parse JSON
      const rawData = fs.readFileSync(this.dataPath, 'utf-8');
      const parsedData = JSON.parse(rawData);

      // Validate data structure
      const validationResult = safeValidateMessagesConfig(parsedData);
      if (!validationResult.success) {
        throw new Error(`Invalid messages data: ${validationResult.error.message}`);
      }

      this.messagesConfig = validationResult.data;
      this.lastModified = stats.mtimeMs;

      console.log('Loaded messages configuration from config');
    } catch (error) {
      console.error('Failed to load messages:', error);
      throw error;
    }
  }

  /**
   * Hot reload messages if file has changed
   */
  public reloadIfChanged(): boolean {
    try {
      const stats = fs.statSync(this.dataPath);
      if (stats.mtimeMs > this.lastModified) {
        this.loadMessages();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking for messages config changes:', error);
      return false;
    }
  }

  /**
   * Format message template with context data
   */
  public formatMessage(template: string, context: MessageContext = {}): string {
    if (!template) return '';

    return template.replace(/{(\w+)}/g, (match, key) => {
      const value = context[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get message by category and key (backwards compatible)
   */
  public getMessage(category: string, key: string): string | null {
    this.reloadIfChanged();

    const categories = {
      errors: this.messagesConfig.errors,
      success: this.messagesConfig.success,
      events: this.messagesConfig.events,
      privateMessages: this.messagesConfig.privateMessages,
      winConditions: this.messagesConfig.winConditions,
    };

    return categories[category as keyof typeof categories]?.[key] || null;
  }

  /**
   * Get message from nested categories (e.g., 'abilities.attacks')
   */
  public getAbilityMessage(category: string, key: string): string | null {
    this.reloadIfChanged();

    const categoryPath = category.split('.');
    let messageConfig: any = this.messagesConfig;

    // Navigate to the message category
    for (const path of categoryPath) {
      messageConfig = messageConfig[path];
      if (!messageConfig) {
        return null;
      }
    }

    return messageConfig[key] || null;
  }

  /**
   * Get formatted error message
   */
  public getError(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.errors[key];
    return template ? this.formatMessage(template, context) : 'Unknown error occurred.';
  }

  /**
   * Get formatted success message
   */
  public getSuccess(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.success[key];
    return template ? this.formatMessage(template, context) : 'Action completed.';
  }

  /**
   * Get formatted event message
   */
  public getEvent(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.events[key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get formatted private message
   */
  public getPrivateMessage(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.privateMessages[key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get formatted win condition message
   */
  public getWinCondition(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.winConditions[key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get formatted combat message
   */
  public getCombatMessage(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.combat[key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get formatted warlock message
   */
  public getWarlockMessage(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.warlock[key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get formatted monster message
   */
  public getMonsterMessage(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.monster[key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get formatted player message
   */
  public getPlayerMessage(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.player[key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get formatted UI message
   */
  public getUIMessage(key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.ui[key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get formatted ability message
   */
  public getAbilityMessageFormatted(category: 'attacks' | 'defense' | 'healing' | 'special' | 'racial', key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.abilities[category][key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get formatted server log message
   */
  public getServerLogMessage(level: 'info' | 'warn' | 'error' | 'debug', key: string, context: MessageContext = {}): string {
    this.reloadIfChanged();
    const template = this.messagesConfig.serverLogMessages[level][key];
    return template ? this.formatMessage(template, context) : '';
  }

  /**
   * Get all messages in a category
   */
  public getMessageCategory(category: keyof MessagesConfig): MessageCategory | AbilityMessages | ServerLogMessages {
    this.reloadIfChanged();
    return this.messagesConfig[category];
  }

  /**
   * Search for messages containing a specific text
   */
  public searchMessages(searchText: string): Array<{ category: string; key: string; message: string }> {
    this.reloadIfChanged();

    const results: Array<{ category: string; key: string; message: string }> = [];
    const searchLower = searchText.toLowerCase();

    const searchInCategory = (categoryName: string, categoryData: any, parentPath: string = '') => {
      for (const [key, value] of Object.entries(categoryData)) {
        const fullPath = parentPath ? `${parentPath}.${key}` : key;

        if (typeof value === 'string') {
          if (value.toLowerCase().includes(searchLower)) {
            results.push({
              category: categoryName,
              key: fullPath,
              message: value
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          searchInCategory(categoryName, value, fullPath);
        }
      }
    };

    // Search through all categories
    for (const [categoryName, categoryData] of Object.entries(this.messagesConfig)) {
      searchInCategory(categoryName, categoryData);
    }

    return results;
  }

  /**
   * Get message statistics
   */
  public getMessageStats(): {
    totalMessages: number;
    categoryCounts: Record<string, number>;
    averageMessageLength: number;
    messagesWithPlaceholders: number;
    uniquePlaceholders: Set<string>;
  } {
    this.reloadIfChanged();

    let totalMessages = 0;
    let totalLength = 0;
    let messagesWithPlaceholders = 0;
    const categoryCounts: Record<string, number> = {};
    const uniquePlaceholders = new Set<string>();

    const countInCategory = (categoryName: string, categoryData: any) => {
      let categoryCount = 0;

      for (const [, value] of Object.entries(categoryData)) {
        if (typeof value === 'string') {
          totalMessages++;
          categoryCount++;
          totalLength += value.length;

          // Check for placeholders
          const placeholders = value.match(/{(\w+)}/g);
          if (placeholders) {
            messagesWithPlaceholders++;
            placeholders.forEach(placeholder => {
              uniquePlaceholders.add(placeholder.slice(1, -1)); // Remove { }
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          categoryCount += countInCategory(categoryName, value);
        }
      }

      return categoryCount;
    };

    // Count messages in all categories
    for (const [categoryName, categoryData] of Object.entries(this.messagesConfig)) {
      categoryCounts[categoryName] = countInCategory(categoryName, categoryData);
    }

    return {
      totalMessages,
      categoryCounts,
      averageMessageLength: totalMessages > 0 ? Math.round(totalLength / totalMessages) : 0,
      messagesWithPlaceholders,
      uniquePlaceholders
    };
  }

  /**
   * Validate message placeholders against expected context
   */
  public validateMessagePlaceholders(): {
    isValid: boolean;
    warnings: string[];
    unusedPlaceholders: string[];
  } {
    this.reloadIfChanged();

    const warnings: string[] = [];
    const allPlaceholders = new Set<string>();

    // Common context keys that are expected
    const expectedContextKeys = new Set([
      'playerName', 'targetName', 'attackerName', 'actorName', 'abilityName',
      'damage', 'healing', 'armor', 'turns', 'amount', 'gameCode', 'maxPlayers',
      'minPlayers', 'actionType', 'hitCount', 'totalDamage', 'hits', 'hitNumber',
      'level'
    ]);

    // Extract all placeholders from messages
    const extractPlaceholders = (categoryData: any, categoryPath: string = '') => {
      for (const [key, value] of Object.entries(categoryData)) {
        if (typeof value === 'string') {
          const placeholders = value.match(/{(\w+)}/g);
          if (placeholders) {
            placeholders.forEach(placeholder => {
              const placeholderKey = placeholder.slice(1, -1);
              allPlaceholders.add(placeholderKey);

              if (!expectedContextKeys.has(placeholderKey)) {
                warnings.push(`Unexpected placeholder '{${placeholderKey}}' in ${categoryPath}.${key}`);
              }
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          extractPlaceholders(value, categoryPath ? `${categoryPath}.${key}` : key);
        }
      }
    };

    // Check all categories
    for (const [categoryName, categoryData] of Object.entries(this.messagesConfig)) {
      extractPlaceholders(categoryData, categoryName);
    }

    // Find unused expected context keys
    const unusedPlaceholders = Array.from(expectedContextKeys).filter(
      key => !allPlaceholders.has(key)
    );

    return {
      isValid: warnings.length === 0,
      warnings,
      unusedPlaceholders
    };
  }

  /**
   * Get all messages data (backwards compatibility)
   */
  public getAllMessagesData(): MessagesConfig {
    this.reloadIfChanged();
    return JSON.parse(JSON.stringify(this.messagesConfig));
  }

  /**
   * Get legacy message structure (backwards compatibility)
   */
  public getLegacyMessages(): any {
    this.reloadIfChanged();
    return {
      messages: this.messagesConfig,
      events: this.messagesConfig.events,
      errors: this.messagesConfig.errors,
      success: this.messagesConfig.success,
      privateMessages: this.messagesConfig.privateMessages,
      abilities: this.messagesConfig.abilities,
      combat: this.messagesConfig.combat,
      statusEffects: this.messagesConfig.statusEffects,
      warlock: this.messagesConfig.warlock,
      monster: this.messagesConfig.monster,
      player: this.messagesConfig.player,
      ui: this.messagesConfig.ui,
      serverLogMessages: this.messagesConfig.serverLogMessages,
      winConditions: this.messagesConfig.winConditions,
    };
  }
}

// Export a default instance
export const messagesLoader = new MessagesLoader();
