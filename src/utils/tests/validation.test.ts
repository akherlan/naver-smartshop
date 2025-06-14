import {
  validateProductUrl,
  extractProductId,
  normalizeProductUrl,
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
  sanitizeUrl,
  isUrlAccessible,
} from "../validation";

/**
 * Test suite for validation utilities
 * This file demonstrates how to use all validation functions
 */

// Test validateProductUrl
console.log("=== Testing validateProductUrl ===");

// Valid URLs
const validUrls = [
  "https://smartstore.naver.com/store/products/123456",
  "https://smartstore.naver.com/minibeans/products/4256805008",
  "https://smartstore.naver.com/store/123456",
  "https://smartstore.naver.com/store?product_no=123456",
];

validUrls.forEach((url, index) => {
  const result = validateProductUrl(url);
  console.log(
    `Valid URL ${index + 1}: ${result.isValid ? "✅" : "❌"} - ${url}`,
  );
  if (!result.isValid) console.log(`  Error: ${result.error}`);
});

// Invalid URLs
const invalidUrls = [
  "",
  "not-a-url",
  "https://example.com/products/123",
  "https://brand.naver.com/store/products/123", // brand.naver.com not smartstore
  "https://smartstore.naver.com/store", // no product ID
  "https://smartstore.naver.com/store/categories/123", // categories not products
];

invalidUrls.forEach((url, index) => {
  const result = validateProductUrl(url);
  console.log(
    `Invalid URL ${index + 1}: ${result.isValid ? "❌" : "✅"} - "${url}"`,
  );
  if (!result.isValid) console.log(`  Error: ${result.error}`);
});

// Test extractProductId
console.log("\n=== Testing extractProductId ===");

const urlsWithIds = [
  "https://smartstore.naver.com/store/products/123456",
  "https://smartstore.naver.com/minibeans/products/4256805008",
  "https://smartstore.naver.com/store/789012",
  "https://smartstore.naver.com/store?product_no=345678",
];

urlsWithIds.forEach((url) => {
  const id = extractProductId(url);
  console.log(`URL: ${url}`);
  console.log(`Extracted ID: ${id || "null"}`);
});

// Test normalizeProductUrl
console.log("\n=== Testing normalizeProductUrl ===");

const urlsToNormalize = [
  "smartstore.naver.com/store/products/123456",
  "https://smartstore.naver.com/store/products/123456",
  "http://smartstore.naver.com/store/products/123456",
];

urlsToNormalize.forEach((url) => {
  const normalized = normalizeProductUrl(url);
  console.log(`Original: ${url}`);
  console.log(`Normalized: ${normalized}`);
});

// Test validateRequestParameters
console.log("\n=== Testing validateRequestParameters ===");

const validParams = {
  productUrl: "https://smartstore.naver.com/store/products/123456",
  format: "json",
};

const invalidParams = [
  {},
  { format: "json" }, // missing productUrl
  { productUrl: "invalid-url" },
  {
    productUrl: "https://smartstore.naver.com/store/products/123",
    eval: "malicious",
  },
];

console.log("Valid params:", validateRequestParameters(validParams));

invalidParams.forEach((params, index) => {
  const result = validateRequestParameters(params);
  console.log(`Invalid params ${index + 1}: ${result.isValid ? "❌" : "✅"}`);
  if (!result.isValid) console.log(`  Error: ${result.error}`);
});

// Test validateString
console.log("\n=== Testing validateString ===");

const stringTests = [
  { value: "Valid string", options: { minLength: 5, maxLength: 20 } },
  { value: "Too short", options: { minLength: 20, maxLength: 50 } },
  { value: "A".repeat(100), options: { minLength: 5, maxLength: 20 } },
  { value: "", options: { allowEmpty: true } },
  { value: "", options: { allowEmpty: false } },
  {
    value: '<script>alert("xss")</script>Normal text',
    options: { maxLength: 100 },
  },
  { value: 123, options: { maxLength: 10 } }, // not a string
];

stringTests.forEach((test, index) => {
  const result = validateString(test.value, test.options);
  console.log(`String test ${index + 1}: ${result.isValid ? "✅" : "❌"}`);
  console.log(`  Input: ${JSON.stringify(test.value)}`);
  if (result.sanitized) console.log(`  Sanitized: "${result.sanitized}"`);
  if (!result.isValid) console.log(`  Error: ${result.error}`);
});

