/**
 * @fileoverview Core utility types for TypeScript type transformations
 * Basic utility types that can be composed to create more complex types
 */

/**
 * Deep Partial utility type
 * Makes all properties and nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep Required utility type
 * Makes all properties and nested properties required
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Deep Readonly utility type
 * Makes all properties and nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Makes specified fields optional while keeping others required
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes specified fields required while keeping others optional
 */
export type RequiredFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Extract only string keys from a type
 */
export type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

/**
 * Extract only number keys from a type
 */
export type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

/**
 * Extract only boolean keys from a type
 */
export type BooleanKeys<T> = {
  [K in keyof T]: T[K] extends boolean ? K : never;
}[keyof T];

/**
 * Extract only function keys from a type
 */
export type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (..._args: any[]) => any ? K : never;
}[keyof T];

/**
 * Strict versions of Pick and Omit that ensure keys exist
 */
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;
export type StrictPick<T, K extends keyof T> = Pick<T, K>;

/**
 * Make all properties mutable (remove readonly)
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Make all properties immutable (add readonly)
 */
export type Immutable<T> = {
  readonly [P in keyof T]: T[P];
};

/**
 * Unwrap Promise type
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Unwrap Array type
 */
export type UnwrapArray<T> = T extends (infer U)[] ? U : T;

/**
 * Function type utilities
 */
export type AsyncFunction<T = void> = () => Promise<T>;
export type SyncFunction<T = void> = () => T;
export type Predicate<T> = (_value: T) => boolean;
export type Mapper<T, U> = (_value: T) => U;
export type Reducer<T, U> = (_accumulator: U, _value: T) => U;

/**
 * Non-nullable field utilities
 */
export type NonNullableFields<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

export type NullableFields<T> = {
  [K in keyof T]: T[K] | null;
};

/**
 * Merge two types, with the second type overriding the first
 */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Exclusive or (XOR) type - either T or U but not both
 */
export type XOR<T, U> = (T | U) extends object ?
  (Omit<T, keyof U> & U) | (Omit<U, keyof T> & T)
  : T | U;

/**
 * Type guard utility
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Constructor type
 */
export type Constructor<T = {}> = new (..._args: any[]) => T;

/**
 * Extract entries from an object type
 */
export type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

/**
 * Extract values from an object type
 */
export type Values<T> = T[keyof T];

/**
 * Utility type for exhaustive checking
 */
export type Exhaustive<T> = T extends never ? true : false;

/**
 * Discriminate union types
 */
export type DiscriminateUnion<T, K extends keyof T, V extends T[K]> =
  T extends Record<K, V> ? T : never;

/**
 * Constructor parameter extraction
 */
export type ConstructorParameters<T extends new (..._args: any) => any> =
  T extends new (..._args: infer P) => any ? P : never;

/**
 * Instance type extraction
 */
export type InstanceType<T extends new (..._args: any) => any> =
  T extends new (..._args: any) => infer R ? R : any;

/**
 * Parameters and return type utilities
 */
export type Parameters<T extends (..._args: any) => any> =
  T extends (..._args: infer P) => any ? P : never;

export type ReturnType<T extends (..._args: any) => any> =
  T extends (..._args: any) => infer R ? R : any;

export type AsyncReturnType<T extends (..._args: any) => Promise<any>> =
  T extends (..._args: any) => Promise<infer R> ? R : any;

/**
 * Utility for creating partial types with defaults
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Add defaults to a type
 */
export type WithDefaults<T, D> = T & D;

/**
 * Remove index signature from type
 */
export type RemoveIndex<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

/**
 * Get keys of a specific type
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Make methods optional/required
 */
export type OptionalMethods<T> = {
  [K in keyof T]: T[K] extends (..._args: any[]) => any ? T[K] | undefined : T[K];
};

export type RequiredMethods<T> = {
  [K in keyof T]: T[K] extends (..._args: any[]) => any ? NonNullable<T[K]> : T[K];
};
