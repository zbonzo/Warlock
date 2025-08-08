/**
 * @fileoverview Tests for AdaptabilityModal constants.ts
 * Test suite for constants and types used in AdaptabilityModal
 */

import {
  STEPS,
  ABILITY_CATEGORIES,
  DEFAULT_CATEGORY,
  type StepType,
  type AbilityCategory
} from '../../../../../client/src/components/modals/AdaptabilityModal/constants';

describe('AdaptabilityModal Constants', () => {
  describe('STEPS', () => {
    it('should define all required step constants', () => {
      expect(STEPS.SELECT_ABILITY).toBe('selectAbility');
      expect(STEPS.SELECT_CLASS).toBe('selectClass');
      expect(STEPS.SELECT_NEW_ABILITY).toBe('selectNewAbility');
    });

    it('should have string values for all steps', () => {
      Object.values(STEPS).forEach(step => {
        expect(typeof step).toBe('string');
        expect(step.length).toBeGreaterThan(0);
      });
    });

    it('should have unique values for all steps', () => {
      const stepValues = Object.values(STEPS);
      const uniqueValues = [...new Set(stepValues)];
      expect(stepValues).toHaveLength(uniqueValues.length);
    });

    it('should have descriptive step names', () => {
      expect(STEPS.SELECT_ABILITY).toContain('Ability');
      expect(STEPS.SELECT_CLASS).toContain('Class');
      expect(STEPS.SELECT_NEW_ABILITY).toContain('NewAbility');
    });
  });

  describe('StepType', () => {
    it('should accept valid step values', () => {
      const selectAbility: StepType = 'selectAbility';
      const selectClass: StepType = 'selectClass';
      const selectNewAbility: StepType = 'selectNewAbility';

      expect(selectAbility).toBe('selectAbility');
      expect(selectClass).toBe('selectClass');
      expect(selectNewAbility).toBe('selectNewAbility');
    });

    it('should work with STEPS constants', () => {
      const step1: StepType = STEPS.SELECT_ABILITY;
      const step2: StepType = STEPS.SELECT_CLASS;
      const step3: StepType = STEPS.SELECT_NEW_ABILITY;

      expect(step1).toBe('selectAbility');
      expect(step2).toBe('selectClass');
      expect(step3).toBe('selectNewAbility');
    });
  });

  describe('ABILITY_CATEGORIES', () => {
    it('should define all standard ability categories', () => {
      expect(ABILITY_CATEGORIES.Attack).toBeDefined();
      expect(ABILITY_CATEGORIES.Defense).toBeDefined();
      expect(ABILITY_CATEGORIES.Heal).toBeDefined();
      expect(ABILITY_CATEGORIES.Special).toBeDefined();
    });

    it('should have correct structure for Attack category', () => {
      const attack = ABILITY_CATEGORIES.Attack;
      expect(attack).toHaveProperty('icon');
      expect(attack).toHaveProperty('color');
      expect(attack.icon).toBe('⚔️');
      expect(attack.color).toBe('#e74c3c');
    });

    it('should have correct structure for Defense category', () => {
      const defense = ABILITY_CATEGORIES.Defense;
      expect(defense).toHaveProperty('icon');
      expect(defense).toHaveProperty('color');
      expect(defense.icon).toBe('🛡️');
      expect(defense.color).toBe('#3498db');
    });

    it('should have correct structure for Heal category', () => {
      const heal = ABILITY_CATEGORIES.Heal;
      expect(heal).toHaveProperty('icon');
      expect(heal).toHaveProperty('color');
      expect(heal.icon).toBe('💚');
      expect(heal.color).toBe('#2ecc71');
    });

    it('should have correct structure for Special category', () => {
      const special = ABILITY_CATEGORIES.Special;
      expect(special).toHaveProperty('icon');
      expect(special).toHaveProperty('color');
      expect(special.icon).toBe('✨');
      expect(special.color).toBe('#9b59b6');
    });

    it('should have valid hex color codes for all categories', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      Object.values(ABILITY_CATEGORIES).forEach(category => {
        expect(category.color).toMatch(hexColorRegex);
      });
    });

    it('should have non-empty icons for all categories', () => {
      Object.values(ABILITY_CATEGORIES).forEach(category => {
        expect(category.icon).toBeTruthy();
        expect(typeof category.icon).toBe('string');
        expect(category.icon.length).toBeGreaterThan(0);
      });
    });

    it('should have unique colors for each category', () => {
      const colors = Object.values(ABILITY_CATEGORIES).map(cat => cat.color);
      const uniqueColors = [...new Set(colors)];
      expect(colors).toHaveLength(uniqueColors.length);
    });

    it('should have unique icons for each category', () => {
      const icons = Object.values(ABILITY_CATEGORIES).map(cat => cat.icon);
      const uniqueIcons = [...new Set(icons)];
      expect(icons).toHaveLength(uniqueIcons.length);
    });
  });

  describe('DEFAULT_CATEGORY', () => {
    it('should have required properties', () => {
      expect(DEFAULT_CATEGORY).toHaveProperty('icon');
      expect(DEFAULT_CATEGORY).toHaveProperty('color');
    });

    it('should have correct default values', () => {
      expect(DEFAULT_CATEGORY.icon).toBe('📜');
      expect(DEFAULT_CATEGORY.color).toBe('#7f8c8d');
    });

    it('should have valid hex color code', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      expect(DEFAULT_CATEGORY.color).toMatch(hexColorRegex);
    });

    it('should have non-empty icon', () => {
      expect(DEFAULT_CATEGORY.icon).toBeTruthy();
      expect(typeof DEFAULT_CATEGORY.icon).toBe('string');
      expect(DEFAULT_CATEGORY.icon.length).toBeGreaterThan(0);
    });

    it('should be different from all standard categories', () => {
      const standardColors = Object.values(ABILITY_CATEGORIES).map(cat => cat.color);
      const standardIcons = Object.values(ABILITY_CATEGORIES).map(cat => cat.icon);

      expect(standardColors).not.toContain(DEFAULT_CATEGORY.color);
      expect(standardIcons).not.toContain(DEFAULT_CATEGORY.icon);
    });
  });

  describe('AbilityCategory Type', () => {
    it('should accept valid category objects', () => {
      const validCategory: AbilityCategory = {
        icon: '🔥',
        color: '#ff0000'
      };

      expect(validCategory.icon).toBe('🔥');
      expect(validCategory.color).toBe('#ff0000');
    });

    it('should work with all predefined categories', () => {
      const attack: AbilityCategory = ABILITY_CATEGORIES.Attack;
      const defense: AbilityCategory = ABILITY_CATEGORIES.Defense;
      const heal: AbilityCategory = ABILITY_CATEGORIES.Heal;
      const special: AbilityCategory = ABILITY_CATEGORIES.Special;
      const defaultCat: AbilityCategory = DEFAULT_CATEGORY;

      expect(attack).toBeDefined();
      expect(defense).toBeDefined();
      expect(heal).toBeDefined();
      expect(special).toBeDefined();
      expect(defaultCat).toBeDefined();
    });
  });

  describe('Color Consistency', () => {
    it('should use consistent color format across all categories', () => {
      const allCategories = [...Object.values(ABILITY_CATEGORIES), DEFAULT_CATEGORY];

      allCategories.forEach(category => {
        // Should be hex format
        expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        // Should use lowercase hex letters
        expect(category.color).toBe(category.color.toLowerCase());
      });
    });

    it('should use visually distinct colors', () => {
      // Test that colors are reasonably different (basic check)
      const colors = Object.values(ABILITY_CATEGORIES).map(cat => cat.color);

      // Should have different hues (basic red, blue, green, purple)
      expect(colors).toContain('#e74c3c'); // Red-ish for Attack
      expect(colors).toContain('#3498db'); // Blue-ish for Defense
      expect(colors).toContain('#2ecc71'); // Green-ish for Heal
      expect(colors).toContain('#9b59b6'); // Purple-ish for Special
    });
  });

  describe('Icon Consistency', () => {
    it('should use appropriate thematic icons', () => {
      expect(ABILITY_CATEGORIES.Attack.icon).toBe('⚔️'); // Weapon for attack
      expect(ABILITY_CATEGORIES.Defense.icon).toBe('🛡️'); // Shield for defense
      expect(ABILITY_CATEGORIES.Heal.icon).toBe('💚'); // Heart for healing
      expect(ABILITY_CATEGORIES.Special.icon).toBe('✨'); // Sparkles for special
      expect(DEFAULT_CATEGORY.icon).toBe('📜'); // Scroll for unknown/default
    });

    it('should use emoji icons consistently', () => {
      const allCategories = [...Object.values(ABILITY_CATEGORIES), DEFAULT_CATEGORY];

      allCategories.forEach(category => {
        // Icons should be single characters (emojis)
        expect(category.icon.length).toBeGreaterThan(0);
        expect(category.icon.length).toBeLessThanOrEqual(2); // Some emojis are 2 characters
      });
    });
  });

  describe('Immutability', () => {
    it('should not allow modification of STEPS', () => {
      expect(() => {
        (STEPS as any).SELECT_ABILITY = 'modified';
      }).toThrow();
    });

    it('should not allow adding new steps', () => {
      expect(() => {
        (STEPS as any).NEW_STEP = 'newStep';
      }).toThrow();
    });

    it('should allow reading all properties', () => {
      expect(() => {
        const step1 = STEPS.SELECT_ABILITY;
        const step2 = STEPS.SELECT_CLASS;
        const step3 = STEPS.SELECT_NEW_ABILITY;
        console.log(step1, step2, step3); // Use variables to avoid unused warnings
      }).not.toThrow();
    });
  });

  describe('Export Completeness', () => {
    it('should export all required constants', () => {
      expect(STEPS).toBeDefined();
      expect(ABILITY_CATEGORIES).toBeDefined();
      expect(DEFAULT_CATEGORY).toBeDefined();
    });

    it('should have properly structured exports', () => {
      expect(typeof STEPS).toBe('object');
      expect(typeof ABILITY_CATEGORIES).toBe('object');
      expect(typeof DEFAULT_CATEGORY).toBe('object');
    });
  });
});
