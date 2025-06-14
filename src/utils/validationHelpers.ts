import { ValidationResult } from "./validation";

/**
 * Common validation patterns and error messages
 */
export const VALIDATION_PATTERNS = {
  // URL patterns
  NAVER_SMARTSTORE: /^https?:\/\/smartstore\.naver\.com/i,
  PRODUCT_ID: /\/products\/(\d+)|\/(\d+)(?:\?|$)|product_no=(\d+)/i,
  URL_SAFE: /^https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/,

  // Data patterns
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SAFE_STRING: /^[a-zA-Z0-9\s\-_.(),]+$/,

  // Security patterns
  SQL_INJECTION:
    /(union|select|insert|update|delete|drop|create|alter|exec|execute|\bor\b|\band\b)/i,
  XSS_PATTERNS: /<script|javascript:|on\w+\s*=|<iframe|<object|<embed/i,
  PATH_TRAVERSAL: /\.\.|\/\.\.|\\\.\.|\.\.\\/,

  // Korean text patterns
  KOREAN: /[\u3131-\u3163\uac00-\ud7a3]/,
  KOREAN_ENGLISH: /^[\u3131-\u3163\uac00-\ud7a3a-zA-Z0-9\s\-_.(),!?]+$/,
};

/**
 * Common validation error messages
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: "This field is required",
  INVALID_FORMAT: "Invalid format",
  TOO_SHORT: "Value is too short",
  TOO_LONG: "Value is too long",
  INVALID_URL: "Invalid URL format",
  INVALID_EMAIL: "Invalid email format",
  INVALID_PHONE: "Invalid phone number format",
  SECURITY_VIOLATION: "Security violation detected",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  MALICIOUS_INPUT: "Malicious input detected",

  // Naver-specific messages
  NAVER_URL_REQUIRED: "URL must be from Naver Smartstore",
  PRODUCT_ID_REQUIRED: "Product ID is required",
  PRODUCT_NOT_FOUND: "Product not found",
  SCRAPING_BLOCKED: "Access to product page was blocked",

  // Korean messages
  REQUIRED_KO: "필수 입력 항목입니다",
  INVALID_FORMAT_KO: "형식이 올바르지 않습니다",
  TOO_SHORT_KO: "입력값이 너무 짧습니다",
  TOO_LONG_KO: "입력값이 너무 깁니다",
};

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

/**
 * Enhanced validation result with severity and context
 */
export interface EnhancedValidationResult extends ValidationResult {
  severity?: ValidationSeverity;
  field?: string;
  code?: string;
  context?: Record<string, any>;
  suggestions?: string[];
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  name: string;
  validator: (value: any, options?: any) => ValidationResult;
  message?: string;
  severity?: ValidationSeverity;
}

/**
 * Common validation rules
 */
