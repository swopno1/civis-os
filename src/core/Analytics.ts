/**
 * AnalyticsService - A privacy-first, tracing-free analytics utility.
 * Designed for CivisOS landing page statistics without user behavior tracking.
 */
export class AnalyticsService {
  private static instance: AnalyticsService;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Initializes the analytics script.
   * Only call this on the landing page as per project requirements.
   * @param endpoint The analytics endpoint (e.g., GoatCounter code)
   */
  public init(endpoint: string = 'civisos'): void {
    if (this.initialized || !endpoint) return;

    // Implementation for GoatCounter (Privacy-first, no cookies, no tracking)
    // This script is only 3.5kb and respects DNT (Do Not Track).
    const script = document.createElement('script');
    script.async = true;
    script.src = '//gc.zgo.at/count.js';
    script.dataset.goatcounter = `https://${endpoint}.goatcounter.com/count`;

    // Add to head
    document.head.appendChild(script);

    this.initialized = true;
    console.log(`[Analytics] Privacy-first tracking initialized for ${endpoint}`);
  }

  /**
   * Manually trigger a page view.
   * Useful if the landing page is part of a Single Page Application (SPA).
   */
  public trackPageView(path?: string, title?: string): void {
    if (!this.initialized) return;

    // @ts-ignore - GoatCounter global
    if (window.goatcounter && window.goatcounter.count) {
      // @ts-ignore
      window.goatcounter.count({
        path: path || window.location.pathname + window.location.hash,
        title: title || document.title,
      });
    }
  }
}

export const analytics = AnalyticsService.getInstance();
