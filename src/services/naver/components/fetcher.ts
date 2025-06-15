import axios, { AxiosInstance, AxiosResponse } from "axios";
import { AppError } from "../../../middleware/errorHandler";
import { logInfo, logError, logWarning } from "../../../middleware/logger";

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  userAgent?: string;
}

export interface FetchResult {
  data: string;
  status: number;
  headers: Record<string, string>;
  url: string;
}

export class ProductFetcher {
  private static readonly DEFAULT_TIMEOUT = 15000; // 15 seconds
  private static readonly DEFAULT_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 2000; // 2 seconds

  // Rotate between multiple realistic User-Agent strings
  private static readonly USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15"
  ];

  private axiosInstance: AxiosInstance;
  private currentUserAgentIndex: number = 0;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: ProductFetcher.DEFAULT_TIMEOUT,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logInfo(`Making request to: ${config.url}`);
        return config;
      },
      (error) => {
        logError("Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logInfo(`Response received: ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logWarning(`Response error: ${error.response.status} from ${error.config?.url}`);
        } else {
          logError("Network error:", error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get the next User-Agent in rotation
   */
  private getNextUserAgent(): string {
    const userAgent = ProductFetcher.USER_AGENTS[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % ProductFetcher.USER_AGENTS.length;
    return userAgent!; // Safe assertion since we control the array and index
  }

  /**
   * Generate realistic browser headers
   */
  private generateBrowserHeaders(userAgent?: string): Record<string, string> {
    const selectedUserAgent = userAgent || this.getNextUserAgent();

    return {
      "User-Agent": selectedUserAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "Connection": "keep-alive",
      "DNT": "1"
    };
  }

  /**
   * Add random delay to mimic human behavior
   */
  private async addRandomDelay(baseDelay: number = 1000): Promise<void> {
    const randomDelay = baseDelay + Math.random() * 2000; // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, randomDelay));
  }

  /**
   * Validate if URL is a valid Naver SmartStore product URL
   */
  static isValidNaverProductUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname === "smartstore.naver.com" &&
        urlObj.pathname.includes("/products/")
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle specific HTTP status codes
   */
  private handleHttpStatus(status: number, url: string): void {
    switch (status) {
      case 429:
        throw new AppError("Too many requests - rate limited by server", 429);
      case 404:
        throw new AppError("Product not found", 404);
      case 403:
        throw new AppError("Access forbidden - possible bot detection", 403);
      case 503:
        throw new AppError("Service unavailable", 503);
      default:
        if (status >= 400) {
          throw new AppError(`HTTP error ${status}`, status);
        }
    }
  }

  /**
   * Fetch product page with retry logic and browser simulation
   */
  async fetchProductPage(url: string, options: FetchOptions = {}): Promise<FetchResult> {
    const {
      timeout = ProductFetcher.DEFAULT_TIMEOUT,
      retries = ProductFetcher.DEFAULT_RETRIES,
      retryDelay = ProductFetcher.DEFAULT_RETRY_DELAY,
      userAgent
    } = options;

    // Validate URL
    if (!ProductFetcher.isValidNaverProductUrl(url)) {
      throw new AppError("Invalid Naver SmartStore product URL", 400);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        logInfo(`Fetching product page (attempt ${attempt}/${retries + 1}): ${url}`);

        // Add delay between attempts to avoid rate limiting
        if (attempt > 1) {
          await this.addRandomDelay(retryDelay * attempt);
        }

        const headers = this.generateBrowserHeaders(userAgent);

        const response: AxiosResponse = await this.axiosInstance.get(url, {
          headers,
          timeout,
          // Add some browser-like behavior
          params: {
            // Add timestamp to avoid caching issues
            _: Date.now()
          }
        });

        // Handle specific status codes
        this.handleHttpStatus(response.status, url);

        // Check if we got valid HTML content
        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('text/html')) {
          throw new AppError("Response is not HTML content", 400);
        }

        // Check if content looks like it might be blocked
        const content = response.data as string;
        if (content.includes('captcha') || content.includes('blocked') || content.length < 1000) {
          logWarning("Potential bot detection or blocked content detected");
        }

        logInfo(`Successfully fetched product page: ${url} (${content.length} characters)`);

        return {
          data: content,
          status: response.status,
          headers: response.headers as Record<string, string>,
          url: response.config.url || url
        };

      } catch (error: any) {
        lastError = error;

        // Don't retry on specific errors
        if (error instanceof AppError) {
          const statusCode = error.statusCode;
          if (statusCode === 404 || statusCode === 400) {
            throw error; // Don't retry on client errors
          }
          if (statusCode === 429 && attempt <= retries) {
            logWarning(`Rate limited (attempt ${attempt}), waiting longer before retry...`);
            await this.addRandomDelay(retryDelay * attempt * 2); // Wait longer for rate limiting
            continue;
          }
        }

        // Handle axios errors
        if (axios.isAxiosError(error)) {
          if (error.code === 'ENOTFOUND') {
            throw new AppError("Product page not found", 404);
          } else if (error.code === 'ECONNREFUSED') {
            throw new AppError("Connection refused by server", 503);
          } else if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            logWarning(`Request timeout (attempt ${attempt}), retrying...`);
            if (attempt > retries) {
              throw new AppError("Request timeout while fetching product page", 408);
            }
            continue;
          }
        }

        if (attempt > retries) {
          break; // Stop retrying
        }

        logWarning(`Attempt ${attempt} failed, retrying in ${retryDelay * attempt}ms...`);
      }
    }

    // All retries exhausted
    logError("All fetch attempts failed:", lastError);

    if (lastError instanceof AppError) {
      throw lastError;
    }

    throw new AppError("Failed to fetch product page after multiple attempts", 500);
  }

  /**
   * Pre-visit the main store page to establish session (optional)
   */
  async establishSession(storeUrl: string): Promise<void> {
    try {
      logInfo(`Establishing session with store: ${storeUrl}`);

      const headers = this.generateBrowserHeaders();
      await this.axiosInstance.get(storeUrl, {
        headers,
        timeout: 10000
      });

      // Add small delay after session establishment
      await this.addRandomDelay(500);

      logInfo("Session established successfully");
    } catch (error) {
      logWarning("Failed to establish session, continuing anyway:", error);
      // Don't throw error as this is optional
    }
  }

  /**
   * Get current request statistics
   */
  getStats(): { userAgent: string; nextRotation: number } {
    return {
      userAgent: ProductFetcher.USER_AGENTS[this.currentUserAgentIndex]!,
      nextRotation: (ProductFetcher.USER_AGENTS.length - this.currentUserAgentIndex) % ProductFetcher.USER_AGENTS.length
    };
  }
}
