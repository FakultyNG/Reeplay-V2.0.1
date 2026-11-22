import {
  FlatList,
  InteractionManager,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import React, {
  Dispatch,
  SetStateAction,
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
  IDownloadData,
  IEpisode,
  ISeasonData,
  IVODContent,
} from '@/types/api/content.types';
import {fetchCastsByVOID, fetchSeasonsForSeries, hasPaidContentStatus} from '@/api/content.api';
import Size from '@/Utils/useResponsiveSize';
import colors from '@/configs/colors';
import FastImage from 'react-native-fast-image';
import {useNavigation} from '@react-navigation/native';
import {previewContentType, RootNav} from '@/navigation/AppNavigator';
import routes from '@/navigation/routes';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {setPreviewContent} from '@/store/slices/previewContentSlice';
import {selectContinueWatching} from '@/store/slices/bannerSlice.slice';
import {
  getEpisodePlaybackUrl,
  normalizeSeriesSeasons,
} from '@/Utils/seriesContent';

export type FeaturedExtrasAvailability = boolean | null;

interface Props {
  vod: IVODContent | null;
  /** All featured banner VODs — prefetched so swipes are cache-only. */
  featuredVods?: IVODContent[];
  onAvailabilityChange: (available: FeaturedExtrasAvailability) => void;
  makeFullscreen?: () => void;
  setFullscreenContent?: Dispatch<SetStateAction<IDownloadData | null>>;
}

const EPISODE_CARD_WIDTH = Size.calcWidth(118);
const EPISODE_CARD_HEIGHT = Size.calcWidth(140);
const EPISODE_CARD_GAP = Size.calcWidth(8);
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

function sortEpisodes(episodes: IEpisode[] | undefined) {
  return [...(episodes ?? [])].sort(
    (a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0),
  );
}

function sortSeasons(seasons: ISeasonData[]) {
  return [...seasons]
    .sort((a, b) => b.serial_number - a.serial_number)
    .map(season => ({
      ...season,
      episodes: sortEpisodes(season.episodes),
    }));
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
        const seasons = sortSeasons(normalizeSeriesSeasons(res.data.data));
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
  makeFullscreen,
  setFullscreenContent,
}: Props) => {
  const [cacheTick, setCacheTick] = useState(0);
  const availabilityRef = useRef<FeaturedExtrasAvailability>(null);
  const featuredKey = useMemo(
    () => featuredVods.map(v => v._id).join('|'),
    [featuredVods],
  );

  // Resolve from cache in the same render as the hero index change (no effect lag).
  const extras = useMemo(() => {
    // The cache is external to React; this counter deliberately invalidates
    // the memo after a background fetch populates it.
    void cacheTick;
    if (!vod) {
      return null;
    }
    const cached = extrasCache.get(vod._id) ?? seedFromVod(vod);
    if (cached && cached.kind !== 'empty' && !extrasCache.has(vod._id)) {
      extrasCache.set(vod._id, cached);
    }
    return cached;
  }, [vod, cacheTick]);

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
  }, [featuredKey, featuredVods, vod?._id]);

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
  }, [vod, extras, setAvailability]);

  if (!vod || !extras || !hasExtrasContent(extras)) {
    return null;
  }

  if (extras.kind === 'series') {
    return (
      <SeriesEpisodesExtras
        vod={vod}
        seasons={extras.seasons}
        makeFullscreen={makeFullscreen}
        setFullscreenContent={setFullscreenContent}
      />
    );
  }

  if (extras.kind === 'casts') {
    return <CastExtras vod={vod} casts={extras.casts} />;
  }

  return null;
};

interface SeriesEpisodesExtrasProps {
  vod: IVODContent;
  seasons: ISeasonData[];
  makeFullscreen?: () => void;
  setFullscreenContent?: Dispatch<SetStateAction<IDownloadData | null>>;
}

