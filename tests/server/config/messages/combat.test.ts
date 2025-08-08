/**
 * @fileoverview Tests for combat messages configuration
 * Tests the structure and content of combat message templates
 */
import combatMessages from '../../../server/config/messages/combat';

describe('Combat Messages Configuration', () => {
  it('should export a valid messages object', () => {
    expect(combatMessages).toBeDefined();
    expect(typeof combatMessages).toBe('object');
  });

  describe('Damage messages', () => {
    it('should have all required damage message types', () => {
      expect(combatMessages.damage).toBeDefined();
      expect(typeof combatMessages.damage).toBe('object');

      const requiredDamageMessages = [
        'playerTakesDamage',
        'playerDamageWithArmor',
        'playerDamageReduced',
        'vulnerabilityDamage',
        'monsterTakesDamage',
        'damageDealt'
      ];

      requiredDamageMessages.forEach(messageType => {
        expect(combatMessages.damage[messageType]).toBeDefined();
        expect(typeof combatMessages.damage[messageType]).toBe('string');
        expect(combatMessages.damage[messageType].length).toBeGreaterThan(0);
      });
    });

    it('should have proper placeholder formatting in damage messages', () => {
      const damageMessages = combatMessages.damage;

      // Test that key messages have proper placeholders
      expect(damageMessages.playerTakesDamage).toMatch(/{targetName}/);
      expect(damageMessages.playerTakesDamage).toMatch(/{damage}/);

      expect(damageMessages.playerDamageWithArmor).toMatch(/{targetName}/);
      expect(damageMessages.playerDamageWithArmor).toMatch(/{damage}/);
      expect(damageMessages.playerDamageWithArmor).toMatch(/{initial}/);
      expect(damageMessages.playerDamageWithArmor).toMatch(/{reduction}/);
    });
  });

  describe('Barbarian messages', () => {
    it('should have barbarian-specific messages', () => {
      expect(combatMessages.barbarian).toBeDefined();
      expect(typeof combatMessages.barbarian).toBe('object');

      const barbarianMessages = [
        'relentlessFuryVulnerability',
        'thirstyBladeLifeSteal',
        'sweepingStrikeHits',
        'sweepingStrikeStuns'
      ];

      barbarianMessages.forEach(messageType => {
        expect(combatMessages.barbarian[messageType]).toBeDefined();
        expect(typeof combatMessages.barbarian[messageType]).toBe('string');
      });
    });
  });

  describe('Coordination messages', () => {
    it('should have coordination system messages', () => {
      expect(combatMessages.coordination).toBeDefined();
      expect(typeof combatMessages.coordination).toBe('object');

      const coordinationMessages = [
        'damageBonus',
        'healingBonus',
        'monsterAssault',
        'teamworkAnnouncement',
        'coordinationFailed'
      ];

      coordinationMessages.forEach(messageType => {
        expect(combatMessages.coordination[messageType]).toBeDefined();
        expect(typeof combatMessages.coordination[messageType]).toBe('string');
      });
    });

    it('should have proper placeholders in coordination messages', () => {
      expect(combatMessages.coordination.damageBonus).toMatch(/{playerCount}/);
      expect(combatMessages.coordination.damageBonus).toMatch(/{bonusPercent}/);
      expect(combatMessages.coordination.healingBonus).toMatch(/{playerCount}/);
      expect(combatMessages.coordination.healingBonus).toMatch(/{bonusPercent}/);
    });
  });

  describe('Comeback mechanics messages', () => {
    it('should have comeback system messages', () => {
      expect(combatMessages.comeback).toBeDefined();
      expect(typeof combatMessages.comeback).toBe('object');

      const comebackMessages = [
        'activated',
        'damageBonus',
        'healingBonus',
        'armorBonus',
        'corruptionResistance',
        'lastStand'
      ];

      comebackMessages.forEach(messageType => {
        expect(combatMessages.comeback[messageType]).toBeDefined();
        expect(typeof combatMessages.comeback[messageType]).toBe('string');
      });
    });
  });

  describe('Detection messages', () => {
    it('should have detection penalty messages', () => {
      expect(combatMessages.detection).toBeDefined();
      expect(typeof combatMessages.detection).toBe('object');

      const detectionMessages = [
        'penaltyApplied',
        'penaltyActive',
        'corruptionBlocked',
        'penaltyExpired',
        'privateDetectionPenalty'
      ];

      detectionMessages.forEach(messageType => {
        expect(combatMessages.detection[messageType]).toBeDefined();
        expect(typeof combatMessages.detection[messageType]).toBe('string');
      });
    });
  });

  describe('Death and resurrection messages', () => {
    it('should have death messages', () => {
      expect(combatMessages.death).toBeDefined();
      expect(typeof combatMessages.death).toBe('object');

      const deathMessages = [
        'playerDies',
        'playerCollapse',
        'deathByPoison',
        'heroicSacrifice',
        'warlockEliminated'
      ];

      deathMessages.forEach(messageType => {
        expect(combatMessages.death[messageType]).toBeDefined();
        expect(typeof combatMessages.death[messageType]).toBe('string');
      });
    });

    it('should have resurrection messages', () => {
      expect(combatMessages.resurrection).toBeDefined();
      expect(typeof combatMessages.resurrection).toBe('object');

      const resurrectionMessages = [
        'playerResurrected',
        'playerRises',
        'undyingActivated',
        'hopefulReturn'
      ];

      resurrectionMessages.forEach(messageType => {
        expect(combatMessages.resurrection[messageType]).toBeDefined();
        expect(typeof combatMessages.resurrection[messageType]).toBe('string');
      });
    });
  });

  describe('Private messages', () => {
    it('should have private combat messages', () => {
      expect(combatMessages.private).toBeDefined();
      expect(typeof combatMessages.private).toBe('object');

      const privateMessages = [
        'youAttacked',
        'youWereAttacked',
        'youAttackedSimple',
        'youWereAttackedSimple',
        'healedByPlayer',
        'youKilledTarget'
      ];

      privateMessages.forEach(messageType => {
        expect(combatMessages.private[messageType]).toBeDefined();
        expect(typeof combatMessages.private[messageType]).toBe('string');
      });
    });

    it('should have proper placeholders in private messages', () => {
      expect(combatMessages.private.youAttacked).toMatch(/{targetName}/);
      expect(combatMessages.private.youAttacked).toMatch(/{damage}/);
      expect(combatMessages.private.youWereAttacked).toMatch(/{attackerName}/);
      expect(combatMessages.private.youWereAttacked).toMatch(/{damage}/);
    });
  });

  describe('Message formatting consistency', () => {
    it('should have consistent placeholder formatting across all messages', () => {
      const checkPlaceholders = (obj: any, path = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'string') {
            // Check that placeholders use curly braces format
            const placeholders = value.match(/{[^}]+}/g) || [];
            placeholders.forEach(placeholder => {
              expect(placeholder).toMatch(/^{[a-zA-Z][a-zA-Z0-9]*}$/);
            });
          } else if (typeof value === 'object' && value !== null) {
            checkPlaceholders(value, `${path}.${key}`);
          }
        });
      };

      checkPlaceholders(combatMessages);
    });

    it('should not have empty message strings', () => {
      const checkEmptyStrings = (obj: any) => {
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'string') {
            expect(value.trim().length).toBeGreaterThan(0);
          } else if (typeof value === 'object' && value !== null) {
            checkEmptyStrings(value);
          }
        });
      };

      checkEmptyStrings(combatMessages);
    });
  });

  describe('Game state messages', () => {
    it('should have game state transition messages', () => {
      expect(combatMessages.gameState).toBeDefined();
      expect(typeof combatMessages.gameState).toBe('object');

      const gameStateMessages = [
        'comebackActivated',
        'comebackDeactivated',
        'finalStand',
        'hopefulTurn',
        'balanceShifts'
      ];

      gameStateMessages.forEach(messageType => {
        expect(combatMessages.gameState[messageType]).toBeDefined();
        expect(typeof combatMessages.gameState[messageType]).toBe('string');
      });
    });
  });

  describe('Special ability messages', () => {
    it('should have moonbeam detection messages', () => {
      expect(combatMessages.moonbeam).toBeDefined();
      expect(typeof combatMessages.moonbeam).toBe('object');

      const moonbeamMessages = [
        'warlockDetected',
        'notWarlockDetected',
        'moonbeamPrivate',
        'truthRevealed'
      ];

      moonbeamMessages.forEach(messageType => {
        expect(combatMessages.moonbeam[messageType]).toBeDefined();
        expect(typeof combatMessages.moonbeam[messageType]).toBe('string');
      });
    });

    it('should have life bond messages', () => {
      expect(combatMessages.lifeBond).toBeDefined();
      expect(typeof combatMessages.lifeBond).toBe('object');

      expect(combatMessages.lifeBond.healing).toBeDefined();
      expect(combatMessages.lifeBond.healingPrivate).toBeDefined();
    });
  });
});
