/**
 * @fileoverview Tests for GameTutorial constants.ts
 * Test suite for constants and types used in GameTutorial
 */

import {
  TUTORIAL_STEPS,
  getTutorialStep
} from '../../../../../client/src/components/modals/GameTutorial/constants';

describe('GameTutorial Constants', () => {
  describe('TUTORIAL_STEPS', () => {
    it('should be defined and be an array', () => {
      expect(TUTORIAL_STEPS).toBeDefined();
      expect(Array.isArray(TUTORIAL_STEPS)).toBe(true);
    });

    it('should have more than 0 steps', () => {
      expect(TUTORIAL_STEPS.length).toBeGreaterThan(0);
    });

    it('should have expected minimum number of steps', () => {
      // Based on the component, should have at least welcome and ready steps
      expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have welcome step as first step', () => {
      const firstStep = TUTORIAL_STEPS[0];
      expect(firstStep.title).toContain('Welcome to Warlock');
      expect(firstStep.type).toBe('welcome');
    });

    it('should have ready step as last step', () => {
      const lastStep = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
      expect(lastStep.title).toContain('Ready to Play');
      expect(lastStep.type).toBe('ready');
    });

    it('should have all required properties for each step', () => {
      TUTORIAL_STEPS.forEach((step, index) => {
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('content');
        expect(step).toHaveProperty('type');
        
        expect(typeof step.title).toBe('string');
        expect(typeof step.content).toBe('string');
        expect(typeof step.type).toBe('string');
        
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.content.length).toBeGreaterThan(0);
        expect(step.type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Step Content Validation', () => {
    it('should have welcome step with highlights', () => {
      const welcomeStep = TUTORIAL_STEPS.find(step => step.type === 'welcome');
      
      expect(welcomeStep).toBeDefined();
      expect(welcomeStep!.highlights).toBeDefined();
      expect(Array.isArray(welcomeStep!.highlights)).toBe(true);
      expect(welcomeStep!.highlights!.length).toBeGreaterThan(0);
      
      welcomeStep!.highlights!.forEach(highlight => {
        expect(highlight).toHaveProperty('icon');
        expect(highlight).toHaveProperty('text');
        expect(typeof highlight.icon).toBe('string');
        expect(typeof highlight.text).toBe('string');
      });
    });

    it('should have steps with proper flow content', () => {
      const flowSteps = TUTORIAL_STEPS.filter(step => step.steps);
      
      expect(flowSteps.length).toBeGreaterThan(0);
      
      flowSteps.forEach(step => {
        expect(Array.isArray(step.steps)).toBe(true);
        expect(step.steps!.length).toBeGreaterThan(0);
        
        step.steps!.forEach(stepText => {
          expect(typeof stepText).toBe('string');
          expect(stepText.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have steps with tips', () => {
      const stepsWithTips = TUTORIAL_STEPS.filter(step => step.tips);
      
      expect(stepsWithTips.length).toBeGreaterThan(0);
      
      stepsWithTips.forEach(step => {
        expect(Array.isArray(step.tips)).toBe(true);
        expect(step.tips!.length).toBeGreaterThan(0);
        
        step.tips!.forEach(tip => {
          expect(typeof tip).toBe('string');
          expect(tip.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have ready step with reminders', () => {
      const readyStep = TUTORIAL_STEPS.find(step => step.type === 'ready');
      
      expect(readyStep).toBeDefined();
      expect(readyStep!.reminders).toBeDefined();
      expect(Array.isArray(readyStep!.reminders)).toBe(true);
      expect(readyStep!.reminders!.length).toBeGreaterThan(0);
      
      readyStep!.reminders!.forEach(reminder => {
        expect(typeof reminder).toBe('string');
        expect(reminder.length).toBeGreaterThan(0);
      });
    });

    it('should have race information steps', () => {
      const raceSteps = TUTORIAL_STEPS.filter(step => step.races);
      
      expect(raceSteps.length).toBeGreaterThan(0);
      
      raceSteps.forEach(step => {
        expect(Array.isArray(step.races)).toBe(true);
        expect(step.races!.length).toBeGreaterThan(0);
        
        step.races!.forEach(race => {
          expect(race).toHaveProperty('emoji');
          expect(race).toHaveProperty('name');
          expect(race).toHaveProperty('type');
          expect(race).toHaveProperty('ability');
          
          expect(typeof race.emoji).toBe('string');
          expect(typeof race.name).toBe('string');
          expect(typeof race.type).toBe('string');
          expect(typeof race.ability).toBe('string');
        });
      });
    });

    it('should have class information steps', () => {
      const classSteps = TUTORIAL_STEPS.filter(step => step.classes);
      
      expect(classSteps.length).toBeGreaterThan(0);
      
      classSteps.forEach(step => {
        expect(Array.isArray(step.classes)).toBe(true);
        expect(step.classes!.length).toBeGreaterThan(0);
        
        step.classes!.forEach(cls => {
          expect(cls).toHaveProperty('emoji');
          expect(cls).toHaveProperty('name');
          expect(cls).toHaveProperty('type');
          expect(cls).toHaveProperty('desc');
          
          expect(typeof cls.emoji).toBe('string');
          expect(typeof cls.name).toBe('string');
          expect(typeof cls.type).toBe('string');
          expect(typeof cls.desc).toBe('string');
        });
      });
    });

    it('should have detection steps with methods', () => {
      const detectionSteps = TUTORIAL_STEPS.filter(step => step.methods);
      
      expect(detectionSteps.length).toBeGreaterThan(0);
      
      detectionSteps.forEach(step => {
        expect(Array.isArray(step.methods)).toBe(true);
        expect(step.methods!.length).toBeGreaterThan(0);
        
        step.methods!.forEach(method => {
          expect(method).toHaveProperty('icon');
          expect(method).toHaveProperty('name');
          expect(method).toHaveProperty('desc');
          
          expect(typeof method.icon).toBe('string');
          expect(typeof method.name).toBe('string');
          expect(typeof method.desc).toBe('string');
        });
      });
    });
  });

  describe('Step Types Validation', () => {
    it('should have diverse step types', () => {
      const stepTypes = TUTORIAL_STEPS.map(step => step.type);
      const uniqueTypes = [...new Set(stepTypes)];
      
      // Should have multiple different step types
      expect(uniqueTypes.length).toBeGreaterThan(5);
    });

    it('should include expected step types', () => {
      const stepTypes = TUTORIAL_STEPS.map(step => step.type);
      
      expect(stepTypes).toContain('welcome');
      expect(stepTypes).toContain('ready');
      expect(stepTypes).toContain('flow');
      expect(stepTypes).toContain('threat');
      expect(stepTypes).toContain('detection');
    });

    it('should have valid step type strings', () => {
      TUTORIAL_STEPS.forEach(step => {
        expect(step.type).toMatch(/^[a-z]+[0-9]*$/); // Only lowercase letters and numbers
        expect(step.type.length).toBeGreaterThan(2);
      });
    });
  });

  describe('Content Quality', () => {
    it('should have meaningful titles', () => {
      TUTORIAL_STEPS.forEach(step => {
        // Titles should contain emojis and descriptive text
        expect(step.title).toMatch(/[\u{1F000}-\u{1F9FF}]/u); // Contains emoji
        expect(step.title.length).toBeGreaterThan(5);
      });
    });

    it('should have substantial content', () => {
      TUTORIAL_STEPS.forEach(step => {
        expect(step.content.length).toBeGreaterThan(20); // Meaningful content
      });
    });

    it('should have proper punctuation in content', () => {
      TUTORIAL_STEPS.forEach(step => {
        // Content should end with proper punctuation
        expect(step.content).toMatch(/[.!:]/);
      });
    });

    it('should use consistent emoji style', () => {
      TUTORIAL_STEPS.forEach(step => {
        if (step.highlights) {
          step.highlights.forEach(highlight => {
            expect(highlight.icon).toMatch(/[\u{1F000}-\u{1F9FF}]/u);
          });
        }
        
        if (step.races) {
          step.races.forEach(race => {
            expect(race.emoji).toMatch(/[\u{1F000}-\u{1F9FF}]/u);
          });
        }
        
        if (step.classes) {
          step.classes.forEach(cls => {
            expect(cls.emoji).toMatch(/[\u{1F000}-\u{1F9FF}]/u);
          });
        }
      });
    });
  });

  describe('Game-specific Content', () => {
    it('should include Warlock-specific terminology', () => {
      const allContent = TUTORIAL_STEPS.map(step => 
        `${step.title} ${step.content}`
      ).join(' ');
      
      expect(allContent.toLowerCase()).toContain('warlock');
      expect(allContent.toLowerCase()).toContain('monster');
      expect(allContent.toLowerCase()).toContain('hero');
      expect(allContent.toLowerCase()).toContain('corruption');
    });

    it('should include race names', () => {
      const raceSteps = TUTORIAL_STEPS.filter(step => step.races);
      const raceNames = raceSteps.flatMap(step => 
        step.races!.map(race => race.name)
      );
      
      expect(raceNames).toContain('Artisan');
      expect(raceNames).toContain('Rockhewn');
      expect(raceNames).toContain('Lich');
      expect(raceNames).toContain('Orc');
      expect(raceNames).toContain('Crestfallen');
      expect(raceNames).toContain('Kinfolk');
    });

    it('should include class names', () => {
      const classSteps = TUTORIAL_STEPS.filter(step => step.classes);
      const classNames = classSteps.flatMap(step => 
        step.classes!.map(cls => cls.name)
      );
      
      expect(classNames).toContain('Warrior');
      expect(classNames).toContain('Pyromancer');
      expect(classNames).toContain('Wizard');
      expect(classNames).toContain('Assassin');
      expect(classNames).toContain('Priest');
      expect(classNames).toContain('Oracle');
    });

    it('should include detection abilities', () => {
      const detectionSteps = TUTORIAL_STEPS.filter(step => step.methods);
      const abilityNames = detectionSteps.flatMap(step => 
        step.methods!.map(method => method.name)
      );
      
      expect(abilityNames).toContain('Eye of Fate');
      expect(abilityNames).toContain('Moonbeam');
      expect(abilityNames).toContain('Sanctuary');
    });
  });

  describe('getTutorialStep Function', () => {
    it('should return correct step for valid index', () => {
      const firstStep = getTutorialStep(0);
      expect(firstStep).toBe(TUTORIAL_STEPS[0]);
      
      const secondStep = getTutorialStep(1);
      expect(secondStep).toBe(TUTORIAL_STEPS[1]);
      
      const lastIndex = TUTORIAL_STEPS.length - 1;
      const lastStep = getTutorialStep(lastIndex);
      expect(lastStep).toBe(TUTORIAL_STEPS[lastIndex]);
    });

    it('should return null for negative index', () => {
      expect(getTutorialStep(-1)).toBeNull();
      expect(getTutorialStep(-10)).toBeNull();
    });

    it('should return null for index beyond array length', () => {
      const beyondLength = TUTORIAL_STEPS.length;
      expect(getTutorialStep(beyondLength)).toBeNull();
      expect(getTutorialStep(beyondLength + 10)).toBeNull();
    });

    it('should return null for non-integer index', () => {
      expect(getTutorialStep(1.5)).toBeNull();
      expect(getTutorialStep(0.9)).toBeNull();
    });

    it('should handle edge case of exactly array length', () => {
      const exactLength = TUTORIAL_STEPS.length;
      expect(getTutorialStep(exactLength)).toBeNull();
    });

    it('should return same reference as direct array access', () => {
      for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
        expect(getTutorialStep(i)).toBe(TUTORIAL_STEPS[i]);
      }
    });
  });

  describe('Strategy Content', () => {
    it('should have strategy tips for both teams', () => {
      const strategySteps = TUTORIAL_STEPS.filter(step => 
        step.goodTips || step.warlockTips
      );
      
      expect(strategySteps.length).toBeGreaterThan(0);
      
      const hasGoodTips = strategySteps.some(step => step.goodTips);
      const hasWarlockTips = strategySteps.some(step => step.warlockTips);
      
      expect(hasGoodTips).toBe(true);
      expect(hasWarlockTips).toBe(true);
    });

    it('should have warlock detection tells', () => {
      const detectionSteps = TUTORIAL_STEPS.filter(step => step.tells);
      
      expect(detectionSteps.length).toBeGreaterThan(0);
      
      detectionSteps.forEach(step => {
        expect(Array.isArray(step.tells)).toBe(true);
        expect(step.tells!.length).toBeGreaterThan(0);
        
        step.tells!.forEach(tell => {
          expect(typeof tell).toBe('string');
          expect(tell.length).toBeGreaterThan(0);
        });
      });
    });

    it('should include threat system information', () => {
      const threatStep = TUTORIAL_STEPS.find(step => step.type === 'threat');
      
      expect(threatStep).toBeDefined();
      expect(threatStep!.formula).toBeDefined();
      expect(typeof threatStep!.formula).toBe('string');
      expect(threatStep!.formula!.length).toBeGreaterThan(0);
    });

    it('should include coordination information', () => {
      const coordStep = TUTORIAL_STEPS.find(step => step.type === 'coordination');
      
      expect(coordStep).toBeDefined();
      expect(coordStep!.highlights).toBeDefined();
      expect(coordStep!.highlights!.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should not have duplicate step titles', () => {
      const titles = TUTORIAL_STEPS.map(step => step.title);
      const uniqueTitles = [...new Set(titles)];
      
      expect(titles.length).toBe(uniqueTitles.length);
    });

    it('should maintain consistent data structure', () => {
      TUTORIAL_STEPS.forEach((step, index) => {
        // All steps should have these base properties
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('content');
        expect(step).toHaveProperty('type');
        
        // Optional properties should be properly typed when present
        if (step.highlights) {
          expect(Array.isArray(step.highlights)).toBe(true);
        }
        if (step.steps) {
          expect(Array.isArray(step.steps)).toBe(true);
        }
        if (step.tips) {
          expect(Array.isArray(step.tips)).toBe(true);
        }
        if (step.races) {
          expect(Array.isArray(step.races)).toBe(true);
        }
        if (step.classes) {
          expect(Array.isArray(step.classes)).toBe(true);
        }
      });
    });

    it('should have no empty arrays for optional properties', () => {
      TUTORIAL_STEPS.forEach(step => {
        if (step.highlights) {
          expect(step.highlights.length).toBeGreaterThan(0);
        }
        if (step.steps) {
          expect(step.steps.length).toBeGreaterThan(0);
        }
        if (step.tips) {
          expect(step.tips.length).toBeGreaterThan(0);
        }
        if (step.races) {
          expect(step.races.length).toBeGreaterThan(0);
        }
        if (step.classes) {
          expect(step.classes.length).toBeGreaterThan(0);
        }
        if (step.methods) {
          expect(step.methods.length).toBeGreaterThan(0);
        }
        if (step.tells) {
          expect(step.tells.length).toBeGreaterThan(0);
        }
        if (step.goodTips) {
          expect(step.goodTips.length).toBeGreaterThan(0);
        }
        if (step.warlockTips) {
          expect(step.warlockTips.length).toBeGreaterThan(0);
        }
        if (step.reminders) {
          expect(step.reminders.length).toBeGreaterThan(0);
        }
      });
    });
  });
});