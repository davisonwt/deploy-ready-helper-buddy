/**
 * Analytics Events API
 * Supabase Edge Function or API route handler
 */

import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
  localTime: string;
  timezone: string;
  deviceModel: string;
  osVersion: string;
  appVersion: string;
  screenWidth: number;
  screenHeight: number;
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

export async function ingestAnalyticsEvents(events: AnalyticsEvent[]): Promise<{ success: boolean; inserted: number; error?: string }> {
  const startTime = Date.now();

  try {
    if (!Array.isArray(events) || events.length === 0) {
      return { success: false, inserted: 0, error: 'Invalid events array' };
    }

    // Validate consent for each user
    const userIds = [...new Set(events.map(e => e.userId).filter(Boolean))];
    let consentMap = new Map<string, boolean>();

    if (userIds.length > 0) {
      const { data: consents, error: consentError } = await supabase
        .from('user_consent')
        .select('user_id, analytics')
        .in('user_id', userIds);

      if (consentError) {
        console.error('Consent check error:', consentError);
      } else {
        consentMap = new Map(consents?.map(c => [c.user_id, c.analytics]) || []);
      }
    }

    // Filter out events from users without consent
    const filteredEvents = events.filter(e => {
      if (!e.userId) return true; // Allow anonymous events
      return consentMap.get(e.userId) !== false;
    });

    if (filteredEvents.length === 0) {
      return { success: false, inserted: 0, error: 'No consent' };
    }

    // Insert into events table
    const eventsToInsert = filteredEvents.map(event => ({
      timestamp: new Date(event.timestamp).toISOString(),
      user_id: event.userId || null,
      session_id: event.sessionId,
      event: event.event,
      product_id: event.productId || null,
      revenue: event.revenue || null,
      utm_source: event.utmSource || null,
      utm_medium: event.utmMedium || null,
      utm_campaign: event.utmCampaign || null,
      utm_term: event.utmTerm || null,
      utm_content: event.utmContent || null,
      attribution_channel: event.attributionChannel || null,
      device_model: event.deviceModel,
      os_version: event.osVersion,
      screen_width: event.screenWidth,
      screen_height: event.screenHeight,
      ip_country: event.ipCountry || null,
      ip_city: event.ipCity || null,
      lat: event.lat || null,
      lon: event.lon || null,
      local_hour: new Date(event.localTime).getHours(),
      metadata: JSON.stringify(event),
    }));

    const { error } = await supabase
      .from('analytics_events')
      .insert(eventsToInsert);

    if (error) {
      console.error('Analytics insert error:', error);
      return { success: false, inserted: 0, error: error.message };
    }

    const duration = Date.now() - startTime;
    console.log(`Analytics ingested ${filteredEvents.length} events in ${duration}ms`);

    return {
      success: true,
      inserted: filteredEvents.length,
    };
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return {
      success: false,
      inserted: 0,
      error: error.message || 'Internal server error',
    };
  }
}

