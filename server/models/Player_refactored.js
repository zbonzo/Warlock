/**
 * @fileoverview Refactored Player model using composition with domain models
 * Uses PlayerStats, PlayerAbilities, and PlayerEffects for better separation of concerns
 */
const config = require('@config');
const logger = require('@utils/logger');
const messages = require('@messages');
const PlayerStats = require('./player/PlayerStats');
const PlayerAbilities = require('./player/PlayerAbilities');
const PlayerEffects = require('./player/PlayerEffects');

/**
 * Player class representing a single player in the game
 * Now uses composition with domain models for better organization
 */
class Player {
  /**
   * Create a new player
   * @param {string} id - Player's socket ID
   * @param {string} name - Player's display name
   */
  constructor(id, name) {
    // Core player identity
    this.id = id;
    this.name = name;
    this.socketIds = [id]; // Track all socket IDs for reconnection
    
    // Basic game state
    this.race = null;
    this.class = null;
    this.hp = config.gameBalance.player.baseHp || 100;
    this.maxHp = config.gameBalance.player.baseHp || 100;
    this.armor = 0;
    this.damageMod = 1.0; // Damage modifier from race and class
    this.level = 1;
    this.isWarlock = false;
    this.isAlive = true;
    this.isReady = false;

    // Composed domain models
    this.playerStats = new PlayerStats(name);
    this.playerAbilities = new PlayerAbilities(id, name);
    this.playerEffects = new PlayerEffects(id, name);

    // Compatibility properties (delegate to domain models)
    // These provide backward compatibility while we migrate the codebase
    this.setupCompatibilityProperties();
  }

  /**
   * Setup compatibility properties that delegate to domain models
   * This allows existing code to continue working while we migrate
   */
  setupCompatibilityProperties() {
    // Stats compatibility
    Object.defineProperty(this, 'stats', {
      get: () => this.playerStats.getStats(),
      enumerable: true
    });

    // Abilities compatibility
    Object.defineProperty(this, 'abilities', {
      get: () => this.playerAbilities.abilities,
      set: (value) => this.playerAbilities.abilities = value,
      enumerable: true
    });

    Object.defineProperty(this, 'unlocked', {
      get: () => this.playerAbilities.unlocked,
      set: (value) => this.playerAbilities.unlocked = value,
      enumerable: true
    });

    Object.defineProperty(this, 'abilityCooldowns', {
      get: () => this.playerAbilities.abilityCooldowns,
      enumerable: true
    });

    Object.defineProperty(this, 'hasSubmittedAction', {
      get: () => this.playerAbilities.hasSubmittedAction,
      enumerable: true
    });

    Object.defineProperty(this, 'submittedAction', {
      get: () => this.playerAbilities.submittedAction,
      enumerable: true
    });

    Object.defineProperty(this, 'racialAbility', {
      get: () => this.playerAbilities.racialAbility,
      set: (value) => this.playerAbilities.racialAbility = value,
      enumerable: true
    });

    Object.defineProperty(this, 'racialUsesLeft', {
      get: () => this.playerAbilities.racialUsesLeft,
      set: (value) => this.playerAbilities.racialUsesLeft = value,
      enumerable: true
    });

    Object.defineProperty(this, 'racialCooldown', {
      get: () => this.playerAbilities.racialCooldown,
      set: (value) => this.playerAbilities.racialCooldown = value,
      enumerable: true
    });

    // Effects compatibility
    Object.defineProperty(this, 'statusEffects', {
      get: () => this.playerEffects.statusEffects,
      enumerable: true
    });

    Object.defineProperty(this, 'isVulnerable', {
      get: () => this.playerEffects.isVulnerable,
      enumerable: true
    });

    Object.defineProperty(this, 'vulnerabilityIncrease', {
      get: () => this.playerEffects.vulnerabilityIncrease,
      enumerable: true
    });

    Object.defineProperty(this, 'stoneArmorIntact', {
      get: () => this.playerEffects.stoneArmorIntact,
      set: (value) => this.playerEffects.stoneArmorIntact = value,
      enumerable: true
    });

    Object.defineProperty(this, 'stoneArmorValue', {
      get: () => this.playerEffects.stoneArmorValue,
      set: (value) => this.playerEffects.stoneArmorValue = value,
      enumerable: true
    });

    Object.defineProperty(this, 'classEffects', {
      get: () => this.playerEffects.classEffects,
      enumerable: true
    });

    Object.defineProperty(this, 'racialEffects', {
      get: () => this.playerEffects.racialEffects,
      enumerable: true
    });
  }

