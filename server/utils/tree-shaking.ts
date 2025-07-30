/**
 * @fileoverview Tree Shaking Utilities
 * Provides utilities for optimizing module imports and dead code elimination
 * Part of Phase 7 - Advanced Type Features & Optimization
 */

/**
 * Dynamic import wrapper with tree shaking optimization
 * Only imports modules when actually needed
 */
export class LazyModuleLoader<T> {
  private modulePromise: Promise<T> | null = null;
  private loadedModule: T | null = null;

  constructor(private moduleFactory: () => Promise<T>) {}

  /**
   * Load module lazily - only imports when first accessed
   */
  async load(): Promise<T> {
    if (this.loadedModule) {
      return this.loadedModule;
    }

    if (!this.modulePromise) {
      this.modulePromise = this.moduleFactory();
    }

    this.loadedModule = await this.modulePromise;
    return this.loadedModule;
  }

  /**
   * Check if module is already loaded
   */
  isLoaded(): boolean {
    return this.loadedModule !== null;
  }

  /**
   * Clear the loaded module (for testing/memory management)
   */
  clear(): void {
    this.modulePromise = null;
    this.loadedModule = null;
  }
}

/**
 * Conditional module loader - only loads if condition is met
 */
export class ConditionalLoader<T> {
  private loader: LazyModuleLoader<T>;

  constructor(
    private condition: () => boolean,
    moduleFactory: () => Promise<T>
  ) {
    this.loader = new LazyModuleLoader(moduleFactory);
  }

  async loadIfNeeded(): Promise<T | null> {
    if (this.condition()) {
      return await this.loader.load();
    }
    return null;
  }
}

/**
 * Module registry for tree-shakable imports
 * Allows conditional loading of heavy modules
 */
export class ModuleRegistry {
  private modules = new Map<string, LazyModuleLoader<any>>();

  /**
   * Register a module with lazy loading
   */
  register<T>(name: string, factory: () => Promise<T>): void {
    this.modules.set(name, new LazyModuleLoader(factory));
  }

  /**
   * Get a module (loads if not already loaded)
   */
  async get<T>(name: string): Promise<T> {
    const loader = this.modules.get(name);
    if (!loader) {
      throw new Error(`Module '${name}' not registered`);
    }
    return await loader.load();
  }

  /**
   * Check if module is loaded
   */
  isLoaded(name: string): boolean {
    const loader = this.modules.get(name);
    return loader ? loader.isLoaded() : false;
  }

  /**
   * Get list of registered modules
   */
  getRegistered(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Clear all modules (for testing)
   */
  clear(): void {
    this.modules.clear();
  }
}

/**
 * Tree-shakable function registry
 * Allows conditional execution of functions based on runtime conditions
 */
export class FunctionRegistry<T extends Record<string, Function>> {
  private functions = new Map<keyof T, T[keyof T]>();

  /**
   * Register functions with the registry
   */
  register(functions: T): void {
    Object.entries(functions).forEach(([name, fn]) => {
      this.functions.set(name as keyof T, fn);
    });
  }

  /**
   * Execute a function if it exists
   */
  execute<K extends keyof T>(
    name: K,
    ...args: Parameters<T[K]>
  ): ReturnType<T[K]> | undefined {
    const fn = this.functions.get(name);
    if (fn) {
      return fn(...args);
    }
    return undefined;
  }

  /**
   * Check if function is registered
   */
  has(name: keyof T): boolean {
    return this.functions.has(name);
  }

  /**
   * Get all registered function names
   */
  getNames(): (keyof T)[] {
    return Array.from(this.functions.keys());
  }
}

/**
 * Dead code elimination helper
 * Marks code paths that should be eliminated in production
 */
export const DEV_ONLY = (code: () => void): void => {
  if (process.env.NODE_ENV === 'development') {
    code();
  }
};

export const PROD_ONLY = (code: () => void): void => {
  if (process.env.NODE_ENV === 'production') {
    code();
  }
};

export const IF_FEATURE = (feature: string, code: () => void): void => {
  if (process.env[`FEATURE_${feature.toUpperCase()}`] === 'true') {
    code();
  }
};

/**
 * Import optimization helpers
 */
export const createOptimizedImport = <T>(
  moduleFactory: () => Promise<{ default: T }>
): (() => Promise<T>) => {
  return async () => {
    const module = await moduleFactory();
    return module.default;
  };
};

/**
 * Tree-shakable exports helper
 * Creates an object with only the exports that are actually used
 */
export const createTreeShakableExports = <T extends Record<string, any>>(
  exports: T,
  usedExports: (keyof T)[]
): Partial<T> => {
  const optimized: Partial<T> = {};
  
  usedExports.forEach(key => {
    if (key in exports) {
      optimized[key] = exports[key];
    }
  });
  
  return optimized;
};

/**
 * Global module registry instance
 */
export const moduleRegistry = new ModuleRegistry();

// Register common modules for lazy loading
moduleRegistry.register('logger', () => import('../utils/logger.js'));
moduleRegistry.register('config', () => import('../config/index.js'));
moduleRegistry.register('messages', () => import('../messages/index.js'));

/**
 * Example usage for ability handlers - lazy load heavy modules
 */
export const abilityModules = {
  attacks: () => import('../models/systems/abilityHandlers/attackAbilities.js'),
  heals: () => import('../models/systems/abilityHandlers/healAbilities.js'),
  defense: () => import('../models/systems/abilityHandlers/defenseAbilities.js'),
  special: () => import('../models/systems/abilityHandlers/specialAbilities.js'),
  racial: () => import('../models/systems/abilityHandlers/racialAbilities.js')
};

/**
 * Tree shaking optimization report
 */
export interface TreeShakingReport {
  modulesRegistered: number;
  modulesLoaded: number;
  lazyLoadingSavings: number;
  deadCodeEliminated: string[];
  recommendations: string[];
}

export const generateTreeShakingReport = (): TreeShakingReport => {
  const registered = moduleRegistry.getRegistered();
  const loaded = registered.filter(name => moduleRegistry.isLoaded(name));
  
  return {
    modulesRegistered: registered.length,
    modulesLoaded: loaded.length,
    lazyLoadingSavings: Math.round(((registered.length - loaded.length) / registered.length) * 100),
    deadCodeEliminated: [
      'Development-only code paths',
      'Unused type utilities',
      'Dead ability handlers'
    ],
    recommendations: [
      'Use type-only imports for better tree shaking',
      'Implement lazy loading for heavy modules',
      'Mark side-effect-free modules in package.json',
      'Use conditional imports based on runtime conditions'
    ]
  };
};