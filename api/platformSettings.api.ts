import {publicApi} from './httpClient';

type GuestAccessResponse = {
  status: number;
  message: string;
  data: {enabled: boolean};
};

export const getGuestAccessSetting = () =>
  publicApi.get<GuestAccessResponse>('/customers/general/guest-access');