  // ==================== STATS METHODS ====================
  addDamageDealt(damage) {
    return this.playerStats.addDamageDealt(damage);
  }

  addDamageTaken(damage) {
    return this.playerStats.addDamageTaken(damage);
  }

  addHealingDone(healing) {
    return this.playerStats.addHealingDone(healing);
  }

  addCorruption() {
    return this.playerStats.addCorruption();
  }

  addAbilityUse() {
    return this.playerStats.addAbilityUse();
  }

  addDeath() {
    return this.playerStats.addDeath();
  }

  addMonsterKill() {
    return this.playerStats.addMonsterKill();
  }

  addSelfHeal(healing) {
    return this.playerStats.addSelfHeal(healing);
  }

  getStats() {
    return this.playerStats.getStats();
  }

  // ==================== ABILITY METHODS ====================
  submitAction(actionType, targetId, additionalData = {}) {
    // Check if player is alive first
    if (!this.isAlive) {
      return {
        success: false,
        reason: messages.getError('playerDeadCannotAct'),
        action: null,
      };
    }

    return this.playerAbilities.submitAction(actionType, targetId, additionalData);
  }

  validateSubmittedAction(alivePlayers, monster) {
    return this.playerAbilities.validateSubmittedAction(alivePlayers, monster);
  }

  invalidateAction(reason) {
    return this.playerAbilities.invalidateAction(reason);
  }

  clearActionSubmission() {
    this.playerAbilities.clearActionSubmission();
    this.isReady = false;
  }

  isAbilityOnCooldown(abilityType) {
    return this.playerAbilities.isAbilityOnCooldown(abilityType);
  }

  getAbilityCooldown(abilityType) {
    return this.playerAbilities.getAbilityCooldown(abilityType);
  }

  putAbilityOnCooldown(abilityType, cooldownTurns) {
    return this.playerAbilities.putAbilityOnCooldown(abilityType, cooldownTurns);
  }

  canUseAbility(abilityType) {
    return this.playerAbilities.canUseAbility(abilityType);
  }

  processAbilityCooldowns() {
    return this.playerAbilities.processAbilityCooldowns();
  }

  getAvailableAbilities() {
    return this.playerAbilities.getAvailableAbilities();
  }

  canUseRacialAbility() {
    return this.playerAbilities.canUseRacialAbility();
  }

  useRacialAbility() {
    return this.playerAbilities.useRacialAbility();
  }

  processRacialCooldowns() {
    return this.playerAbilities.processRacialCooldowns();
  }

  setRacialAbility(abilityData) {
    this.playerAbilities.setRacialAbility(abilityData);
    
    // Handle special racial effects setup
    if (abilityData.type === 'undying') {
      this.playerEffects.initializeUndying(abilityData.params?.resurrectedHp || 1);
    } else if (abilityData.type === 'stoneArmor') {
      this.playerEffects.initializeStoneArmor(
        abilityData.params.initialArmor || config.gameBalance.stoneArmor.initialValue
      );
    }
  }

  resetRacialPerRoundUses() {
    return this.playerAbilities.resetRacialPerRoundUses();
  }

  getSubmissionStatus() {
    return this.playerAbilities.getSubmissionStatus();
  }

  getAbilityDamageDisplay(ability) {
    return this.playerAbilities.getAbilityDamageDisplay(ability, this.damageMod);
  }

  // ==================== EFFECTS METHODS ====================
  hasStatusEffect(effectName) {
    return this.playerEffects.hasStatusEffect(effectName);
  }

  applyStatusEffect(effectName, data) {
    return this.playerEffects.applyStatusEffect(effectName, data);
  }

  removeStatusEffect(effectName) {
    return this.playerEffects.removeStatusEffect(effectName);
  }

  processVulnerability() {
    return this.playerEffects.processVulnerability();
  }

