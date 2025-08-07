/**
 * @fileoverview Performance utility types and interfaces
 * Provides types for lazy loading, memoization, debouncing, and other performance patterns
 */

/**
 * Lazy loading interface
 */
export interface Lazy<T> {
  (): T;
  isLoaded: boolean;
  clear(): void;
  peek(): T | undefined;
}

/**
 * Memoized function interface
 */
export interface Memoized<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  cache: Map<string, ReturnType<T>>;
  clear(): void;
  has(key: string): boolean;
  delete(key: string): boolean;
}

/**
 * Debounced function interface
 */
export interface Debounced<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  pending(): boolean;
}

/**
 * Throttled function interface
 */
export interface Throttled<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
}

/**
 * Repository pattern interface
 */
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findMany(ids: ID[]): Promise<T[]>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, updates: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
}

/**
 * Query options for repository operations
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Builder pattern interface
 */
export interface Builder<T> {
  build(): T;
  reset(): this;
}

/**
 * Fluent builder pattern type
 */
export type FluentBuilder<T, K extends keyof T = keyof T> = {
  [P in K]: (value: T[P]) => FluentBuilder<T, K>;
};

/**
 * Create builder type that includes build method
 */
export type CreateBuilder<T> = FluentBuilder<T> & {
  build(): T;
};

/**
 * State machine interface
 */
export interface StateMachine<State extends string, Event extends string, Context = any> {
  currentState: State;
  context: Context;
  canTransition(event: Event): boolean;
  transition(event: Event, payload?: any): State | null;
  onEnter?(state: State, context: Context): void;
  onExit?(state: State, context: Context): void;
}

/**
 * Performance utility functions object type
 */
export interface PerformanceUtils {
  // Lazy loading
  createLazy<T>(factory: () => T): Lazy<T>;
  
  // Memoization
  memoize<T extends (...args: any[]) => any>(fn: T, keyGenerator?: (...args: Parameters<T>) => string): Memoized<T>;
  
  // Debouncing
  debounce<T extends (...args: any[]) => any>(fn: T, delay: number): Debounced<T>;
  
  // Throttling
  throttle<T extends (...args: any[]) => any>(fn: T, limit: number): Throttled<T>;
  
  // Object utilities
  deepClone<T>(obj: T): T;
  deepFreeze<T>(obj: T): Readonly<T>;
  deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T;
  
  // Performance monitoring
  measureExecutionTime<T>(fn: () => T): { result: T; executionTime: number };
  measureAsyncExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }>;
}