import {
  FlatList,
  InteractionManager,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {AppImage, AppText, AppView, TouchableOpacity} from '@/components';
import {OpenDropDwn} from '@/assets/icons';
import {
  ICast,
  IContinueWatching,
  IEpisode,
  ISeasonData,
  IVODContent,
} from '@/types/api/content.types';
import {fetchCastsByVOID, fetchSeasonsForSeries} from '@/api/content.api';
import Size from '@/Utils/useResponsiveSize';
import colors from '@/configs/colors';
import FastImage from 'react-native-fast-image';
import {useNavigation} from '@react-navigation/native';
import {previewContentType, RootNav} from '@/navigation/AppNavigator';
import routes from '@/navigation/routes';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {setPreviewContent} from '@/store/slices/previewContentSlice';
import {selectContinueWatching} from '@/store/slices/bannerSlice.slice';

export type FeaturedExtrasAvailability = boolean | null;

interface Props {
  vod: IVODContent | null;
  /** All featured banner VODs — prefetched so swipes are cache-only. */
  featuredVods?: IVODContent[];
  onAvailabilityChange: (available: FeaturedExtrasAvailability) => void;
}

const EPISODE_CARD_WIDTH = Size.calcWidth(148);
const EPISODE_CARD_HEIGHT = Size.calcHeight(88);
const CAST_SIZE = Size.calcWidth(72);
const DEFAULT_CAST_AVATAR = require('@/assets/images/dummy-avatar.png');
const PREFETCH_CONCURRENCY = 6;

type CachedExtras =
  | {kind: 'series'; seasons: ISeasonData[]}
  | {kind: 'casts'; casts: ICast[]}
  | {kind: 'empty'};

const extrasCache = new Map<string, CachedExtras>();
const inflight = new Map<string, Promise<CachedExtras>>();

function isSeriesType(type?: string) {
  return (type ?? '').toLowerCase().includes('series');
}

function padEpisode(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function uniqueCasts(list: ICast[]) {
  const seen = new Set<string>();
  const out: ICast[] = [];
  for (const cast of list) {
    if (!cast) {
      continue;
    }
    const key = cast._id || cast.photoUrl || cast.name;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(cast);
  }
  return out;
}

function sortSeasons(seasons: ISeasonData[]) {
  return [...seasons].sort((a, b) => b.serial_number - a.serial_number);
}

function hasExtrasContent(cached: CachedExtras | null | undefined) {
  if (!cached || cached.kind === 'empty') {
    return false;
  }
  if (cached.kind === 'series') {
    return cached.seasons.some(s => (s.episodes?.length ?? 0) > 0);
  }
  return cached.casts.length > 0;
}

function seedFromVod(vod: IVODContent): CachedExtras | null {
  if (isSeriesType(vod.type)) {
    return null;
  }
  const casts = uniqueCasts(Array.isArray(vod.cast) ? vod.cast : []);
  return casts.length ? {kind: 'casts', casts} : null;
}

async function fetchExtrasForVod(vod: IVODContent): Promise<CachedExtras> {
  const cached = extrasCache.get(vod._id);
  if (cached) {
    return cached;
  }

  const existing = inflight.get(vod._id);
  if (existing) {
    return existing;
  }

  const promise = (async (): Promise<CachedExtras> => {
    try {
      if (isSeriesType(vod.type)) {
        const res = await fetchSeasonsForSeries({
          _id: vod._id,
          pagination: {page: 1, limit: 50},
        });
        if (!res.ok || !res.data?.data?.length) {
          const empty: CachedExtras = {kind: 'empty'};
          extrasCache.set(vod._id, empty);
          return empty;
        }
        const seasons = sortSeasons(res.data.data);
        const hasEps = seasons.some(s => (s.episodes?.length ?? 0) > 0);
        const value: CachedExtras = hasEps
          ? {kind: 'series', seasons}
          : {kind: 'empty'};
        extrasCache.set(vod._id, value);
        return value;
      }

      const seeded = uniqueCasts(Array.isArray(vod.cast) ? vod.cast : []);
      const res = await fetchCastsByVOID({
        _id: vod._id,
        pagination: {page: 1, limit: 20},
      });
      const casts =
        res.ok && res.data?.data?.length
          ? uniqueCasts(res.data.data)
          : seeded;
      const value: CachedExtras = casts.length
        ? {kind: 'casts', casts}
        : {kind: 'empty'};
      extrasCache.set(vod._id, value);
      if (value.kind === 'casts') {
        preloadCastPhotos(casts);
      }
      return value;
    } catch {
      const empty: CachedExtras = {kind: 'empty'};
      extrasCache.set(vod._id, empty);
      return empty;
    } finally {
      inflight.delete(vod._id);
    }
  })();

  inflight.set(vod._id, promise);
  return promise;
}

/** Prefetch cast/season payloads for every featured title (bounded concurrency). */
export async function prefetchAllFeaturedExtras(
  vods: IVODContent[],
  priorityId?: string,
) {
  if (!vods.length) {
    return;
  }
  const ordered = [...vods].sort((a, b) => {
    if (a._id === priorityId) {
      return -1;
    }
    if (b._id === priorityId) {
      return 1;
    }
    return 0;
  });
  const queue = ordered.filter(v => v?._id && !extrasCache.has(v._id));
  const workers = Array.from(
    {length: Math.min(PREFETCH_CONCURRENCY, queue.length || 1)},
    async () => {
      while (queue.length) {
        const next = queue.shift();
        if (next) {
          await fetchExtrasForVod(next);
        }
      }
    },
  );
  await Promise.all(workers);
}

function preloadCastPhotos(list: ICast[]) {
  const sources = list
    .map(c => c.photoUrl)
    .filter((uri): uri is string => !!uri)
    .slice(0, 6)
    .map(uri => ({
      uri,
      priority: FastImage.priority.low,
      cache: FastImage.cacheControl.immutable,
    }));
  if (sources.length) {
    FastImage.preload(sources);
  }
}

const FeaturedExtras = ({
  vod,
  featuredVods = [],
  onAvailabilityChange,
}: Props) => {
  const [cacheTick, setCacheTick] = useState(0);
  const availabilityRef = useRef<FeaturedExtrasAvailability>(null);
  const featuredKey = useMemo(
    () => featuredVods.map(v => v._id).join('|'),
    [featuredVods],
  );

  // Resolve from cache in the same render as the hero index change (no effect lag).
  const extras = useMemo(() => {
    if (!vod) {
      return null;
    }
    const cached = extrasCache.get(vod._id) ?? seedFromVod(vod);
    if (cached && cached.kind !== 'empty' && !extrasCache.has(vod._id)) {
      extrasCache.set(vod._id, cached);
    }
    return cached;
  }, [vod?._id, cacheTick]);

  const setAvailability = useCallback(
    (next: FeaturedExtrasAvailability) => {
      if (availabilityRef.current === next) {
        return;
      }
      availabilityRef.current = next;
      onAvailabilityChange(next);
    },
    [onAvailabilityChange],
  );

  // Prefetch remaining featured titles after first paint so posters win the network.
  useEffect(() => {
    if (!featuredVods.length) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        prefetchAllFeaturedExtras(featuredVods, vod?._id).then(() => {
          if (!cancelled) {
            setCacheTick(t => t + 1);
          }
        });
      }, 1200);
    });
    return () => {
      cancelled = true;
      task.cancel();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [featuredKey]);

  // Keep layout flag in sync without blocking hero paint.
  useEffect(() => {
    if (!vod) {
      setAvailability(false);
      return;
    }
    if (extras) {
      setAvailability(hasExtrasContent(extras));
      return;
    }
    let cancelled = false;
    fetchExtrasForVod(vod).then(fresh => {
      if (cancelled) {
        return;
      }
      setCacheTick(t => t + 1);
      setAvailability(hasExtrasContent(fresh));
    });
    return () => {
      cancelled = true;
    };
  }, [vod?._id, extras, setAvailability]);

  if (!vod || !extras || !hasExtrasContent(extras)) {
    return null;
  }

  if (extras.kind === 'series') {
    return <SeriesEpisodesExtras vod={vod} seasons={extras.seasons} />;
  }

  if (extras.kind === 'casts') {
    return <CastExtras vod={vod} casts={extras.casts} />;
  }

  return null;
};

