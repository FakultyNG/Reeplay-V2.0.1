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

export type InterestPreferences = {
  genreIds: string[];
  categoryIds: string[];
};

export const replaceInterests = async (data: InterestPreferences) =>
  await apiCall<IGeneric & {data: InterestPreferences}>(profileApi =>
    profileApi.put('/customers/settings/interests', data),
  );

export const setNotifications = async (data: Notification) =>
  await apiCall<IGeneric>(profileApi =>
    profileApi.put('/customers/settings/notification-vidquality', data),
  );

export type NotificationPreferences = Omit<Notification, 'video_quality'>;

export const setNotificationPreferences = async (
  data: Partial<NotificationPreferences>,
) =>
  await apiCall<IGeneric & {data: NotificationPreferences}>(profileApi =>
    profileApi.patch('/customers/settings/notifications', data),
  );

export type VideoQuality = 'automatic' | '1080p' | '720p' | '480p';

export const setVideoQuality = async (video_quality: VideoQuality) =>
  await apiCall<IGeneric>(profileApi =>
    profileApi.patch('/customers/settings/video-quality', {video_quality}),
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
