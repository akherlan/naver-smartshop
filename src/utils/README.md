# Validation Utils Documentation

A comprehensive validation utility library for the Product Detail API, providing secure and robust input validation, sanitization, and data verification functions.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Core Validation Functions](#core-validation-functions)
- [Advanced Validation Helpers](#advanced-validation-helpers)
- [Validation Chains](#validation-chains)
- [Security Validation](#security-validation)
- [Rate Limiting](#rate-limiting)
- [Constants and Patterns](#constants-and-patterns)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Overview

The validation utilities module provides a comprehensive set of tools for validating, sanitizing, and securing API inputs. It's specifically designed for the Naver Smartstore product API but includes general-purpose validation functions.

### Key Features

- **URL Validation**: Specialized validation for Naver Smartstore product URLs
- **Security Validation**: Protection against XSS, SQL injection, and path traversal attacks
- **Data Validation**: Comprehensive validation for product data structures
- **Validation Chains**: Fluent API for combining multiple validation rules
- **Rate Limiting**: Built-in rate limiting validation
- **Performance Monitoring**: Track validation performance metrics
- **Sanitization**: Safe input sanitization utilities

## Installation

```typescript
// Import specific functions
import { validateProductUrl, validateString } from '../utils';

// Import validation chains
import { createValidationChain, validators } from '../utils';

// Import all utilities
import * as ValidationUtils from '../utils';
```

## Core Validation Functions

### validateProductUrl(url: string)

Validates Naver Smartstore product URLs.

```typescript
import { validateProductUrl } from '../utils';

const result = validateProductUrl('https://smartstore.naver.com/store/products/123456');
console.log(result.isValid); // true

const invalid = validateProductUrl('https://example.com/products/123');
console.log(invalid.isValid); // false
console.log(invalid.error); // "URL must be from Naver Smartstore (smartstore.naver.com)"
```

**Supported URL formats:**
- `https://smartstore.naver.com/store/products/123456`
- `https://smartstore.naver.com/store/123456`
- `https://smartstore.naver.com/store?product_no=123456`

### validateString(value: any, options)

Validates and sanitizes string inputs.

```typescript
import { validateString } from '../utils';

const result = validateString('Hello World', {
  minLength: 5,
  maxLength: 50,
  fieldName: 'title'
});

console.log(result.isValid); // true
console.log(result.sanitized); // "Hello World"
```

**Options:**
- `minLength?: number` - Minimum string length
- `maxLength?: number` - Maximum string length (default: 1000)
- `allowEmpty?: boolean` - Allow empty strings (default: false)
- `fieldName?: string` - Field name for error messages

### validateNumber(value: any, options)

Validates numeric inputs with range checking.

```typescript
import { validateNumber } from '../utils';

const result = validateNumber('42', {
  min: 0,
  max: 100,
  integer: true,
  fieldName: 'rating'
});

console.log(result.isValid); // true
console.log(result.parsed); // 42
```

### validateEmail(email: string)

Validates email format.

```typescript
import { validateEmail } from '../utils';

const result = validateEmail('user@example.com');
console.log(result.isValid); // true
```

### validateProductData(data: any)

Validates complete product data structures.

```typescript
import { validateProductData } from '../utils';

const productData = {
  id: '123456',
  title: 'Sample Product',
  price: {
    current: 25000,
    original: 30000,
    currency: 'KRW'
  },
  images: ['https://example.com/image1.jpg'],
  seller: {
    name: 'Sample Store',
    rating: 4.5
  },
  availability: true,
  url: 'https://smartstore.naver.com/store/products/123456'
};

const result = validateProductData(productData);
console.log(result.isValid); // true
console.log(result.validated); // Sanitized product data
```

## Advanced Validation Helpers

### Validation Chains

Create complex validation rules using the fluent chain API.

```typescript
import { createValidationChain } from '../utils';

// Create a validation chain
const userInputValidator = createValidationChain('username')
  .required()
  .length(3, 50)
  .secure();

const result = userInputValidator.validate('john_doe');
console.log(result.isValid); // true
```

### Pre-built Validators

```typescript
import { validators } from '../utils';

// Product URL validator
const productValidator = validators.productRequest();
const result = productValidator.validate('https://smartstore.naver.com/store/products/123');

// Email validator
const emailValidator = validators.email('userEmail');
const emailResult = emailValidator.validate('user@example.com');

// Price validator
const priceValidator = validators.price('productPrice');
const priceResult = priceValidator.validate(25000);
```

### Bulk Field Validation

```typescript
import { validateFields, hasValidationErrors } from '../utils';

const data = {
  email: 'user@example.com',
  age: 25,
  name: 'John Doe'
};

const rules = {
  email: validators.email('email'),
  age: createValidationChain('age').required().range(18, 120),
  name: validators.userInput('name')
};

const results = validateFields(data, rules);

if (hasValidationErrors(results)) {
  console.log('Validation failed:', getValidationErrorsString(results));
} else {
  console.log('All validations passed!');
}
```

## Security Validation

### Built-in Security Checks

```typescript
import { validationHelpers } from '../utils';

// Check for security threats
const hasThreat = validationHelpers.hasSecurityThreats("SELECT * FROM users");
console.log(hasThreat); // true

// Sanitize user input
const sanitized = validationHelpers.sanitizeUserInput('<script>alert("xss")</script>Hello');
console.log(sanitized); // "Hello"
```

### API Input Validation

```typescript
import { validateApiInput } from '../utils';

const requestData = {
  productUrl: 'https://smartstore.naver.com/store/products/123456',
  format: 'json'
};

const result = validateApiInput(
  requestData,
  ['productUrl', 'format'], // allowed fields
  ['productUrl'] // required fields
);

if (result.isValid) {
  console.log('Sanitized input:', result.sanitized);
} else {
  console.log('Validation error:', result.error);
}
```

### Manual Security Validation

```typescript
import { createValidationChain } from '../utils';

const secureValidator = createValidationChain('userInput')
  .required()
  .secure(); // Adds SQL injection, XSS, and path traversal checks

const result = secureValidator.validate(userInput);
```

## Rate Limiting

### Rate Limit Validator

```typescript
import { RateLimitValidator } from '../utils';

const rateLimiter = new RateLimitValidator({
  windowMs: 900000, // 15 minutes
  maxRequests: 100,
  keyGenerator: (req) => req.ip // Custom key generator
});

// Check if request is allowed
const result = rateLimiter.isAllowed(request);

if (!result.isValid) {
  console.log(`Rate limit exceeded: ${result.error}`);
  console.log(`Reset time: ${new Date(result.resetTime)}`);
} else {
  console.log(`Requests remaining: ${result.remaining}`);
}
```

## Constants and Patterns

### Validation Patterns

```typescript
import { VALIDATION_PATTERNS } from '../utils';

// Check if string contains Korean characters
const hasKorean = VALIDATION_PATTERNS.KOREAN.test('안녕하세요');

// Validate Naver Smartstore URL
const isNaverUrl = VALIDATION_PATTERNS.NAVER_SMARTSTORE.test(url);

// Check for security threats
const hasSqlInjection = VALIDATION_PATTERNS.SQL_INJECTION.test(input);
```

### Constants

```typescript
import { VALIDATION_CONSTANTS } from '../utils';

console.log(VALIDATION_CONSTANTS.MAX_URL_LENGTH); // 2000
console.log(VALIDATION_CONSTANTS.SUPPORTED_CURRENCIES); // ['KRW', 'USD', 'EUR', 'JPY', 'CNY']
console.log(VALIDATION_CONSTANTS.HTTP_STATUS.BAD_REQUEST); // 400
```

## API Reference

### ValidationResult Interface

```typescript
interface ValidationResult {
  isValid: boolean;
  error?: string;
}
```

### EnhancedValidationResult Interface

```typescript
interface EnhancedValidationResult extends ValidationResult {
  severity?: ValidationSeverity;
  field?: string;
  code?: string;
  context?: Record<string, any>;
  suggestions?: string[];
}
```

### ValidationSeverity Enum

```typescript
enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}
```

## Examples

### Express Middleware

```typescript
import { validationHelpers } from '../utils';

const validateProductRequest = validationHelpers.createValidationMiddleware({
  productUrl: validators.productRequest(),
  format: createValidationChain('format').length(1, 10)
});

app.get('/product', validateProductRequest, (req, res) => {
  // Request is validated at this point
  const { productUrl } = req.query;
  // Process request...
});
```

### Custom Validation Rule

```typescript
import { createValidationChain } from '../utils';

const customValidator = createValidationChain('customField')
  .required()
  .custom((value) => {
    if (value.includes('forbidden')) {
      return { isValid: false, error: 'Value contains forbidden content' };
    }
    return { isValid: true };
  }, 'Custom validation failed');

const result = customValidator.validate('some value');
```

### Performance Monitoring

```typescript
import { validationMonitor } from '../utils';

// Time a validation operation
const result = await validationMonitor.timeValidation('productValidation', async () => {
  return validateProductData(complexProductData);
});

// Get performance metrics
const metrics = validationMonitor.getMetrics();
console.log('Validation Performance:', metrics);
```

### Sanitization

```typescript
import { sanitize } from '../utils';

// HTML sanitization
const cleanHtml = sanitize.html('<script>alert("xss")</script><p>Hello</p>');
console.log(cleanHtml); // "<p>Hello</p>"

// URL sanitization
const cleanUrl = sanitize.url('https://example.com?javascript=alert("xss")');
console.log(cleanUrl); // "https://example.com"

// SQL sanitization
const cleanSql = sanitize.sql("'; DROP TABLE users; --");
console.log(cleanSql); // "'' DROP TABLE users "

// General string sanitization
const cleanString = sanitize.string('<script>Hello</script>', {
  maxLength: 100,
  allowSpecialChars: false
});
console.log(cleanString); // "Hello"
```

## Best Practices

### 1. Always Validate User Input

```typescript
// ✅ Good
const validation = validateString(userInput, { maxLength: 500 });
if (!validation.isValid) {
  return res.status(400).json({ error: validation.error });
}

// ❌ Bad
const processedData = processUserInput(userInput); // No validation
```

### 2. Use Validation Chains for Complex Rules

```typescript
// ✅ Good
const validator = createValidationChain('email')
  .required()
  .email()
  .secure();

// ❌ Bad - multiple separate validations
const isRequired = validateRequired(email);
const isEmail = validateEmail(email);
const isSecure = checkSecurity(email);
```

### 3. Sanitize After Validation

```typescript
// ✅ Good
const validation = validateString(input, { maxLength: 100 });
if (validation.isValid) {
  const sanitizedInput = validation.sanitized || input;
  // Use sanitizedInput
}

// ❌ Bad - using raw input
const result = processInput(input);
```

### 4. Handle Validation Errors Gracefully

```typescript
// ✅ Good
const result = validateProductUrl(url);
if (!result.isValid) {
  return {
    error: result.error,
    suggestions: ['Ensure URL is from smartstore.naver.com', 'Check URL format']
  };
}

// ❌ Bad - throwing exceptions for validation errors
if (!isValidUrl(url)) {
  throw new Error('Invalid URL');
}
```

### 5. Use Rate Limiting for Public APIs

```typescript
// ✅ Good
const rateLimiter = new RateLimitValidator({
  windowMs: 900000,
  maxRequests: 100
});

app.use((req, res, next) => {
  const limitResult = rateLimiter.isAllowed(req);
  if (!limitResult.isValid) {
    return res.status(429).json({ error: limitResult.error });
  }
  next();
});

// ❌ Bad - no rate limiting
app.get('/api/product', handler); // Vulnerable to abuse
```

### 6. Monitor Validation Performance

```typescript
// ✅ Good
const result = await validationMonitor.timeValidation('complexValidation', () => {
  return validateComplexData(data);
});

// Periodically check metrics
setInterval(() => {
  const metrics = validationMonitor.getMetrics();
  if (metrics.complexValidation?.averageTime > 100) {
    console.warn('Validation performance degraded');
  }
}, 60000);
```

### 7. Use Appropriate Validation Severity

```typescript
// ✅ Good
const securityValidator = createValidationChain('input')
  .custom((value) => {
    if (containsMaliciousCode(value)) {
      return {
        isValid: false,
        error: 'Security violation detected',
        severity: ValidationSeverity.CRITICAL
      };
    }
    return { isValid: true };
  });

// Handle based on severity
if (result.severity === ValidationSeverity.CRITICAL) {
  // Log security incident
  // Block request immediately
} else if (result.severity === ValidationSeverity.ERROR) {
  // Return validation error
}
```

This validation module provides comprehensive, secure, and performant validation utilities for the Product Detail API. Use these tools to ensure data integrity, security, and user experience across your application.