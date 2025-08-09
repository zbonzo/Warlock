# Object Injection Security Strategy

## Recommended Approach

### 1. Keep Security Rule Enabled Globally
The `security/detect-object-injection` rule should remain enabled as a warning to catch potential issues.

### 2. Only Disable for Known-Safe Categories

#### ✅ Safe to Disable - Configuration Files
```javascript
// .eslintrc.js
{
  files: ['server/config/**/*.ts', 'server/config/loaders/**/*.ts'],
  rules: {
    'security/detect-object-injection': 'off', // Static config loading only
  }
}
```
**Reason:** These files only load static configuration at startup, no user input.

#### ✅ Safe to Disable - Test Files  
Already configured to disable in test directories.

### 3. Critical Files to Keep Protected

These files MUST keep the security rule enabled and any warnings should be carefully reviewed:

#### 🔴 High Priority - User Input Handlers
- **`server/server.ts`** - Main entry point, handles socket connections
- **`server/models/events/SocketEventRouter.ts`** - Routes socket events
- **`server/routes/configRoutes.ts`** - HTTP endpoints
- **`server/middleware/socketValidation.ts`** - Validates user input
- **`server/models/GameRoom.ts`** - Core game state management
- **`server/controllers/GameController.ts`** - Game action handlers
- **`server/controllers/PlayerController.ts`** - Player action handlers

### 4. How to Handle Remaining Warnings

For files with warnings that ARE safe:

#### Option A: Inline Disable (Preferred for few instances)
```typescript
// eslint-disable-next-line security/detect-object-injection
gameState[validatedKey] = value;
```

#### Option B: Refactor to Map/Set (Best for new code)
```typescript
// Instead of: 
const abilities: Record<string, Ability> = {};
abilities[abilityId] = ability;

// Use:
const abilities = new Map<string, Ability>();
abilities.set(abilityId, ability);
```

#### Option C: Add Validation Function
```typescript
function safeAccess<T>(obj: Record<string, T>, key: string): T | undefined {
  // Validate key format
  if (!/^[a-zA-Z0-9_]+$/.test(key)) {
    throw new Error('Invalid key format');
  }
  return obj[key];
}
```

### 5. Review Checklist

When you see an object injection warning, ask:

1. **Does this accept user input?** → Keep warning, add validation
2. **Is this a static config/enum?** → Safe to disable
3. **Is this internal game state with validated IDs?** → Add inline disable with comment
4. **Could this be refactored to Map/Set?** → Consider refactoring

### 6. Recommended ESLint Config

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'security/detect-object-injection': 'warn', // Keep as warning globally
  },
  overrides: [
    {
      // Only disable for pure config files
      files: ['server/config/**/*.ts', 'server/config/loaders/**/*.ts'],
      rules: {
        'security/detect-object-injection': 'off',
      },
    },
    {
      // Test files
      files: ['**/*.test.*', '**/*.spec.*'],
      rules: {
        'security/detect-object-injection': 'off',
      },
    },
  ],
};
```

## Summary

- **Don't blanket disable** the rule for all game logic files
- **Focus security attention** on files handling user input
- **Use inline disables** with explanatory comments for safe internal operations
- **Keep the rule as a warning** to maintain awareness without blocking development
- **Refactor to Map/Set** where it makes sense for new code