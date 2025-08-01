/**
 * @fileoverview Validation middleware for socket events - TypeScript version
 * Centralizes input validation logic with consistent error handling
 * Phase 9: TypeScript Migration - Converted from validation.js
 */

import { Socket } from 'socket.io';
import gameService from '../services/gameService.js';
import {
  throwValidationError,
  throwPermissionError,
  throwNotFoundError,
  throwGameStateError,
} from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
// Messages are now accessed through the config system
import type { GameRoom } from '../models/GameRoom.js';
import type { Player } from '../models/Player.js';
import type { Ability } from '../types/generated.js';

/**
 * Player name validation result
 */
export interface PlayerNameValidationResult {
  isValid: boolean;
  error: string | null;
  sanitizedName: string;
}

/**
 * Validate and sanitize strings
 */
export const validateString = (str: unknown, maxLength: number = 30): boolean => {
  if (!str || typeof str !== 'string') return false;
  const sanitized = str.replace(/[<>{}();]/g, '').trim();
  return sanitized.length > 0 && sanitized.length <= maxLength;
};

/**
 * Validate game code format
 */
export const validateGameCode = (code: unknown): boolean => {
  if (!code || typeof code !== 'string') return false;
  return /^\d{4}$/.test(code);
};

/**
 * Validate that a game exists
 */
export const validateGame = (socket: Socket, gameCode: string): boolean => {
  if (!validateGameCode(gameCode)) {
    logger.warn('InvalidGameCodeFormat', { gameCode, socketId: socket.id });
    throwValidationError(config.getError('gameCodeInvalid'));
  }

  const game = gameService.games.get(gameCode);
  if (!game) {
    logger.warn('GameNotFoundValidation', { gameCode, socketId: socket.id });
    throwNotFoundError(config.getError('gameNotFound'));
  }
  return true;
};

/**
 * Validate that a player exists in a game
 */
export const validatePlayer = (socket: Socket, gameCode: string): boolean => {
  const game = gameService.games.get(gameCode);
  if (!game || !game.gameState.players.has(socket.id)) {
    logger.warn('PlayerNotInGameValidation', {
      socketId: socket.id,
      gameCode,
    });
    throwPermissionError(config.getError('playerNotInGame'));
  }
  return true;
};

/**
 * Inclusive player name validation with international character support
 */