// Test validateNumber
console.log("\n=== Testing validateNumber ===");

const numberTests = [
  { value: 42, options: { min: 0, max: 100 } },
  { value: "42", options: { min: 0, max: 100 } }, // string number
  { value: -5, options: { min: 0, max: 100 } },
  { value: 150, options: { min: 0, max: 100 } },
  { value: 3.14, options: { integer: true } },
  { value: 42, options: { integer: true } },
  { value: "not-a-number", options: { min: 0 } },
];

numberTests.forEach((test, index) => {
  const result = validateNumber(test.value, test.options);
  console.log(`Number test ${index + 1}: ${result.isValid ? "✅" : "❌"}`);
  console.log(`  Input: ${JSON.stringify(test.value)}`);
  if (result.parsed !== undefined) console.log(`  Parsed: ${result.parsed}`);
  if (!result.isValid) console.log(`  Error: ${result.error}`);
});

// Test validateEmail
console.log("\n=== Testing validateEmail ===");

const emailTests = [
  "user@example.com",
  "test.email+tag@domain.co.uk",
  "invalid-email",
  "user@",
  "@domain.com",
  "",
  "user@domain",
];

emailTests.forEach((email) => {
  const result = validateEmail(email);
  console.log(`Email "${email}": ${result.isValid ? "✅" : "❌"}`);
  if (!result.isValid) console.log(`  Error: ${result.error}`);
});

// Test validateProductData
console.log("\n=== Testing validateProductData ===");

const validProductData = {
  id: "123456",
  title: "Sample Product",
  price: {
    current: 25000,
    original: 30000,
    currency: "KRW",
  },
  images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  description: "This is a sample product description.",
  seller: {
    name: "Sample Store",
    rating: 4.5,
  },
  availability: true,
  url: "https://smartstore.naver.com/store/products/123456",
};

const invalidProductData = [
  null,
  "not-an-object",
  { id: 123 }, // id should be string
  { price: "not-an-object" },
  { price: { current: -100 } }, // negative price
  { images: "not-an-array" },
  { images: ["invalid-url"] },
  { seller: { rating: 6 } }, // rating too high
  { availability: "yes" }, // should be boolean
];

console.log("Valid product data:", validateProductData(validProductData));

invalidProductData.forEach((data, index) => {
  const result = validateProductData(data);
  console.log(
    `Invalid product data ${index + 1}: ${result.isValid ? "❌" : "✅"}`,
  );
  if (!result.isValid) console.log(`  Error: ${result.error}`);
});

// Test validateHeaders
console.log("\n=== Testing validateHeaders ===");

const validHeaders = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  accept: "application/json",
  "content-type": "application/json",
};

const invalidHeaders: any[] = [
  { "x-forwarded-host": "malicious.com" },
  { "user-agent": "sqlmap/1.0" },
  { "user-agent": "A".repeat(600) }, // too long
  "not-an-object", // Testing non-object input
  null, // Testing null input
  undefined, // Testing undefined input
];

console.log("Valid headers:", validateHeaders(validHeaders));

invalidHeaders.forEach((headers, index) => {
  const result = validateHeaders(headers);
  console.log(`Invalid headers ${index + 1}: ${result.isValid ? "❌" : "✅"}`);
  if (!result.isValid) console.log(`  Error: ${result.error}`);
});

// Test type guards
console.log("\n=== Testing Type Guards ===");

const typeTests = [
  { value: "string", tests: { isString, isNumber, isValidUrl } },
  { value: 42, tests: { isString, isNumber, isValidUrl } },
  { value: "https://example.com", tests: { isString, isNumber, isValidUrl } },
  { value: "not-a-url", tests: { isString, isNumber, isValidUrl } },
];

typeTests.forEach((test, index) => {
  console.log(
    `Type test ${index + 1} for value: ${JSON.stringify(test.value)}`,
  );
  Object.entries(test.tests).forEach(([name, fn]) => {
    console.log(`  ${name}: ${fn(test.value) ? "✅" : "❌"}`);
  });
});

