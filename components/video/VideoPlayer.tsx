import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Video, {
  AdEvent,
  ISO639_1,
  SelectedTrackType,
  TextTrackType,
  ViewType,
  type OnLoadData,
  type OnProgressData,
  type OnReceiveAdEventData,
  type VideoRef,
} from 'react-native-video';
import {
  ImageSourcePropType,
  ImageURISource,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { VideoPlayerProps } from 'react-native-video-player';
import { Controls, ProgressRef } from './Controls';
import { IContentData } from './DynamicVideoComponent';
import LottieView from 'lottie-react-native';
import { getSubtitles, registerContinueWatching, updateViewsCount } from '@/api/content.api';
import {
  cueTextAtTime,
  ensureWebVtt,
  normalizeSubtitleUrl,
  parseVttCues,
  type VttCue,
} from '@/Utils/contentUtils';
import RNFS from 'react-native-fs';
import { MediaInfo, useCastSession, useRemoteMediaClient } from 'react-native-google-cast';
import { throttle } from 'lodash';
import { IRegisteredContinueWatching } from '@/types/api/content.types';
import { useAppSelector } from '@/Hooks/reduxHook';
import { selectUser } from '@/store/slices/userSlice';
import {
  getBufferConfigForMode,
  getPreferredForwardBufferDuration,
  isLiveNowPlayback,
  maxBitRateForQuality,
  shouldAttachGoogleAd,
  shouldTreatPlaybackEndAsContentEnd,
} from './playbackConfig';
import {buildSampleEnglishCues} from '@/assets/subtitles/sampleEnglish';
import {
  analyticsId,
  flushAnalyticsEvents,
  queueAnalyticsEvent,
  type AnalyticsContentType,
} from '@/api/analytics.api';

/** Single linear pre-roll (one ad). Avoids VMAP pods that stack multiple ads per break. */
export const SINGLE_AD_TAG =
  'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&correlator=';

export interface ISubtitle{
  title:string;
  language:ISO639_1;
  type: TextTrackType;
  uri:string;
  /** Parsed cues for reliable JS overlay (native sideloaded tracks are flaky). */
  cues?: VttCue[];
}

export interface VideoInternalRef extends VideoRef {
  onStart: () => void;
}

type RenderVideoProps = Pick<
  VideoPlayerProps,
  | 'animationDuration'
  | 'autoplay'
  | 'controlsTimeout'
  | 'customStyles'
  | 'defaultMuted'
  | 'disableControlsAutoHide'
  | 'disableFullscreen'
  | 'disableSeek'
  | 'duration'
  | 'fullScreenOnLongPress'
  | 'hideControlsOnStart'
  | 'muted'
  | 'onEnd'
  | 'onHideControls'
  | 'onLoad'
  | 'onMutePress'
  | 'onError'
  | 'onPlayPress'
  | 'onPlaybackStateChanged'
  | 'onProgress'
  | 'onShowControls'
  | 'pauseOnPress'
  | 'paused'
  | 'repeat'
  | 'resizeMode'
  | 'showDuration'
  | 'source'
  | 'style'
> & {
  sizeStyle: StyleProp<ViewStyle>;
  onToggleFullScreen: () => void;
  handleCTAFunc?: () => void;
  handleNEXT?: () => void;
  handleSUBTITLE?: () => void;
  type?: string;
  ctaType?: 'vote' | 'donate';
  isTime: boolean;
  isFullscreen: boolean;
  thumbnail: ImageSourcePropType | undefined;
  handleGoBackFunc?: () => void;
  contentData: IContentData;
  isSaveProgress?: boolean;
  castSourceUrl?: string;
  enableMainContentAds?: boolean;
  minimalUi?: boolean;
  showQualityControl?: boolean;
  // videoRef: React.RefObject<VideoRef | null>
};

export const RenderVideo = forwardRef<VideoInternalRef, RenderVideoProps>(
  (props, ref) => {
    const analyticsSessionRef = useRef(analyticsId('play'));
    const analyticsStartedRef = useRef(false);
    const lastAnalyticsPositionRef = useRef(0);
    const viewReportedRef = useRef(false);
    const playbackRequestedAtRef = useRef(Date.now());
    const playbackReadyReportedRef = useRef(false);
    const bufferStartedAtRef = useRef<number | null>(null);
    const analyticsContentType: AnalyticsContentType =
      props.type === 'live' ? 'live' : props.type === 'series' ? 'episode' : 'vod';
  const {
    autoplay = false,
    controlsTimeout = 5000,
    hideControlsOnStart = false,
    disableControlsAutoHide,
    source,
    resizeMode = 'contain',
    muted,
    paused,
    repeat,
    style,
    sizeStyle,
    onToggleFullScreen,
    isFullscreen,
    isSaveProgress,
    ...rest
  } = props;

  /* ---------------- STATE ---------------- */
  const [subtitle, setSubtitle] = useState<ISubtitle[]>([])
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(-1);
  const [activeCueText, setActiveCueText] = useState('');
  const selectedSubtitleIndexRef = useRef(-1);
  const subtitleRef = useRef<ISubtitle[]>([]);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(!!muted);
  const [progress, setProgress] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(
    !hideControlsOnStart
  );
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReadyForDisplay, setIsReadyForDisplay] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const session = useCastSession();
  const remoteClient = useRemoteMediaClient();
  const isCasting = !!session && !!remoteClient;
  const videoQuality = useAppSelector(selectUser).settings_info?.video_quality;
  const liveNow = isLiveNowPlayback(props.type, props.isTime);
  const playbackMode = liveNow ? 'live' : 'vod';
  const maxBitRate = maxBitRateForQuality(videoQuality);
  const showLoadingOverlay =
    !isAdPlaying && (!isReadyForDisplay || isBuffering);

  const posterUri = (() => {
    const thumb = props.thumbnail;
    if (!thumb || typeof thumb === 'number') {
      return undefined;
    }
    if (Array.isArray(thumb)) {
      return (thumb[0] as ImageURISource | undefined)?.uri;
    }
    return (thumb as ImageURISource).uri;
  })();

  /* ---------------- REFS ---------------- */
  const videoRef = useRef<VideoRef>(null);
  const controlsRef = useRef<ProgressRef>(null);
  const progressRef = useRef(0);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastCastUrlRef = useRef('');
  /** Content-only duration — never overwritten by IMA ad load/progress. */
  const contentDurationRef = useRef(0);
  const isAdPlayingRef = useRef(false);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubtitlePickerOpenRef = useRef(false);
  const subtitleLoadGenerationRef = useRef(0);
  const isBrightnessSlidingRef = useRef(false);

  /* ---------------- HELPERS ---------------- */
  const clearControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  };

 const scheduleAutoHide = useCallback(() => {
  clearControlsTimeout();

  if (
    disableControlsAutoHide ||
    !isPlaying ||
    !isControlsVisible ||
    isSubtitlePickerOpenRef.current ||
    isBrightnessSlidingRef.current
  ) {
    return;
  }

  controlsTimeoutRef.current = setTimeout(() => {
    if (
      isSubtitlePickerOpenRef.current ||
      isBrightnessSlidingRef.current
    ) {
      return;
    }
    setIsControlsVisible(false);
  }, controlsTimeout);
}, [
  controlsTimeout,
  disableControlsAutoHide,
  isPlaying,
  isControlsVisible,
]);

  const showControls = () => {
    clearControlsTimeout();
    setIsControlsVisible(true);
  };

  const hideControls = () => {
    if (
      disableControlsAutoHide ||
      isSubtitlePickerOpenRef.current ||
      isBrightnessSlidingRef.current
    ) {
      return;
    }
    clearControlsTimeout();
    setIsControlsVisible(false);
  };

  const handleSubtitlePickerOpenChange = useCallback(
    (open: boolean) => {
      isSubtitlePickerOpenRef.current = open;
      if (open) {
        clearControlsTimeout();
        setIsControlsVisible(true);
        return;
      }
      scheduleAutoHide();
    },
    [scheduleAutoHide],
  );

  const handleBrightnessGestureStart = useCallback(() => {
    isBrightnessSlidingRef.current = true;
    clearControlsTimeout();
    setIsControlsVisible(true);
  }, []);

  const handleBrightnessGestureEnd = useCallback(() => {
    isBrightnessSlidingRef.current = false;
    scheduleAutoHide();
  }, [scheduleAutoHide]);

 
  /* ---------------- VIDEO EVENTS ---------------- */
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);

    if (progressRef.current >= 1) {
      videoRef.current?.seek(0);
    }

    showControls();
  }, []);

  const handleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    showControls();
  }, []);

  const handleSeek = useCallback((seconds: number) => {
    videoRef.current?.seek(seconds);
    showControls();
  }, []);

    const lastWatchedRef = useRef(0);

  const saveProgress = useCallback(
    throttle(async (time: number) => {
      try {
        const data:IRegisteredContinueWatching = {duration:time,totalDuration:duration,parentId:props.contentData._id,parentType: props.type === 'series' ? 'episode' :'vod'}
        const res = await registerContinueWatching(data);
        console.log(res.data, data)
      } catch (err) {
        console.error("Failed to save progress", err);
      }
    }, 15000), // send at most once every 15s
    [duration]
  );

  const reportUniqueView = useCallback(async () => {
    if (
      viewReportedRef.current ||
      !isSaveProgress ||
      disableControlsAutoHide ||
      analyticsContentType === 'live'
    ) {
      return;
    }

    viewReportedRef.current = true;
    const response = await updateViewsCount({
      content: props.contentData._id,
      contentType: analyticsContentType,
    });
    if (!response.ok) {
      // Permit one retry during this player session after a network failure.
      viewReportedRef.current = false;
    }
  }, [
    analyticsContentType,
    disableControlsAutoHide,
    isSaveProgress,
    props.contentData._id,
  ]);

  useEffect(() => {
    viewReportedRef.current = false;
  }, [analyticsContentType, props.contentData._id]);

  const reportAnalyticsProgress = useCallback(
    throttle((positionSeconds: number, durationSeconds: number) => {
      const positionDelta = positionSeconds - lastAnalyticsPositionRef.current;
      const watchedSeconds = positionDelta > 0 && positionDelta <= 30 ? positionDelta : 0;
      lastAnalyticsPositionRef.current = positionSeconds;
      queueAnalyticsEvent({
        sessionId: analyticsSessionRef.current,
        contentId: props.contentData._id,
        contentType: analyticsContentType,
        eventType: 'progress',
        positionSeconds,
        durationSeconds,
        watchedSeconds,
        completionPercent: durationSeconds > 0
          ? Math.min((positionSeconds / durationSeconds) * 100, 100)
          : 0,
      });
    }, 15000, {leading: false, trailing: true}),
    [analyticsContentType, props.contentData._id],
  );

    async function removeSaveWatch(){
      saveProgress.flush?.();
    }

  const hasPrerollAds = shouldAttachGoogleAd(
    props.contentData.vidClass,
    props.enableMainContentAds === true,
  );

  /**
   * Content duration is sticky: never shrink it to an ad-length value, and never
   * write while IMA owns the timeline. Ads often fire onLoad before STARTED.
   */
  const applyContentDuration = useCallback((nextDuration: number) => {
    if (!(nextDuration > 0) || !Number.isFinite(nextDuration)) {
      return;
    }
    if (isAdPlayingRef.current) {
      return;
    }
    const existing = contentDurationRef.current;
    // Reject shorter replacements once we know a longer content length (ad bleed).
    if (existing > 0 && nextDuration + 0.5 < existing && nextDuration < 120) {
      return;
    }
    contentDurationRef.current = nextDuration;
    durationRef.current = nextDuration;
    setDuration(nextDuration);
  }, []);

  const applyActiveCue = useCallback((time: number) => {
    const idx = selectedSubtitleIndexRef.current;
    if (idx < 0) {
      setActiveCueText(prev => (prev ? '' : prev));
      return;
    }
    const track = subtitleRef.current[idx];
    const cues = track?.cues;
    if (!cues?.length) {
      setActiveCueText(prev => (prev ? '' : prev));
      return;
    }

    const next = cueTextAtTime(cues, time);
    setActiveCueText(prev => (prev === next ? prev : next));
  }, []);

  const handleSelectSubtitle = useCallback((index: number) => {
    selectedSubtitleIndexRef.current = index;
    setSelectedSubtitleIndex(index);
    if (index < 0) {
      setActiveCueText('');
      return;
    }
    const track = subtitleRef.current[index];
    const time = currentTimeRef.current;
    const atTime = cueTextAtTime(track?.cues, time);
    if (atTime) {
      setActiveCueText(atTime);
      return;
    }
    // Do not display a previous/upcoming caption outside its actual cue window.
    setActiveCueText('');
  }, []);
  const restoreContentDuration = useCallback(() => {
    const contentDur = contentDurationRef.current;
    if (!(contentDur > 0)) {
      return;
    }
    durationRef.current = contentDur;
    setDuration(contentDur);
    const t = currentTimeRef.current;
    const next = Math.min(Math.max(t / contentDur, 0), 1);
    if (Number.isFinite(next)) {
      progressRef.current = next;
      setProgress(next);
      controlsRef.current?.onProgress(next);
    }
  }, []);

  const handleProgress = useCallback(
    (e: OnProgressData) => {
      // Ads report their own timeline — never drive the content scrubber/duration from them.
      if (isAdPlayingRef.current) {
        return;
      }

      currentTimeRef.current = e.currentTime;
      // Captions must update even before content duration is known.
      applyActiveCue(e.currentTime);

      const seekable = (e as {seekableDuration?: number}).seekableDuration;
      if (
        Number.isFinite(seekable) &&
        (seekable as number) > 0 &&
        // Prefer seekable once content is playing; still guarded against ad lengths.
        (!hasPrerollAds ||
          contentDurationRef.current <= 0 ||
          (seekable as number) >= contentDurationRef.current * 0.9)
      ) {
        applyContentDuration(seekable as number);
      }

      const knownDuration = contentDurationRef.current;
      if (!(knownDuration > 0)) {
        return;
      }

      const next = Math.min(Math.max(e.currentTime / knownDuration, 0), 1);
      if (!Number.isFinite(next)) {
        return;
      }

      progressRef.current = next;
      setProgress(next);
      controlsRef.current?.onProgress(next);
      reportAnalyticsProgress(e.currentTime, knownDuration);

      if (props.type !== 'live') {
        const isFree = props.contentData.vidClass === 'free';
        if (isSaveProgress && !disableControlsAutoHide && isReadyForDisplay) {
          lastWatchedRef.current = e.currentTime;
          saveProgress(e.currentTime);
        }
        if (isFree && next >= 0.6) {
          reportUniqueView().catch(() => {});
        } else if (!isFree && next >= 0.3) {
          reportUniqueView().catch(() => {});
        }
      }
    },
    [
      applyActiveCue,
      applyContentDuration,
      hasPrerollAds,
      isReadyForDisplay,
      disableControlsAutoHide,
      isSaveProgress,
      props.type,
      props.contentData.vidClass,
      reportUniqueView,
      reportAnalyticsProgress,
    ],
  );

  async function fetchAndConvertSubtitles(
    src: string,
    bucket?: string,
    key?: string,
  ): Promise<string> {
    const url = normalizeSubtitleUrl(src, bucket, key);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Subtitle fetch failed (${res.status}) for ${url}`);
    }
    const text = await res.text();
    if (!text?.trim()) {
      throw new Error(`Empty subtitle body for ${url}`);
    }
    // HTML error pages / JSON responses are not captions.
    const trimmed = text.trimStart();
    if (
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('{')
    ) {
      throw new Error(`Subtitle URL did not return caption text: ${url}`);
    }
    return ensureWebVtt(text);
  }

  async function saveVttFile(vtt: string, fileName = 'subtitles.vtt') {
    const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
    await RNFS.writeFile(path, vtt, 'utf8');
    return `file://${path}`;
  }

  function toLangCode(language: string): ISO639_1 {
    const raw = (language || 'en').trim().toLowerCase();
    const two = raw.slice(0, 2);
    const known: ISO639_1[] = [
      'en',
      'fr',
      'es',
      'de',
      'pt',
      'ar',
      'ha',
      'ig',
      'yo',
      'zh',
      'hi',
      'it',
      'nl',
      'ru',
      'ja',
      'ko',
    ];
    if (known.includes(two as ISO639_1)) {
      return two as ISO639_1;
    }
    if (raw.includes('english')) return 'en';
    if (raw.includes('french')) return 'fr';
    if (raw.includes('spanish')) return 'es';
    if (raw.includes('arabic')) return 'ar';
    if (raw.includes('hausa')) return 'ha';
    if (raw.includes('igbo')) return 'ig';
    if (raw.includes('yoruba')) return 'yo';
    return 'en';
  }

  function buildDevTestTrack(): ISubtitle {
    return {
      language: 'en',
      title: 'English (Test)',
      uri: '',
      type: TextTrackType.VTT,
      cues: buildSampleEnglishCues(),
    };
  }

  async function handleSubtitles(loadGeneration: number) {
    // English (Test) is Metro/dev only — never shipped in release/prod bundles.
    const includeDevTest = typeof __DEV__ !== 'undefined' && __DEV__;
    let data: ISubtitle[] = includeDevTest ? [buildDevTestTrack()] : [];
    subtitleRef.current = data;
    setSubtitle(data);
    selectedSubtitleIndexRef.current = -1;
    setSelectedSubtitleIndex(-1);
    setActiveCueText('');

    if (props.type === 'live') {
      return;
    }

    const parentId = props.contentData._id;

    try {
      if (parentId) {
        const res = await getSubtitles({
          parentId,
          parentType: props.type === 'series' ? 'episode' : 'vod',
        });
        if (res.ok && res.data?.data?.length) {
          const apiTracks = (
            await Promise.all(
              res.data.data.map(async (x, index) => {
                try {
                  const vtt = await fetchAndConvertSubtitles(
                    x.src,
                    x.bucket,
                    x.key,
                  );
                  const cues = parseVttCues(vtt);
                  if (!cues.length) {
                    console.warn(
                      '[subtitles] parsed 0 cues',
                      x.language,
                      x.src,
                    );
                    return null;
                  }
                  const safeName = (x.language || `track-${index}`)
                    .replace(/[^a-z0-9_-]/gi, '_')
                    .toLowerCase();
                  // The JS cue overlay only needs parsed cues. Persisting a
                  // local VTT copy is an optimisation for the native track,
                  // so a device cache/RNFS failure must not remove the track
                  // from the subtitle picker.
                  let vttUri = normalizeSubtitleUrl(x.src, x.bucket, x.key);
                  try {
                    vttUri = await saveVttFile(
                      vtt,
                      `${parentId}-${safeName}.vtt`,
                    );
                  } catch (cacheError) {
                    console.warn(
                      '[subtitles] local cache unavailable; using remote VTT',
                      x.language,
                      cacheError,
                    );
                  }

                  return {
                    language: toLangCode(x.language),
                    title: x.language || `Track ${index + 1}`,
                    uri: vttUri,
                    type: TextTrackType.VTT,
                    cues,
                  };
                } catch (err) {
                  console.warn(
                    '[subtitles] failed to load track',
                    x.language,
                    x.src,
                    err,
                  );
                  return null;
                }
              }),
            )
          ).filter(Boolean) as ISubtitle[];

          data = includeDevTest
            ? [...apiTracks, buildDevTestTrack()]
            : apiTracks;
        }
      }
    } catch (err) {
      console.warn('[subtitles] fetch failed', err);
    }

    if (subtitleLoadGenerationRef.current !== loadGeneration) {
      return;
    }
    subtitleRef.current = data;
    setSubtitle(data);
  }

  const handleBuffer = useCallback((e: { isBuffering: boolean }) => {
    setIsBuffering(e.isBuffering);
    if (isAdPlayingRef.current) return;
    if (e.isBuffering && bufferStartedAtRef.current == null) {
      bufferStartedAtRef.current = Date.now();
      return;
    }
    if (!e.isBuffering && bufferStartedAtRef.current != null) {
      const bufferingSeconds = (Date.now() - bufferStartedAtRef.current) / 1000;
      bufferStartedAtRef.current = null;
      if (bufferingSeconds >= 0.25) {
        queueAnalyticsEvent({
          sessionId: analyticsSessionRef.current,
          contentId: props.contentData._id,
          contentType: analyticsContentType,
          eventType: 'buffer',
          positionSeconds: currentTimeRef.current,
          bufferingSeconds,
          quality: videoQuality ?? 'automatic',
        });
      }
    }
  }, [analyticsContentType, props.contentData._id, videoQuality]);

  const handleReadyForDisplay = useCallback(() => {
    setIsReadyForDisplay(true);
    setIsBuffering(false);
    if (!isAdPlayingRef.current && !playbackReadyReportedRef.current) {
      playbackReadyReportedRef.current = true;
      queueAnalyticsEvent({
        sessionId: analyticsSessionRef.current,
        contentId: props.contentData._id,
        contentType: analyticsContentType,
        eventType: 'playback_ready',
        startupMs: Date.now() - playbackRequestedAtRef.current,
        quality: videoQuality ?? 'automatic',
      });
    }
  }, [analyticsContentType, props.contentData._id, videoQuality]);

  const handleAdEvent = useCallback(
    (e: OnReceiveAdEventData) => {
      switch (e.event) {
        case AdEvent.LOADED:
        case AdEvent.STARTED:
        case AdEvent.AD_BREAK_STARTED:
        case AdEvent.CONTENT_PAUSE_REQUESTED:
        case AdEvent.AD_PERIOD_STARTED:
          isAdPlayingRef.current = true;
          setIsAdPlaying(true);
          setActiveCueText('');
          // If only a short (ad-length) duration was captured before LOADED/STARTED,
          // discard it so we don't restore ad length after the break.
          if (
            contentDurationRef.current > 0 &&
            contentDurationRef.current < 90
          ) {
            contentDurationRef.current = 0;
            durationRef.current = 0;
            setDuration(0);
            progressRef.current = 0;
            setProgress(0);
          } else if (contentDurationRef.current > 0) {
            durationRef.current = contentDurationRef.current;
            setDuration(contentDurationRef.current);
          }
          clearControlsTimeout();
          setIsControlsVisible(false);
          break;
        case AdEvent.COMPLETED:
        case AdEvent.ALL_ADS_COMPLETED:
        case AdEvent.AD_BREAK_ENDED:
        case AdEvent.CONTENT_RESUME_REQUESTED:
        case AdEvent.AD_PERIOD_ENDED:
        case AdEvent.SKIPPED:
        case AdEvent.ERROR:
          isAdPlayingRef.current = false;
          setIsAdPlaying(false);
          restoreContentDuration();
          showControls();
          break;
        default:
          break;
      }
    },
    [restoreContentDuration],
  );

  const handleLoad = useCallback(
    (e: OnLoadData) => {
      // IMA fires load for ads too — ignore while an ad break owns the player.
      if (isAdPlayingRef.current) {
        return;
      }

      const loadedDuration =
        Number.isFinite(e.duration) && e.duration > 0 ? e.duration : 0;
      if (loadedDuration > 0) {
        applyContentDuration(loadedDuration);

        if (!analyticsStartedRef.current) {
          analyticsStartedRef.current = true;
          lastAnalyticsPositionRef.current = props.contentData.seekTo || 0;
          queueAnalyticsEvent({
            sessionId: analyticsSessionRef.current,
            contentId: props.contentData._id,
            contentType: analyticsContentType,
            eventType: 'play_start',
            positionSeconds: props.contentData.seekTo || 0,
            durationSeconds: loadedDuration,
          });
        }

        const known = contentDurationRef.current;
        if (!(known > 0)) {
          return;
        }

        const time =
          currentTimeRef.current > 0
            ? currentTimeRef.current
            : props.contentData.seekTo || 0;
        const next = Math.min(Math.max(time / known, 0), 1);
        if (Number.isFinite(next)) {
          progressRef.current = next;
          setProgress(next);
          controlsRef.current?.onProgress(next);
        }
      }

      const resumeAt =
        currentTimeRef.current > 1
          ? currentTimeRef.current
          : props.contentData.seekTo || 0;
      if (resumeAt > 0) {
        handleSeek(resumeAt);
      }
    },
    [
      analyticsContentType,
      applyContentDuration,
      handleSeek,
      props.contentData._id,
      props.contentData.seekTo,
    ],
  );

  const handleEnd = useCallback(() => {
    // IMA can emit a native end callback while handing the timeline back to
    // the main video. Empty/failed sources can also report end before load.
    // Neither event means the actual content has completed.
    if (
      !shouldTreatPlaybackEndAsContentEnd(
        isAdPlayingRef.current,
        contentDurationRef.current,
      )
    ) {
      return;
    }

    reportAnalyticsProgress.flush?.();
    queueAnalyticsEvent({
      sessionId: analyticsSessionRef.current,
      contentId: props.contentData._id,
      contentType: analyticsContentType,
      eventType: 'complete',
      positionSeconds: durationRef.current,
      durationSeconds: durationRef.current,
      watchedSeconds: 0,
      completionPercent: 100,
    });
    void flushAnalyticsEvents();
    controlsRef.current?.onProgress(1);
if(isSaveProgress) {
          saveProgress(duration);
          removeSaveWatch()
        }
    if (repeat) {
      videoRef.current?.seek(0);
    }
    setIsPlaying(repeat ?? false);
    showControls();
    rest.onEnd?.();
  }, [analyticsContentType, props.contentData._id, repeat, reportAnalyticsProgress]);

  const handlePlaybackError = useCallback(
    (error: Parameters<NonNullable<VideoPlayerProps['onError']>>[0]) => {
      setIsBuffering(false);
      console.error('[VideoPlayer] playback failed', {
        contentId: props.contentData._id,
        source: typeof source?.uri === 'string' ? source.uri : '',
        error,
      });
      const errorValue = error as unknown as {
        error?: {errorCode?: string | number; errorString?: string};
      };
      queueAnalyticsEvent({
        sessionId: analyticsSessionRef.current,
        contentId: props.contentData._id,
        contentType: analyticsContentType,
        eventType: 'playback_error',
        positionSeconds: currentTimeRef.current,
        quality: videoQuality ?? 'automatic',
        errorCode: String(
          errorValue.error?.errorCode ?? errorValue.error?.errorString ?? 'unknown',
        ).slice(0, 80),
      });
      void flushAnalyticsEvents();
      props.onError?.(error);
    },
    [analyticsContentType, props, source?.uri, videoQuality],
  );

  useEffect(() => () => {
    reportAnalyticsProgress.flush?.();
    void flushAnalyticsEvents();
  }, [reportAnalyticsProgress]);

  /* ---------------- IMPERATIVE ---------------- */
  // If you want, you can still use useImperativeHandle inside parent
  useImperativeHandle(ref, () => ({
    ...(videoRef.current as VideoRef),
    onStart: () => {
      setIsPlaying(true);
      showControls();
    },
  }));

  const castSourceUrl =
    props.castSourceUrl ||
    (typeof source?.uri === 'string' ? source.uri : '');

  useEffect(() => {
    if (!isCasting || !remoteClient || !castSourceUrl) {
      if (!isCasting) {
        lastCastUrlRef.current = '';
      }
      return;
    }

    if (lastCastUrlRef.current === castSourceUrl) {
      return;
    }

    setIsPlaying(false);
    videoRef.current?.pause();

    const mediaInfo: MediaInfo = {
      contentUrl: castSourceUrl,
      contentType: castSourceUrl.toLowerCase().includes('.m3u8')
        ? 'application/x-mpegURL'
        : 'video/mp4',
      metadata: {
        type: 'generic',
        title: props.contentData.title,
        subtitle: props.contentData.desc,
        images: posterUri ? [{url: posterUri}] : [],
      },
    };

    lastCastUrlRef.current = castSourceUrl;
    void remoteClient
      .loadMedia({
        mediaInfo,
        autoplay: true,
        startTime: currentTimeRef.current,
      })
      .then(() =>
        queueAnalyticsEvent({
          eventType: 'cast_start',
          contentId: props.contentData._id,
          contentType: analyticsContentType,
          positionSeconds: currentTimeRef.current,
        }),
      )
      .catch(error => {
        lastCastUrlRef.current = '';
        queueAnalyticsEvent({
          eventType: 'cast_error',
          contentId: props.contentData._id,
          contentType: analyticsContentType,
          errorCode: String(error instanceof Error ? error.message : error).slice(0, 80),
        });
        console.error(
          `[${new Date().toLocaleTimeString()}] Failed to load media on Cast device:`,
          error,
        );
      });
  }, [
    castSourceUrl,
    analyticsContentType,
    isCasting,
    posterUri,
    props.contentData.desc,
    props.contentData._id,
    props.contentData.title,
    remoteClient,
  ]);

  useEffect(() => {
  scheduleAutoHide();

  return clearControlsTimeout;
}, [scheduleAutoHide]);