  applyVulnerability(damageIncrease, turns) {
    return this.playerEffects.applyVulnerability(damageIncrease, turns);
  }

  getEffectiveArmor() {
    return this.playerEffects.getEffectiveArmor(this.armor);
  }

  processStoneArmorDegradation(damage) {
    return this.playerEffects.processStoneArmorDegradation(damage);
  }

  processClassEffects() {
    return this.playerEffects.processClassEffects(this.maxHp);
  }

  updateRelentlessFuryLevel(newLevel) {
    this.level = newLevel;
    this.playerEffects.updateRelentlessFuryLevel(newLevel, this.class);
  }

  processThirstyBladeLifeSteal(damageDealt) {
    const result = this.playerEffects.processThirstyBladeLifeSteal(
      damageDealt, this.class, this.hp, this.maxHp
    );
    if (result.healed > 0) {
      this.hp = result.newHp;
    }
    return result.healed;
  }

  refreshThirstyBladeOnKill() {
    return this.playerEffects.refreshThirstyBladeOnKill(this.class);
  }

  getSweepingStrikeParams() {
    return this.playerEffects.getSweepingStrikeParams(this.class);
  }

  getRelentlessFuryVulnerability(baseDamage) {
    return this.playerEffects.getRelentlessFuryVulnerability(baseDamage, this.class);
  }

  calculateDamageWithVulnerability(baseDamage) {
    return this.playerEffects.calculateDamageWithVulnerability(baseDamage);
  }

  // ==================== CORE METHODS ====================
  
  /**
   * Calculate damage reduction from armor
   * @param {number} damage - Raw damage amount
   * @returns {number} Final damage after armor reduction
   */
  calculateDamageReduction(damage) {
    const totalArmor = this.getEffectiveArmor();
    const reductionRate = config.gameBalance.armor.reductionRate || 0.1;
    const maxReduction = config.gameBalance.armor.maxReduction || 0.9;

    let reductionPercent;
    if (totalArmor <= 0) {
      // Negative armor increases damage taken
      reductionPercent = Math.max(-2.0, totalArmor * reductionRate);
    } else {
      // Positive armor reduces damage
      reductionPercent = Math.min(maxReduction, totalArmor * reductionRate);
    }

    // Apply the reduction and return final damage
    const finalDamage = Math.floor(damage * (1 - reductionPercent));
    return Math.max(1, finalDamage); // Always deal at least 1 damage
  }

  /**
   * Apply damage modifiers from effects and class
   * @param {number} rawDamage - Base damage value
   * @returns {number} Modified damage
   */
  modifyDamage(rawDamage) {
    // First apply the normal damage modifier (level progression)
    let modifiedDamage = Math.floor(rawDamage * (this.damageMod || 1.0));

    // Apply effects-based modifiers
    modifiedDamage = this.playerEffects.applyDamageModifiers(
      modifiedDamage, this.class, this.level, this.hp, this.maxHp
    );

    return modifiedDamage;
  }

  /**
   * Take damage with proper armor calculation
   * @param {number} amount - Base damage amount
   * @param {string} source - Source of damage
   * @returns {number} Actual damage taken
   */
  takeDamage(amount, source) {
    // Apply damage resistance from effects
    let modifiedDamage = this.playerEffects.applyDamageResistance(amount, this.class);

    // Apply armor reduction using the calculation
    const finalDamage = this.calculateDamageReduction(modifiedDamage);

    // Apply the damage
    this.hp = Math.max(0, this.hp - finalDamage);

    // Check if died
    if (this.hp <= 0) {
      this.isAlive = false;
    }

    return finalDamage;
  }

  /**
   * Heal the player
   * @param {number} amount - Amount to heal
   * @returns {number} Actual amount healed
   */
  heal(amount) {
    const beforeHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return this.hp - beforeHp;
  }

  /**
   * Calculate healing modifier (inverse of damage modifier)
   * @returns {number} Healing modifier value
   */
  getHealingModifier() {
    // Get class base damage modifier
    const classDamageModifier =
      this.class && config.classAttributes && config.classAttributes[this.class]
        ? config.classAttributes[this.class].damageModifier || 1.0
        : 1.0;

    // Calculate pure level scaling (removing class modifier influence)
    const levelMultiplier = (this.damageMod || 1.0) / classDamageModifier;

    // Healing scales directly with level progression
    return levelMultiplier;
  }

