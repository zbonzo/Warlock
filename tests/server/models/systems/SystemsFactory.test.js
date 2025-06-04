const abilityHandlers = require('@models/systems/abilityHandlers');

jest.mock('@models/systems/GameStateUtils');
jest.mock('@models/systems/StatusEffectManager');
jest.mock('@models/systems/RacialAbilitySystem');
jest.mock('@models/systems/WarlockSystem');
jest.mock('@controllers/MonsterController');
jest.mock('@models/systems/CombatSystem');
jest.mock('@models/AbilityRegistry');
jest.mock('@models/systems/abilityHandlers');

describe('SystemsFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Provide simple mock implementations so instanceof checks work if needed
    GameStateUtils.mockImplementation(() => ({ tag: 'gsu' }));
    StatusEffectManager.mockImplementation(() => ({ tag: 'sem' }));
    RacialAbilitySystem.mockImplementation(() => ({ tag: 'ras' }));
    WarlockSystem.mockImplementation(() => ({ tag: 'ws' }));
    MonsterController.mockImplementation(() => ({ tag: 'mc' }));
    CombatSystem.mockImplementation(() => ({ tag: 'cs' }));
    AbilityRegistry.mockImplementation(() => ({
      classAbilities: new Map(),
      racialAbilities: new Map(),
    }));
  });

  test('createSystems wires up all subsystems and registers ability handlers', () => {
    const players = new Map();
    const monster = { hp: 10 };

    const systems = SystemsFactory.createSystems(players, monster);

    expect(GameStateUtils).toHaveBeenCalledWith(players);
    expect(StatusEffectManager).toHaveBeenCalledWith(
      players,
      expect.any(Object)
    );
    expect(RacialAbilitySystem).toHaveBeenCalledWith(
      players,
      expect.any(Object)
    );
    expect(WarlockSystem).toHaveBeenCalledWith(players, expect.any(Object));
    expect(MonsterController).toHaveBeenCalledWith(
      monster,
      players,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object)
    );
    expect(CombatSystem).toHaveBeenCalledWith(
      players,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object)
    );

    // abilityHandlers.registerAbilityHandlers should be called with the registry
    expect(abilityHandlers.registerAbilityHandlers).toHaveBeenCalledTimes(1);
    const registryArg =
      abilityHandlers.registerAbilityHandlers.mock.calls[0][0];
    expect(registryArg).toBeInstanceOf(Object);
    expect(registryArg.systems).toBeDefined();

    // Returned object exposes created systems
    expect(systems).toHaveProperty('gameStateUtils');
    expect(systems).toHaveProperty('statusEffectManager');
    expect(systems).toHaveProperty('warlockSystem');
    expect(systems).toHaveProperty('racialAbilitySystem');
    expect(systems).toHaveProperty('monsterController');
    expect(systems).toHaveProperty('combatSystem');
    expect(systems).toHaveProperty('abilityRegistry');
  });
});
