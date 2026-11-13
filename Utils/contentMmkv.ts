import {createMMKV} from 'react-native-mmkv';
import {MMKV_ENCRYPTION_KEY} from '@env';
import {ICategoryData, IContinueWatching, IVODContent} from '@/types/api/content.types';

export const CONTENT_MMKV_KEYS = {
  HOME_SNAPSHOT: 'home.snapshot',
  BANNER: 'banner',
  CATEGORY: 'category',
  GENRE: 'genre',
  IMAGE_CACHE_MAP: 'IMAGE_CACHE_MAP',
} as const;

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
  contentMmkv.clearAll();
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
