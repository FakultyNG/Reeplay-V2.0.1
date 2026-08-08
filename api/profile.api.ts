import {IGeneric} from '@/types/api/auth.types';
import {IProfileResponse, Notification} from '@/types/api/profile.types';
import {apiCall} from './httpClient';

export {
  api,
  apiCall,
  armAuthGrace,
  getAuthToken,
  publicApi,
} from './httpClient';

export const getProfileDetails = async () =>
  await apiCall<IProfileResponse>(profileApi =>
    profileApi.get<IProfileResponse>('/customers/profile/fetch'),
  );

export const updateProfileDetails = async (data: FormData, _id: string) =>
  await apiCall<IGeneric>(profileApi =>
    profileApi.put<IGeneric>(
      `/customers/shared/user-profile/update/${_id}`,
      data,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    ),
  );

export const addinterests = async (data: {interest: string[]}) =>
  await apiCall<IGeneric>(profileApi =>
    profileApi.post('/customers/settings/interest/add', data),
  );

export const setNotifications = async (data: Notification) =>
  await apiCall<IGeneric>(profileApi =>
    profileApi.put('/customers/settings/notification-vidquality', data),
  );

export const uploadProfile = async (data: FormData) =>
  await apiCall<IGeneric>(profileApi =>
    profileApi.post('/customers/media/upload-photo', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  );

export const deleteProfile = async () =>
  await apiCall<IGeneric>(profileApi =>
    profileApi.delete('/customers/profile/delete'),
  );