  /**
   * Check if Crestfallen moonbeam is active (wounded condition)
   * @returns {boolean} Whether moonbeam detection is active
   */
  isMoonbeamActive() {
    if (this.race !== 'Crestfallen' || !this.isAlive) return false;
    return this.hp <= this.maxHp * 0.5;
  }

  /**
   * Process Kinfolk life bond healing
   * @param {number} monsterHp - Current monster HP
   * @param {Array} log - Event log to append messages to
   * @returns {number} Amount healed
   */
  processLifeBondHealing(monsterHp, log = []) {
    if (this.race !== 'Kinfolk' || !this.isAlive || monsterHp <= 0) return 0;

    const healAmount = Math.floor(
      monsterHp * this.racialAbility?.params?.healingPercent
    );
    const actualHeal = Math.min(healAmount, this.maxHp - this.hp);

    if (actualHeal > 0) {
      this.hp += actualHeal;

      const healLog = {
        type: 'life_bond_healing',
        public: false,
        targetId: this.id,
        message: messages.formatMessage(
          messages.getEvent('kinfolkLifebondPublic'),
          { playerName: this.name, healAmount: actualHeal }
        ),
        privateMessage: messages.formatMessage(
          messages.privateMessages.kinfolkLifebondPrivate,
          { healAmount: actualHeal }
        ),
        attackerMessage: '',
      };
      log.push(healLog);
    }

    return actualHeal;
  }

  /**
   * Add a new socket ID for reconnection tracking
   * @param {string} socketId - New socket ID to track
   */
  addSocketId(socketId) {
    if (!this.socketIds.includes(socketId)) {
      this.socketIds.push(socketId);
      logger.debug(`Added socket ID ${socketId} for player ${this.name}. Total socket IDs: ${this.socketIds.length}`);
    }
    this.id = socketId; // Update current socket ID
    
    // Update references in domain models
    this.playerAbilities.playerId = socketId;
    this.playerEffects.playerId = socketId;
  }

  /**
   * Check if this player has used a specific socket ID
   * @param {string} socketId - Socket ID to check
   * @returns {boolean} Whether this player has used this socket ID
   */
  hasUsedSocketId(socketId) {
    return this.socketIds.includes(socketId);
  }

  /**
   * Update player name and propagate to domain models
   * @param {string} newName - New player name
   */
  setName(newName) {
    this.name = newName;
    this.playerStats.setPlayerName(newName);
    this.playerAbilities.setPlayerName(newName);
    this.playerEffects.setPlayerName(newName);
  }

  /**
   * Prepare player data for client transmission
   * @param {boolean} includePrivate - Whether to include private/sensitive data
   * @param {string} requestingPlayerId - ID of player requesting the data
   * @returns {Object} Player data object for client
   */
  toClientData(includePrivate = false, requestingPlayerId = null) {
    const data = {
      id: this.id,
      name: this.name,
      race: this.race,
      class: this.class,
      hp: this.hp,
      maxHp: this.maxHp,
      armor: this.armor,
      effectiveArmor: this.getEffectiveArmor(), // Add effective armor for UI
      isAlive: this.isAlive,
      isReady: this.isReady,
      hasSubmittedAction: this.hasSubmittedAction,
      statusEffects: this.statusEffects,
      level: this.level, // Add level for UI
    };

    // Include private data for the player themselves or when specifically requested
    if (includePrivate || requestingPlayerId === this.id) {
      data.isWarlock = this.isWarlock;
      data.unlocked = this.unlocked;
      data.abilityCooldowns = this.abilityCooldowns;
      data.racialAbility = this.racialAbility;
      data.racialUsesLeft = this.racialUsesLeft;
      data.racialCooldown = this.racialCooldown;
      data.submissionStatus = this.getSubmissionStatus();
      data.damageMod = this.damageMod;

      // Add damage display info for abilities
      data.abilitiesWithDamage = this.unlocked.map((ability) => ({
        ...ability,
        damageDisplay: this.getAbilityDamageDisplay(ability),
      }));
    }

    return data;
  }
}

module.exports = Player;