export const VALIDATION_RULES = {
  required: {
    name: "required",
    validator: (value: any) => ({
      isValid: value !== null && value !== undefined && value !== "",
      error:
        value === null || value === undefined || value === ""
          ? VALIDATION_MESSAGES.REQUIRED
          : undefined,
    }),
    severity: ValidationSeverity.ERROR,
  } as ValidationRule,

  email: {
    name: "email",
    validator: (value: any) => ({
      isValid:
        typeof value === "string" && VALIDATION_PATTERNS.EMAIL.test(value),
      error:
        typeof value !== "string" || !VALIDATION_PATTERNS.EMAIL.test(value)
          ? VALIDATION_MESSAGES.INVALID_EMAIL
          : undefined,
    }),
    severity: ValidationSeverity.ERROR,
  } as ValidationRule,

  url: {
    name: "url",
    validator: (value: any) => {
      if (typeof value !== "string")
        return { isValid: false, error: VALIDATION_MESSAGES.INVALID_URL };
      try {
        new URL(value);
        return { isValid: true };
      } catch {
        return { isValid: false, error: VALIDATION_MESSAGES.INVALID_URL };
      }
    },
    severity: ValidationSeverity.ERROR,
  } as ValidationRule,

  naverUrl: {
    name: "naverUrl",
    validator: (value: any) => ({
      isValid:
        typeof value === "string" &&
        VALIDATION_PATTERNS.NAVER_SMARTSTORE.test(value),
      error:
        typeof value !== "string" ||
        !VALIDATION_PATTERNS.NAVER_SMARTSTORE.test(value)
          ? VALIDATION_MESSAGES.NAVER_URL_REQUIRED
          : undefined,
    }),
    severity: ValidationSeverity.ERROR,
  } as ValidationRule,

  noSqlInjection: {
    name: "noSqlInjection",
    validator: (value: any) => ({
      isValid:
        typeof value !== "string" ||
        !VALIDATION_PATTERNS.SQL_INJECTION.test(value),
      error:
        typeof value === "string" &&
        VALIDATION_PATTERNS.SQL_INJECTION.test(value)
          ? VALIDATION_MESSAGES.SECURITY_VIOLATION
          : undefined,
    }),
    severity: ValidationSeverity.CRITICAL,
  } as ValidationRule,

  noXss: {
    name: "noXss",
    validator: (value: any) => ({
      isValid:
        typeof value !== "string" ||
        !VALIDATION_PATTERNS.XSS_PATTERNS.test(value),
      error:
        typeof value === "string" &&
        VALIDATION_PATTERNS.XSS_PATTERNS.test(value)
          ? VALIDATION_MESSAGES.MALICIOUS_INPUT
          : undefined,
    }),
    severity: ValidationSeverity.CRITICAL,
  } as ValidationRule,

  noPathTraversal: {
    name: "noPathTraversal",
    validator: (value: any) => ({
      isValid:
        typeof value !== "string" ||
        !VALIDATION_PATTERNS.PATH_TRAVERSAL.test(value),
      error:
        typeof value === "string" &&
        VALIDATION_PATTERNS.PATH_TRAVERSAL.test(value)
          ? VALIDATION_MESSAGES.SECURITY_VIOLATION
          : undefined,
    }),
    severity: ValidationSeverity.CRITICAL,
  } as ValidationRule,
} as const;

/**
 * Validation chain builder
 */
export class ValidationChain {
  private rules: Array<{ rule: ValidationRule; options?: any }> = [];
  private fieldName?: string;

  constructor(fieldName?: string) {
    this.fieldName = fieldName;
  }

  /**
   * Add a validation rule to the chain
   */
  addRule(rule: ValidationRule, options?: any): ValidationChain {
    this.rules.push({ rule, options });
    return this;
  }

  /**
   * Add a required validation
   */
  required(): ValidationChain {
    return this.addRule(VALIDATION_RULES.required);
  }

  /**
   * Add email validation
   */
  email(): ValidationChain {
    return this.addRule(VALIDATION_RULES.email);
  }

  /**
   * Add URL validation
   */
  url(): ValidationChain {
    return this.addRule(VALIDATION_RULES.url);
  }

  /**
   * Add Naver URL validation
   */
  naverUrl(): ValidationChain {
    return this.addRule(VALIDATION_RULES.naverUrl);
  }

  /**
   * Add length validation
   */
  length(min?: number, max?: number): ValidationChain {
    const rule: ValidationRule = {
      name: "length",
      validator: (value: any) => {
        if (typeof value !== "string") {
          return { isValid: false, error: "Value must be a string" };
        }

        const length = value.length;

        if (min !== undefined && length < min) {
          return {
            isValid: false,
            error: `Minimum length is ${min} characters`,
          };
        }

        if (max !== undefined && length > max) {
          return {
            isValid: false,
            error: `Maximum length is ${max} characters`,
          };
        }

        return { isValid: true };
      },
      severity: ValidationSeverity.ERROR,
    };

    return this.addRule(rule, { min, max });
  }

  /**
   * Add range validation for numbers
   */
  range(min?: number, max?: number): ValidationChain {
    const rule: ValidationRule = {
      name: "range",
      validator: (value: any) => {
        const num = Number(value);

        if (isNaN(num)) {
          return { isValid: false, error: "Value must be a number" };
        }

        if (min !== undefined && num < min) {
          return { isValid: false, error: `Minimum value is ${min}` };
        }

        if (max !== undefined && num > max) {
          return { isValid: false, error: `Maximum value is ${max}` };
        }

        return { isValid: true };
      },
      severity: ValidationSeverity.ERROR,
    };

    return this.addRule(rule, { min, max });
  }

