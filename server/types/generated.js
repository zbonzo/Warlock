"use strict";
/**
 * @fileoverview Auto-generated TypeScript types from Zod schemas
 * Generated for Phase 2: Zod-to-TypeScript Type Generation
 * These types are automatically inferred from the Zod validation schemas
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schemas = exports.isValidAction = exports.isGameState = exports.isPlayer = void 0;
const Schemas = __importStar(require("../models/validation/ZodSchemas"));
exports.Schemas = Schemas;
// Type guards
function isPlayer(obj) {
    return Schemas.PlayerSchemas.player.safeParse(obj).success;
}
exports.isPlayer = isPlayer;
function isGameState(obj) {
    return Schemas.GameSchemas.gameState.safeParse(obj).success;
}
exports.isGameState = isGameState;
function isValidAction(obj) {
    return Schemas.ActionSchemas.playerAction.safeParse(obj).success;
}
exports.isValidAction = isValidAction;
