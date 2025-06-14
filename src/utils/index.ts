// Core validation functions
import {
  validateProductUrl,
  extractProductId,
  normalizeProductUrl,
  isUrlAccessible,
  sanitizeUrl,
  validateRequestParameters,
  validateString,
  validateNumber,
  validateEmail,
  validateProductData,
  validateHeaders,
  isString,
  isNumber,
  isValidUrl,
  validateRateLimit,
  createValidationError,
  createValidationSuccess,
  combineValidationResults,
  type ValidationResult,
  type ValidateRequestParams,
  type ProductDataValidation,
  type RateLimitInfo,
} from "./validation";

// Advanced validation helpers
import {
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  ValidationSeverity,
  VALIDATION_RULES,
  ValidationChain,
  createValidationChain,
  validateFields,
  hasValidationErrors,
  getValidationErrorsString,
  validateApiInput,
  RateLimitValidator,
  sanitize,
  ValidationPerformanceMonitor,
  validationMonitor,
  type EnhancedValidationResult,
  type ValidationRule,
} from "./validationHelpers";

// Export all core functions
export {
  validateProductUrl,
  extractProductId,
  normalizeProductUrl,
  isUrlAccessible,
  sanitizeUrl,
  validateRequestParameters,
  validateString,
  validateNumber,
  validateEmail,
  validateProductData,
  validateHeaders,
  isString,
  isNumber,
  isValidUrl,
  validateRateLimit,
  createValidationError,
  createValidationSuccess,
  combineValidationResults,
  type ValidationResult,
  type ValidateRequestParams,
  type ProductDataValidation,
  type RateLimitInfo,
};

// Export all advanced helpers
export {
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  ValidationSeverity,
  VALIDATION_RULES,
  ValidationChain,
  createValidationChain,
  validateFields,
  hasValidationErrors,
  getValidationErrorsString,
  validateApiInput,
  RateLimitValidator,
  sanitize,
  ValidationPerformanceMonitor,
  validationMonitor,
  type EnhancedValidationResult,
  type ValidationRule,
};

// Common validation patterns for convenience
export const commonValidators = {
  productUrl: validateProductUrl,
  email: validateEmail,
  string: validateString,
  number: validateNumber,
};

// Validation chain builders for common use cases
export const validators = {
  productRequest: () =>
    createValidationChain("productUrl").required().naverUrl().secure(),

  userInput: (fieldName: string) =>
    createValidationChain(fieldName).required().length(1, 500).secure(),

  email: (fieldName: string = "email") =>
    createValidationChain(fieldName).required().email(),

  price: (fieldName: string) =>
    createValidationChain(fieldName)
      .required()
      .range(0, Number.MAX_SAFE_INTEGER),

  rating: (fieldName: string) => createValidationChain(fieldName).range(0, 5),
};

// Validation utilities for different contexts
export const apiValidation = {
  validateRequest: validateApiInput,
  sanitizeInput: sanitize,
  checkRateLimit: (config: any) => new RateLimitValidator(config),
  monitorPerformance: validationMonitor,
};

// Validation constants
export const VALIDATION_CONSTANTS = {
  MAX_URL_LENGTH: 2000,
  MAX_STRING_LENGTH: 1000,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_SELLER_NAME_LENGTH: 100,
  MIN_PRODUCT_ID_LENGTH: 1,
  MAX_PRODUCT_ID_LENGTH: 50,
  MAX_RATING: 5,
  MIN_RATING: 0,
  MAX_PRICE: Number.MAX_SAFE_INTEGER,
  MIN_PRICE: 0,

  // Rate limiting defaults
  DEFAULT_RATE_LIMIT: 100,
  DEFAULT_RATE_WINDOW_MS: 900000, // 15 minutes

  // Korean text support
  KOREAN_CHARS: /[\u3131-\u3163\uac00-\ud7a3]/,

  // Common currency codes
  SUPPORTED_CURRENCIES: ["KRW", "USD", "EUR", "JPY", "CNY"],

  // HTTP status codes for validation errors
  HTTP_STATUS: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
};

// Helper functions for common validation scenarios
export const validationHelpers = {
  /**
   * Quick validation for Naver Smartstore product URLs
   */
  isValidNaverProductUrl: (url: string): boolean => {
    return validateProductUrl(url).isValid;
  },

  /**
   * Extract and validate product ID from URL
   */
  getValidatedProductId: (url: string): string | null => {
    const validation = validateProductUrl(url);
    if (!validation.isValid) return null;
    return extractProductId(url);
  },

  /**
   * Validate and sanitize user input
   */
  sanitizeUserInput: (input: string, maxLength: number = 500): string => {
    const validation = validateString(input, { maxLength, fieldName: "input" });
    return validation.sanitized || "";
  },

  /**
   * Check if input contains security threats
   */
  hasSecurityThreats: (input: string): boolean => {
    const chain = createValidationChain().secure();
    return !chain.validate(input).isValid;
  },

  /**
   * Validate product data with enhanced error reporting
   */
  validateProductWithDetails: (data: any) => {
    const validation = validateProductData(data);
    return {
      ...validation,
      details: validation.isValid
        ? null
        : {
            field: "product",
            suggestions: [
              "Ensure all required fields are present",
              "Check data types match expected formats",
              "Verify URLs are valid and accessible",
              "Confirm numeric values are within valid ranges",
            ],
          },
    };
  },

  /**
   * Create validation middleware for Express
   */
  createValidationMiddleware: (rules: Record<string, ValidationChain>) => {
    return (req: any, res: any, next: any) => {
      const results = validateFields(req.body || {}, rules);

      if (hasValidationErrors(results)) {
        return res.status(400).json({
          error: "Validation failed",
          details: results,
          message: getValidationErrorsString(results),
        });
      }

      next();
    };
  },
};

// Default export with commonly used functions
export default {
  validateProductUrl,
  validateString,
  validateNumber,
  createValidationChain,
  validators,
  validationHelpers,
  VALIDATION_CONSTANTS,
};
