import { ProductFetcher, FetchOptions, FetchResult } from "./components/ProductFetcher";
import { ProductParser, NaverProductData, ParseOptions } from "./components/ProductParser";
import { AppError } from "../../middleware/errorHandler";
import { logInfo, logError, logWarning } from "../../middleware/logger";

export { NaverProductData } from "./components/ProductParser";

export interface NaverOptions {
  fetchOptions?: FetchOptions;
  parseOptions?: ParseOptions;
  establishSession?: boolean;
}

export class NaverScraper {
  private fetcher: ProductFetcher;

  constructor() {
    this.fetcher = new ProductFetcher();
  }

  /**
   * Validates if the provided URL is a valid Naver Smartstore product URL
   */
  static isValidNaverProductUrl(url: string): boolean {
    return ProductFetcher.isValidNaverProductUrl(url);
  }

  /**
   * Extracts brand username and product ID from Naver Smartstore URL
   */
  static parseNaverUrl(url: string): {
    brandUsername: string;
    productId: string;
  } {
    return ProductParser.parseNaverUrl(url);
  }

  /**
   * Main method to scrape product data from Naver Smartstore
   */
  async scrapeProduct(url: string, options: NaverOptions = {}): Promise<NaverProductData> {
    const {
      fetchOptions = {},
      parseOptions = {},
      establishSession = false
    } = options;

    try {
      // Validate URL format
      if (!NaverScraper.isValidNaverProductUrl(url)) {
        throw new AppError("Invalid Naver Smartstore product URL", 400);
      }

      logInfo(`Starting to scrape Naver product: ${url}`);

      // Optionally establish session first
      if (establishSession) {
        try {
          const { brandUsername } = NaverScraper.parseNaverUrl(url);
          const storeUrl = `https://smartstore.naver.com/${brandUsername}`;
          await this.fetcher.establishSession(storeUrl);
        } catch (error) {
          logWarning("Failed to establish session, continuing anyway:", error);
        }
      }

      // Fetch the product page
      const fetchResult: FetchResult = await this.fetcher.fetchProductPage(url, fetchOptions);

      // Check for potential blocking or captcha
      if (this.isContentBlocked(fetchResult.data)) {
        logWarning("Potential bot detection or content blocking detected");
        // Continue anyway, parser might still extract some data
      }

      // Parse product data from HTML
      const productData = ProductParser.parseProductData(fetchResult.data, url, parseOptions);

      // Validate the extracted data
      ProductParser.validateProductData(productData);

      logInfo(`Successfully scraped product: ${productData.title}`);

      return productData;

    } catch (error) {
      if (error instanceof AppError) {
        // Log specific error types for monitoring
        if (error.statusCode === 429) {
          logWarning("Rate limited by Naver - consider implementing delays between requests");
        } else if (error.statusCode === 404) {
          logWarning("Product not found - URL may be invalid or product may be removed");
        } else if (error.statusCode === 403) {
          logWarning("Access forbidden - possible bot detection or IP blocking");
        }
        throw error;
      }

      logError("Unexpected error during scraping:", error);
      throw new AppError("Failed to scrape product data", 500);
    }
  }

  /**
   * Batch scrape multiple products with built-in rate limiting
   */
  async scrapeMultipleProducts(
    urls: string[],
    options: NaverOptions & { delayBetweenRequests?: number } = {}
  ): Promise<{ success: NaverProductData[]; failed: { url: string; error: string }[] }> {
    const { delayBetweenRequests = 3000 } = options;
    const success: NaverProductData[] = [];
    const failed: { url: string; error: string }[] = [];

    logInfo(`Starting batch scraping of ${urls.length} products`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      if (!url) continue; // Skip undefined URLs

      try {
        logInfo(`Processing product ${i + 1}/${urls.length}: ${url}`);

        const productData = await this.scrapeProduct(url, options);
        success.push(productData);

        // Add delay between requests to avoid rate limiting
        if (i < urls.length - 1 && delayBetweenRequests > 0) {
          logInfo(`Waiting ${delayBetweenRequests}ms before next request...`);
          await this.delay(delayBetweenRequests);
        }

      } catch (error: any) {
        const errorMessage = error instanceof AppError ? error.message : "Unknown error";
        logError(`Failed to scrape ${url}:`, errorMessage);
        failed.push({ url, error: errorMessage });

        // If we hit rate limiting, increase delay for subsequent requests
        if (error instanceof AppError && error.statusCode === 429) {
          const extendedDelay = delayBetweenRequests * 2;
          logWarning(`Rate limited, extending delay to ${extendedDelay}ms`);
          await this.delay(extendedDelay);
        }
      }
    }

    logInfo(`Batch scraping completed. Success: ${success.length}, Failed: ${failed.length}`);

    return { success, failed };
  }

  /**
   * Check if content appears to be blocked or contains captcha
   */
  private isContentBlocked(html: string): boolean {
    const blockingIndicators = [
      'captcha',
      'blocked',
      'access denied',
      'robot',
      'bot detection',
      'too many requests',
      '차단',
      '접근 제한',
      '로봇'
    ];

    const lowerHtml = html.toLowerCase();
    return blockingIndicators.some(indicator => lowerHtml.includes(indicator)) ||
           html.length < 1000; // Suspiciously short response
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scraper statistics and configuration
   */
  getScraperInfo(): {
    userAgent: string;
    nextRotation: number;
    isReady: boolean;
  } {
    const stats = this.fetcher.getStats();
    return {
      ...stats,
      isReady: true
    };
  }

  /**
   * Test connection to Naver SmartStore
   */
  async testConnection(brandUsername: string = "test"): Promise<{
    success: boolean;
    status?: number;
    message: string;
  }> {
    try {
      const testUrl = `https://smartstore.naver.com/${brandUsername}`;

      await this.fetcher.establishSession(testUrl);

      return {
        success: true,
        status: 200,
        message: "Connection to Naver SmartStore successful"
      };
    } catch (error: any) {
      logError("Connection test failed:", error);

      let status = 500;
      let message = "Connection test failed";

      if (error instanceof AppError) {
        status = error.statusCode;
        message = error.message;
      }

      return {
        success: false,
        status,
        message
      };
    }
  }

  /**
   * Static method for backward compatibility
   */
  static async scrapeProduct(url: string, options: NaverOptions = {}): Promise<NaverProductData> {
    const scraper = new NaverScraper();
    return scraper.scrapeProduct(url, options);
  }
}
