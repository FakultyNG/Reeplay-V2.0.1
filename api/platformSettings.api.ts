import {publicApi} from './httpClient';

type GuestAccessResponse = {
  status: number;
  message: string;
  data: {enabled: boolean};
};

export const getGuestAccessSetting = () =>
  publicApi.get<GuestAccessResponse>('/customers/general/guest-access');

export type LiveAccessSetting = {
  enabled: boolean;
  updatedAt?: string;
};

type LiveAccessResponse = {
  status: number;
  message: string;
  data: LiveAccessSetting;
};

export const getLiveAccessSetting = () =>
  publicApi.get<LiveAccessResponse>('/customers/general/live-access');
