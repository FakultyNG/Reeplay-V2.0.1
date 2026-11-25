import {create} from 'zustand';
import {getLiveAccessSetting, LiveAccessSetting} from '@/api/platformSettings.api';
import {
  CONTENT_MMKV_KEYS,
  contentGetJson,
  contentSetJson,
} from '@/Utils/contentMmkv';

const cached = contentGetJson<LiveAccessSetting>(CONTENT_MMKV_KEYS.LIVE_FEATURE);

type LiveFeatureState = LiveAccessSetting & {
  refreshing: boolean;
  setSetting: (setting: LiveAccessSetting) => void;
  setRefreshing: (refreshing: boolean) => void;
};

export const useLiveFeatureStore = create<LiveFeatureState>(set => ({
  enabled: cached?.enabled ?? true,
  updatedAt: cached?.updatedAt,
  refreshing: false,
  setSetting: setting => set(setting),
  setRefreshing: refreshing => set({refreshing}),
}));

let refreshPromise: Promise<boolean> | null = null;

export function refreshLiveFeatureSetting(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  useLiveFeatureStore.getState().setRefreshing(true);
  refreshPromise = getLiveAccessSetting()
    .then(response => {
      if (!response.ok || !response.data?.data) {
        return useLiveFeatureStore.getState().enabled;
      }
      const setting = response.data.data;
      contentSetJson(CONTENT_MMKV_KEYS.LIVE_FEATURE, setting);
      useLiveFeatureStore.getState().setSetting(setting);
      return setting.enabled;
    })
    .catch(() => useLiveFeatureStore.getState().enabled)
    .finally(() => {
      useLiveFeatureStore.getState().setRefreshing(false);
      refreshPromise = null;
    });

  return refreshPromise;
}
