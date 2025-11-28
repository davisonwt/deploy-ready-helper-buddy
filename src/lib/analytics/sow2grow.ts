/**
 * S2G Marketing Analytics SDK
 * Auto-instruments every user touchpoint with GDPR/CCPA compliance
 */

interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  localTime?: string;
  timezone?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  screenWidth?: number;
  screenHeight?: number;
  ipCountry?: string;
  ipCity?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  attributionChannel?: string;
  productId?: string;
  revenue?: number;
  lat?: number;
  lon?: number;
  [key: string]: any;
}

class Sow2GrowAnalytics {
  private sessionId: string;
  private userId?: string;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval?: NodeJS.Timeout;
  private consent: {
    analytics: boolean;
    marketingAttribution: boolean;
    preciseLocation: boolean;
  } = {
    analytics: false,
    marketingAttribution: false,
    preciseLocation: false,
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadConsent();
    this.setupAutoEvents();
    this.startFlushInterval();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadConsent() {
    try {
      const stored = localStorage.getItem('s2g_analytics_consent');
      if (stored) {
        this.consent = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load analytics consent', e);
    }
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  setConsent(consent: { analytics: boolean; marketingAttribution: boolean; preciseLocation: boolean }) {
    this.consent = consent;
    localStorage.setItem('s2g_analytics_consent', JSON.stringify(consent));
  }

  private getSuperProperties(): Partial<AnalyticsEvent> {
    const now = new Date();
    const utmParams = this.getUTMParams();
    
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: now.getTime(),
      localTime: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceModel: this.getDeviceModel(),
      osVersion: this.getOSVersion(),
      appVersion: process.env.REACT_APP_VERSION || '1.0.0',
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      ...utmParams,
      attributionChannel: this.getAttributionChannel(),
    };
  }

  private getUTMParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      utmTerm: params.get('utm_term') || undefined,
      utmContent: params.get('utm_content') || undefined,
    };
  }

  private getDeviceModel(): string {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'Mac';
    return 'Unknown';
  }

  private getOSVersion(): string {
    const ua = navigator.userAgent;
    const match = ua.match(/(?:iPhone|iPad|iPod|Android|Windows|Mac OS X)[\s\/]?([\d._]+)/);
    return match ? match[1] : 'Unknown';
  }

  private getAttributionChannel(): string {
    const params = new URLSearchParams(window.location.search);
    if (params.get('utm_source')) return 'organic';
    if (params.get('adjust_campaign')) return 'adjust';
    if (params.get('af_c')) return 'appsflyer';
    return 'organic';
  }

  private async getLocation(): Promise<{ lat?: number; lon?: number; ipCountry?: string; ipCity?: string }> {
    if (!this.consent.preciseLocation) {
      // Try IP-based location (less precise, no consent needed)
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
          ipCountry: data.country_code,
          ipCity: data.city,
        };
      } catch (e) {
        return {};
      }
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => resolve({}),
        { timeout: 2000, maximumAge: 60000 }
      );
    });
  }

  private setupAutoEvents() {
    // Session start
    this.track('session_start');

    // Screen view on route change (if using React Router)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.track('session_end');
        this.flush(true);
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.track('app_background');
        } else {
          this.track('app_foreground');
        }
      });
    }
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.consent.analytics && eventName !== 'session_start') {
      return; // Don't track if no consent (except session_start for consent tracking)
    }

    const event: AnalyticsEvent = {
      ...this.getSuperProperties(),
      event: eventName,
      ...properties,
    };

    // Add location if consented
    if (this.consent.preciseLocation || eventName === 'session_start') {
      this.getLocation().then((location) => {
        Object.assign(event, location);
        this.eventQueue.push(event);
      });
    } else {
      this.eventQueue.push(event);
    }

    // Flush immediately for critical events
    if (['bestowal_complete', 'purchase'].includes(eventName)) {
      this.flush();
    }
  }

  // Marketing events
  trackProductView(productId: string, properties?: Record<string, any>) {
    this.track('product_view', { productId, ...properties });
  }

  trackProductTap(productId: string, properties?: Record<string, any>) {
    this.track('product_tap', { productId, ...properties });
  }

  trackBestowalStart(productId: string, amount: number) {
    this.track('bestowal_start', { productId, revenue: amount });
  }

  trackBestowalComplete(productId: string, amount: number) {
    this.track('bestowal_complete', { productId, revenue: amount });
  }

  trackShareSent(platform: string, contentId?: string) {
    this.track('share_sent', { platform, contentId });
  }

  trackShareOpened(platform: string, contentId?: string) {
    this.track('share_opened', { platform, contentId });
  }

  trackFollow(userId: string) {
    this.track('follow', { targetUserId: userId });
  }

  trackUnfollow(userId: string) {
    this.track('unfollow', { targetUserId: userId });
  }

  trackOrchardWater(orchardId: string) {
    this.track('orchard_water', { orchardId });
  }

  trackOrchardHarvest(orchardId: string, amount: number) {
    this.track('orchard_harvest', { orchardId, revenue: amount });
  }

  trackVideoStart(videoId: string) {
    this.track('video_start', { videoId });
  }

  trackVideoComplete(videoId: string, duration: number) {
    this.track('video_complete', { videoId, duration });
  }

  trackMessageSent(roomId: string) {
    this.track('message_sent', { roomId });
  }

  trackMessageRead(roomId: string) {
    this.track('message_read', { roomId });
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds
  }

  async flush(sync = false) {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    const flushEvents = async () => {
      try {
        // Import the API function
        const { ingestAnalyticsEvents } = await import('@/api/analytics/events');
        const result = await ingestAnalyticsEvents(events);

        if (!result.success) {
          console.warn('Analytics flush failed:', result.error);
          // Re-queue events on failure (up to 100)
          if (this.eventQueue.length < 100) {
            this.eventQueue.unshift(...events);
          }
        }
      } catch (error) {
        console.warn('Analytics flush error:', error);
        if (this.eventQueue.length < 100) {
          this.eventQueue.unshift(...events);
        }
      }
    };

    if (sync) {
      await flushEvents();
    } else {
      flushEvents();
    }
  }
}

// Singleton instance
export const analytics = new Sow2GrowAnalytics();

// React hook for easy access
export function useAnalytics() {
  return analytics;
}

