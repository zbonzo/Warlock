/**
 * @fileoverview Tests for PlayerEffects model
 */
import { PlayerEffects, StatusEffects, ClassEffects, RacialEffects } from '../../../../server/models/player/PlayerEffects';
import logger from '../../../../server/utils/logger';
import messages from '../../../../server/config/messages';
import config from '../../../../server/config';

// Mock dependencies
jest.mock('@utils/logger');
jest.mock('@messages');
jest.mock('@config');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockMessages = messages as any;
const mockConfig = config as any;

describe('PlayerEffects', () => {
  let playerEffects: PlayerEffects;
  const playerId = 'player1';
  const playerName = 'TestPlayer';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock config
    mockConfig.gameBalance = {
      stoneArmor: {
        degradationPerHit: 1,
        minimumValue: 0,
        initialValue: 5
      }
    };

    // Mock messages
    mockMessages.formatMessage = jest.fn((template, params) => 
      `Formatted: ${template} with ${JSON.stringify(params)}`
    );
    mockMessages.getEvent = jest.fn((event) => `Event: ${event}`);
    mockMessages.serverLogMessages = {
      debug: {
        StoneArmorDegradation: 'Stone armor degraded',
        UndyingSetup: 'Undying setup'
      }
    };

    playerEffects = new PlayerEffects(playerId, playerName);
  });

  describe('constructor', () => {
    it('should initialize with empty effects', () => {
      expect(playerEffects.getStatusEffects()).toEqual({});
      expect(playerEffects.getClassEffects()).toEqual({});
      expect(playerEffects.getRacialEffects()).toEqual({});
      expect(playerEffects.isVulnerable).toBe(false);
      expect(playerEffects.vulnerabilityIncrease).toBe(0);
    });
  });

  describe('status effects management', () => {
    describe('hasStatusEffect', () => {
      it('should return false for non-existent effects', () => {
        expect(playerEffects.hasStatusEffect('poison')).toBe(false);
      });

      it('should return true for existing effects', () => {
        playerEffects.applyStatusEffect('poison', { damage: 5, turns: 3 });
        expect(playerEffects.hasStatusEffect('poison')).toBe(true);
      });
    });

    describe('applyStatusEffect', () => {
      it('should apply status effect', () => {
        const effectData = { damage: 10, turns: 2 };
        playerEffects.applyStatusEffect('poison', effectData);

        const effects = playerEffects.getStatusEffects();
        expect(effects.poison).toEqual(effectData);
      });
    });

    describe('removeStatusEffect', () => {
      it('should remove existing status effect', () => {
        playerEffects.applyStatusEffect('poison', { damage: 5, turns: 3 });
        playerEffects.removeStatusEffect('poison');

        expect(playerEffects.hasStatusEffect('poison')).toBe(false);
      });

      it('should handle removing non-existent effect', () => {
        expect(() => playerEffects.removeStatusEffect('nonexistent')).not.toThrow();
      });
    });
  });

  describe('vulnerability system', () => {
    describe('applyVulnerability', () => {
      it('should apply vulnerability with damage increase and duration', () => {
        playerEffects.applyVulnerability(50, 3);

        expect(playerEffects.isVulnerable).toBe(true);
        expect(playerEffects.vulnerabilityIncrease).toBe(50);
        
        const effects = playerEffects.getStatusEffects();
        expect(effects.vulnerable).toEqual({
          damageIncrease: 50,
          turns: 3
        });
      });

      it('should validate vulnerability data with schema', () => {
        // Should not throw for valid data
        expect(() => playerEffects.applyVulnerability(50, 3)).not.toThrow();

        // Should throw for invalid data
        expect(() => playerEffects.applyVulnerability(-10, 3)).toThrow();
        expect(() => playerEffects.applyVulnerability(250, 3)).toThrow();
      });
    });

    describe('processVulnerability', () => {
      it('should return false when not vulnerable', () => {
        const expired = playerEffects.processVulnerability();
        expect(expired).toBe(false);
      });

      it('should reduce vulnerability duration', () => {
        playerEffects.applyVulnerability(30, 2);

        const expired1 = playerEffects.processVulnerability();
        expect(expired1).toBe(false);
        expect(playerEffects.getStatusEffects().vulnerable?.turns).toBe(1);

        const expired2 = playerEffects.processVulnerability();
        expect(expired2).toBe(true);
        expect(playerEffects.isVulnerable).toBe(false);
        expect(playerEffects.hasStatusEffect('vulnerable')).toBe(false);
      });
    });

    describe('calculateDamageWithVulnerability', () => {
      it('should return base damage when not vulnerable', () => {
        const damage = playerEffects.calculateDamageWithVulnerability(100);
        expect(damage).toBe(100);
      });

      it('should increase damage when vulnerable', () => {
        playerEffects.applyVulnerability(50, 2); // 50% increase
        
        const damage = playerEffects.calculateDamageWithVulnerability(100);
        expect(damage).toBe(150); // 100 * 1.5 = 150
      });

      it('should floor the damage result', () => {
        playerEffects.applyVulnerability(33, 2); // 33% increase
        
        const damage = playerEffects.calculateDamageWithVulnerability(100);
        expect(damage).toBe(133); // 100 * 1.33 = 133 (floored)
      });
    });
  });

  describe('armor system', () => {
    describe('getEffectiveArmor', () => {
      it('should return base armor when no effects', () => {
        const armor = playerEffects.getEffectiveArmor(10);
        expect(armor).toBe(10);
      });

      it('should add stone armor when intact', () => {
        playerEffects.initializeStoneArmor(5);
        
        const armor = playerEffects.getEffectiveArmor(10);
        expect(armor).toBe(15);
      });

      it('should add shielded effect armor', () => {
        playerEffects.applyStatusEffect('shielded', { armor: 8, turns: 2 });
        
        const armor = playerEffects.getEffectiveArmor(10);
        expect(armor).toBe(18);
      });

      it('should combine all armor sources', () => {
        playerEffects.initializeStoneArmor(5);
        playerEffects.applyStatusEffect('shielded', { armor: 8, turns: 2 });
        
        const armor = playerEffects.getEffectiveArmor(10);
        expect(armor).toBe(23); // 10 + 5 + 8
      });

      it('should handle zero base armor', () => {
        playerEffects.initializeStoneArmor(5);
        
        const armor = playerEffects.getEffectiveArmor(0);
        expect(armor).toBe(5);
      });
    });

    describe('stone armor system', () => {
      describe('initializeStoneArmor', () => {
        it('should initialize with default value', () => {
          playerEffects.initializeStoneArmor();
          
          const armor = playerEffects.getEffectiveArmor(0);
          expect(armor).toBe(5); // Default from config
        });

        it('should initialize with custom value', () => {
          playerEffects.initializeStoneArmor(10);
          
          const armor = playerEffects.getEffectiveArmor(0);
          expect(armor).toBe(10);
        });
      });

      describe('processStoneArmorDegradation', () => {
        it('should not degrade when stone armor not intact', () => {
          const result = playerEffects.processStoneArmorDegradation(10);
          
          expect(result.degraded).toBe(false);
          expect(result.newArmorValue).toBe(0);
        });

        it('should not degrade on zero or negative damage', () => {
          playerEffects.initializeStoneArmor(5);
          
          const result1 = playerEffects.processStoneArmorDegradation(0);
          const result2 = playerEffects.processStoneArmorDegradation(-5);
          
          expect(result1.degraded).toBe(false);
          expect(result2.degraded).toBe(false);
        });

        it('should degrade stone armor by config amount', () => {
          playerEffects.initializeStoneArmor(5);
          
          const result = playerEffects.processStoneArmorDegradation(10);
          
          expect(result.degraded).toBe(true);
          expect(result.oldValue).toBe(5);
          expect(result.newArmorValue).toBe(4);
          expect(result.destroyed).toBe(false);
        });

        it('should mark as destroyed when armor reaches minimum', () => {
          playerEffects.initializeStoneArmor(1);
          
          const result = playerEffects.processStoneArmorDegradation(10);
          
          expect(result.degraded).toBe(true);
          expect(result.newArmorValue).toBe(0);
          expect(result.destroyed).toBe(true);
        });

        it('should cap at minimum value', () => {
          playerEffects.initializeStoneArmor(1);
          
          // Multiple hits to go below minimum
          playerEffects.processStoneArmorDegradation(10);
          const result = playerEffects.processStoneArmorDegradation(10);
          
          expect(result.newArmorValue).toBe(0); // Capped at minimum
        });

        it('should log degradation', () => {
          playerEffects.initializeStoneArmor(5);
          
          playerEffects.processStoneArmorDegradation(10);
          
          expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Stone armor degraded')
          );
        });
      });
    });
  });

  describe('damage modifiers', () => {
    describe('applyDamageModifiers', () => {
      it('should return base damage with no effects', () => {
        const damage = playerEffects.applyDamageModifiers(100, 'Warrior', 1, 80, 100);
        expect(damage).toBe(100);
      });

      it('should apply blood rage double damage', () => {
        playerEffects.setRacialEffects({ bloodRage: true });
        
        const damage = playerEffects.applyDamageModifiers(100, 'Warrior', 1, 80, 100);
        expect(damage).toBe(200);
        
        // Should consume the effect
        expect(playerEffects.getRacialEffects().bloodRage).toBeUndefined();
      });

      it('should apply blood rage multiplier', () => {
        playerEffects.setRacialEffects({ bloodRageMultiplier: 1.5 });
        
        const damage = playerEffects.applyDamageModifiers(100, 'Warrior', 1, 80, 100);
        expect(damage).toBe(150);
        
        // Should consume the effect
        expect(playerEffects.getRacialEffects().bloodRageMultiplier).toBeUndefined();
      });

      it('should apply relentless fury for barbarians', () => {
        playerEffects.setClassEffects({
          relentlessFury: {
            active: true,
            currentLevel: 2,
            damagePerLevel: 0.05
          }
        });
        
        const damage = playerEffects.applyDamageModifiers(100, 'Barbarian', 1, 80, 100);
        expect(damage).toBe(110); // 100 * (1 + 2 * 0.05) = 110
      });

      it('should apply blood frenzy based on missing HP', () => {
        playerEffects.setClassEffects({
          bloodFrenzy: {
            active: true,
            damageIncreasePerHpMissing: 0.02
          }
        });
        
        // 50% HP missing = 50% * 0.02 = 1% damage increase
        const damage = playerEffects.applyDamageModifiers(100, 'Barbarian', 1, 50, 100);
        expect(damage).toBe(101); // 100 * (1 + 0.01) = 101
      });

      it('should apply unstoppable rage damage boost', () => {
        playerEffects.setClassEffects({
          unstoppableRage: {
            active: true,
            turnsLeft: 2,
            damageBoost: 1.5
          }
        });
        
        const damage = playerEffects.applyDamageModifiers(100, 'Barbarian', 1, 80, 100);
        expect(damage).toBe(150);
      });

      it('should apply weakened effect reduction', () => {
        playerEffects.applyStatusEffect('weakened', { damageReduction: 0.25, turns: 2 });
        
        const damage = playerEffects.applyDamageModifiers(100, 'Warrior', 1, 80, 100);
        expect(damage).toBe(75); // 100 * (1 - 0.25) = 75
      });

      it('should apply multiple effects in correct order', () => {
        playerEffects.setRacialEffects({ bloodRageMultiplier: 1.5 });
        playerEffects.setClassEffects({
          relentlessFury: { active: true, currentLevel: 1, damagePerLevel: 0.1 }
        });
        playerEffects.applyStatusEffect('weakened', { damageReduction: 0.2, turns: 2 });
        
        const damage = playerEffects.applyDamageModifiers(100, 'Barbarian', 1, 80, 100);
        // 100 * 1.5 = 150 (blood rage)
        // 150 * 1.1 = 165 (relentless fury)
        // 165 * 0.8 = 132 (weakened)
        expect(damage).toBe(132);
      });
    });

    describe('applyDamageResistance', () => {
      it('should return base damage with no effects', () => {
        const damage = playerEffects.applyDamageResistance(100, 'Warrior');
        expect(damage).toBe(100);
      });

      it('should apply vulnerability before resistance', () => {
        playerEffects.applyVulnerability(50, 2); // 50% increase
        
        const damage = playerEffects.applyDamageResistance(100, 'Warrior');
        expect(damage).toBe(150);
      });

      it('should apply unstoppable rage resistance', () => {
        playerEffects.setClassEffects({
          unstoppableRage: {
            active: true,
            turnsLeft: 2,
            damageResistance: 0.3
          }
        });
        
        const damage = playerEffects.applyDamageResistance(100, 'Barbarian');
        expect(damage).toBe(70); // 100 * (1 - 0.3) = 70
      });

      it('should apply vulnerability then resistance', () => {
        playerEffects.applyVulnerability(100, 2); // Double damage
        playerEffects.setClassEffects({
          unstoppableRage: {
            active: true,
            turnsLeft: 1,
            damageResistance: 0.5
          }
        });
        
        const damage = playerEffects.applyDamageResistance(100, 'Barbarian');
        // 100 * 2.0 = 200 (vulnerability)
        // 200 * 0.5 = 100 (resistance)
        expect(damage).toBe(100);
      });
    });
  });

  describe('class-specific abilities', () => {
    describe('relentless fury', () => {
      it('should calculate vulnerability damage for barbarians', () => {
        playerEffects.setClassEffects({
          relentlessFury: {
            active: true,
            currentLevel: 3,
            vulnerabilityPerLevel: 0.02
          }
        });
        
        const vulnDamage = playerEffects.getRelentlessFuryVulnerability(100, 'Barbarian');
        expect(vulnDamage).toBe(6); // 100 * (3 * 0.02) = 6
      });

      it('should return 0 for non-barbarians', () => {
        playerEffects.setClassEffects({
          relentlessFury: { active: true, currentLevel: 3 }
        });
        
        const vulnDamage = playerEffects.getRelentlessFuryVulnerability(100, 'Warrior');
        expect(vulnDamage).toBe(0);
      });

      it('should update level when player levels up', () => {
        playerEffects.setClassEffects({
          relentlessFury: { active: true, currentLevel: 1 }
        });
        
        playerEffects.updateRelentlessFuryLevel(5, 'Barbarian');
        
        const effects = playerEffects.getClassEffects();
        expect(effects.relentlessFury?.currentLevel).toBe(5);
      });
    });

    describe('thirsty blade', () => {
      it('should process life steal for active effect', () => {
        playerEffects.setClassEffects({
          thirstyBlade: {
            active: true,
            turnsLeft: 2,
            lifeSteal: 0.2
          }
        });
        
        const result = playerEffects.processThirstyBladeLifeSteal(50, 'Barbarian', 70, 100);
        expect(result.healed).toBe(10); // 50 * 0.2 = 10
        expect(result.newHp).toBe(80); // 70 + 10
      });

      it('should cap healing at max HP', () => {
        playerEffects.setClassEffects({
          thirstyBlade: {
            active: true,
            turnsLeft: 2,
            lifeSteal: 0.5
          }
        });
        
        const result = playerEffects.processThirstyBladeLifeSteal(100, 'Barbarian', 90, 100);
        expect(result.healed).toBe(10); // Capped at max HP difference
        expect(result.newHp).toBe(100);
      });

      it('should refresh on kill', () => {
        playerEffects.setClassEffects({
          thirstyBlade: {
            active: false,
            turnsLeft: 0,
            maxDuration: 3
          }
        });
        
        const refreshed = playerEffects.refreshThirstyBladeOnKill('Barbarian');
        
        expect(refreshed).toBe(true);
        expect(playerEffects.getClassEffects().thirstyBlade?.active).toBe(true);
        expect(playerEffects.getClassEffects().thirstyBlade?.turnsLeft).toBe(3);
      });

      it('should not refresh for non-barbarians', () => {
        const refreshed = playerEffects.refreshThirstyBladeOnKill('Warrior');
        expect(refreshed).toBe(false);
      });
    });

    describe('sweeping strike', () => {
      it('should return parameters for active effect', () => {
        playerEffects.setClassEffects({
          sweepingStrike: {
            active: true,
            bonusTargets: 2,
            stunChance: 0.3,
            stunDuration: 2
          }
        });
        
        const params = playerEffects.getSweepingStrikeParams('Barbarian');
        expect(params).toEqual({
          bonusTargets: 2,
          stunChance: 0.3,
          stunDuration: 2
        });
      });

      it('should return null for non-barbarians', () => {
        playerEffects.setClassEffects({
          sweepingStrike: { active: true }
        });
        
        const params = playerEffects.getSweepingStrikeParams('Warrior');
        expect(params).toBe(null);
      });

      it('should return null for inactive effect', () => {
        playerEffects.setClassEffects({
          sweepingStrike: { active: false }
        });
        
        const params = playerEffects.getSweepingStrikeParams('Barbarian');
        expect(params).toBe(null);
      });
    });
  });

  describe('effect processing', () => {
    describe('processClassEffects', () => {
      it('should return null when no effects', () => {
        const result = playerEffects.processClassEffects(100);
        expect(result).toBe(null);
      });

      it('should process thirsty blade expiration', () => {
        playerEffects.setClassEffects({
          thirstyBlade: {
            active: true,
            turnsLeft: 1
          }
        });
        
        const result = playerEffects.processClassEffects(100);
        
        expect(result?.type).toBe('thirsty_blade_ended');
        expect(playerEffects.getClassEffects().thirstyBlade?.active).toBe(false);
      });

      it('should process unstoppable rage expiration with self damage', () => {
        playerEffects.setClassEffects({
          unstoppableRage: {
            active: true,
            turnsLeft: 1,
            selfDamagePercent: 0.25
          }
        });
        
        const result = playerEffects.processClassEffects(100);
        
        expect(result?.type).toBe('rage_ended');
        expect(result?.damage).toBe(25); // 100 * 0.25
        expect(playerEffects.getClassEffects().unstoppableRage).toBeUndefined();
      });

      it('should process spirit guard expiration', () => {
        playerEffects.setClassEffects({
          spiritGuard: {
            active: true,
            turnsLeft: 1
          }
        });
        
        const result = playerEffects.processClassEffects(100);
        
        expect(result?.type).toBe('spirit_guard_ended');
        expect(playerEffects.getClassEffects().spiritGuard).toBeUndefined();
      });

      it('should process sanctuary of truth expiration', () => {
        playerEffects.setClassEffects({
          sanctuaryOfTruth: {
            active: true,
            turnsLeft: 1
          }
        });
        
        const result = playerEffects.processClassEffects(100);
        
        expect(result?.type).toBe('sanctuary_ended');
        expect(playerEffects.getClassEffects().sanctuaryOfTruth).toBeUndefined();
      });

      it('should decrement turns without expiring', () => {
        playerEffects.setClassEffects({
          thirstyBlade: {
            active: true,
            turnsLeft: 3
          }
        });
        
        const result = playerEffects.processClassEffects(100);
        
        expect(result).toBe(null);
        expect(playerEffects.getClassEffects().thirstyBlade?.turnsLeft).toBe(2);
      });
    });
  });

  describe('racial abilities', () => {
    describe('undying (lich racial)', () => {
      it('should initialize undying with default HP', () => {
        playerEffects.initializeUndying();
        
        const racialEffects = playerEffects.getRacialEffects();
        expect(racialEffects.resurrect).toEqual({
          resurrectedHp: 1,
          active: true
        });
      });

      it('should initialize undying with custom HP', () => {
        playerEffects.initializeUndying(5);
        
        const racialEffects = playerEffects.getRacialEffects();
        expect(racialEffects.resurrect?.resurrectedHp).toBe(5);
      });
    });
  });

  describe('utility methods', () => {
    describe('setPlayerName', () => {
      it('should update player name for logging', () => {
        playerEffects.setPlayerName('NewName');
        
        // Test that the new name is used (this would be visible in logging)
        expect(() => playerEffects.initializeStoneArmor()).not.toThrow();
      });
    });

    describe('getters and setters', () => {
      it('should handle vulnerability property getters/setters', () => {
        playerEffects.isVulnerable = true;
        playerEffects.vulnerabilityIncrease = 50;
        
        expect(playerEffects.isVulnerable).toBe(true);
        expect(playerEffects.vulnerabilityIncrease).toBe(50);
      });

      it('should return copies of effects', () => {
        const originalEffects = { poison: { damage: 5, turns: 2 } };
        playerEffects.applyStatusEffect('poison', originalEffects.poison);
        
        const statusEffects1 = playerEffects.getStatusEffects();
        const statusEffects2 = playerEffects.getStatusEffects();
        
        expect(statusEffects1).toEqual(statusEffects2);
        expect(statusEffects1).not.toBe(statusEffects2); // Different objects
      });
    });
  });

  describe('serialization', () => {
    describe('toJSON', () => {
      it('should serialize all effect data', () => {
        playerEffects.applyVulnerability(50, 2);
        playerEffects.initializeStoneArmor(10);
        playerEffects.setClassEffects({ thirstyBlade: { active: true } });
        playerEffects.setRacialEffects({ bloodRage: true });
        
        const json = playerEffects.toJSON();
        
        expect(json).toEqual({
          playerId,
          playerName,
          statusEffects: expect.objectContaining({
            vulnerable: { damageIncrease: 50, turns: 2 }
          }),
          _isVulnerable: true,
          _vulnerabilityIncrease: 50,
          stoneArmorIntact: true,
          stoneArmorValue: 10,
          classEffects: expect.objectContaining({
            thirstyBlade: { active: true }
          }),
          racialEffects: expect.objectContaining({
            bloodRage: true
          })
        });
      });
    });

    describe('fromJSON', () => {
      it('should recreate PlayerEffects from serialized data', () => {
        const data = {
          playerId: 'player2',
          playerName: 'Player2',
          statusEffects: { poison: { damage: 5, turns: 2 } },
          _isVulnerable: true,
          _vulnerabilityIncrease: 25,
          stoneArmorIntact: true,
          stoneArmorValue: 8,
          classEffects: { bloodFrenzy: { active: true } },
          racialEffects: { bloodRage: true }
        };
        
        const effects = PlayerEffects.fromJSON(data);
        
        expect(effects.getStatusEffects()).toEqual(data.statusEffects);
        expect(effects.isVulnerable).toBe(true);
        expect(effects.vulnerabilityIncrease).toBe(25);
        expect(effects.getEffectiveArmor(0)).toBe(8); // Stone armor
        expect(effects.getClassEffects()).toEqual(data.classEffects);
        expect(effects.getRacialEffects()).toEqual(data.racialEffects);
      });

      it('should handle missing data gracefully', () => {
        const data = {
          playerId: 'player3',
          playerName: 'Player3'
        };
        
        const effects = PlayerEffects.fromJSON(data);
        
        expect(effects.getStatusEffects()).toEqual({});
        expect(effects.isVulnerable).toBe(false);
        expect(effects.getClassEffects()).toEqual({});
        expect(effects.getRacialEffects()).toEqual({});
      });
    });
  });
});