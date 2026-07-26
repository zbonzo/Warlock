import { getActionButtonText, getActionButtonVariant } from '../../../client/src/utils/actionButtonText';

describe('getActionButtonText', () => {
  it('returns "Casting..." when isSubmitting is true', () => {
    expect(getActionButtonText('attack', false, true)).toBe('Casting...');
    expect(getActionButtonText('heal', true, true)).toBe('Casting...');
  });

  it('returns the ready text when not submitted', () => {
    expect(getActionButtonText('attack', false)).toBe('Draw Blade');
    expect(getActionButtonText('fireball', false)).toBe('Ignite Flame');
    expect(getActionButtonText('heal', false)).toBe('Channel Light');
    expect(getActionButtonText('shieldWall', false)).toBe('Raise Guard');
  });

  it('returns the submitted text when submitted', () => {
    expect(getActionButtonText('attack', true)).toBe('Strike Ready');
    expect(getActionButtonText('fireball', true)).toBe('Fire Burning');
    expect(getActionButtonText('heal', true)).toBe('Healing Flow');
  });

  it('falls back to default text for unknown ability types', () => {
    expect(getActionButtonText('unknownAbility', false)).toBe('Submit Action');
    expect(getActionButtonText('unknownAbility', true)).toBe('Action Locked');
  });

  it('handles empty string ability type with default', () => {
    expect(getActionButtonText('', false)).toBe('Submit Action');
    expect(getActionButtonText('', true)).toBe('Action Locked');
  });

  it('covers all attack ability types', () => {
    const attacks = ['backstab', 'poisonStrike', 'holyBolt', 'lightningBolt', 'pistolShot'];
    for (const ability of attacks) {
      expect(getActionButtonText(ability, false)).toBeTruthy();
      expect(getActionButtonText(ability, true)).toBeTruthy();
    }
  });

  it('covers defense ability types', () => {
    const defenses = ['arcaneShield', 'shadowVeil', 'divineShield', 'barkskin'];
    for (const ability of defenses) {
      expect(getActionButtonText(ability, false)).toBeTruthy();
      expect(getActionButtonText(ability, true)).toBeTruthy();
    }
  });
});

describe('getActionButtonVariant', () => {
  it('returns "secondary" when submitted', () => {
    expect(getActionButtonVariant('attack', true)).toBe('secondary');
    expect(getActionButtonVariant('heal', true)).toBe('secondary');
    expect(getActionButtonVariant('fireball', true)).toBe('secondary');
  });

  it('returns "primary" when not submitted', () => {
    expect(getActionButtonVariant('attack', false)).toBe('primary');
    expect(getActionButtonVariant('fireball', false)).toBe('primary');
    expect(getActionButtonVariant('unknown', false)).toBe('primary');
  });
});
