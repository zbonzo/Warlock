// server/GameRoom.js
const Player = require('./Player');
const classAbilities = require('../config/classAbilities');
const racialAbilities = require('../config/racialAbilities');
const { calculateStats } = require('../config/balancing');

const GameStateUtils = require('./systems/GameStateUtils');
const StatusEffectManager = require('./systems/StatusEffectManager');
const RacialAbilitySystem = require('./systems/RacialAbilitySystem');
const WarlockSystem = require('./systems/WarlockSystem');
const MonsterController = require('./systems/MonsterController');
const CombatSystem = require('./systems/CombatSystem');
const AbilityRegistry = require('./systems/AbilityRegistry');
const { registerAbilityHandlers } = require('./systems/abilityHandlers');

class GameRoom {
    constructor(code) {
      this.code           = code;
      this.players        = new Map();
      this.hostId         = null;
      this.started        = false;
      this.round          = 0;
      this.level          = 1;
      this.aliveCount     = 0;
      this.pendingActions = [];
      this.pendingRacialActions = []; // Track racial ability uses
      this.nextReady      = new Set();
  
      // Monster setup
      this.monster = {
        hp:      100,
        maxHp:   100,
        baseDmg: 10,
        age:     0
      };
      
      // Initialize systems
      this.gameStateUtils = new GameStateUtils(this.players);
      this.statusEffectManager = new StatusEffectManager(this.players, this.gameStateUtils);
      this.warlockSystem = new WarlockSystem(this.players, this.gameStateUtils);
      this.racialAbilitySystem = new RacialAbilitySystem(this.players, this.gameStateUtils, this.statusEffectManager);
      this.monsterController = new MonsterController(this.monster, this.players, this.statusEffectManager, this.racialAbilitySystem, this.gameStateUtils);
      this.combatSystem = new CombatSystem(this.players, this.monsterController, this.statusEffectManager, this.racialAbilitySystem, this.warlockSystem, this.gameStateUtils);
      
      // Initialize ability registry
      this.abilityRegistry = new AbilityRegistry();
      
      // Set up system references for ability handlers
      this.abilityRegistry.setSystems({
        players: this.players,
        gameStateUtils: this.gameStateUtils,
        statusEffectManager: this.statusEffectManager,
        warlockSystem: this.warlockSystem,
        racialAbilitySystem: this.racialAbilitySystem,
        monsterController: this.monsterController,
        combatSystem: this.combatSystem
      });
      
      // Connect RacialAbilitySystem to the registry
      this.racialAbilitySystem.setAbilityRegistry(this.abilityRegistry);
      
      // Register all ability handlers
      registerAbilityHandlers(this.abilityRegistry);
      this.abilityRegistry.listRegisteredAbilities();
    }
  
    addPlayer(id, name) {
        if (this.started || this.players.size >= 20) return false;
        const p = new Player(id, name);
        this.players.set(id, p);
        this.aliveCount++;
        if (!this.hostId) this.hostId = id;
        return true;
      }
  
    removePlayer(id) {
        const p = this.players.get(id);
        if (!p) return;
        if (p.isAlive) this.aliveCount--;
        if (p.isWarlock) this.warlockSystem.decrementWarlockCount();
        this.players.delete(id);
    }
  
    clearReady() {
        this.nextReady.clear();
        for (let p of this.players.values()) p.isReady = false;
    }
  
    setPlayerClass(id, race, cls) {
      const p = this.players.get(id);
      if (!p) return;
      
      p.race = race;
      p.class = cls;
      
      // Apply abilities list from class definition
      p.abilities = (classAbilities[cls] || []).map(a => ({...a}));
      p.unlocked = p.abilities.filter(a => a.unlockAt <= this.level);
      
      // Apply racial and class stat modifications
      const stats = calculateStats(race, cls);
      if (stats) {
        p.maxHp = stats.maxHp;
        p.armor = stats.armor;
        p.damageMod = stats.damageMod; // Store the damage modifier for use in combat
      } else {
        // Fallback in case of invalid race/class
        p.maxHp = 80;
        p.armor = 0;
        p.damageMod = 1.0;
      }
      
      p.hp = p.maxHp; // Set current HP to max HP
      
      // Assign racial ability
      if (racialAbilities[race]) {
        p.setRacialAbility(racialAbilities[race]);
      }
    }
  
    assignInitialWarlock(pref = null) {
        const ids = Array.from(this.players.keys());
        if (ids.length === 0) return;
        this.warlockSystem.assignInitialWarlock(pref);
    }
  
