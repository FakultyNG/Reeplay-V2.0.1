import {publicApi} from './httpClient';

type BackendVersionResponse = {
  status: number;
  message: string;
  data: {version: string};
};

export const fetchBackendVersion = () =>
  publicApi.get<BackendVersionResponse>(`/version?timestamp=${Date.now()}`);
