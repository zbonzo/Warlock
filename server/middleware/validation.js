/**
 * @fileoverview Validation middleware for socket events
 * Centralizes input validation logic with consistent error handling
 */
const { games } = require('../services/gameService');
const {
  throwValidationError,
  throwPermissionError,
  throwNotFoundError,
  throwGameStateError,
} = require('../utils/errorHandler');
const logger = require('../utils/logger');
const config = require('@config');
const messages = require('@config/messages');

/**
 * Validate and sanitize strings
 * @param {string} str - String to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} Whether the string is valid
 */
const validateString = (str, maxLength = 30) => {
  if (!str || typeof str !== 'string') return false;
  const sanitized = str.replace(/[<>{}();]/g, '').trim();
  return sanitized.length > 0 && sanitized.length <= maxLength;
};

/**
 * Validate game code format
 * @param {string} code - Game code to validate
 * @returns {boolean} Whether the code format is valid
 */
const validateGameCode = (code) => {
  if (!code || typeof code !== 'string') return false;
  return /^\d{4}$/.test(code);
};

/**
 * Validate that a game exists
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code to validate
 * @returns {boolean} Whether the game exists
 */
const validateGame = (socket, gameCode) => {
  if (!validateGameCode(gameCode)) {
    logger.warn('InvalidGameCodeFormat', { gameCode, socketId: socket.id });
    throwValidationError(messages.getError('gameCodeInvalid'));
  }

  const game = games.get(gameCode);
  if (!game) {
    logger.warn('GameNotFoundValidation', { gameCode, socketId: socket.id });
    throwNotFoundError(messages.getError('gameNotFound'));
  }
  return true;
};

/**
 * Validate that a player exists in a game
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @returns {boolean} Whether the player exists in the game
 */
const validatePlayer = (socket, gameCode) => {
  const game = games.get(gameCode);
  if (!game.players.has(socket.id)) {
    logger.warn('PlayerNotInGameValidation', {
      socketId: socket.id,
      gameCode,
    });
    throwPermissionError(messages.getError('playerNotInGame'));
  }
  return true;
};

/**
 * Inclusive player name validation with international character support
 * @param {string} playerName - The proposed player name
 * @param {Array} existingPlayers - Array of existing players in the game
 * @returns {Object} { isValid: boolean, error: string, sanitizedName: string }
 */
