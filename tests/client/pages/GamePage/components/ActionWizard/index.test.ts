/**
 * @fileoverview Tests for ActionWizard index file
 */

import * as ActionWizardExports from '@client/pages/GamePage/components/ActionWizard';

describe('ActionWizard index', () => {
  it('should export ActionWizard as named export', () => {
    expect(ActionWizardExports.ActionWizard).toBeDefined();
    expect(typeof ActionWizardExports.ActionWizard).toBe('function');
  });

  it('should export AbilitySelectionStep as named export', () => {
    expect(ActionWizardExports.AbilitySelectionStep).toBeDefined();
    expect(typeof ActionWizardExports.AbilitySelectionStep).toBe('function');
  });

  it('should export TargetSelectionStep as named export', () => {
    expect(ActionWizardExports.TargetSelectionStep).toBeDefined();
    expect(typeof ActionWizardExports.TargetSelectionStep).toBe('function');
  });

  it('should export all expected components', () => {
    const exports = Object.keys(ActionWizardExports);
    expect(exports).toContain('ActionWizard');
    expect(exports).toContain('AbilitySelectionStep');
    expect(exports).toContain('TargetSelectionStep');
    expect(exports).toHaveLength(3);
  });

  it('should have the correct export structure', () => {
    expect(ActionWizardExports).toBeDefined();
    expect(typeof ActionWizardExports).toBe('object');
  });
});