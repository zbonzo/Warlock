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
export interface Memoized<T extends (..._args: any[]) => any> {
  (..._args: Parameters<T>): ReturnType<T>;
  cache: Map<string, ReturnType<T>>;
  clear(): void;
  has(_key: string): boolean;
  delete(_key: string): boolean;
}

/**
 * Debounced function interface
 */
export interface Debounced<T extends (..._args: any[]) => any> {
  (..._args: Parameters<T>): void;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
  pending(): boolean;
}

/**
 * Throttled function interface
 */
export interface Throttled<T extends (..._args: any[]) => any> {
  (..._args: Parameters<T>): ReturnType<T> | undefined;
  cancel(): void;
  flush(): ReturnType<T> | undefined;
}

/**
 * Repository pattern interface
 */
export interface Repository<T, ID = string> {
  findById(_id: ID): Promise<T | null>;
  findMany(_ids: ID[]): Promise<T[]>;
  findAll(): Promise<T[]>;
  create(_entity: Omit<T, 'id'>): Promise<T>;
  update(_id: ID, _updates: Partial<T>): Promise<T>;
  delete(_id: ID): Promise<boolean>;
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
  [P in K]: (_value: T[P]) => FluentBuilder<T, K>;
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
  canTransition(_event: Event): boolean;
  transition(_event: Event, _payload?: any): State | null;
  onEnter?(_state: State, _context: Context): void;
  onExit?(_state: State, _context: Context): void;
}

/**
 * Performance utility functions object type
 */
export interface PerformanceUtils {
  // Lazy loading
  createLazy<T>(_factory: () => T): Lazy<T>;

  // Memoization
  memoize<T extends (..._args: any[]) => any>(_fn: T, _keyGenerator?: (..._args: Parameters<T>) => string): Memoized<T>;

  // Debouncing
  debounce<T extends (..._args: any[]) => any>(_fn: T, _delay: number): Debounced<T>;

  // Throttling
  throttle<T extends (..._args: any[]) => any>(_fn: T, _limit: number): Throttled<T>;

  // Object utilities
  deepClone<T>(_obj: T): T;
  deepFreeze<T>(_obj: T): Readonly<T>;
  deepMerge<T extends Record<string, any>>(_target: T, _source: Partial<T>): T;

  // Performance monitoring
  measureExecutionTime<T>(_fn: () => T): { result: T; executionTime: number };
  measureAsyncExecutionTime<T>(_fn: () => Promise<T>): Promise<{ result: T; executionTime: number }>;
}
