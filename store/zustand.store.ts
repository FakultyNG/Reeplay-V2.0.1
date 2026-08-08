import {createMMKV} from 'react-native-mmkv';
import {create} from 'zustand';
import {persist} from 'zustand/middleware';

import {MMKV_ENCRYPTION_KEY} from '@env';
import {IDownloadData} from '@/types/api/content.types';
import {IProfile} from '@/types/api/profile.types';

type AppPersistStoreState = {
  userDetails?: IProfile;
  /** Session-expired UI flag — not persisted */
  isSessionExpired?: boolean;
  isLock?: boolean;
  biometrics?: boolean;
  downloadedList?: IDownloadData[];
};

interface AppPersistStore extends AppPersistStoreState {
  setUserDetails: (userDetails?: IProfile) => void;
  setIsSessionExpired: (isSessionExpired?: boolean) => void;
  /** @deprecated use setIsSessionExpired */
  setIsToken: (isToken?: boolean) => void;
  setIsLock: (isLock?: boolean) => void;
  setIsBiometrics: (biometrics?: boolean) => void;
  addDownload: (downloadItem?: IDownloadData) => void;
  removeDownloadById: (id: string) => void;
  hasDownloadById: (id: string) => boolean;
}

interface MKKVZustandState<T> {
  state: T;
  version: number;
}

export type AppPersistStoreStateType = MKKVZustandState<AppPersistStoreState>;

export const appPersistStoreName = 'app-persist-storage-reeplay';

export const appPersistStorage = createMMKV({
  id: appPersistStoreName,
  encryptionKey: MMKV_ENCRYPTION_KEY,
});

export const useAppPersistStore = create<
  AppPersistStore,
  [['zustand/persist', AppPersistStore]]
>(
  persist(
    (set, get) => ({
      userDetails: undefined,
      isSessionExpired: false,
      isLock: undefined,
      biometrics: false,
      downloadedList: [],

      setUserDetails: userDetails => set({userDetails}),
      setIsSessionExpired: isSessionExpired => set({isSessionExpired}),
      setIsToken: isToken => set({isSessionExpired: isToken}),
      setIsLock: isLock => set({isLock}),
      setIsBiometrics: biometrics => set({biometrics}),
      addDownload: downloadItem =>
        set(state => ({
          downloadedList: downloadItem
            ? [...(state.downloadedList || []), downloadItem]
            : state.downloadedList,
        })),
      removeDownloadById: (id: string) =>
        set(state => ({
          downloadedList:
            state.downloadedList?.filter(item => item._id !== id) || [],
        })),
      hasDownloadById: (id: string) =>
        get().downloadedList?.some(item => item._id === id) ?? false,
    }),
    {
      name: appPersistStoreName,
      storage: {
        setItem: (name, value) => {
          return appPersistStorage.set(name, JSON.stringify(value));
        },
        getItem: name => {
          const value = appPersistStorage.getString(name);
          if (value) return JSON.parse(value);
          else return null;
        },
        removeItem: name => {
          return appPersistStorage.remove(name);
        },
      },
      partialize: state => ({
        userDetails: state.userDetails,
        isLock: state.isLock,
        biometrics: state.biometrics,
        downloadedList: state.downloadedList,
      }),
    },
  ),
);