useEffect(() =>{
  const loadGeneration = ++subtitleLoadGenerationRef.current;
  void handleSubtitles(loadGeneration);
  return () => {
    if (subtitleLoadGenerationRef.current === loadGeneration) {
      subtitleLoadGenerationRef.current += 1;
    }
  };
}, [props.contentData._id, props.type]);

  useEffect(() => {
    analyticsSessionRef.current = analyticsId('play');
    analyticsStartedRef.current = false;
    playbackRequestedAtRef.current = Date.now();
    playbackReadyReportedRef.current = false;
    bufferStartedAtRef.current = null;
    setIsReadyForDisplay(false);
    setIsBuffering(true);
    durationRef.current = 0;
    contentDurationRef.current = 0;
    progressRef.current = 0;
    currentTimeRef.current = 0;
    isAdPlayingRef.current = false;
    setIsAdPlaying(false);
    setDuration(0);
    setProgress(0);
    selectedSubtitleIndexRef.current = -1;
    setSelectedSubtitleIndex(-1);
    setActiveCueText('');
  }, [typeof source?.uri === 'string' ? source.uri : source?.uri]);

  /* ---------------- RENDER ---------------- */
  return (
    <View style={{flex: 1}}>
      <Video
        ref={videoRef}
        source={{
          ...source,
          ...(liveNow && !(source as {type?: string})?.type
            ? {type: 'm3u8'}
            : null),
          shouldCache: liveNow ? false : source?.shouldCache,
          bufferConfig:
            source?.bufferConfig ?? getBufferConfigForMode(playbackMode),
          minLoadRetryCount: source?.minLoadRetryCount ?? 5,
          textTracks:
            subtitle.length > 0
              ? subtitle
                  .filter(t => !!t.uri)
                  .map(({title, language, type, uri}) => ({
                    title,
                    language,
                    type,
                    uri,
                  }))
              : undefined,
          ad: {
            adTagUrl: hasPrerollAds ? SINGLE_AD_TAG : undefined,
          },
        }}
        style={[styles.video, sizeStyle, style]}
        paused={paused || !isPlaying}
        muted={isMuted}
        resizeMode={resizeMode}
        // SurfaceView draws above RN views on Android and hides caption overlays.
        useTextureView
        viewType={ViewType.TEXTURE}
        poster={
          posterUri
            ? {source: {uri: posterUri}, resizeMode: 'cover'}
            : undefined
        }
        preferredForwardBufferDuration={getPreferredForwardBufferDuration(
          playbackMode,
        )}
        maxBitRate={maxBitRate}
        progressUpdateInterval={250}
        preventsDisplaySleepDuringVideoPlayback
        reportBandwidth
        hideShutterView
        shutterColor="transparent"
        ignoreSilentSwitch="ignore"
        playInBackground={false}
        playWhenInactive={false}
        // Native sideloaded tracks are unreliable on current Android builds —
        // captions are rendered via the JS cue overlay below.
        selectedTextTrack={{type: SelectedTrackType.DISABLED}}
        subtitleStyle={{
          fontSize: 18,
          paddingBottom: isFullscreen ? 48 : 24,
          opacity: 1,
        }}
        onProgress={handleProgress}
        onLoad={handleLoad}
        onEnd={handleEnd}
        onBuffer={handleBuffer}
        onError={handlePlaybackError}
        onReadyForDisplay={handleReadyForDisplay}
        onReceiveAdEvent={handleAdEvent}
      />

      {showLoadingOverlay && (
        <View style={styles.loader} pointerEvents="none">
          <LottieView
            source={require('@/assets/icons/RPlay.json')}
            style={{
              width: isFullscreen ? 180 : 120,
              height: isFullscreen ? 180 : 120,
            }}
            autoPlay
            loop
          />
        </View>
      )}

      {!isAdPlaying && (
        <View style={styles.chromeLayer} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={isControlsVisible ? hideControls : showControls}
          />
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Controls
              {...props}
              progress={progress}
              duration={duration}
              isPlaying={isPlaying}
              isMuted={isMuted}
              isControlsVisible={isControlsVisible}
              isFullscreeen={isFullscreen}
              isLoading={showLoadingOverlay}
              onPlayPress={handlePlayPause}
              onMutePress={handleMute}
              onSeek={handleSeek}
              onToggleFullScreen={onToggleFullScreen}
              setIsPlaying={setIsPlaying}
              showControls={showControls}
              handleGoBackFunc={rest.handleGoBackFunc}
              subtitleTracks={subtitle}
              selectedSubtitleIndex={selectedSubtitleIndex}
              onSelectSubtitle={handleSelectSubtitle}
              onSubtitlePickerOpenChange={handleSubtitlePickerOpenChange}
              onBrightnessGestureStart={handleBrightnessGestureStart}
              onBrightnessGestureEnd={handleBrightnessGestureEnd}
            />
          </View>

          {!!activeCueText && (
            <View
              pointerEvents="none"
              style={[
                styles.subtitleOverlay,
                {
                  paddingBottom: isControlsVisible
                    ? isFullscreen
                      ? 78
                      : 36
                    : isFullscreen
                      ? 14
                      : 8,
                },
              ]}>
              <Text style={styles.subtitleText}>{activeCueText}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  video: {
    backgroundColor: 'black',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  chromeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  subtitleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 40,
  },
  subtitleText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    overflow: 'hidden',
    maxWidth: '100%',
  },
});
