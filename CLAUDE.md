# Warlock Game - TypeScript Project

This is a multiplayer turn-based battle game built with React (frontend) and Node.js/Express (backend).

## Project Structure
- `client/` - React TypeScript frontend
- `server/` - Node.js TypeScript backend 
- `shared/` - Shared TypeScript types and utilities

## Context Focus
When analyzing this codebase, focus primarily on:
- `client/src/` - React components, hooks, and game logic
- `server/` - Game server, models, systems, and API
- `shared/` - Shared interfaces and utilities
- `docs/` - Game Documentation

## Ignore Directories
Please ignore these directories unless specifically asked:
- `archive/` - Old js files
- `tests/` - Test files (keep but don't include in general context)
- `simulation/` - Simulation and testing scripts
- `test/` - Additional test utilities
- `scripts/` - Build and utility scripts
- `node_modules/` - Dependencies
- `.git/` - Git history
- `.vscode/` - Editor configuration

## Key Commands
- `npm run dev:ts` - Start both client and server in TypeScript mode
- `npm run build` - Build production version
- `npm run lint` - Run linting
- `npm run typecheck` - Run TypeScript checking

## Current Status
The project has been migrated from JavaScript to TypeScript. Main game functionality includes:
- Character selection (races/classes)
- Turn-based combat system
- Real-time multiplayer via Socket.IO
- Battle results and progression system