interface SeriesEpisodesExtrasProps {
  vod: IVODContent;
  seasons: ISeasonData[];
}

const SeriesEpisodesExtras = ({vod, seasons}: SeriesEpisodesExtrasProps) => {
  const {navigate} = useNavigation<RootNav>();
  const dispatch = useAppDispatch();
  const continueWatching = useAppSelector(selectContinueWatching) ?? [];
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(
    seasons[0]?._id ?? null,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setSelectedSeasonId(seasons[0]?._id ?? null);
  }, [vod._id, seasons]);

  const selectedSeason = useMemo(
    () => seasons.find(s => s._id === selectedSeasonId) ?? seasons[0],
    [seasons, selectedSeasonId],
  );

  const episodes = selectedSeason?.episodes ?? [];
  if (!episodes.length) {
    return null;
  }

  const openSeriesPreview = () => {
    dispatch(setPreviewContent(vod));
    navigate(routes.PREVIEW_SCREEN, {
      content: previewContentType['tv series'],
      videoURL: vod.trailer ?? '',
    });
  };

  return (
    <AppView className="mt-6 pl-5">
      <AppView className="flex-row items-center pr-5 mb-3">
        <TouchableOpacity
          onPress={() => setDropdownOpen(true)}
          disabled={seasons.length < 2}
          className="flex-row items-center"
          hitSlop={8}>
          <AppText className="text-white font-MANROPE_700 text-base mr-1.5">
            Season {selectedSeason?.serial_number ?? 1}
          </AppText>
          {seasons.length > 1 && <OpenDropDwn />}
        </TouchableOpacity>
        <AppText className="ml-3 text-sm font-MANROPE_400 text-grey_white">
          {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
        </AppText>
      </AppView>

      <FlatList
        horizontal
        data={episodes}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={4}
        windowSize={5}
        maxToRenderPerBatch={4}
        keyExtractor={(item, index) =>
          item?._id ? `${item._id}-${index}` : `episode-${index}`
        }
        contentContainerStyle={{paddingRight: 20}}
        renderItem={({item}) => (
          <EpisodeCard
            episode={item}
            coverUri={vod.landscapePhoto || vod.portraitPhoto}
            continueWatching={continueWatching}
            onPress={openSeriesPreview}
          />
        )}
      />

      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}>
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={() => setDropdownOpen(false)}>
          <AppView style={styles.dropdownSheet}>
            {seasons.map(season => {
              const active = season._id === selectedSeason?._id;
              return (
                <TouchableOpacity
                  key={season._id}
                  onPress={() => {
                    setSelectedSeasonId(season._id);
                    setDropdownOpen(false);
                  }}
                  className="py-3 px-4">
                  <AppText
                    className={`text-sm font-MANROPE_500 ${
                      active ? 'text-red' : 'text-white'
                    }`}>
                    Season {season.serial_number}
                    <AppText className="text-grey_white">
                      {'  '}
                      {season.episodes?.length ?? 0} eps
                    </AppText>
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </AppView>
        </Pressable>
      </Modal>
    </AppView>
  );
};

interface EpisodeCardProps {
  episode: IEpisode;
  coverUri: string;
  continueWatching: IContinueWatching[];
  onPress: () => void;
}

const EpisodeCard = React.memo(function EpisodeCard({
  episode,
  coverUri,
  continueWatching,
  onPress,
}: EpisodeCardProps) {
  const progress = useMemo(() => {
    const match = continueWatching.find(
      c => c.episode?._id === episode._id || c.watchedDocumentId === episode._id,
    );
    if (match && match.totalDuration > 0) {
      return Math.min(1, Math.max(0, match.duration / match.totalDuration));
    }
    if (episode.durationWatched > 0) {
      return Math.min(0.85, Math.max(0.12, episode.durationWatched / 2700));
    }
    return 0;
  }, [continueWatching, episode._id, episode.durationWatched]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{width: EPISODE_CARD_WIDTH}}
      className="mr-3">
      <AppView
        style={{height: EPISODE_CARD_HEIGHT, backgroundColor: colors.BLACKER}}
        className="rounded-lg overflow-hidden relative">
        <AppImage
          source={{
            uri: coverUri,
            priority: FastImage.priority.normal,
            cache: FastImage.cacheControl.immutable,
          }}
          style={StyleSheet.absoluteFillObject}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.episodeBadge}>
          <AppText className="text-white font-MANROPE_700 text-[10px]">
            {padEpisode(episode.episodeNumber)}
          </AppText>
        </View>
        <View style={styles.episodeFooter}>
          <AppText
            numberOfLines={1}
            className="text-white font-MANROPE_500 text-[11px] mb-1">
            {episode.title}
          </AppText>
          {progress > 0 && (
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, {width: `${progress * 100}%`}]}
              />
            </View>
          )}
        </View>
      </AppView>
    </TouchableOpacity>
  );
});