    addAction(actorId, actionType, targetId, options = {}) {
      if (!this.started) return false;
      const actor = this.players.get(actorId);
      
      // Basic validation
      if (!actor || !actor.isAlive || this.statusEffectManager.isPlayerStunned(actorId)) return false;
      if (this.pendingActions.some(a => a.actorId === actorId)) return false; // Already acted
      
      // Find the ability being used
      const ability = actor.unlocked.find(a => a.type === actionType);
      if (!ability) return false; // Ability not found or not unlocked
      
      // Check if our registry knows this ability type
      if (!this.abilityRegistry.hasClassAbility(actionType)) {
        console.warn(`Unknown ability type: ${actionType}`);
        return false;
      }
      
      // Handle invisibility redirection for player targets
      let finalTargetId = targetId;
      if (targetId !== '__monster__' && targetId !== actorId) {
        const targetPlayer = this.players.get(targetId);
        if (targetPlayer && targetPlayer.hasStatusEffect('invisible')) {
          finalTargetId = this.gameStateUtils.getRandomTarget(actorId, { 
            excludeIds: [targetId], 
            includeMonster: true, 
            monsterRef: this.monsterController.getState() 
          });
          
          if (!finalTargetId) return false; // No valid redirect target
        }
      }
      
      // Add the action to pending actions
      this.pendingActions.push({ 
        actorId, 
        actionType, 
        targetId: finalTargetId, 
        options 
      });
      
      return true;
    }
    
    // Add racial ability action
    addRacialAction(actorId, targetId) {
      if (!this.started) return false;
      
      const actor = this.players.get(actorId);
      if (!actor || !actor.isAlive || !actor.canUseRacialAbility()) return false;
      if (this.pendingRacialActions.some(a => a.actorId === actorId)) return false; // Already used racial this round
      
      // Check if our registry knows this racial ability type
      if (!actor.racialAbility || !this.abilityRegistry.hasRacialAbility(actor.racialAbility.type)) {
        console.warn(`Unknown racial ability type: ${actor.racialAbility?.type}`);
        return false;
      }
      
      let finalTargetId = targetId;
      if (targetId !== '__monster__' && targetId !== actorId) {
        const targetPlayer = this.players.get(targetId);
        if (!targetPlayer || !targetPlayer.isAlive) return false; // Invalid player target
        if (targetPlayer.hasStatusEffect('invisible')) {
          finalTargetId = this.gameStateUtils.getRandomTarget(actorId, { 
            excludeIds: [targetId], 
            onlyPlayers: true 
          });
          if (!finalTargetId) return false; // No valid redirect
        }
      }
      
      this.pendingRacialActions.push({
        actorId,
        targetId: finalTargetId,
        racialType: actor.racialAbility.type
      });
      
      actor.useRacialAbility(); // Mark as used on the player object
      return true;
    }

    // Helper to get a random target excluding specific IDs
    getRandomTargetExcept(actorId, excludeId) {
      return this.gameStateUtils.getRandomTarget(actorId, { 
        excludeIds: [excludeId], 
        includeMonster: true, 
        monsterRef: this.monsterController.getState() 
      });
    }
  
    getAlivePlayers() {
      return this.gameStateUtils.getAlivePlayers();
    }
      
    allActionsSubmitted() {
      // Only count players who aren't stunned
      const activePlayerCount = this.getAlivePlayers()
        .filter(p => !this.statusEffectManager.isPlayerStunned(p.id))
        .length;
      return this.pendingActions.length >= activePlayerCount;
    }
     
