/**
 * @fileoverview Tests for MobileActionWizard index file
 */

import * as MobileActionWizardExports from '@client/pages/GamePage/components/MobileActionWizard';

describe('MobileActionWizard index', () => {
  it('should export MobileActionWizard as named export', () => {
    expect(MobileActionWizardExports.MobileActionWizard).toBeDefined();
    expect(typeof MobileActionWizardExports.MobileActionWizard).toBe('function');
  });

  it('should export AbilitySelectionStep as named export', () => {
    expect(MobileActionWizardExports.AbilitySelectionStep).toBeDefined();
    expect(typeof MobileActionWizardExports.AbilitySelectionStep).toBe('function');
  });

  it('should export TargetSelectionStep as named export', () => {
    expect(MobileActionWizardExports.TargetSelectionStep).toBeDefined();
    expect(typeof MobileActionWizardExports.TargetSelectionStep).toBe('function');
  });

  it('should export MobilePlayerHeader as named export', () => {
    expect(MobileActionWizardExports.MobilePlayerHeader).toBeDefined();
    expect(typeof MobileActionWizardExports.MobilePlayerHeader).toBe('function');
  });

  it('should export all expected components', () => {
    const exports = Object.keys(MobileActionWizardExports);
    expect(exports).toContain('MobileActionWizard');
    expect(exports).toContain('AbilitySelectionStep');
    expect(exports).toContain('TargetSelectionStep');
    expect(exports).toContain('MobilePlayerHeader');
    expect(exports).toHaveLength(4);
  });

  it('should have the correct export structure', () => {
    expect(MobileActionWizardExports).toBeDefined();
    expect(typeof MobileActionWizardExports).toBe('object');
  });
});
