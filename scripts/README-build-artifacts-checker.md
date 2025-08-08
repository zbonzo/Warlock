# Build Artifacts Checker

This script helps prevent TypeScript build artifacts (`.js`, `.d.ts`, `.js.map`, `.d.ts.map` files) from polluting the source directories.

## Usage

```bash
# Check for build artifacts
npm run check:build-artifacts

# The script is also automatically run as part of:
npm run lint
npm run lint:security
npm run lint:no-tests
```

## What it does

- Scans `client/src`, `server`, and `shared` directories for build artifacts
- Ignores allowed directories: `node_modules`, `dist`, `build`, `coverage`, `archive`, `public`, `.git`, `scripts`
- Allows specific root-level config files like `.eslintrc.js`, `config-overrides.js`
- Reports any build artifacts found in source directories with helpful remediation suggestions

## Why this matters

Build artifacts in source directories indicate:
- TypeScript compilation configuration issues
- Incorrect `outDir` settings in `tsconfig.json`
- Build processes outputting to wrong locations

This can cause:
- Source tree pollution
- Version control issues
- Confusion between source and compiled code
- Potential import/module resolution problems

## Configuration

The script checks these directories:
- `client/src` - React client source code
- `server` - Node.js server source code  
- `shared` - Shared TypeScript utilities

Modify the `SOURCE_DIRECTORIES` array in `scripts/check-build-artifacts.js` to add or remove directories.

## Example Output

When build artifacts are found:
```
⚠️  Found 3 build artifacts in source directories:

.js files (2):
  - server/utils/logger.js
  - server/models/Player.js

.d.ts files (1):
  - server/types/generated.d.ts

💡 These files should be in dist/ directories instead of source directories
💡 Run "npm run typecheck:clean" to clean build outputs
💡 Check your TypeScript configuration (tsconfig.json) outDir settings
```

When clean:
```
✅ No build artifacts found in source directories
```