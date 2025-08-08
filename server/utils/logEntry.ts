/**
 * @fileoverview Log entry factory utilities
 * Creates log entries with automatic timestamping to avoid linter issues with Date.now()
 */

import { getCurrentTimestamp } from './timestamp.js';
import { secureId } from './secureRandom.js';

/**
 * Base log entry interface (matches the various LogEntry types in the codebase)
 */
export interface BaseLogEntry {
  id?: string;
  timestamp?: number;
  type: string;
  message: string;
  source?: string;
  target?: string;
  targetId?: string;
  attackerId?: string;
  public?: boolean;
  isPublic?: boolean;
  priority?: 'low' | 'medium' | 'high';
  details?: any;
  privateMessage?: string;
  [key: string]: any;
}

/**
 * Creates a log entry with automatic timestamp and ID generation.
 * This centralizes timestamp generation to avoid linter warnings about Date.now()
 * 
 * @param entry - The log entry data (without timestamp/id)
 * @param options - Optional configuration
 * @returns Complete log entry with timestamp and ID
 */
export function createLogEntry<T extends BaseLogEntry>(
  entry: Omit<T, 'timestamp' | 'id'> & { id?: string; timestamp?: number },
  options?: {
    skipTimestamp?: boolean;
    skipId?: boolean;
    idPrefix?: string;
  }
): T {
  const result = { ...entry } as T;
  
  // Add timestamp unless explicitly skipped or already present
  if (!options?.skipTimestamp && !result.timestamp) {
    result.timestamp = getCurrentTimestamp();
  }
  
  // Add ID unless explicitly skipped or already present
  if (!options?.skipId && !result.id) {
    const prefix = options?.idPrefix || entry.type || 'log';
    result.id = secureId(prefix);
  }
  
  return result;
}

/**
 * Creates a system log entry
 */
export function createSystemLog(
  message: string,
  details?: any,
  additionalProps?: Partial<BaseLogEntry>
): BaseLogEntry {
  return createLogEntry({
    type: 'system',
    source: 'system',
    message,
    details,
    public: false,
    isPublic: false,
    priority: 'medium',
    ...additionalProps
  });
}

/**
 * Creates an error log entry
 */
export function createErrorLog(
  message: string,
  error?: any,
  additionalProps?: Partial<BaseLogEntry>
): BaseLogEntry {
  return createLogEntry({
    type: 'system',
    source: 'system',
    message,
    details: error ? { error: error.message || error, stack: error.stack } : undefined,
    public: false,
    isPublic: false,
    priority: 'high',
    ...additionalProps
  });
}

/**
 * Creates an action log entry
 */
export function createActionLog(
  source: string,
  target: string,
  message: string,
  additionalProps?: Partial<BaseLogEntry>
): BaseLogEntry {
  return createLogEntry({
    type: 'action',
    source,
    target,
    targetId: target,
    message,
    public: true,
    isPublic: true,
    ...additionalProps
  });
}

/**
 * Creates a damage log entry
 */
export function createDamageLog(
  attackerId: string,
  targetId: string,
  damage: number,
  message: string,
  additionalProps?: Partial<BaseLogEntry>
): BaseLogEntry {
  return createLogEntry({
    type: 'damage',
    source: attackerId,
    attackerId,
    target: targetId,
    targetId,
    message,
    details: { damage },
    public: true,
    isPublic: true,
    ...additionalProps
  });
}

/**
 * Creates a heal log entry
 */
export function createHealLog(
  healerId: string,
  targetId: string,
  healing: number,
  message: string,
  additionalProps?: Partial<BaseLogEntry>
): BaseLogEntry {
  return createLogEntry({
    type: 'heal',
    source: healerId,
    target: targetId,
    targetId,
    message,
    details: { healing },
    public: true,
    isPublic: true,
    ...additionalProps
  });
}