const SeriesEpisodesExtras = ({
  vod,
  seasons,
  makeFullscreen,
  setFullscreenContent,
}: SeriesEpisodesExtrasProps) => {
  const {navigate} = useNavigation<RootNav>();
  const dispatch = useAppDispatch();
  const continueWatching = useAppSelector(selectContinueWatching) ?? [];
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(
    seasons[0]?._id ?? null,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [canView, setCanView] = useState(
    (vod.vidClass ?? '').toLowerCase() === 'free',
  );

  useEffect(() => {
    setSelectedSeasonId(seasons[0]?._id ?? null);
  }, [vod._id, seasons]);

  useEffect(() => {
    let cancelled = false;
    async function checkAccess() {
      if ((vod.vidClass ?? '').toLowerCase() === 'free') {
        setCanView(true);
        return;
      }
      const res = await hasPaidContentStatus({
        contentType: 'vod',
        _id: vod._id,
      });
      if (!cancelled) {
        setCanView(!!(res.ok && res.data?.data?.canView));
      }
    }
    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [vod._id, vod.vidClass]);

  const selectedSeason = useMemo(
    () => seasons.find(s => s._id === selectedSeasonId) ?? seasons[0],
    [seasons, selectedSeasonId],
  );

  const episodes = useMemo(
    () => sortEpisodes(selectedSeason?.episodes),
    [selectedSeason],
  );

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

  const openEpisode = (episode: IEpisode) => {
    const videoURL = getEpisodePlaybackUrl(episode);
    if (canView && videoURL && makeFullscreen && setFullscreenContent) {
      const playlist = episodes
        .map<IDownloadData | null>(item => {
          const url = getEpisodePlaybackUrl(item);
          if (!url) {
            return null;
          }
          return {
            _id: item._id,
            desc: item.description,
            landscapePhoto: vod.landscapePhoto,
            portraitPhoto: vod.portraitPhoto,
            pg: vod.pg,
            size: '',
            title: item.title,
            type: vod.type,
            vidClass: vod.vidClass,
            video: url,
            viewsCount: item.viewsCount,
            playbackRole: item.video ? 'main' : 'trailer',
          } satisfies IDownloadData;
        })
        .filter((item): item is IDownloadData => item !== null);
      const playlistIndex = Math.max(
        0,
        playlist.findIndex(item => item._id === episode._id),
      );
      setFullscreenContent({
        ...playlist[playlistIndex],
        playlist,
        playlistIndex,
      });
      makeFullscreen();
      return;
    }
    openSeriesPreview();
  };

  return (
    <AppView className="mt-6 pl-5">
      <AppView className="flex-row items-center pr-5 mb-5">
        <TouchableOpacity
          onPress={() => setDropdownOpen(true)}
          disabled={seasons.length < 2}
          className="flex-row items-center"
          hitSlop={8}>
          <AppText className="text-white font-MANROPE_700 text-base mr-1.5">
            Season {selectedSeason?.serial_number ?? 1}
          </AppText>
          <OpenDropDwn />
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
            artwork={vod.landscapePhoto || vod.portraitPhoto}
            continueWatching={continueWatching}
            onPress={() => openEpisode(item)}
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
  artwork: string;
  continueWatching: IContinueWatching[];
  onPress: () => void;
}

const EpisodeCard = React.memo(function EpisodeCard({
  episode,
  artwork,
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
    return 0;
  }, [continueWatching, episode._id]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{width: EPISODE_CARD_WIDTH, marginRight: EPISODE_CARD_GAP}}>
      <AppView
        style={styles.episodeCard}
        className="overflow-hidden relative">
        {!!artwork && (
          <AppImage
            source={{
              uri: artwork,
              priority: FastImage.priority.normal,
              cache: FastImage.cacheControl.immutable,
            }}
            style={StyleSheet.absoluteFillObject}
            resizeMode={FastImage.resizeMode.cover}
          />
        )}
        <View style={styles.episodeBadge} pointerEvents="none">
          <AppText className="text-white font-MANROPE_700 text-[10px]">
            {padEpisode(episode.episodeNumber)}
          </AppText>
        </View>
        {progress > 0 && (
          <View style={styles.progressTrack} pointerEvents="none">
            <View
              style={[styles.progressFill, {width: `${progress * 100}%`}]}
            />
          </View>
        )}
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
  episodeCard: {
    height: EPISODE_CARD_HEIGHT,
    backgroundColor: colors.BLACKER,
    borderRadius: 10,
  },
  episodeBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.RED,
    minWidth: Size.calcWidth(22),
    paddingHorizontal: 5,
    paddingVertical: 3,
    alignItems: 'center',
    zIndex: 2,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
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
