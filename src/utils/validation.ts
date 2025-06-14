export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate if the provided URL is a valid Naver Smartstore product URL
 */
export function validateProductUrl(url: string): ValidationResult {
  // Check if URL is provided
  if (!url || typeof url !== "string") {
    return {
      isValid: false,
      error: "URL is required and must be a string",
    };
  }

  // Check if URL is not empty after trimming
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return {
      isValid: false,
      error: "URL cannot be empty",
    };
  }

  // Check if URL has valid format
  try {
    new URL(trimmedUrl);
  } catch (error) {
    return {
      isValid: false,
      error: "Invalid URL format",
    };
  }

  // Check if URL is from Naver Smartstore
  const naverSmartstorePattern = /^https?:\/\/smartstore\.naver\.com/i;
  if (!naverSmartstorePattern.test(trimmedUrl)) {
    return {
      isValid: false,
      error: "URL must be from Naver Smartstore (smartstore.naver.com)",
    };
  }

  // Check if URL contains product information
  const productUrlPatterns = [
    /\/products\/\d+/i, // /products/123456
    /\/\d+(?:\?|$)/i, // /123456 or /123456?param=value
    /product_no=\d+/i, // product_no=123456
  ];

  const hasProductInfo = productUrlPatterns.some((pattern) =>
    pattern.test(trimmedUrl),
  );
  if (!hasProductInfo) {
    return {
      isValid: false,
      error: "URL must contain a valid product identifier",
    };
  }

  // Check URL length (reasonable limit)
  if (trimmedUrl.length > 2000) {
    return {
      isValid: false,
      error: "URL is too long (maximum 2000 characters)",
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Extract product ID from Naver Smartstore URL
 */
export function extractProductId(url: string): string | null {
  const patterns = [
    /\/products\/(\d+)/i,
    /\/(\d+)(?:\?|$)/i,
    /product_no=(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate and normalize URL
 */
export function normalizeProductUrl(url: string): string {
  const trimmedUrl = url.trim();

  // Add https:// if protocol is missing
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
}

/**
 * Check if URL is accessible (basic format check)
 */
export function isUrlAccessible(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitize URL by removing potentially harmful parameters
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);

    // Remove potentially harmful parameters
    const dangerousParams = [
      "javascript",
      "script",
      "onload",
      "onerror",
      "onclick",
    ];

    dangerousParams.forEach((param) => {
      parsedUrl.searchParams.delete(param);
    });

    return parsedUrl.toString();
  } catch {
    return url;
  }
}

/**
 * Validate request parameters for the product API
 */
export interface ValidateRequestParams {
  productUrl?: string;
  [key: string]: any;
}

export function validateRequestParameters(
  params: ValidateRequestParams,
): ValidationResult {
  if (!params || typeof params !== "object") {
    return {
      isValid: false,
      error: "Request parameters must be an object",
    };
  }

  // Check for required productUrl parameter
  if (!params.productUrl) {
    return {
      isValid: false,
      error: "Missing required parameter: productUrl",
    };
  }

  // Validate productUrl
  const urlValidation = validateProductUrl(params.productUrl);
  if (!urlValidation.isValid) {
    return urlValidation;
  }

  // Check for suspicious parameters
  const suspiciousParams = ["eval", "exec", "system", "cmd"];
  for (const [key, value] of Object.entries(params)) {
    if (
      suspiciousParams.some(
        (suspicious) =>
          key.toLowerCase().includes(suspicious) ||
          (typeof value === "string" &&
            value.toLowerCase().includes(suspicious)),
      )
    ) {
      return {
        isValid: false,
        error: "Suspicious parameter detected",
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate and sanitize string input
 */
export function validateString(
  value: any,
  options: {
    minLength?: number;
    maxLength?: number;
    allowEmpty?: boolean;
    fieldName?: string;
  },
): ValidationResult & { sanitized?: string } {
  const {
    minLength = 0,
    maxLength = 1000,
    allowEmpty = false,
    fieldName = "Field",
  } = options;

  if (value === null || value === undefined) {
    return {
      isValid: allowEmpty,
      error: allowEmpty ? undefined : `${fieldName} is required`,
    };
  }

  if (typeof value !== "string") {
    return {
      isValid: false,
      error: `${fieldName} must be a string`,
    };
  }

  const trimmed = value.trim();

  if (!allowEmpty && trimmed.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be empty`,
    };
  }

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters long`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be no more than ${maxLength} characters long`,
    };
  }

  // Remove potential XSS characters
  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=\s*[^>]*>/gi, "");

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * Validate numeric input
 */
export function validateNumber(
  value: any,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    fieldName?: string;
  },
): ValidationResult & { parsed?: number } {
  const { min, max, integer = false, fieldName = "Field" } = options;

  if (value === null || value === undefined || value === "") {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }

  const parsed = Number(value);

  if (isNaN(parsed)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
    };
  }

  if (integer && !Number.isInteger(parsed)) {
    return {
      isValid: false,
      error: `${fieldName} must be an integer`,
    };
  }

  if (min !== undefined && parsed < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min}`,
    };
  }

  if (max !== undefined && parsed > max) {
    return {
      isValid: false,
      error: `${fieldName} must be no more than ${max}`,
    };
  }

  return {
    isValid: true,
    parsed,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return {
      isValid: false,
      error: "Email is required",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email.trim())) {
    return {
      isValid: false,
      error: "Invalid email format",
    };
  }

  return { isValid: true };
}

/**
 * Type guard for checking if value is a string
 */
export function isString(value: any): value is string {
  return typeof value === "string";
}

/**
 * Type guard for checking if value is a number
 */
export function isNumber(value: any): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Type guard for checking if value is a valid URL
 */
export function isValidUrl(value: any): value is string {
  if (!isString(value)) return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rate limiting validation
 */
export interface RateLimitInfo {
  key: string;
  limit: number;
  windowMs: number;
  current: number;
}

export function validateRateLimit(info: RateLimitInfo): ValidationResult {
  if (info.current >= info.limit) {
    return {
      isValid: false,
      error: `Rate limit exceeded. Maximum ${info.limit} requests per ${Math.floor(info.windowMs / 1000)} seconds.`,
    };
  }

  return { isValid: true };
}

/**
 * Validate product data structure
 */
export interface ProductDataValidation {
  id?: string;
  title?: string;
  price?: {
    current?: number;
    original?: number;
    currency?: string;
  };
  images?: string[];
  description?: string;
  seller?: {
    name?: string;
    rating?: number;
  };
  availability?: boolean;
  url?: string;
}

export function validateProductData(
  data: any,
): ValidationResult & { validated?: ProductDataValidation } {
  if (!data || typeof data !== "object") {
    return {
      isValid: false,
      error: "Product data must be an object",
    };
  }

  const validated: ProductDataValidation = {};

  // Validate ID
  if (data.id !== undefined) {
    const idValidation = validateString(data.id, {
      minLength: 1,
      maxLength: 50,
      fieldName: "Product ID",
    });
    if (!idValidation.isValid) return idValidation;
    validated.id = idValidation.sanitized;
  }

  // Validate title
  if (data.title !== undefined) {
    const titleValidation = validateString(data.title, {
      minLength: 1,
      maxLength: 500,
      fieldName: "Product title",
    });
    if (!titleValidation.isValid) return titleValidation;
    validated.title = titleValidation.sanitized;
  }

  // Validate price
  if (data.price !== undefined) {
    if (typeof data.price !== "object" || data.price === null) {
      return {
        isValid: false,
        error: "Product price must be an object",
      };
    }

    validated.price = {};

    if (data.price.current !== undefined) {
      const currentPriceValidation = validateNumber(data.price.current, {
        min: 0,
        fieldName: "Current price",
      });
      if (!currentPriceValidation.isValid) return currentPriceValidation;
      validated.price.current = currentPriceValidation.parsed;
    }

    if (data.price.original !== undefined) {
      const originalPriceValidation = validateNumber(data.price.original, {
        min: 0,
        fieldName: "Original price",
      });
      if (!originalPriceValidation.isValid) return originalPriceValidation;
      validated.price.original = originalPriceValidation.parsed;
    }

    if (data.price.currency !== undefined) {
      const currencyValidation = validateString(data.price.currency, {
        minLength: 3,
        maxLength: 3,
        fieldName: "Currency",
      });
      if (!currencyValidation.isValid) return currencyValidation;
      validated.price.currency = currencyValidation.sanitized;
    }
  }

  // Validate images array
  if (data.images !== undefined) {
    if (!Array.isArray(data.images)) {
      return {
        isValid: false,
        error: "Product images must be an array",
      };
    }

    validated.images = [];
    for (let i = 0; i < data.images.length; i++) {
      if (!isValidUrl(data.images[i])) {
        return {
          isValid: false,
          error: `Image ${i + 1} is not a valid URL`,
        };
      }
      validated.images.push(data.images[i]);
    }
  }

  // Validate description
  if (data.description !== undefined) {
    const descValidation = validateString(data.description, {
      maxLength: 2000,
      allowEmpty: true,
      fieldName: "Product description",
    });
    if (!descValidation.isValid) return descValidation;
    validated.description = descValidation.sanitized;
  }

  // Validate seller
  if (data.seller !== undefined) {
    if (typeof data.seller !== "object" || data.seller === null) {
      return {
        isValid: false,
        error: "Seller information must be an object",
      };
    }

    validated.seller = {};

    if (data.seller.name !== undefined) {
      const nameValidation = validateString(data.seller.name, {
        minLength: 1,
        maxLength: 100,
        fieldName: "Seller name",
      });
      if (!nameValidation.isValid) return nameValidation;
      validated.seller.name = nameValidation.sanitized;
    }

    if (data.seller.rating !== undefined) {
      const ratingValidation = validateNumber(data.seller.rating, {
        min: 0,
        max: 5,
        fieldName: "Seller rating",
      });
      if (!ratingValidation.isValid) return ratingValidation;
      validated.seller.rating = ratingValidation.parsed;
    }
  }

  // Validate availability
  if (data.availability !== undefined) {
    if (typeof data.availability !== "boolean") {
      return {
        isValid: false,
        error: "Product availability must be a boolean",
      };
    }
    validated.availability = data.availability;
  }

  // Validate URL
  if (data.url !== undefined) {
    const urlValidation = validateProductUrl(data.url);
    if (!urlValidation.isValid) return urlValidation;
    validated.url = data.url;
  }

  return {
    isValid: true,
    validated,
  };
}

/**
 * Validate HTTP headers for security
 */
export function validateHeaders(
  headers: Record<string, any>,
): ValidationResult {
  if (!headers || typeof headers !== "object") {
    return {
      isValid: false,
      error: "Headers must be an object",
    };
  }

  const dangerousHeaders = [
    "x-forwarded-host",
    "x-original-url",
    "x-rewrite-url",
  ];

  for (const header of dangerousHeaders) {
    if (headers[header]) {
      return {
        isValid: false,
        error: `Dangerous header detected: ${header}`,
      };
    }
  }

  // Validate User-Agent if present
  if (headers["user-agent"]) {
    const userAgent = headers["user-agent"];
    if (typeof userAgent !== "string" || userAgent.length > 500) {
      return {
        isValid: false,
        error: "Invalid User-Agent header",
      };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /nessus/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
      return {
        isValid: false,
        error: "Suspicious User-Agent detected",
      };
    }
  }

  return { isValid: true };
}

/**
 * Create a comprehensive validation result
 */
export function createValidationError(
  message: string,
  field?: string,
): ValidationResult {
  return {
    isValid: false,
    error: field ? `${field}: ${message}` : message,
  };
}

/**
 * Create a successful validation result
 */
export function createValidationSuccess(): ValidationResult {
  return { isValid: true };
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(
  results: ValidationResult[],
): ValidationResult {
  const errors = results
    .filter((result) => !result.isValid)
    .map((result) => result.error)
    .filter((error) => error !== undefined);

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join("; "),
    };
  }

  return { isValid: true };
}