    processRound() {
      const log = [];
      const prevAlive = this.getAlivePlayers().length;
      
      // Reset per-round racial ability uses for all players
      for (let player of this.players.values()) {
        player.resetRacialPerRoundUses();
      }
    
      // ——— Process racial abilities first ———
      this.processRacialAbilities(log);
    
      // ——— Monster ages and prepares to strike ———
      this.monsterController.ageMonster();
    
      // ——— Process player actions using the ability registry ———
      this.processPlayerActions(log);
    
      // ——— Monster attacks using CombatSystem for unified damage logic ———
      this.monsterController.attack(log, this.combatSystem); 
    
      // ——— Status effects tick-down ———
      this.statusEffectManager.processTimedEffects(log);
      
      // Re-check for pending deaths after poison/timed effects
      for (const player of this.players.values()) {
        if (player.isAlive && player.hp <= 0) {
          player.pendingDeath = true;
          player.deathAttacker = "Effects";
        }
      }
      
      // ——— Process racial effects ———
      this.racialAbilitySystem.processEndOfRoundEffects(log);
    
      // ——— Process pending deaths (including Undying resurrections) ———
      this.combatSystem.processPendingDeaths(log);
    
      // ——— Monster death & level-up ———
      const monsterDeathResult = this.monsterController.handleDeathAndRespawn(this.level, log);
      this.level = monsterDeathResult.newLevel;
      // Monster state is updated internally by monsterController
    
      // ——— Win check & turn increment ———
      // Update aliveCount before checking win conditions
      this.aliveCount = this.getAlivePlayers().length; 
      const winner = this.gameStateUtils.checkWinConditions(this.warlockSystem.getWarlockCount(), this.aliveCount);
      
      if (!winner) {
          this.round++;
      }
    
      return {
        eventsLog: log,
        players: this.getPlayersInfo(),
        monster: this.monsterController.getState(),
        turn: this.round,
        level: this.level,
        winner
      };
    }
    
    processRacialAbilities(log) {
      console.log("===== PROCESSING RACIAL ABILITIES =====");
      console.log(`Pending racial actions: ${JSON.stringify(this.pendingRacialActions)}`);
      
      for (const action of this.pendingRacialActions) {
        const actor = this.players.get(action.actorId);
        if (!actor || !actor.isAlive) {
          console.log(`Skipping racial action: actor ${action.actorId} is invalid or dead`);
          continue;
        }
        
        console.log(`Processing racial action for ${actor.name} (${actor.race}): ${action.racialType}`);
        
        const target = action.targetId === '__monster__' ? 
          null : this.players.get(action.targetId);
        
        if (action.targetId !== '__monster__' && !target) {
          console.log(`Skipping racial action: target ${action.targetId} not found`);
          continue;
        }
        
        if (actor.racialAbility && actor.racialAbility.type === action.racialType) {
          // Check if the ability registry knows this ability
          if (!this.abilityRegistry.hasRacialAbility(action.racialType)) {
            console.log(`ERROR: Racial ability ${action.racialType} not registered in ability registry!`);
            
            // List all registered racial abilities
            console.log("Registered racial abilities:", 
              [...this.abilityRegistry.racialAbilityHandlers.keys()]);
            
            continue;
          }
          
          console.log(`Executing racial ability: ${action.racialType}`);
          try {
            this.abilityRegistry.executeRacialAbility(
              action.racialType,
              actor,
              target || action.targetId,
              actor.racialAbility,
              log
            );
          } catch (error) {
            console.error(`Error executing racial ability ${action.racialType}:`, error);
          }
        } else {
          console.log(`Racial ability mismatch: actor has ${actor.racialAbility?.type}, action is ${action.racialType}`);
        }
      }
      
      this.pendingRacialActions = [];
    }
    
    processPlayerActions(log) {
      for (const action of this.pendingActions) {
        const actor = this.players.get(action.actorId);
        if (!actor || !actor.isAlive || this.statusEffectManager.isPlayerStunned(action.actorId)) {
          if (actor && this.statusEffectManager.isPlayerStunned(action.actorId)) {
            log.push(`${actor.name} is stunned and cannot act.`);
          }
          continue;
        }
        
        const ability = actor.unlocked.find(a => a.type === action.actionType);
        if (!ability) continue;
        
        const target = action.targetId === '__monster__' ? 
          '__monster__' : this.players.get(action.targetId);
        
        log.push(`${actor.name} uses ${ability.name} on ${target === '__monster__' ? 'the Monster' : target.name}.`);
        
        this.abilityRegistry.executeClassAbility(
          action.actionType,
          actor,
          target,
          ability,
          log
        );
      }
      this.pendingActions = [];
    }
  
    getPlayersInfo() {
        return Array.from(this.players.values()).map(p => ({
          id: p.id,
          name: p.name,
          race: p.race,
          class: p.class,
          hp: p.hp,
          maxHp: p.maxHp,
          armor: p.armor,
          damageMod: p.damageMod,
          isWarlock: p.isWarlock,
          isAlive: p.isAlive,
          isReady: p.isReady,
          unlocked: p.unlocked,
          racialAbility: p.racialAbility,
          racialUsesLeft: p.racialUsesLeft,
          racialCooldown: p.racialCooldown,
          level: this.level,
          statusEffects: p.statusEffects
      }));
    }
  }
  
  module.exports = { GameRoom, classAbilities };