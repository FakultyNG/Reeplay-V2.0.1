import { IGeneric, IPagination } from '@/types/api/auth.types';
import {
  IReminderStatusResponse,
  IUpcomingEventsResponse,
} from '@/types/api/upcomingEvents.types';
import {create} from 'apisauce';
import {apiCall, getAuthToken} from './profile.api';

const legacyUpcomingApi = create({
  baseURL: 'https://api.reeplay.app/api/v1',
  headers: {'Content-Type': 'application/json'},
  timeout: 12000,
});

export const getUpcomingEvents = async (data: IPagination) =>
  await apiCall<IUpcomingEventsResponse>(upcomingEvent =>
    upcomingEvent.get<IUpcomingEventsResponse>(
      `customers/upcoming/events/fetch?page=${data.page}&limit=${data.limit}`,
    ),
  );

/**
 * Admin currently publishes Upcoming records through api.reeplay.app while the
 * mobile app's primary API is typescript.reeplay.app. Read the same customer
 * feed from the publishing host as a compatibility source until both services
 * share a single catalogue.
 */
export const getLegacyUpcomingEvents = async (data: IPagination) => {
  const token = await getAuthToken();

  return legacyUpcomingApi.get<IUpcomingEventsResponse>(
    `customers/upcoming/events/fetch?page=${data.page}&limit=${data.limit}`,
    undefined,
    token ? {headers: {'customer-auth': token}} : undefined,
  );
};

export const getReminderStatus = async (eventID: string, type:'vod'|'live') =>
  await apiCall<IReminderStatusResponse>(upcomingEvent =>
    upcomingEvent.get<IReminderStatusResponse>(
      `customers/upcoming/events/is-subscribed/${eventID}/${type}`,
    ),
  );

export const subscribeReminderStatus = async (eventID: string, type:'vod'|'live') =>
  await apiCall<IGeneric>(upcomingEvent =>
    upcomingEvent.put<IGeneric>(
      `customers/upcoming/events/subscribe/${eventID}/${type}`,
    ),
  );

export const unsubscribeReminderStatus = async (eventID: string, type:'vod'|'live') =>
  await apiCall<IGeneric>(upcomingEvent =>
    upcomingEvent.put<IGeneric>(
      `customers/upcoming/events/unsubscribe/${eventID}/${type}`,
    ),
  );
