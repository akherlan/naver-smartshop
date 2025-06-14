import * as cheerio from "cheerio";
import { AppError } from "../../../middleware/errorHandler";
import { logInfo, logError, logWarning } from "../../../middleware/logger";

export interface NaverProductData {
  title: string;
  price: {
    original?: number;
    discounted?: number;
    currency: string;
    formatted: string;
  };
  images: string[];
  description?: string;
  brand: string;
  category?: string;
  rating?: {
    score: number;
    count: number;
  };
  shipping?: {
    fee: string;
    method: string;
  };
  seller: {
    name: string;
    url: string;
  };
  productId: string;
  url: string;
  availability: boolean;
  specifications?: Record<string, string>;
  reviews?: {
    count: number;
    averageRating: number;
  };
}

export interface ParseOptions {
  extractImages?: boolean;
  maxImages?: number;
  extractSpecs?: boolean;
  maxDescriptionLength?: number;
}

export class ProductParser {
  private static readonly DEFAULT_MAX_IMAGES = 10;
  private static readonly DEFAULT_MAX_DESCRIPTION = 500;

  /**
   * Parse Naver SmartStore URL to extract brand username and product ID
   */
  static parseNaverUrl(url: string): {
    brandUsername: string;
    productId: string;
  } {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");

      const brandUsername = pathParts[1];
      const productIndex = pathParts.indexOf("products");
      const productId = pathParts[productIndex + 1];

      if (!brandUsername || !productId) {
        throw new AppError("Invalid Naver Smartstore URL format", 400);
      }

      return { brandUsername, productId };
    } catch (error) {
      throw new AppError("Failed to parse Naver URL", 400);
    }
  }

  /**
   * Main parsing method - extracts all product data from HTML
   */
  static parseProductData(
    html: string,
    url: string,
    options: ParseOptions = {}
  ): NaverProductData {
    const {
      extractImages = true,
      maxImages = ProductParser.DEFAULT_MAX_IMAGES,
      extractSpecs = true,
      maxDescriptionLength = ProductParser.DEFAULT_MAX_DESCRIPTION
    } = options;

    try {
      logInfo(`Starting to parse product data from HTML (${html.length} characters)`);

      const $ = cheerio.load(html) as cheerio.CheerioAPI;
      const { brandUsername, productId } = this.parseNaverUrl(url);

      // Extract all product information
      const productData: NaverProductData = {
        title: this.extractTitle($),
        price: this.extractPrice($),
        images: extractImages ? this.extractImages($, maxImages) : [],
        description: this.extractDescription($, maxDescriptionLength),
        brand: this.extractBrand($, brandUsername),
        category: this.extractCategory($),
        rating: this.extractRating($),
        shipping: this.extractShipping($),
        seller: this.extractSeller($, brandUsername),
        productId,
        url,
        availability: this.extractAvailability($),
        specifications: extractSpecs ? this.extractSpecifications($) : undefined,
        reviews: this.extractReviews($)
      };

      logInfo(`Successfully parsed product: ${productData.title}`);
      return productData;

    } catch (error) {
      logError("Error parsing product data:", error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Failed to parse product data from HTML", 500);
    }
  }

  /**
   * Extract product title
   */
  private static extractTitle($: cheerio.CheerioAPI): string {
    const selectors = [
      // Common title selectors for Naver SmartStore
      'h1.se-module-text',
      '.product_title h1',
      '.se-text-paragraph',
      'h1[class*="title"]',
      'h1[class*="name"]',
      '.product-name h1',
      '.item-name h1',
      // Fallback selectors
      'h1',
      '.title',
      '.product-name',
      '[class*="product"][class*="title"]',
      '[class*="item"][class*="title"]'
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      for (let i = 0; i < elements.length; i++) {
        const title = $(elements[i]).text().trim();
        if (title && title.length > 3 && title.length < 200) {
          logInfo(`Title extracted using selector: ${selector}`);
          return title;
        }
      }
    }

    // Try to find title in meta tags as fallback
    const metaTitle = $('meta[property="og:title"]').attr('content') ||
                     $('meta[name="title"]').attr('content') ||
                     $('title').text();

    if (metaTitle && metaTitle.trim()) {
      logWarning("Using meta title as fallback");
      return metaTitle.trim().replace(/\s*-\s*네이버.*$/, ''); // Remove Naver suffix
    }

    throw new AppError("Product title not found", 404);
  }

  /**
   * Extract price information
   */
  private static extractPrice($: cheerio.CheerioAPI): NaverProductData["price"] {
    const priceSelectors = [
      '.se-text-paragraph',
      '.price_num',
      '.price',
      '.product-price',
      '.current-price',
      '.sale-price',
      '[class*="price"]',
      '.cost_box .price',
      '.item-price'
    ];

    let originalPrice: number | undefined;
    let discountedPrice: number | undefined;
    let formattedPrice = "";
    let foundPrices: number[] = [];

    // Extract all price values from different selectors
    for (const selector of priceSelectors) {
      const priceElements = $(selector);

      priceElements.each((_, element) => {
        const text = $(element).text().trim();
        // Match Korean won prices
        const priceMatches = text.match(/[\d,]+원?/g);

        if (priceMatches) {
          priceMatches.forEach(match => {
            const priceValue = parseInt(match.replace(/[^\d]/g, ""));
            if (priceValue > 0) {
              foundPrices.push(priceValue);

              if (!formattedPrice) {
                formattedPrice = match;
              }

              // Detect discount prices by context
              if (text.includes("할인") || text.includes("특가") ||
                  text.includes("세일") || text.includes("↓")) {
                if (!discountedPrice || priceValue < discountedPrice) {
                  discountedPrice = priceValue;
                }
              }
            }
          });
        }
      });
    }

    // Determine original and discounted prices
    if (foundPrices.length > 0) {
      foundPrices.sort((a, b) => b - a); // Sort descending

      if (foundPrices.length === 1) {
        originalPrice = foundPrices[0];
      } else {
        // If we have multiple prices, highest is likely original, lowest might be discounted
        originalPrice = foundPrices[0];
        if (discountedPrice) {
          // Keep the discounted price we found by context
        } else if (foundPrices.length > 1 && originalPrice && foundPrices[foundPrices.length - 1]! < originalPrice * 0.9) {
          // If lowest price is significantly lower, it might be discounted
          discountedPrice = foundPrices[foundPrices.length - 1];
        }
      }
    }

    // Try meta property as fallback
    if (!originalPrice) {
      const metaPrice = $('meta[property="product:price:amount"]').attr('content');
      if (metaPrice) {
        originalPrice = parseInt(metaPrice);
        formattedPrice = `${originalPrice.toLocaleString()}원`;
      }
    }

    return {
      original: originalPrice,
      discounted: discountedPrice,
      currency: "KRW",
      formatted: formattedPrice || (originalPrice ? `${originalPrice.toLocaleString()}원` : "가격 정보 없음")
    };
  }

  /**
   * Extract product images
   */
  private static extractImages($: cheerio.CheerioAPI, maxImages: number): string[] {
    const images: string[] = [];
    const imageSelectors = [
      '.se-image img',
      '.product-image img',
      '.thumb img',
      '.item-image img',
      'img[src*="shop.pstatic.net"]',
      'img[src*="storep-phinf.pstatic.net"]',
      'img[src*="shopping-phinf.pstatic.net"]',
      '[class*="image"] img',
      '.gallery img',
      '.slider img'
    ];

    for (const selector of imageSelectors) {
      let shouldBreak = false;

      $(selector).each((_, element) => {
        if (images.length >= maxImages) {
          shouldBreak = true;
          return false; // Break out of jQuery .each()
        }

        const src = $(element).attr("src") || $(element).attr("data-src") || $(element).attr("data-original");

        if (src && this.isValidImageUrl(src)) {
          const fullUrl = src.startsWith('//') ? `https:${src}` : src;

          // Avoid duplicates and low-quality images
          if (!images.includes(fullUrl) && !this.isLowQualityImage(fullUrl)) {
            images.push(fullUrl);
          }
        }
        return true; // Continue jQuery .each()
      });

      if (shouldBreak || images.length >= maxImages) {
        break;
      }
    }

    logInfo(`Extracted ${images.length} product images`);
    return images;
  }

  /**
   * Check if URL is a valid image URL
   */
  private static isValidImageUrl(url: string): boolean {
    return (url.startsWith('http') || url.startsWith('//')) &&
           /\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(url);
  }

  /**
   * Check if image is likely low quality (thumbnails, icons, etc.)
   */
  private static isLowQualityImage(url: string): boolean {
    return /thumb|icon|logo|banner|_small|_s\.|40x40|50x50|100x100/i.test(url);
  }

  /**
   * Extract product description
   */
  private static extractDescription($: cheerio.CheerioAPI, maxLength: number): string {
    const descSelectors = [
      '.se-module-text .se-text-paragraph',
      '.product-description',
      '.description',
      '.detail-content',
      '.item-description',
      '[class*="desc"]',
      '.content .se-text-paragraph'
    ];

    for (const selector of descSelectors) {
      const elements = $(selector);
      for (let i = 0; i < elements.length; i++) {
        const desc = $(elements[i]).text().trim();
        if (desc && desc.length > 20 && desc.length < 2000) {
          const truncated = desc.length > maxLength ?
            desc.substring(0, maxLength) + "..." : desc;
          logInfo(`Description extracted using selector: ${selector}`);
          return truncated;
        }
      }
    }

    // Try meta description as fallback
    const metaDesc = $('meta[property="og:description"]').attr('content') ||
                    $('meta[name="description"]').attr('content');

    if (metaDesc && metaDesc.trim()) {
      return metaDesc.trim().substring(0, maxLength);
    }

    return "";
  }

  /**
   * Extract brand information
   */
  private static extractBrand($: cheerio.CheerioAPI, brandUsername: string): string {
    const brandSelectors = [
      '.brand-name',
      '.seller-name',
      '.shop-name',
      '[class*="brand"]',
      '.store-name'
    ];

    for (const selector of brandSelectors) {
      const brand = $(selector).text().trim();
      if (brand && brand.length > 1 && brand.length < 50) {
        return brand;
      }
    }

    // Clean up brand username
    return brandUsername.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Extract category information
   */
  private static extractCategory($: cheerio.CheerioAPI): string {
    const categorySelectors = [
      '.breadcrumb',
      '.category',
      '.navigation',
      '[class*="breadcrumb"]',
      '.category-path'
    ];

    for (const selector of categorySelectors) {
      const category = $(selector).text().trim();
      if (category && category.length < 100) {
        // Clean up category path
        return category.replace(/\s*>\s*/g, ' > ').replace(/\s+/g, ' ');
      }
    }

    return "";
  }

  /**
   * Extract rating information
   */
  private static extractRating($: cheerio.CheerioAPI): NaverProductData["rating"] {
    const ratingSelectors = ['.rating', '.score', '.review-score', '[class*="rating"]'];

    for (const selector of ratingSelectors) {
      const ratingText = $(selector).text();
      const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
      const countMatch = ratingText.match(/\((\d+)\)|(\d+)개/);

      if (ratingMatch && ratingMatch[1]) {
        const score = parseFloat(ratingMatch[1]);
        const count = countMatch ? parseInt(countMatch[1] || countMatch[2] || '0') : 0;

        if (score >= 0 && score <= 5) {
          return { score, count };
        }
      }
    }

    return undefined;
  }

  /**
   * Extract shipping information
   */
  private static extractShipping($: cheerio.CheerioAPI): NaverProductData["shipping"] {
    const shippingSelectors = ['.shipping', '.delivery', '.배송', '[class*="shipping"]', '[class*="delivery"]'];

    let shippingText = "";
    for (const selector of shippingSelectors) {
      shippingText = $(selector).text();
      if (shippingText) break;
    }

    const isFreeShipping = /무료|free/i.test(shippingText);

    return {
      fee: isFreeShipping ? "무료배송" : "배송료 별도",
      method: "택배배송"
    };
  }

  /**
   * Extract seller information
   */
  private static extractSeller($: cheerio.CheerioAPI, brandUsername: string): NaverProductData["seller"] {
    const sellerSelectors = ['.seller-name', '.store-name', '[class*="seller"]'];

    let sellerName = brandUsername;
    for (const selector of sellerSelectors) {
      const name = $(selector).text().trim();
      if (name) {
        sellerName = name;
        break;
      }
    }

    return {
      name: sellerName,
      url: `https://smartstore.naver.com/${brandUsername}`
    };
  }

  /**
   * Extract availability status
   */
  private static extractAvailability($: cheerio.CheerioAPI): boolean {
    const unavailableIndicators = [
      "품절", "재고없음", "판매중지", "판매종료",
      "out of stock", "sold out", "unavailable"
    ];

    const pageText = $("body").text().toLowerCase();

    const isUnavailable = unavailableIndicators.some(indicator =>
      pageText.includes(indicator.toLowerCase())
    );

    return !isUnavailable;
  }

  /**
   * Extract product specifications
   */
  private static extractSpecifications($: cheerio.CheerioAPI): Record<string, string> {
    const specs: Record<string, string> = {};
    const specSelectors = [
      '.spec-table tr',
      '.specification tr',
      '.product-spec tr',
      '[class*="spec"] tr',
      '.detail-table tr'
    ];

    for (const selector of specSelectors) {
      $(selector).each((_, element) => {
        const cells = $(element).find('td, th');
        if (cells.length >= 2) {
          const key = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();

          if (key && value && key.length < 50 && value.length < 200) {
            specs[key] = value;
          }
        }
      });
    }

    return Object.keys(specs).length > 0 ? specs : {};
  }

  /**
   * Extract review information
   */
  private static extractReviews($: cheerio.CheerioAPI): NaverProductData["reviews"] {
    const reviewSelectors = ['.review-count', '.review-summary', '[class*="review"]'];

    let count = 0;
    let averageRating = 0;

    for (const selector of reviewSelectors) {
      const reviewText = $(selector).text();
      const countMatch = reviewText.match(/(\d+)개|(\d+)건/);
      const ratingMatch = reviewText.match(/(\d+\.?\d*)/);

      if (countMatch) {
        count = parseInt(countMatch[1] || countMatch[2] || '0');
      }
      if (ratingMatch && ratingMatch[1]) {
        const rating = parseFloat(ratingMatch[1]);
        if (rating >= 0 && rating <= 5) {
          averageRating = rating;
        }
      }
    }

    return { count, averageRating };
  }

  /**
   * Validate parsed data quality
   */
  static validateProductData(data: NaverProductData): void {
    if (!data.title || data.title.length < 3) {
      throw new AppError("Invalid product title", 400);
    }

    if (!data.price.formatted) {
      logWarning("No price information found");
    }

    if (data.images.length === 0) {
      logWarning("No product images found");
    }

    logInfo("Product data validation passed");
  }
}