  /**
   * Add security validations
   */
  secure(): ValidationChain {
    return this.addRule(VALIDATION_RULES.noSqlInjection)
      .addRule(VALIDATION_RULES.noXss)
      .addRule(VALIDATION_RULES.noPathTraversal);
  }

  /**
   * Add custom validation rule
   */
  custom(
    validator: (value: any) => ValidationResult,
    message?: string,
  ): ValidationChain {
    const rule: ValidationRule = {
      name: "custom",
      validator,
      message,
      severity: ValidationSeverity.ERROR,
    };

    return this.addRule(rule);
  }

  /**
   * Validate a value against all rules in the chain
   */
  validate(value: any): EnhancedValidationResult {
    const errors: string[] = [];
    let highestSeverity = ValidationSeverity.INFO;

    for (const { rule, options } of this.rules) {
      const result = rule.validator(value, options);

      if (!result.isValid) {
        errors.push(result.error || `Validation failed for rule: ${rule.name}`);

        if (rule.severity) {
          const severityOrder = [
            ValidationSeverity.INFO,
            ValidationSeverity.WARNING,
            ValidationSeverity.ERROR,
            ValidationSeverity.CRITICAL,
          ];

          const currentIndex = severityOrder.indexOf(rule.severity);
          const highestIndex = severityOrder.indexOf(highestSeverity);

          if (currentIndex > highestIndex) {
            highestSeverity = rule.severity;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join("; ") : undefined,
      severity: errors.length > 0 ? highestSeverity : ValidationSeverity.INFO,
      field: this.fieldName,
    };
  }
}

/**
 * Create a new validation chain
 */
export function createValidationChain(fieldName?: string): ValidationChain {
  return new ValidationChain(fieldName);
}

/**
 * Bulk validation helper
 */
export function validateFields(
  data: Record<string, any>,
  rules: Record<string, ValidationChain>,
): Record<string, EnhancedValidationResult> {
  const results: Record<string, EnhancedValidationResult> = {};

  for (const [fieldName, chain] of Object.entries(rules)) {
    results[fieldName] = chain.validate(data[fieldName]);
  }

  return results;
}

/**
 * Check if any validation results have errors
 */
export function hasValidationErrors(
  results: Record<string, EnhancedValidationResult>,
): boolean {
  return Object.values(results).some((result) => !result.isValid);
}

/**
 * Get all validation errors as a formatted string
 */
export function getValidationErrorsString(
  results: Record<string, EnhancedValidationResult>,
): string {
  const errors = Object.entries(results)
    .filter(([, result]) => !result.isValid)
    .map(([field, result]) => `${field}: ${result.error}`)
    .join("; ");

  return errors;
}

/**
 * Security-focused validation for API inputs
 */
export function validateApiInput<T extends Record<string, any>>(
  input: T,
  allowedFields: string[],
  requiredFields: string[] = [],
): EnhancedValidationResult & { sanitized?: Partial<T> } {
  // Check for required fields
  for (const field of requiredFields) {
    if (
      !(field in input) ||
      input[field] === null ||
      input[field] === undefined ||
      input[field] === ""
    ) {
      return {
        isValid: false,
        error: `Required field missing: ${field}`,
        severity: ValidationSeverity.ERROR,
        field,
      };
    }
  }

  // Check for unknown fields
  const unknownFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  );
  if (unknownFields.length > 0) {
    return {
      isValid: false,
      error: `Unknown fields: ${unknownFields.join(", ")}`,
      severity: ValidationSeverity.WARNING,
    };
  }

  // Sanitize and validate each field
  const sanitized: Partial<T> = {};

  for (const field of allowedFields) {
    if (field in input) {
      const value = input[field];

      // Apply security validations
      const securityChain = createValidationChain(field).secure();
      const securityResult = securityChain.validate(value);

      if (!securityResult.isValid) {
        return {
          isValid: false,
          error: securityResult.error,
          severity: ValidationSeverity.CRITICAL,
          field,
        };
      }

      // Basic sanitization
      if (typeof value === "string") {
        sanitized[field as keyof T] = value.trim() as T[keyof T];
      } else {
        sanitized[field as keyof T] = value;
      }
    }
  }

  return {
    isValid: true,
    sanitized,
    severity: ValidationSeverity.INFO,
  };
}

/**
 * Rate limiting validation helper
 */
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
}

export class RateLimitValidator {
  private requests: Map<string, { count: number; resetTime: number }> =
    new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is within rate limit
   */
  isAllowed(
    req: any,
  ): EnhancedValidationResult & { remaining?: number; resetTime?: number } {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(req)
      : this.getDefaultKey(req);
    const now = Date.now();

    // Clean up expired entries
    this.cleanup(now);

    let entry = this.requests.get(key);

    if (!entry) {
      entry = { count: 0, resetTime: now + this.config.windowMs };
      this.requests.set(key, entry);
    }

    if (now > entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + this.config.windowMs;
    }

    entry.count++;

    const isAllowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    return {
      isValid: isAllowed,
      error: isAllowed ? undefined : VALIDATION_MESSAGES.RATE_LIMIT_EXCEEDED,
      severity: isAllowed
        ? ValidationSeverity.INFO
        : ValidationSeverity.WARNING,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  private getDefaultKey(req: any): string {
    return req.ip || req.connection?.remoteAddress || "unknown";
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime + this.config.windowMs) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * Input sanitization helpers
 */
export const sanitize = {
  /**
   * Remove HTML tags and dangerous characters
   */
  html: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=\s*[^>]*>/gi, "")
      .trim();
  },

  /**
   * Sanitize for safe URL usage
   */
  url: (input: string): string => {
    try {
      const url = new URL(input);
      // Remove dangerous protocols
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid protocol");
      }
      return url.toString();
    } catch {
      return "";
    }
  },