// Test validateRateLimit
console.log("\n=== Testing validateRateLimit ===");

const rateLimitTests = [
  { key: "user1", limit: 100, windowMs: 900000, current: 50 },
  { key: "user2", limit: 100, windowMs: 900000, current: 100 },
  { key: "user3", limit: 100, windowMs: 900000, current: 150 },
];

rateLimitTests.forEach((info, index) => {
  const result = validateRateLimit(info);
  console.log(`Rate limit test ${index + 1}: ${result.isValid ? "✅" : "❌"}`);
  console.log(`  Current: ${info.current}/${info.limit}`);
  if (!result.isValid) console.log(`  Error: ${result.error}`);
});

// Test sanitizeUrl
console.log("\n=== Testing sanitizeUrl ===");

const urlsToSanitize = [
  'https://example.com?param=value&javascript=alert("xss")',
  "https://example.com?safe=param&script=malicious",
  "https://example.com?normal=param",
  "invalid-url",
];

urlsToSanitize.forEach((url) => {
  const sanitized = sanitizeUrl(url);
  console.log(`Original: ${url}`);
  console.log(`Sanitized: ${sanitized}`);
});

// Test isUrlAccessible
console.log("\n=== Testing isUrlAccessible ===");

const accessibilityTests = [
  "https://example.com",
  "http://example.com",
  "ftp://example.com",
  "invalid-url",
  'javascript:alert("xss")',
];

accessibilityTests.forEach((url) => {
  const accessible = isUrlAccessible(url);
  console.log(
    `URL "${url}": ${accessible ? "✅ Accessible" : "❌ Not accessible"}`,
  );
});

// Test validation result helpers
console.log("\n=== Testing Validation Result Helpers ===");

const error1 = createValidationError("Something went wrong", "email");
const error2 = createValidationError("Another error", "password");
const success = createValidationSuccess();

console.log("Error with field:", error1);
console.log("Error without field:", createValidationError("General error"));
console.log("Success:", success);

const combinedResult = combineValidationResults([error1, error2, success]);
console.log("Combined result:", combinedResult);

const allSuccessResult = combineValidationResults([success, success]);
console.log("All success combined:", allSuccessResult);

// Example usage in a real application
console.log("\n=== Real Application Example ===");

function processProductRequest(req: any) {
  // Validate headers
  const headerValidation = validateHeaders(req.headers || {});
  if (!headerValidation.isValid) {
    return { error: `Header validation failed: ${headerValidation.error}` };
  }

  // Validate request parameters
  const paramValidation = validateRequestParameters(req.query || {});
  if (!paramValidation.isValid) {
    return { error: `Parameter validation failed: ${paramValidation.error}` };
  }

  // Extract and validate product ID
  const productId = extractProductId(req.query.productUrl);
  if (!productId) {
    return { error: "Could not extract product ID from URL" };
  }

  // Validate product ID as a number
  const idValidation = validateNumber(productId, {
    min: 1,
    integer: true,
    fieldName: "Product ID",
  });
  if (!idValidation.isValid) {
    return { error: `Product ID validation failed: ${idValidation.error}` };
  }

  return {
    success: true,
    productId: idValidation.parsed,
    normalizedUrl: normalizeProductUrl(req.query.productUrl),
  };
}

// Test the real application example
const mockRequests = [
  {
    headers: { "user-agent": "Mozilla/5.0" },
    query: { productUrl: "https://smartstore.naver.com/store/products/123456" },
  },
  {
    headers: { "user-agent": "sqlmap/1.0" },
    query: { productUrl: "https://smartstore.naver.com/store/products/123456" },
  },
  {
    headers: { "user-agent": "Mozilla/5.0" },
    query: { productUrl: "https://example.com/products/123" },
  },
  {
    headers: { "user-agent": "Mozilla/5.0" },
    query: {},
  },
];

mockRequests.forEach((req, index) => {
  console.log(`Mock request ${index + 1}:`);
  const result = processProductRequest(req);
  console.log(`  Result:`, result);
});

console.log("\n=== Validation Tests Complete ===");

// Export for use in actual tests
export {
  validateProductUrl,
  extractProductId,
  normalizeProductUrl,
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
  sanitizeUrl,
  isUrlAccessible,
};
