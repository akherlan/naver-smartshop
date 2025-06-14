import { Router, Request, Response, NextFunction } from 'express';
import { NaverScraper, ScrapingOptions } from '../services/scraping/naverScraper';
import { AppError } from '../middleware/errorHandler';
import { logInfo, logError } from '../middleware/logger';

const router = Router();

// Create a shared scraper instance for better performance
const scraper = new NaverScraper();

/**
 * GET /naver?productUrl=<productUrl>
 * Fetches product data from Naver Smartstore
 */
router.get('/naver', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productUrl } = req.query;

    // Validate productUrl parameter
    if (!productUrl || typeof productUrl !== 'string') {
      throw new AppError('Missing or invalid productUrl parameter', 400);
    }

    // Validate URL format
    if (!NaverScraper.isValidNaverProductUrl(productUrl)) {
      throw new AppError('Invalid Naver Smartstore product URL format. Expected: https://smartstore.naver.com/<brandUsername>/products/<productId>', 400);
    }

    logInfo(`Processing request for product URL: ${productUrl}`);

    // Configure scraping options
    const scrapingOptions: ScrapingOptions = {
      fetchOptions: {
        timeout: 15000,
        retries: 2,
        retryDelay: 2000
      },
      parseOptions: {
        maxImages: 8,
        maxDescriptionLength: 400,
        extractSpecs: true
      },
      establishSession: false // Set to true if needed for better success rate
    };

    // Scrape product data
    const productData = await scraper.scrapeProduct(productUrl, scrapingOptions);

    // Return success response
    res.status(200).json({
      success: true,
      data: productData,
      timestamp: new Date().toISOString(),
      requestUrl: productUrl,
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /naver/validate?productUrl=<productUrl>
 * Validates if a URL is a valid Naver Smartstore product URL
 */
router.get('/naver/validate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productUrl } = req.query;

    if (!productUrl || typeof productUrl !== 'string') {
      throw new AppError('Missing or invalid productUrl parameter', 400);
    }

    const isValid = NaverScraper.isValidNaverProductUrl(productUrl);

    let parsedData = null;
    if (isValid) {
      try {
        parsedData = NaverScraper.parseNaverUrl(productUrl);
      } catch (error) {
        // If parsing fails, URL is not valid
        res.status(200).json({
          success: true,
          data: {
            isValid: false,
            url: productUrl,
            reason: 'Failed to parse brand username or product ID from URL',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        isValid,
        url: productUrl,
        ...(parsedData && {
          brandUsername: parsedData.brandUsername,
          productId: parsedData.productId,
        }),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /naver/health
 * Health check endpoint for the Naver scraping service
 */
router.get('/naver/health', async (req: Request, res: Response) => {
  try {
    // Test scraper connection
    const connectionTest = await scraper.testConnection();
    const scraperInfo = scraper.getScraperInfo();

    res.status(200).json({
      success: true,
      service: 'Naver Smartstore Scraper',
      status: connectionTest.success ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      connection: {
        status: connectionTest.success ? 'connected' : 'failed',
        message: connectionTest.message
      },
      scraper: {
        userAgent: scraperInfo.userAgent.substring(0, 50) + '...',
        isReady: scraperInfo.isReady
      },
      endpoints: {
        scrape: 'GET /naver?productUrl=<url>',
        validate: 'GET /naver/validate?productUrl=<url>',
        health: 'GET /naver/health',
      },
      supportedUrlFormat: 'https://smartstore.naver.com/<brandUsername>/products/<productId>',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'Naver Smartstore Scraper',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

export { router as productRouter };
