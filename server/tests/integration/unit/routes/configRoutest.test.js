/**
 * @fileoverview Tests for config API routes
 */

const request = require('supertest');
const express = require('express');
const configRoutes = require('@routes/configRoutes');

// Mock dependencies
jest.mock('@config', () => ({
  minPlayers: 2,
  maxPlayers: 8,
  races: ['Human', 'Dwarf', 'Elf'],
  classes: ['Warrior', 'Pyromancer', 'Wizard'],
  raceAttributes: {
    Human: { hpModifier: 1.0, description: 'Adaptable humans' },
    Dwarf: { hpModifier: 1.2, description: 'Hardy dwarves' },
  },
  classAttributes: {
    Warrior: { hpModifier: 1.2, description: 'Strong warriors' },
    Pyromancer: { hpModifier: 0.9, description: 'Fire mages' },
  },
  racialAbilities: {
    Human: { type: 'adaptability', name: 'Adaptability' },
    Dwarf: { type: 'stoneArmor', name: 'Stone Armor' },
  },
  classRaceCompatibility: {
    Warrior: ['Human', 'Dwarf'],
    Pyromancer: ['Dwarf', 'Elf'],
    Wizard: ['Human', 'Elf'],
  },
  getClassAbilities: jest.fn((className) => {
    const abilities = {
      Warrior: [
        { type: 'slash', name: 'Slash', unlockAt: 1 },
        { type: 'shield', name: 'Shield', unlockAt: 2 },
      ],
      Pyromancer: [{ type: 'fireball', name: 'Fireball', unlockAt: 1 }],
    };
    return abilities[className] || [];
  }),
  getRacialAbility: jest.fn((race) => {
    const abilities = {
      Human: { type: 'adaptability', name: 'Adaptability' },
      Dwarf: { type: 'stoneArmor', name: 'Stone Armor' },
    };
    return abilities[race] || null;
  }),
}));

describe('Config Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/api/config', configRoutes);
  });

  describe('GET /api/config', () => {
    test('should return basic configuration', async () => {
      const response = await request(app).get('/api/config').expect(200);

      expect(response.body).toEqual({
        minPlayers: 2,
        maxPlayers: 8,
        version: expect.any(String),
      });
    });
  });

  describe('GET /api/config/races', () => {
    test('should return races configuration', async () => {
      const response = await request(app).get('/api/config/races').expect(200);

      expect(response.body).toEqual({
        races: ['Human', 'Dwarf', 'Elf'],
        raceAttributes: expect.any(Object),
        racialAbilities: expect.any(Object),
      });
    });
  });

  describe('GET /api/config/classes', () => {
    test('should return classes configuration', async () => {
      const response = await request(app)
        .get('/api/config/classes')
        .expect(200);

      expect(response.body).toEqual({
        classes: ['Warrior', 'Pyromancer', 'Wizard'],
        classAttributes: expect.any(Object),
        classRaceCompatibility: expect.any(Object),
      });
    });
  });

  describe('GET /api/config/compatibility', () => {
    test('should return compatibility mappings', async () => {
      const response = await request(app)
        .get('/api/config/compatibility')
        .expect(200);

      expect(response.body).toEqual({
        classToRaces: {
          Warrior: ['Human', 'Dwarf'],
          Pyromancer: ['Dwarf', 'Elf'],
          Wizard: ['Human', 'Elf'],
        },
        racesToClasses: {
          Human: ['Warrior', 'Wizard'],
          Dwarf: ['Warrior', 'Pyromancer'],
          Elf: ['Pyromancer', 'Wizard'],
        },
      });
    });
  });

  describe('GET /api/config/abilities/:className', () => {
    test('should return abilities for valid class', async () => {
      const response = await request(app)
        .get('/api/config/abilities/Warrior')
        .expect(200);

      expect(response.body).toEqual({
        className: 'Warrior',
        abilities: [
          { type: 'slash', name: 'Slash', unlockAt: 1 },
          { type: 'shield', name: 'Shield', unlockAt: 2 },
        ],
      });
    });

    test('should return 404 for invalid class', async () => {
      const response = await request(app)
        .get('/api/config/abilities/InvalidClass')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Class not found',
      });
    });
  });

  describe('GET /api/config/racial-abilities', () => {
    test('should return all racial abilities', async () => {
      const response = await request(app)
        .get('/api/config/racial-abilities')
        .expect(200);

      expect(response.body).toEqual({
        Human: { type: 'adaptability', name: 'Adaptability' },
        Dwarf: { type: 'stoneArmor', name: 'Stone Armor' },
        Elf: null,
      });
    });
  });
});
