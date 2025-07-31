/**
 * @fileoverview Tests for actionButtonText utility functions
 * Tests dynamic action button text based on selected abilities
 */

import {
  getActionButtonText,
  getActionButtonVariant
} from '@client/utils/actionButtonText';

describe('actionButtonText utility functions', () => {
  describe('getActionButtonText', () => {
    describe('basic attack abilities', () => {
      it('should return correct text for attack ability', () => {
        expect(getActionButtonText('attack', false)).toBe('Draw Blade');
        expect(getActionButtonText('attack', true)).toBe('Strike Ready');
      });

      it('should return correct text for fireball ability', () => {
        expect(getActionButtonText('fireball', false)).toBe('Ignite Flame');
        expect(getActionButtonText('fireball', true)).toBe('Fire Burning');
      });

      it('should return correct text for magicMissile ability', () => {
        expect(getActionButtonText('magicMissile', false)).toBe('Focus Arcane');
        expect(getActionButtonText('magicMissile', true)).toBe('Magic Charged');
      });

      it('should return correct text for backstab ability', () => {
        expect(getActionButtonText('backstab', false)).toBe('Find Opening');
        expect(getActionButtonText('backstab', true)).toBe('Shadow Strike');
      });
    });

    describe('healing abilities', () => {
      it('should return correct text for heal ability', () => {
        expect(getActionButtonText('heal', false)).toBe('Channel Light');
        expect(getActionButtonText('heal', true)).toBe('Healing Flow');
      });

      it('should return correct text for bandage ability', () => {
        expect(getActionButtonText('bandage', false)).toBe('Dress Wounds');
        expect(getActionButtonText('bandage', true)).toBe('Bandaging');
      });

      it('should return correct text for swiftMend ability', () => {
        expect(getActionButtonText('swiftMend', false)).toBe('Quick Mend');
        expect(getActionButtonText('swiftMend', true)).toBe('Light Flows');
      });

      it('should return correct text for rejuvenation ability', () => {
        expect(getActionButtonText('rejuvenation', false)).toBe('Nature\'s Touch');
        expect(getActionButtonText('rejuvenation', true)).toBe('Life Renewed');
      });
    });

    describe('defense abilities', () => {
      it('should return correct text for shieldWall ability', () => {
        expect(getActionButtonText('shieldWall', false)).toBe('Raise Guard');
        expect(getActionButtonText('shieldWall', true)).toBe('Shield Wall');
      });

      it('should return correct text for arcaneShield ability', () => {
        expect(getActionButtonText('arcaneShield', false)).toBe('Weave Protection');
        expect(getActionButtonText('arcaneShield', true)).toBe('Barrier Cast');
      });

      it('should return correct text for shadowVeil ability', () => {
        expect(getActionButtonText('shadowVeil', false)).toBe('Embrace Darkness');
        expect(getActionButtonText('shadowVeil', true)).toBe('Shadows Dance');
      });

      it('should return correct text for divineShield ability', () => {
        expect(getActionButtonText('divineShield', false)).toBe('Blessed Ward');
        expect(getActionButtonText('divineShield', true)).toBe('Divine Grace');
      });
    });

    describe('special abilities', () => {
      it('should return correct text for battleCry ability', () => {
        expect(getActionButtonText('battleCry', false)).toBe('Rally Allies');
        expect(getActionButtonText('battleCry', true)).toBe('War Cry');
      });

      it('should return correct text for poisonTrap ability', () => {
        expect(getActionButtonText('poisonTrap', false)).toBe('Set Trap');
        expect(getActionButtonText('poisonTrap', true)).toBe('Trap Armed');
      });

      it('should return correct text for fatesEye ability', () => {
        expect(getActionButtonText('fatesEye', false)).toBe('Peer Beyond');
        expect(getActionButtonText('fatesEye', true)).toBe('Visions Clear');
      });

      it('should return correct text for controlMonster ability', () => {
        expect(getActionButtonText('controlMonster', false)).toBe('Tame Beast');
        expect(getActionButtonText('controlMonster', true)).toBe('Will Bent');
      });
    });

    describe('advanced attack abilities', () => {
      it('should return correct text for pyroblast ability', () => {
        expect(getActionButtonText('pyroblast', false)).toBe('Summon Inferno');
        expect(getActionButtonText('pyroblast', true)).toBe('Volcano Erupts');
      });

      it('should return correct text for meteorShower ability', () => {
        expect(getActionButtonText('meteorShower', false)).toBe('Call Stars');
        expect(getActionButtonText('meteorShower', true)).toBe('Meteors Fall');
      });

      it('should return correct text for chainLightning ability', () => {
        expect(getActionButtonText('chainLightning', false)).toBe('Chain Storm');
        expect(getActionButtonText('chainLightning', true)).toBe('Lightning Arcs');
      });

      it('should return correct text for ricochetRound ability', () => {
        expect(getActionButtonText('ricochetRound', false)).toBe('Angle Shot');
        expect(getActionButtonText('ricochetRound', true)).toBe('Trajectory Set');
      });
    });

    describe('submitting state', () => {
      it('should return "Casting..." when isSubmitting is true', () => {
        expect(getActionButtonText('attack', false, true)).toBe('Casting...');
        expect(getActionButtonText('heal', true, true)).toBe('Casting...');
        expect(getActionButtonText('unknownAbility', false, true)).toBe('Casting...');
      });

      it('should prioritize isSubmitting over other states', () => {
        expect(getActionButtonText('attack', true, true)).toBe('Casting...');
      });
    });

    describe('unknown abilities', () => {
      it('should return default text for unknown abilities', () => {
        expect(getActionButtonText('unknownAbility', false)).toBe('Submit Action');
        expect(getActionButtonText('unknownAbility', true)).toBe('Action Locked');
      });

      it('should handle empty ability type', () => {
        expect(getActionButtonText('', false)).toBe('Submit Action');
        expect(getActionButtonText('', true)).toBe('Action Locked');
      });

      it('should handle null ability type', () => {
        expect(getActionButtonText(null as any, false)).toBe('Submit Action');
        expect(getActionButtonText(null as any, true)).toBe('Action Locked');
      });
    });

    describe('edge cases', () => {
      it('should handle case sensitivity', () => {
        expect(getActionButtonText('ATTACK', false)).toBe('Submit Action');
        expect(getActionButtonText('Attack', false)).toBe('Submit Action');
      });

      it('should handle partial matches', () => {
        expect(getActionButtonText('attackSpecial', false)).toBe('Submit Action');
        expect(getActionButtonText('healingWave', false)).toBe('Submit Action');
      });
    });
  });

  describe('getActionButtonVariant', () => {
    describe('submitted state', () => {
      it('should return secondary variant when submitted', () => {
        expect(getActionButtonVariant('attack', true)).toBe('secondary');
        expect(getActionButtonVariant('heal', true)).toBe('secondary');
        expect(getActionButtonVariant('unknownAbility', true)).toBe('secondary');
      });
    });

    describe('healing abilities', () => {
      it('should return primary variant for heal abilities', () => {
        expect(getActionButtonVariant('heal', false)).toBe('primary');
        expect(getActionButtonVariant('healingWave', false)).toBe('primary');
        expect(getActionButtonVariant('regeneration', false)).toBe('primary');
      });

      it('should detect heal in ability name', () => {
        expect(getActionButtonVariant('quickHeal', false)).toBe('primary');
        expect(getActionButtonVariant('massHeal', false)).toBe('primary');
      });

      it('should detect regeneration in ability name', () => {
        expect(getActionButtonVariant('fastRegeneration', false)).toBe('primary');
        expect(getActionButtonVariant('regenerationAura', false)).toBe('primary');
      });
    });

    describe('main attack abilities', () => {
      it('should return primary variant for specific attack abilities', () => {
        expect(getActionButtonVariant('pistolShot', false)).toBe('primary');
        expect(getActionButtonVariant('swordStrike', false)).toBe('primary');
        expect(getActionButtonVariant('fireBlast', false)).toBe('primary');
        expect(getActionButtonVariant('lightningBolt', false)).toBe('primary');
      });
    });

    describe('other abilities', () => {
      it('should return primary variant for other abilities', () => {
        expect(getActionButtonVariant('attack', false)).toBe('primary');
        expect(getActionButtonVariant('fireball', false)).toBe('primary');
        expect(getActionButtonVariant('shieldWall', false)).toBe('primary');
        expect(getActionButtonVariant('unknownAbility', false)).toBe('primary');
      });
    });

    describe('edge cases', () => {
      it('should handle empty ability type', () => {
        expect(getActionButtonVariant('', false)).toBe('primary');
        expect(getActionButtonVariant('', true)).toBe('secondary');
      });

      it('should handle null ability type', () => {
        expect(getActionButtonVariant(null as any, false)).toBe('primary');
        expect(getActionButtonVariant(null as any, true)).toBe('secondary');
      });

      it('should handle undefined ability type', () => {
        expect(getActionButtonVariant(undefined as any, false)).toBe('primary');
        expect(getActionButtonVariant(undefined as any, true)).toBe('secondary');
      });
    });

    describe('priority of conditions', () => {
      it('should prioritize submitted state over healing detection', () => {
        expect(getActionButtonVariant('heal', true)).toBe('secondary');
        expect(getActionButtonVariant('healingWave', true)).toBe('secondary');
      });

      it('should prioritize submitted state over main attack detection', () => {
        expect(getActionButtonVariant('pistolShot', true)).toBe('secondary');
        expect(getActionButtonVariant('lightningBolt', true)).toBe('secondary');
      });
    });
  });

  describe('integration tests', () => {
    it('should have consistent behavior between functions', () => {
      const abilities = ['attack', 'heal', 'fireball', 'shieldWall', 'unknownAbility'];
      
      abilities.forEach(ability => {
        // Both functions should handle the same ability types
        const text = getActionButtonText(ability, false);
        const variant = getActionButtonVariant(ability, false);
        
        expect(text).toBeDefined();
        expect(['primary', 'secondary', 'danger']).toContain(variant);
      });
    });

    it('should handle full ability workflow', () => {
      const ability = 'attack';
      
      // Ready state
      expect(getActionButtonText(ability, false)).toBe('Draw Blade');
      expect(getActionButtonVariant(ability, false)).toBe('primary');
      
      // Submitting state
      expect(getActionButtonText(ability, false, true)).toBe('Casting...');
      expect(getActionButtonVariant(ability, false)).toBe('primary');
      
      // Submitted state
      expect(getActionButtonText(ability, true)).toBe('Strike Ready');
      expect(getActionButtonVariant(ability, true)).toBe('secondary');
    });
  });
});