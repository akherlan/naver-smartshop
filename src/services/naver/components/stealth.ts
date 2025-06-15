import { Page, Browser, BrowserContext, Route, Request } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { newInjectedContext } from "fingerprint-injector";

chromium.use(StealthPlugin());

export interface StealthResponse {
  responseProductJson: any;
  responseBenefitsJson: any;
}

export class StealthBrowser {
  // todo: browser context should be initialized while the server launches
  // not at the beginning of scraping function call
  private browserClient: Promise<Browser>;
  private context: Promise<BrowserContext>;

  constructor() {
    const headlessMode = false;
    const argOptions = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ];
    const proxyOptions = {
      server: process.env.PROXY_SERVER || "",
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD,
    };
    const ws = process.env.BROWSER_CDP_SERVER || "";
    if (ws !== "") {
      this.browserClient = chromium.connectOverCDP(ws);
    } else {
      this.browserClient = chromium.launch({
        headless: headlessMode,
        args: argOptions,
        proxy: proxyOptions,
      });
    }
    this.context = this.newContext();
  }

  private async newContext(): Promise<BrowserContext> {
    const browser = await this.browserClient;
    const context = await newInjectedContext(browser, {
      fingerprintOptions: {
        devices: ["mobile"],
        operatingSystems: ["android"],
      },
      // newContextOptions: {
      //   geolocation: {
      //     longitude: 123.456, // should get from proxy IP
      //     latitude: 789.012 // should get from proxy IP
      //   }
      // }
    });
    return context;
  }

  private async newPage(context: BrowserContext): Promise<Page> {
    const page = await context.newPage();
    // const page = await newInjectedPage(this.browserClient, {
    //   fingerprintOptions: {
    //     devices: ["desktop"],
    //     operatingSystems: ["linux"],
    //   },
    // });
    return page;
  }

  async listenTo(url: string): Promise<StealthResponse> {
    const context = await this.newContext();
    // const page = await this.browserClient.then((browser) => browser.newPage());
    const page = await this.newPage(context);

    // Abort images
    await page.route("**/*", (route: Route, req: Request) => {
      if (req.resourceType() === "image") {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Wait for a product API response
    const responseProductPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/i/v2/channels/") && response.status() === 200,
    );

    // Wait for a benefits API response
    const responseBenefitsPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/benefits/by-product") &&
        response.status() === 200,
    );

    await page.goto(url);

    const responseProduct = await responseProductPromise;
    const responseProductJson = await responseProduct.json();
    console.log(responseProductJson);

    const responseBenefits = await responseBenefitsPromise;
    const responseBenefitsJson = await responseBenefits.json();
    console.log(responseBenefitsJson);

    await page.screenshot({ path: "screenshot.png", fullPage: true });

    await page.close();
    // await context.close();

    return {
      responseProductJson,
      responseBenefitsJson,
    };
  }

  /**
   * Closes the browser client
   */
  async close(): Promise<void> {
    await this.browserClient.then((browser) => browser.close());
  }
}