export function validatePlayerName(
  playerName: unknown, 
  existingPlayers: Player[] = []
): PlayerNameValidationResult {
  // Basic validation
  if (!playerName || typeof playerName !== 'string') {
    return {
      isValid: false,
      error: config.getError('playerNameRequired'),
      sanitizedName: '',
    };
  }

  const trimmedName = playerName.trim();

  // Length validation
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: config.getError('playerNameTooShort'),
      sanitizedName: trimmedName,
    };
  }

  if (trimmedName.length > 20) {
    return {
      isValid: false,
      error: config.getError('playerNameTooLong'),
      sanitizedName: trimmedName,
    };
  }

  // INCLUSIVE: Allow letters (including accented), numbers, spaces, hyphens, apostrophes
  // This regex supports international characters while blocking dangerous symbols
  const allowedCharsRegex = /^[\p{L}\p{N}\s\-']+$/u;

  if (!allowedCharsRegex.test(trimmedName)) {
    // More specific error for better UX
    const hasLettersOrNumbers = /[\p{L}\p{N}]/u.test(trimmedName);
    if (!hasLettersOrNumbers) {
      return {
        isValid: false,
        error: config.getError('playerNameNoLettersNumbers'),
        sanitizedName: trimmedName.replace(/[^\p{L}\p{N}\s\-']/gu, ''),
      };
    }

    return {
      isValid: false,
      error: config.getError('playerNameInvalidChars'),
      sanitizedName: trimmedName.replace(/[^\p{L}\p{N}\s\-']/gu, ''),
    };
  }

  // SECURITY: Still prevent dangerous injection patterns
  // Block specific dangerous characters even if they're "letters" in some contexts
  const dangerousPatterns = [
    /[<>{}()]/, // HTML/template injection
    /[&;|`$]/, // Command injection
    /javascript:|data:|vbscript:/i, // URL schemes
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/, // Control characters (but allow \t\n)
  ];

  if (dangerousPatterns.some((pattern) => pattern.test(trimmedName))) {
    return {
      isValid: false,
      error: config.getError('playerNameUnsafeChars'),
      sanitizedName: trimmedName.replace(
        /[<>{}()&;|`$\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
        ''
      ),
    };
  }

  // Whitespace validation
  if (trimmedName !== playerName.trim()) {
    return {
      isValid: false,
      error: config.getError('playerNameWhitespace'),
      sanitizedName: trimmedName,
    };
  }

  // Multiple consecutive spaces
  if (/\s{2,}/.test(trimmedName)) {
    return {
      isValid: false,
      error: config.getError('playerNameMultipleSpaces'),
      sanitizedName: trimmedName.replace(/\s+/g, ' '),
    };
  }

  // Cannot be only spaces or punctuation
  if (/^[\s\-']+$/.test(trimmedName)) {
    return {
      isValid: false,
      error: config.getError('playerNameOnlyPunctuation'),
      sanitizedName: trimmedName,
    };
  }

  // ENHANCED: Normalize for comparison (handles accents consistently)
  const normalizedName = trimmedName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Reserved words (comprehensive list) - now using normalized comparison
  const reservedWords = [
    // Core game entities
    'monster',
    'the monster',
    'beast',
    'creature',
    'boss',

    // System terms
    'server',
    'admin',
    'administrator',
    'system',
    'game',
    'host',
    'moderator',
    'mod',
    'bot',
    'ai',
    'computer',

    // Warlock terms
    'warlock',
    'the warlock',
    'evil',
    'good',
    'warlocks',
    'corrupted',
    'corruption',
    'convert',
    'darkness',

    // Combat/game terms that appear in messages
    'you',
    'your',
    'yours',
    'yourself',
    'target',
    'attacker',
    'player',
    'hero',
    'character',
    'ally',
    'enemy',
    'damage',
    'heal',
    'death',
    'kill',
    'attack',

    // All ability names
    'attack',
    'slash',
    'heal',
    'shield',
    'bandage',
    'fireball',
    'lightning',
    'poison',
    'stun',
    'pistol shot',
    'pistolshot',
    'claw swipe',
    'clawswipe',
    'reckless strike',
    'recklessstrike',
    'shield wall',
    'shieldwall',
    'battle cry',
    'battlecry',
    'shadow veil',
    'shadowveil',
    'backstab',
    'death mark',
    'deathmark',
    'flame burst',
    'flameburst',
    'chain lightning',
    'chainlightning',
    'mass heal',
    'massheal',
    'holy light',
    'holylight',
    'detect evil',
    'detectevil',
    'true sight',
    'truesight',
    'eagle eye',
    'eagleeye',
    'mark target',
    'marktarget',
    'rage',
    'berserker fury',
    'berserkerfury',

    // Racial abilities
    'stone resolve',
    'stoneresolve',
    'moonbeam',
    'blood rage',
    'bloodrage',
    'life bond',
    'lifebond',
    'undying',
    'keen senses',
    'keensenses',
    'adaptability',

    // Race names
    'human',
    'dwarf',
    'elf',
    'orc',
    'satyr',
    'skeleton',
    'kinfolk',
    'rockhewn',
    'artisan',
    'humans',
    'dwarfs',
    'dwarves',
    'elves',
    'orcs',
    'satyrs',
    'skeletons',

    // Class names
    'warrior',
    'wizard',
    'assassin',
    'priest',
    'oracle',
    'pyromancer',
    'druid',
    'shaman',
    'gunslinger',
    'tracker',
    'alchemist',
    'barbarian',
    'warriors',
    'wizards',
    'assassins',
    'priests',
    'oracles',
    'pyromancers',
    'druids',
    'shamans',
    'gunslingers',
    'trackers',
    'alchemists',
    'barbarians',

    // Status effects
    'poisoned',
    'stunned',
    'invisible',
    'shielded',
    'armor',
    'armored',
    'marked',
    'raging',

    // Common exploit attempts
    'null',
    'undefined',
    'nan',
    'infinity',
    'true',
    'false',
    'delete',
    'drop',
    'select',
    'insert',
    'update',
    'script',
    'alert',
    'console',
    'window',
    'document',
    'eval',
    'function',
    'return',
    'var',
    'let',
    'const',
  ];

  // Check exact matches using normalized comparison
  if (reservedWords.includes(normalizedName)) {
    return {
      isValid: false,
      error: config.formatMessage(config.getError('playerNameReserved'), {
        playerName: trimmedName,
      }),
      sanitizedName: trimmedName,
    };
  }

  // Check for problematic patterns (also normalized)
  const problematicPatterns = [
    /^monster/i, // Names starting with "monster"
    /monster$/i, // Names ending with "monster"
    /^the[\s\-]/i, // Names starting with "the "
    /^you[\s\-]/i, // Names starting with "you "
    /^admin/i, // Names starting with "admin"
    /^warlock/i, // Names starting with "warlock"
    /^mod[\s\-]/i, // Names starting with "mod "
    /^bot[\s\-]/i, // Names starting with "bot "
  ];

  if (problematicPatterns.some((pattern) => pattern.test(normalizedName))) {
    return {
      isValid: false,
      error: config.getError('playerNameProblematicTerms'),
      sanitizedName: trimmedName,
    };
  }

  // ENHANCED: Check for duplicate names using normalized comparison
  const existingNormalizedNames = existingPlayers.map((p) =>
    p.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  );

  if (existingNormalizedNames.includes(normalizedName)) {
    return {
      isValid: false,
      error: config.formatMessage(config.getError('playerNameTaken'), {
        playerName: trimmedName,
      }),
      sanitizedName: trimmedName,
    };
  }

  // All checks passed
  return {
    isValid: true,
    error: null,
    sanitizedName: trimmedName,
  };
}

/**
 * Test cases to verify international support
 */
export function testInternationalNames(): void {
  const testCases = [
    'niñá', // Spanish with tilde
    'José', // Spanish with accent
    'François', // French with cedilla
    'Müller', // German with umlaut
    'Åse', // Scandinavian
    'Ελένη', // Greek
    'Владимир', // Cyrillic
    '张伟', // Chinese
    'やまだ', // Japanese Hiragana
    'Ali', // Simple name
    "O'Connor", // Irish with apostrophe
    'Jean-Luc', // French with hyphen
  ];

  logger.debug('InternationalNameTestStart', {});
  testCases.forEach((name) => {
    const result = validatePlayerName(name, []);
    logger.debug('InternationalNameTestResult', {
      name,
      isValid: result.isValid,
      error: result.error,
    });
  });
}

/**
 * Auto-sanitize name suggestions (international-friendly)
 */
export function suggestValidName(originalName: string): string {
  if (!originalName) return '';

  // Remove only dangerous characters, keep international letters
  let suggestion = originalName
    .replace(/[^\p{L}\p{N}\s\-']/gu, '') // Remove invalid chars (Unicode-aware)
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim() // Remove leading/trailing space
    .substring(0, 20); // Enforce length limit

  // If nothing left or too short, suggest alternatives
  if (suggestion.length < 2) {
    // Try to preserve some of the original if possible
    const letters = originalName.match(/\p{L}/gu);
    if (letters && letters.length > 0) {
      suggestion =
        letters.slice(0, 8).join('') + Math.floor(Math.random() * 99);
    } else {
      // Fallback to random names
      const randomNames = [
        'Hero',
        'Champion',
        'Warrior',
        'Scout',
        'Ranger',
        'Guardian',
        'Defender',
        'Striker',
        'Fighter',
        'Knight',
      ];
      suggestion =
        randomNames[Math.floor(Math.random() * randomNames.length)] +
        Math.floor(Math.random() * 999);
    }
  }

  return suggestion;
}

/**
 * Validate game state
 */
export const validateGameState = (
  socket: Socket, 
  gameCode: string, 
  shouldBeStarted: boolean
): boolean => {
  const game = gameService.games.get(gameCode);
  if (!game) {
    throwNotFoundError(config.getError('gameNotFound'));
  }
  
  if (shouldBeStarted && !game.gameState.started) {
    throwGameStateError(config.getError('gameNotStarted'));
  }
  if (!shouldBeStarted && game.gameState.started) {
    throwGameStateError(config.getError('gameStarted'));
  }
  return true;
};

/**
 * Validate host permissions
 */
export const validateHost = (socket: Socket, gameCode: string): boolean => {
  const game = gameService.games.get(gameCode);
  if (!game) {
    throwNotFoundError(config.getError('gameNotFound'));
  }
  
  if (socket.id !== game.gameState.hostId) {
    logger.warn('NonHostActionAttempt', {
      socketId: socket.id,
      gameCode,
    });
    throwPermissionError(config.getError('notHost'));
  }
  return true;
};

/**
 * Helper function to check if an ability is AOE based on its configuration
 */
export function isAOEAbility(ability: Ability | null | undefined): boolean {
  if (!ability) return false;

  // Check multiple indicators that an ability is AOE
  return (
    ability.target === 'Multi' ||
    (ability as any).isAOE === true ||
    (ability as any).targetType === 'multi' ||
    ability.category === 'AOE' ||
    // Check specific ability types that are known to be AOE
    [
      'massHeal',
      'thunderStrike',
      'earthquake',
      'massStun',
      'groupHeal',
      'meteorShower',
      'infernoBlast',
      'chainLightning',
      'rejuvenation',
      'battleCry',
      'divineShield',
      'entangle',
      'poisonTrap',
    ].includes(ability.type)
  );
}

/**
 * FIXED: Validate action type and target - now handles AOE abilities with "multi" target
 */
export const validateAction = (
  socket: Socket, 
  gameCode: string, 
  actionType: string, 
  targetId: string
): boolean => {
  const game = gameService.games.get(gameCode);
  if (!game) {
    throwNotFoundError(config.getError('gameNotFound'));
  }
  
  const player = game.gameState.players.get(socket.id);
  if (!player) {
    throwPermissionError(config.getError('playerNotInGame'));
  }

  // Check if action type is valid for this player
  const validAction = player.unlockedAbilities.find((a: Ability) => a.type === actionType);
  if (!validAction) {
    socket.emit('errorMessage', {
      message: config.getError('invalidAction'),
    });
    return false;
  }

  // NEW: Handle AOE abilities with "multi" target
  if (targetId === 'multi') {
    // Check if this is actually an AOE ability
    if (isAOEAbility(validAction)) {
      return true; // Valid AOE ability with multi target
    } else {
      socket.emit('errorMessage', {
        message: config.formatMessage(config.getError('actionNotAOE'), {
          actionType,
        }),
      });
      return false;
    }
  }

  // Handle monster target
  if (targetId === '__monster__') {
    // Always allow monster targeting (monster existence is checked in GameRoom)
    return true;
  }

  // Handle player targets
  if (!game.gameState.players.has(targetId) || !game.gameState.players.get(targetId)!.isAlive) {
    socket.emit('errorMessage', {
      message: config.getError('invalidTarget'),
    });
    return false;
  }

  return true;
};

/**
 * FIXED: Validate action with cooldown checks - now handles AOE abilities
 */
export const validateActionWithCooldown = (
  socket: Socket, 
  gameCode: string, 
  actionType: string, 
  targetId: string
): boolean => {
  const game = gameService.games.get(gameCode);
  if (!game) {
    throwNotFoundError(config.getError('gameNotFound'));
  }
  
  const player = game.gameState.players.get(socket.id);
  if (!player) {
    throwPermissionError(config.getError('playerNotInGame'));
  }

  // Check if action type is valid for this player
  const validAction = player.unlockedAbilities.find((a: Ability) => a.type === actionType);
  if (!validAction) {
    socket.emit('errorMessage', {
      message: config.getError('invalidAction'),
    });
    return false;
  }

  // Check if ability is on cooldown
  if (player.isAbilityOnCooldown && player.isAbilityOnCooldown(actionType)) {
    const cooldownRemaining = player.getAbilityCooldown(actionType);
    socket.emit('errorMessage', {
      message: config.formatMessage(config.getError('actionOnCooldown'), {
        abilityName: actionType,
        turns: cooldownRemaining,
        s: cooldownRemaining > 1 ? 's' : '',
      }),
    });
    return false;
  }

  // NEW: Handle AOE abilities with "multi" target
  if (targetId === 'multi') {
    // Check if this is actually an AOE ability
    if (isAOEAbility(validAction)) {
      return true; // Valid AOE ability with multi target
    } else {
      socket.emit('errorMessage', {
        message: config.formatMessage(config.getError('actionNotAOE'), {
          actionType,
        }),
      });
      return false;
    }
  }

  // Handle monster target
  if (targetId === '__monster__') {
    // Always allow monster targeting (monster existence is checked in GameRoom)
    return true;
  }

  // Handle player targets
  if (!game.gameState.players.has(targetId) || !game.gameState.players.get(targetId)!.isAlive) {
    socket.emit('errorMessage', {
      message: config.getError('invalidTarget'),
    });
    return false;
  }

  return true;
};

/**
 * FIXED: Validate player name for socket events
 */
export const validatePlayerNameSocket = (
  socket: Socket, 
  playerName: string, 
  gameCode: string | null = null
): boolean => {
  // Get existing players if game code provided
  let existingPlayers: Player[] = [];
  if (gameCode && gameService.games.has(gameCode)) {
    const game = gameService.games.get(gameCode)!;
    const allPlayers = Array.from(game.getPlayers());
    // Filter out the current socket's player to avoid false duplicates
    existingPlayers = allPlayers.filter(player => player.id !== socket.id);
    
    // DEBUG: Log name checking details for socket validation
    logger.info('Socket name validation check:', {
      attemptedName: playerName,
      socketId: socket.id,
      gameCode: gameCode,
      totalPlayersInGame: allPlayers.length,
      playersAfterFiltering: existingPlayers.length,
      allPlayerNames: allPlayers.map(p => ({ id: p.id, name: p.name })),
      existingPlayerNames: existingPlayers.map(p => ({ id: p.id, name: p.name })),
      isCurrentSocketInGame: allPlayers.some(p => p.id === socket.id)
    });
  }

  // Use the inclusive validation function
  const validation = validatePlayerName(playerName, existingPlayers);
  
  logger.info('Socket name validation result:', {
    attemptedName: playerName,
    gameCode: gameCode,
    isValid: validation.isValid,
    message: validation.message,
    suggestion: validation.suggestion
  });

  if (!validation.isValid) {
    logger.warn('InvalidPlayerNameValidation', {
      playerName,
      socketId: socket.id,
      error: validation.error,
    });

    // Send error with suggestion if available
    const errorData: any = { message: validation.error };
    if (validation.sanitizedName && validation.sanitizedName !== playerName) {
      errorData.suggestion = suggestValidName(playerName);
    }

    socket.emit('errorMessage', errorData);
    return false;
  }

  return true;
};

export default {
  validateGame,
  validatePlayerNameSocket,
  validateGameState,
  validateHost,
  validatePlayer,
  validatePlayerName,
  suggestValidName,
  testInternationalNames,
  validateAction: validateActionWithCooldown, // Replace the old validateAction
  isAOEAbility, // Export the helper function
};