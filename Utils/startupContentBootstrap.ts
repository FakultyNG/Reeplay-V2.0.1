import FastImage from 'react-native-fast-image';
import {bannerApi, fetchEnums, getVODbyEnumID} from '@/api/content.api';
import {getUpcomingEvents} from '@/api/upcomingEvents.api';
import store from '@/store/app.store';
import {
  setBannerContent,
  setCategories,
  setGenres,
} from '@/store/slices/bannerSlice.slice';
import {
  getHomeSnapshot,
  hydrateLegacyFlatKeysIntoSnapshot,
  setHomeSnapshot,
  setUpcomingCache,
  setVodRowCache,
  UpcomingContent,
} from '@/Utils/contentMmkv';

const STARTUP_REFRESH_TTL_MS = 60_000;
const FIRST_ROW_LIMIT = 12;
const IMAGE_PRELOAD_LIMIT = 16;

let startupRequest: Promise<void> | null = null;

function sortUpcoming(items: UpcomingContent[]): UpcomingContent[] {
  return items
    .slice()
    .sort((a, b) => {
      const aDate = 'releaseDate' in a ? a.releaseDate : a.start;
      const bDate = 'releaseDate' in b ? b.releaseDate : b.start;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    })
    .slice(0, 100);
}

function preloadImages(urls: Array<string | undefined>): void {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean))) as string[];
  if (!uniqueUrls.length) return;

  FastImage.preload(
    uniqueUrls.slice(0, IMAGE_PRELOAD_LIMIT).map(uri => ({
      uri,
      priority: FastImage.priority.high,
      cache: FastImage.cacheControl.immutable,
    })),
  );
}

/**
 * Warms the public, first-paint catalogue while the splash animation runs.
 * It never blocks navigation and shares one in-flight request with Home.
 */
export function preloadStartupContent(force = false): Promise<void> {
  const cached = getHomeSnapshot() ?? hydrateLegacyFlatKeysIntoSnapshot();

  if (cached) {
    if (cached.banner) store.dispatch(setBannerContent(cached.banner));
    if (cached.categories?.length) store.dispatch(setCategories(cached.categories));
    if (cached.genres?.length) store.dispatch(setGenres(cached.genres));
    preloadImages((cached.banner?.vods ?? []).map(item => item.portraitPhoto));
  }

  const cacheIsFresh =
    cached?.fetchedAt && Date.now() - cached.fetchedAt < STARTUP_REFRESH_TTL_MS;
  if (!force && cacheIsFresh) return Promise.resolve();
  if (startupRequest) return startupRequest;

  startupRequest = (async () => {
    const [banner, categories, genres, upcoming] = await Promise.allSettled([
      bannerApi(),
      fetchEnums('categories'),
      fetchEnums('genres'),
      getUpcomingEvents({page: 1, limit: 100}),
    ]);

    const previous = getHomeSnapshot() ?? cached;
    const bannerData =
      banner.status === 'fulfilled' && banner.value.ok
        ? banner.value.data?.data
        : undefined;
    const categoryData =
      categories.status === 'fulfilled' && categories.value.ok
        ? categories.value.data?.data
        : undefined;
    const genreData =
      genres.status === 'fulfilled' && genres.value.ok
        ? genres.value.data?.data
        : undefined;

    if (bannerData) store.dispatch(setBannerContent(bannerData));
    if (Array.isArray(categoryData)) store.dispatch(setCategories(categoryData));
    if (Array.isArray(genreData)) store.dispatch(setGenres(genreData));

    setHomeSnapshot({
      banner: bannerData ?? previous?.banner,
      categories: Array.isArray(categoryData)
        ? categoryData
        : previous?.categories,
      genres: Array.isArray(genreData) ? genreData : previous?.genres,
      continueWatching: previous?.continueWatching,
      fetchedAt: Date.now(),
    });

    if (upcoming.status === 'fulfilled' && upcoming.value.ok) {
      const data = upcoming.value.data?.data;
      if (data) {
        const upcomingItems = sortUpcoming([
          ...(data.lives ?? []),
          ...(data.vods ?? []),
        ]);
        setUpcomingCache(upcomingItems);
        preloadImages(
          upcomingItems.slice(0, 4).map(item =>
            'releaseDate' in item ? item.portraitPhoto : item.coverPhoto,
          ),
        );
      }
    }

    const firstCategory = Array.isArray(categoryData)
      ? categoryData.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]
      : previous?.categories?.[0];
    if (firstCategory) {
      const row = await getVODbyEnumID({
        enumId: firstCategory._id,
        pagination: {page: 1, limit: FIRST_ROW_LIMIT},
      });
      if (row.ok && row.data?.data) {
        setVodRowCache(firstCategory._id, row.data.data);
        preloadImages(row.data.data.map(item => item.portraitPhoto));
      }
    }

    preloadImages((bannerData?.vods ?? []).map(item => item.portraitPhoto));
  })()
    .catch(() => {
      // Cached content remains usable when startup networking fails.
    })
    .finally(() => {
      startupRequest = null;
    });

  return startupRequest;
}
