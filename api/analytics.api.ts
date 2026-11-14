import {apiCall} from './profile.api';
import {IGeneric} from '@/types/api/auth.types';

export type AnalyticsContentType = 'vod' | 'episode' | 'live';
export type AnalyticsEventType = 'play_start' | 'progress' | 'complete' | 'share';

export type ContentAnalyticsEvent = {
  eventId: string;
  sessionId: string;
  contentId: string;
  contentType: AnalyticsContentType;
  eventType: AnalyticsEventType;
  positionSeconds?: number;
  durationSeconds?: number;
  watchedSeconds?: number;
  completionPercent?: number;
  shareDestination?: string;
  occurredAt: string;
};

let queue: ContentAnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;

export const analyticsId = (prefix = 'evt') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export async function flushAnalyticsEvents() {
  if (isFlushing || queue.length === 0) return;
  isFlushing = true;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  const batch = queue.splice(0, 50);
  try {
    const response = await apiCall<IGeneric>(api =>
      api.post<IGeneric>('/customers/analytics/events', {events: batch}),
    );
    if (!response.ok) queue = [...batch, ...queue].slice(0, 200);
  } catch {
    queue = [...batch, ...queue].slice(0, 200);
  } finally {
    isFlushing = false;
    if (queue.length > 0) flushTimer = setTimeout(flushAnalyticsEvents, 5000);
  }
}

export function queueAnalyticsEvent(
  event: Omit<ContentAnalyticsEvent, 'eventId' | 'occurredAt'> &
    Partial<Pick<ContentAnalyticsEvent, 'eventId' | 'occurredAt'>>,
) {
  queue.push({
    ...event,
    eventId: event.eventId ?? analyticsId(),
    occurredAt: event.occurredAt ?? new Date().toISOString(),
  });
  if (queue.length >= 10) void flushAnalyticsEvents();
  else if (!flushTimer) flushTimer = setTimeout(flushAnalyticsEvents, 5000);
}