  /**
   * Sanitize string for database usage
   */
  sql: (input: string): string => {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, "")
      .replace(/--/g, "")
      .replace(/\/\*/g, "")
      .replace(/\*\//g, "")
      .trim();
  },

  /**
   * General string sanitization
   */
  string: (
    input: string,
    options: { maxLength?: number; allowSpecialChars?: boolean } = {},
  ): string => {
    const { maxLength = 1000, allowSpecialChars = false } = options;

    let sanitized = input.trim();

    if (!allowSpecialChars) {
      sanitized = sanitized.replace(/[<>'"&]/g, "");
    }

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  },
};

/**
 * Performance monitoring for validation
 */
export class ValidationPerformanceMonitor {
  private metrics: Map<
    string,
    { count: number; totalTime: number; maxTime: number }
  > = new Map();

  /**
   * Time a validation operation
   */
  async timeValidation<T>(
    name: string,
    operation: () => Promise<T> | T,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric(name, duration);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric(name, duration);
      throw error;
    }
  }

  private recordMetric(name: string, duration: number): void {
    let metric = this.metrics.get(name);

    if (!metric) {
      metric = { count: 0, totalTime: 0, maxTime: 0 };
      this.metrics.set(name, metric);
    }

    metric.count++;
    metric.totalTime += duration;
    metric.maxTime = Math.max(metric.maxTime, duration);
  }

  /**
   * Get performance metrics
   */
  getMetrics(): Record<
    string,
    { count: number; averageTime: number; maxTime: number }
  > {
    const result: Record<
      string,
      { count: number; averageTime: number; maxTime: number }
    > = {};

    for (const [name, metric] of this.metrics.entries()) {
      result[name] = {
        count: metric.count,
        averageTime: metric.totalTime / metric.count,
        maxTime: metric.maxTime,
      };
    }

    return result;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics.clear();
  }
}

/**
 * Global validation performance monitor
 */
export const validationMonitor = new ValidationPerformanceMonitor();
