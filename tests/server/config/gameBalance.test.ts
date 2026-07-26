import * as gb from '../../../server/config/gameBalance';

const { monster, player, warlock, coordinationBonus } = gb;

describe('gameBalance – monster config', () => {
  it('has positive base stats', () => {
    expect(monster.baseHp).toBeGreaterThan(0);
    expect(monster.baseDamage).toBeGreaterThan(0);
    expect(monster.hpScalingMultiplier).toBeGreaterThan(1);
  });

  it('has valid damage scaling', () => {
    expect(monster.damageScaling.ageMultiplier).toBeGreaterThan(0);
    expect(monster.damageScaling.maxAge === null || monster.damageScaling.maxAge > 0).toBe(true);
  });

  it('targeting flags are booleans', () => {
    const t = monster.targeting;
    expect(typeof t.preferLowestHp).toBe('boolean');
    expect(typeof t.useThreatSystem).toBe('boolean');
    expect(typeof t.canAttackInvisible).toBe('boolean');
    expect(typeof t.fallbackToHighestHp).toBe('boolean');
    expect(typeof t.canAttackWarlock).toBe('boolean');
  });

  it('threat system has valid multipliers', () => {
    const { threat } = monster;
    expect(typeof threat.enabled).toBe('boolean');
    expect(threat.armorMultiplier).toBeGreaterThanOrEqual(0);
    expect(threat.damageMultiplier).toBeGreaterThanOrEqual(0);
    expect(threat.healingMultiplier).toBeGreaterThanOrEqual(0);
    expect(threat.decayRate).toBeGreaterThanOrEqual(0);
    expect(threat.decayRate).toBeLessThanOrEqual(1);
  });

  it('threat system consistency: useThreatSystem matches threat.enabled', () => {
    if (monster.threat.enabled) {
      expect(monster.targeting.useThreatSystem).toBe(true);
    }
  });
});

describe('gameBalance – player config', () => {
  it('armor reduction values are within [0, 1]', () => {
    const { armor } = player;
    expect(armor.reductionRate).toBeGreaterThan(0);
    expect(armor.maxReduction).toBeGreaterThanOrEqual(0);
    expect(armor.maxReduction).toBeLessThanOrEqual(1);
    expect(armor.minReduction).toBeGreaterThanOrEqual(0);
    expect(armor.minReduction).toBeLessThanOrEqual(armor.maxReduction);
  });

  it('level-up config has positive growth values', () => {
    const { levelUp } = player;
    expect(levelUp.hpIncrease).toBeGreaterThanOrEqual(0);
    expect(levelUp.damageIncrease).toBeGreaterThanOrEqual(0);
    expect(typeof levelUp.fullHealOnLevelUp).toBe('boolean');
  });

  it('healing config is valid', () => {
    const { healing } = player;
    expect(healing.modifierBase).toBeGreaterThan(0);
    expect(typeof healing.antiDetection.enabled).toBe('boolean');
    expect(healing.antiDetection.detectionChance).toBeGreaterThanOrEqual(0);
    expect(healing.antiDetection.detectionChance).toBeLessThanOrEqual(1);
  });

  it('death config flags are booleans', () => {
    expect(typeof player.death.pendingDeathSystem).toBe('boolean');
    expect(typeof player.death.allowResurrection).toBe('boolean');
  });
});

describe('gameBalance – warlock config', () => {
  it('conversion chances are in [0, 1]', () => {
    const { conversion } = warlock;
    expect(conversion.baseChance).toBeGreaterThanOrEqual(0);
    expect(conversion.baseChance).toBeLessThanOrEqual(1);
    expect(conversion.maxChance).toBeGreaterThanOrEqual(conversion.baseChance);
    expect(conversion.maxChance).toBeLessThanOrEqual(1);
  });

  it('conversion modifiers are non-negative', () => {
    const { conversion } = warlock;
    expect(conversion.aoeModifier).toBeGreaterThanOrEqual(0);
    expect(conversion.randomModifier).toBeGreaterThanOrEqual(0);
    expect(conversion.untargetedModifier).toBeGreaterThanOrEqual(0);
  });

  it('scaling config is valid', () => {
    const { scaling } = warlock;
    expect(typeof scaling.enabled).toBe('boolean');
    expect(scaling.playersPerWarlock).toBeGreaterThan(0);
    expect(scaling.minimumWarlocks).toBeGreaterThanOrEqual(0);
    expect(scaling.maximumWarlocks).toBeGreaterThan(scaling.minimumWarlocks);
  });

  it('win conditions reference valid outcomes', () => {
    const { winConditions } = warlock;
    expect(['Good', 'Evil']).toContain(winConditions.allWarlocksGone);
    expect(['Good', 'Evil']).toContain(winConditions.allPlayersWarlocks);
    expect(winConditions.majorityThreshold).toBeGreaterThan(0);
    expect(winConditions.majorityThreshold).toBeLessThanOrEqual(1);
  });
});

describe('gameBalance – coordination bonus config', () => {
  it('has non-negative bonuses', () => {
    expect(coordinationBonus.damageBonus).toBeGreaterThanOrEqual(0);
    expect(coordinationBonus.healingBonus).toBeGreaterThanOrEqual(0);
    expect(coordinationBonus.maxBonusTargets).toBeGreaterThan(0);
  });

  it('has boolean flags', () => {
    expect(typeof coordinationBonus.enabled).toBe('boolean');
    expect(typeof coordinationBonus.appliesToMonster).toBe('boolean');
    expect(typeof coordinationBonus.announceCoordination).toBe('boolean');
  });
});
