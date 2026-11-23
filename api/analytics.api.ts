import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import firebaseAnalytics from '@react-native-firebase/analytics';
import NetInfo from '@react-native-community/netinfo';
import {apiCall} from './profile.api';
import {publicApi} from './httpClient';
import {IGeneric} from '@/types/api/auth.types';
import {
  CONTENT_MMKV_KEYS,
  contentGetJson,
  contentGetString,
  contentSetJson,
  contentSetString,
} from '@/Utils/contentMmkv';
import {getAccessToken} from '@/Utils/secureTokenStorage';
import {useGuestAccessStore} from '@/store/guestAccess.store';

export type AnalyticsContentType = 'vod' | 'episode' | 'live';
export type AnalyticsEventType =
  | 'app_session_start'
  | 'screen_view'
  | 'content_impression'
  | 'content_select'
  | 'preview_start'
  | 'play_start'
  | 'playback_ready'
  | 'progress'
  | 'buffer'
  | 'playback_error'
  | 'complete'
  | 'search'
  | 'download_start'
  | 'download_complete'
  | 'download_error'
  | 'cast_start'
  | 'cast_complete'
  | 'cast_error'
  | 'share'
  | 'notification_received'
  | 'notification_open'
  | 'house_ad_impression'
  | 'house_ad_click';

export type ContentAnalyticsEvent = {
  eventId: string;
  sessionId: string;
  eventType: AnalyticsEventType;
  contentId?: string;
  contentType?: AnalyticsContentType;
  positionSeconds?: number;
  durationSeconds?: number;
  watchedSeconds?: number;
  completionPercent?: number;
  shareDestination?: string;
  screenName?: string;
  sourceScreen?: string;
  searchTerm?: string;
  adId?: string;
  notificationId?: string;
  quality?: string;
  errorCode?: string;
  startupMs?: number;
  bufferingSeconds?: number;
  appVersion: string;
  platform: 'android' | 'ios' | 'unknown';
  osVersion: string;
  deviceClass: 'phone' | 'tablet' | 'tv' | 'unknown';
  networkType?: string;
  occurredAt: string;
};

const MAX_QUEUE_SIZE = 500;
let queue = contentGetJson<ContentAnalyticsEvent[]>(CONTENT_MMKV_KEYS.ANALYTICS_QUEUE) ?? [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

export const analyticsId = (prefix = 'evt') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const installId = (() => {
  const existing = contentGetString(CONTENT_MMKV_KEYS.ANALYTICS_INSTALL_ID);
  if (existing) return existing;
  const created = `${analyticsId('install')}-${Math.random().toString(36).slice(2, 11)}`;
  contentSetString(CONTENT_MMKV_KEYS.ANALYTICS_INSTALL_ID, created);
  return created;
})();

let currentSessionId = analyticsId('session');
export const getAnalyticsSessionId = () => currentSessionId;
export const startAnalyticsSession = () => {
  currentSessionId = analyticsId('session');
  queueAnalyticsEvent({eventType: 'app_session_start'});
  return currentSessionId;
};

function deviceClass(): ContentAnalyticsEvent['deviceClass'] {
  const type = DeviceInfo.getDeviceType().toLowerCase();
  if (type.includes('tv')) return 'tv';
  if (type.includes('tablet')) return 'tablet';
  return 'phone';
}

function persistQueue() {
  contentSetJson(CONTENT_MMKV_KEYS.ANALYTICS_QUEUE, queue.slice(-MAX_QUEUE_SIZE));
}

function compactFirebaseParams(event: ContentAnalyticsEvent) {
  return Object.fromEntries(
    Object.entries({
      content_id: event.contentId,
      content_type: event.contentType,
      screen_name: event.screenName,
      source_screen: event.sourceScreen,
      ad_id: event.adId,
      notification_id: event.notificationId,
      quality: event.quality,
      error_code: event.errorCode,
      position_seconds: event.positionSeconds,
      duration_seconds: event.durationSeconds,
      completion_percent: event.completionPercent,
      startup_ms: event.startupMs,
      buffering_seconds: event.bufferingSeconds,
    }).filter(([, value]) => value !== undefined && value !== ''),
  );
}

async function mirrorToFirebase(event: ContentAnalyticsEvent) {
  try {
    await firebaseAnalytics().logEvent(event.eventType, compactFirebaseParams(event));
  } catch {
    // First-party delivery remains authoritative if Firebase is unavailable.
  }
}

export async function flushAnalyticsEvents() {
  if (isFlushing || queue.length === 0) return;
  isFlushing = true;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;

  try {
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) {
      flushTimer = setTimeout(flushAnalyticsEvents, 15_000);
      return;
    }

    const batch = queue.slice(0, 50).map(event => ({
      ...event,
      networkType: event.networkType ?? network.type,
    }));
    const token = await getAccessToken();
    const isGuest = useGuestAccessStore.getState().isGuest;
    const response = token && !isGuest
      ? await apiCall<IGeneric>(api =>
          api.post<IGeneric>('/customers/analytics/events', {events: batch}),
        )
      : await publicApi.post<IGeneric>('/customers/analytics/events/anonymous', {
          installId,
          events: batch,
        });

    if (response.ok) {
      const sentIds = new Set(batch.map(event => event.eventId));
      queue = queue.filter(event => !sentIds.has(event.eventId));
      persistQueue();
    }
  } catch {
    // Persisted events will be retried after connectivity or API recovery.
  } finally {
    isFlushing = false;
    if (queue.length > 0) flushTimer = setTimeout(flushAnalyticsEvents, 10_000);
  }
}

export function queueAnalyticsEvent(
  event: Pick<ContentAnalyticsEvent, 'eventType'> &
    Partial<Omit<ContentAnalyticsEvent, 'eventType' | 'appVersion' | 'platform' | 'osVersion' | 'deviceClass'>>,
) {
  const enriched: ContentAnalyticsEvent = {
    ...event,
    eventId: event.eventId ?? analyticsId(),
    sessionId: event.sessionId ?? currentSessionId,
    appVersion: DeviceInfo.getVersion(),
    platform: Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : 'unknown',
    osVersion: String(Platform.Version),
    deviceClass: deviceClass(),
    occurredAt: event.occurredAt ?? new Date().toISOString(),
  };

  queue.push(enriched);
  if (queue.length > MAX_QUEUE_SIZE) queue = queue.slice(-MAX_QUEUE_SIZE);
  persistQueue();
  void mirrorToFirebase(enriched);

  if (queue.length >= 10) void flushAnalyticsEvents();
  else if (!flushTimer) flushTimer = setTimeout(flushAnalyticsEvents, 5_000);
}

export const trackScreenView = (screenName: string, sourceScreen?: string) =>
  queueAnalyticsEvent({eventType: 'screen_view', screenName, sourceScreen});

export const trackHouseAd = (
  eventType: 'house_ad_impression' | 'house_ad_click',
  adId: string,
  sourceScreen: string,
) => queueAnalyticsEvent({eventType, adId, sourceScreen});