function validatePlayerName(playerName, existingPlayers = []) {
  // Basic validation
  if (!playerName || typeof playerName !== 'string') {
    return {
      isValid: false,
      error: messages.getError('playerNameRequired'),
      sanitizedName: '',
    };
  }

  const trimmedName = playerName.trim();

  // Length validation
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: messages.getError('playerNameTooShort'),
      sanitizedName: trimmedName,
    };
  }

  if (trimmedName.length > 20) {
    return {
      isValid: false,
      error: messages.getError('playerNameTooLong'),
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
        error: messages.getError('playerNameNoLettersNumbers'),
        sanitizedName: trimmedName.replace(/[^\p{L}\p{N}\s\-']/gu, ''),
      };
    }

    return {
      isValid: false,
      error: messages.getError('playerNameInvalidChars'),
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
      error: messages.getError('playerNameUnsafeChars'),
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
      error: messages.getError('playerNameWhitespace'),
      sanitizedName: trimmedName,
    };
  }

  // Multiple consecutive spaces
  if (/\s{2,}/.test(trimmedName)) {
    return {
      isValid: false,
      error: messages.getError('playerNameMultipleSpaces'),
      sanitizedName: trimmedName.replace(/\s+/g, ' '),
    };
  }

  // Cannot be only spaces or punctuation
  if (/^[\s\-']+$/.test(trimmedName)) {
    return {
      isValid: false,
      error: messages.getError('playerNameOnlyPunctuation'),
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
      error: messages.formatMessage(messages.getError('playerNameReserved'), {
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
      error: messages.getError('playerNameProblematicTerms'),
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
      error: messages.formatMessage(messages.getError('playerNameTaken'), {
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
function testInternationalNames() {
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
 * @param {string} originalName - The invalid name
 * @returns {string} A suggested valid alternative
 */
function suggestValidName(originalName) {
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
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {boolean} shouldBeStarted - Expected game state
 * @returns {boolean} Whether the game state is valid
 */
const validateGameState = (socket, gameCode, shouldBeStarted) => {
  const game = games.get(gameCode);
  if (shouldBeStarted && !game.started) {
    throwGameStateError(messages.getError('gameNotStarted'));
  }
  if (!shouldBeStarted && game.started) {
    throwGameStateError(messages.getError('gameStarted'));
  }
  return true;
};

/**
 * Validate host permissions
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @returns {boolean} Whether the client is the host
 */
const validateHost = (socket, gameCode) => {
  const game = games.get(gameCode);
  if (socket.id !== game.hostId) {
    logger.warn('NonHostActionAttempt', {
      socketId: socket.id,
      gameCode,
    });
    throwPermissionError(messages.getError('notHost'));
  }
  return true;
};

/**
 * Helper function to check if an ability is AOE based on its configuration
 * @param {Object} ability - Ability configuration object
 * @returns {boolean} Whether the ability is AOE
 */
function isAOEAbility(ability) {
  if (!ability) return false;

  // Check multiple indicators that an ability is AOE
  return (
    ability.target === 'Multi' ||
    ability.isAOE === true ||
    ability.targetType === 'multi' ||
    ability.category === 'aoe' ||
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
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} actionType - Action type
 * @param {string} targetId - Target ID
 * @returns {boolean} Whether the action is valid
 */
const validateAction = (socket, gameCode, actionType, targetId) => {
  const game = games.get(gameCode);
  const player = game.players.get(socket.id);

  // Check if action type is valid for this player
  const validAction = player.unlocked.find((a) => a.type === actionType);
  if (!validAction) {
    socket.emit('errorMessage', {
      message: messages.getError('invalidAction'),
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
        message: messages.formatMessage(messages.getError('actionNotAOE'), {
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
  if (!game.players.has(targetId) || !game.players.get(targetId).isAlive) {
    socket.emit('errorMessage', {
      message: messages.getError('invalidTarget'),
    });
    return false;
  }

  return true;
};

/**
 * FIXED: Validate action with cooldown checks - now handles AOE abilities
 * @param {Object} socket - Client socket
 * @param {string} gameCode - Game code
 * @param {string} actionType - Action type
 * @param {string} targetId - Target ID
 * @returns {boolean} Whether the action is valid
 */
const validateActionWithCooldown = (socket, gameCode, actionType, targetId) => {
  const game = games.get(gameCode);
  const player = game.players.get(socket.id);

  // Check if action type is valid for this player
  const validAction = player.unlocked.find((a) => a.type === actionType);
  if (!validAction) {
    socket.emit('errorMessage', {
      message: messages.getError('invalidAction'),
    });
    return false;
  }

  // Check if ability is on cooldown
  if (player.isAbilityOnCooldown && player.isAbilityOnCooldown(actionType)) {
    const cooldownRemaining = player.getAbilityCooldown(actionType);
    socket.emit('errorMessage', {
      message: messages.formatMessage(messages.getError('actionOnCooldown'), {
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
        message: messages.formatMessage(messages.getError('actionNotAOE'), {
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
  if (!game.players.has(targetId) || !game.players.get(targetId).isAlive) {
    socket.emit('errorMessage', {
      message: messages.getError('invalidTarget'),
    });
    return false;
  }

  return true;
};

/**
 * FIXED: Validate player name for socket events
 * @param {Object} socket - Client socket
 * @param {string} playerName - Name to validate
 * @param {string} gameCode - Game code (optional, for duplicate checking)
 * @returns {boolean} Whether the name is valid
 */
const validatePlayerNameSocket = (socket, playerName, gameCode = null) => {
  // Get existing players if game code provided
  let existingPlayers = [];
  if (gameCode && games.has(gameCode)) {
    const game = games.get(gameCode);
    existingPlayers = Array.from(game.players.values());
  }

  // Use the inclusive validation function
  const validation = validatePlayerName(playerName, existingPlayers);

  if (!validation.isValid) {
    logger.warn('InvalidPlayerNameValidation', {
      playerName,
      socketId: socket.id,
      error: validation.error,
    });

    // Send error with suggestion if available
    const errorData = { message: validation.error };
    if (validation.sanitizedName && validation.sanitizedName !== playerName) {
      errorData.suggestion = suggestValidName(playerName);
    }

    socket.emit('errorMessage', errorData);
    return false;
  }

  return true;
};

module.exports = {
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
