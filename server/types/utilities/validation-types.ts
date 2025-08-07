/**
 * @fileoverview Validation result types and API response types
 * Provides standardized types for validation and API responses
 */

/**
 * Validation result types
 */
export type ValidationSuccess<T> = {
  success: true;
  data: T;
  errors: never;
};

export type ValidationError = {
  success: false;
  data: never;
  errors: string[];
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * API response types
 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
  timestamp: Date;
};

export type ApiError = {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: Date;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * Type guards for validation results
 */
export function isValidationSuccess<T>(result: ValidationResult<T>): result is ValidationSuccess<T> {
  return result.success === true;
}

export function isValidationError(result: ValidationResult<any>): result is ValidationError {
  return result.success === false;
}

/**
 * Type guards for API responses
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.success === true;
}

export function isApiError(response: ApiResponse<any>): response is ApiError {
  return response.success === false;
}

/**
 * Helper function to collect validation errors
 */
export function collectValidationErrors<T>(
  validators: Array<(value: T) => ValidationResult<T>>,
  value: T
): ValidationResult<T> {
  const errors: string[] = [];
  
  for (const validator of validators) {
    const result = validator(value);
    if (!result.success) {
      errors.push(...result.errors);
    }
  }
  
  if (errors.length > 0) {
    return { success: false, data: undefined as never, errors };
  }
  
  return { success: true, data: value, errors: undefined as never };
}

/**
 * JSON serialization types
 */
export type JSONValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JSONObject 
  | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> {}

/**
 * Serializable type check
 */
export type Serializable<T> = T extends 
  | string 
  | number 
  | boolean 
  | null 
  | undefined
  ? T
  : T extends Array<infer U>
  ? Array<Serializable<U>>
  : T extends object
  ? T extends Function
    ? never
    : T extends Date
    ? string
    : { [K in keyof T]: Serializable<T[K]> }
  : never;