interface CastExtrasProps {
  vod: IVODContent;
  casts: ICast[];
}

const CastExtras = ({vod, casts}: CastExtrasProps) => {
  const {navigate} = useNavigation<RootNav>();

  if (!casts.length) {
    return null;
  }

  return (
    <AppView className="mt-6 pl-5">
      <AppText className="text-white font-MANROPE_700 text-base mb-3">
        Cast
      </AppText>
      <FlatList
        horizontal
        data={casts}
        showsHorizontalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={5}
        maxToRenderPerBatch={6}
        keyExtractor={(item, index) =>
          item?._id ? `${item._id}-${index}` : `cast-${index}`
        }
        contentContainerStyle={{paddingRight: 20}}
        renderItem={({item}) => (
          <TouchableOpacity
            className="mr-3 items-center"
            style={{width: CAST_SIZE}}
            onPress={() =>
              navigate(routes.CAST_SCREEN, {cast: item, vodId: vod._id})
            }>
            <CastAvatar uri={item.photoUrl} />
            <AppText
              numberOfLines={2}
              className="capitalize text-center mt-2 font-MANROPE_400 text-white text-[10px]">
              {item.name}
            </AppText>
          </TouchableOpacity>
        )}
      />
    </AppView>
  );
};

const CastAvatar = React.memo(function CastAvatar({uri}: {uri?: string}) {
  const [failed, setFailed] = useState(false);
  const hasRemote = !!uri && !failed;

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View style={styles.castImageWrap}>
      <AppImage source={DEFAULT_CAST_AVATAR} style={styles.castImage} />
      {hasRemote && (
        <AppImage
          source={{
            uri,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }}
          style={[styles.castImage, styles.castImageOverlay]}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
});

export default FeaturedExtras;

const styles = StyleSheet.create({
  episodeBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.RED,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderBottomRightRadius: 4,
    zIndex: 2,
  },
  episodeFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingBottom: 6,
    paddingTop: 20,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  progressTrack: {
    height: 2,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.RED,
  },
  castImage: {
    width: CAST_SIZE,
    height: CAST_SIZE,
    borderRadius: 10,
  },
  castImageWrap: {
    width: CAST_SIZE,
    height: CAST_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  castImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  dropdownSheet: {
    backgroundColor: colors.BLACKER,
    borderRadius: 12,
    paddingVertical: 6,
    maxHeight: Size.getHeight() * 0.45,
  },
});
