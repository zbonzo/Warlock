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
    logger.warn(`Invalid game code format: ${gameCode} from ${socket.id}`);
    throwValidationError(
      'Invalid game code format. Please enter a 4-digit code.'
    );
  }

  const game = games.get(gameCode);
  if (!game) {
    logger.info(`Game not found: ${gameCode} from ${socket.id}`);
    throwNotFoundError('Game not found. Check the code and try again.');
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
    logger.warn(`Player not in game: ${socket.id} in game ${gameCode}`);
    throwPermissionError('You are not a player in this game.');
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
    return { isValid: false, error: 'Name is required', sanitizedName: '' };
  }

  const trimmedName = playerName.trim();

  // Length validation
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: 'Name must be at least 2 characters long',
      sanitizedName: trimmedName,
    };
  }

  if (trimmedName.length > 20) {
    return {
      isValid: false,
      error: 'Name must be 20 characters or less',
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
        error: 'Name must contain at least one letter or number',
        sanitizedName: trimmedName.replace(/[^\p{L}\p{N}\s\-']/gu, ''),
      };
    }

    return {
      isValid: false,
      error:
        "Name can only contain letters (including accented), numbers, spaces, hyphens (-), and apostrophes (').",
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
      error: 'Name contains unsafe characters',
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
      error: 'Name cannot start or end with spaces',
      sanitizedName: trimmedName,
    };
  }

  // Multiple consecutive spaces
  if (/\s{2,}/.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Name cannot contain multiple consecutive spaces',
      sanitizedName: trimmedName.replace(/\s+/g, ' '),
    };
  }

  // Cannot be only spaces or punctuation
  if (/^[\s\-']+$/.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Name must contain at least one letter or number',
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
      error: `"${trimmedName}" is a reserved game term. Please choose a different name.`,
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
      error: 'Name contains problematic terms. Please choose a different name.',
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
      error: `The name "${trimmedName}" is already taken. Please choose a different name.`,
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

  console.log('Testing international name support:');
  testCases.forEach((name) => {
    const result = validatePlayerName(name, []);
    console.log(
      `"${name}": ${result.isValid ? '✅ Valid' : '❌ ' + result.error}`
    );
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
    throwGameStateError('Game has not started yet.');
  }
  if (!shouldBeStarted && game.started) {
    throwGameStateError('Game has already started.');
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
    logger.warn(`Non-host action attempt: ${socket.id} in game ${gameCode}`);
    throwPermissionError('Only the host can perform this action.');
  }
  return true;
};

/**
 * Validate action type and target
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
  const validAction = player.unlocked.some((a) => a.type === actionType);
  if (!validAction) {
    socket.emit('errorMessage', { message: 'Invalid action type.' });
    return false;
  }

  // Validate target exists
  if (targetId !== config.MONSTER_ID) {
    if (!game.players.has(targetId) || !game.players.get(targetId).isAlive) {
      socket.emit('errorMessage', { message: 'Invalid target.' });
      return false;
    }
  }

  return true;
};
/**
 * Validate action with cooldown checks
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
  const validAction = player.unlocked.some((a) => a.type === actionType);
  if (!validAction) {
    socket.emit('errorMessage', { message: 'Invalid action type.' });
    return false;
  }

  // Check if ability is on cooldown
  if (player.isAbilityOnCooldown && player.isAbilityOnCooldown(actionType)) {
    const cooldownRemaining = player.getAbilityCooldown(actionType);
    socket.emit('errorMessage', {
      message: `${actionType} is on cooldown for ${cooldownRemaining} more turn${
        cooldownRemaining > 1 ? 's' : ''
      }.`,
    });
    return false;
  }

  // Validate target exists
  if (targetId !== config.MONSTER_ID) {
    if (!game.players.has(targetId) || !game.players.get(targetId).isAlive) {
      socket.emit('errorMessage', { message: 'Invalid target.' });
      return false;
    }
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
    logger.warn(
      `Invalid player name: "${playerName}" from ${socket.id}: ${validation.error}`
    );

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
};
