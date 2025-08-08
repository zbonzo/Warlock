/**
 * @fileoverview Simple test to verify TypeScript Jest setup
 */

import { z } from 'zod';

describe('Simple TypeScript Test', () => {
  it('should validate basic Zod schema', () => {
    const StringSchema = z.string();

    const result = StringSchema.safeParse('hello');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('hello');
    }
  });

  it('should handle schema validation errors', () => {
    const NumberSchema = z.number();

    const result = NumberSchema.safeParse('not a number');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('invalid_type');
    }
  });

  it('should work with TypeScript types', () => {
    const PersonSchema = z.object({
      name: z.string(),
      age: z.number().min(0)
    });

    type Person = z.infer<typeof PersonSchema>;

    const validPerson: Person = {
      name: 'Alice',
      age: 30
    };

    const result = PersonSchema.safeParse(validPerson);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Alice');
      expect(result.data.age).toBe(30);
    }
  });
});
