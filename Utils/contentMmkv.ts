import {createMMKV} from 'react-native-mmkv';
import {MMKV_ENCRYPTION_KEY} from '@env';
import {
  ICategoryData,
  IContinueWatching,
  ILiveContent,
  IVODContent,
} from '@/types/api/content.types';

export const CONTENT_MMKV_KEYS = {
  HOME_SNAPSHOT: 'home.snapshot',
  BANNER: 'banner',
  CATEGORY: 'category',
  GENRE: 'genre',
  IMAGE_CACHE_MAP: 'IMAGE_CACHE_MAP',
  WELCOME_ADS: 'welcome.ads',
  UPCOMING: 'upcoming.events',
  ANALYTICS_QUEUE: 'analytics.queue',
  ANALYTICS_INSTALL_ID: 'analytics.install-id',
} as const;

export type UpcomingContent = IVODContent | ILiveContent;

export type HomeSnapshot = {
  banner?: {lives: unknown[]; vods: IVODContent[]};
  categories?: ICategoryData[];
  genres?: ICategoryData[];
  continueWatching?: IContinueWatching[];
  fetchedAt: number;
};

const contentMmkv = createMMKV({
  id: 'reeplay-content-mmkv',
  encryptionKey: MMKV_ENCRYPTION_KEY,
});

export function contentGetString(key: string): string | undefined {
  return contentMmkv.getString(key);
}

export function contentSetString(key: string, value: string): void {
  contentMmkv.set(key, value);
}

export function contentRemove(key: string): void {
  contentMmkv.remove(key);
}

export function clearContentCache(): void {
  const analyticsQueue = contentGetString(CONTENT_MMKV_KEYS.ANALYTICS_QUEUE);
  const analyticsInstallId = contentGetString(CONTENT_MMKV_KEYS.ANALYTICS_INSTALL_ID);
  contentMmkv.clearAll();
  if (analyticsQueue) contentSetString(CONTENT_MMKV_KEYS.ANALYTICS_QUEUE, analyticsQueue);
  if (analyticsInstallId) {
    contentSetString(CONTENT_MMKV_KEYS.ANALYTICS_INSTALL_ID, analyticsInstallId);
  }
}

export function contentGetJson<T>(key: string): T | null {
  const raw = contentGetString(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function contentSetJson(key: string, value: unknown): void {
  contentSetString(key, JSON.stringify(value));
}

export function vodRowKey(enumId: string): string {
  return `vod.${enumId}`;
}

export function getVodRowCache(enumId: string): IVODContent[] | null {
  return contentGetJson<IVODContent[]>(vodRowKey(enumId));
}

export function setVodRowCache(enumId: string, data: IVODContent[]): void {
  contentSetJson(vodRowKey(enumId), data);
}

export function getHomeSnapshot(): HomeSnapshot | null {
  return contentGetJson<HomeSnapshot>(CONTENT_MMKV_KEYS.HOME_SNAPSHOT);
}

export function setHomeSnapshot(snapshot: HomeSnapshot): void {
  contentSetJson(CONTENT_MMKV_KEYS.HOME_SNAPSHOT, snapshot);
}

export function getUpcomingCache(): UpcomingContent[] {
  return contentGetJson<UpcomingContent[]>(CONTENT_MMKV_KEYS.UPCOMING) ?? [];
}

export function setUpcomingCache(data: UpcomingContent[]): void {
  contentSetJson(CONTENT_MMKV_KEYS.UPCOMING, data);
}

/** One-time pull of old flat banner/category/genre keys into a snapshot if needed. */
export function hydrateLegacyFlatKeysIntoSnapshot(): HomeSnapshot | null {
  const existing = getHomeSnapshot();
  if (existing?.categories?.length || existing?.banner) {
    return existing;
  }

  const categories = contentGetJson<ICategoryData[]>(CONTENT_MMKV_KEYS.CATEGORY);
  const genres = contentGetJson<ICategoryData[]>(CONTENT_MMKV_KEYS.GENRE);
  const banner = contentGetJson<HomeSnapshot['banner']>(CONTENT_MMKV_KEYS.BANNER);

  if (!categories && !genres && !banner) {
    return null;
  }

  const snapshot: HomeSnapshot = {
    categories: categories ?? undefined,
    genres: genres ?? undefined,
    banner: banner ?? undefined,
    fetchedAt: Date.now(),
  };
  setHomeSnapshot(snapshot);
  return snapshot;
}
