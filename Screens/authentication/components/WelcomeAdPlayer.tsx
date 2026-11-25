import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {ViewType, type ReactVideoProps, type VideoRef} from 'react-native-video';
import {AppImage, AppVideo} from '@/components';
import {IAdsData} from '@/types/api/content.types';
import {trackHouseAd} from '@/api/analytics.api';
import {getEligibleWelcomeAds} from '@/Utils/welcomeAds';
import {maxBitRateForQuality} from '@/components/video/playbackConfig';

interface Props {
  ads: IAdsData[];
  muted: boolean;
  paused: boolean;
  requestComplete: boolean;
}

type RemoteSlotIndex = 0 | 1;
type RemoteSlots = [IAdsData | null, IAdsData | null];
type ReadySlots = [boolean, boolean];

const bundledAuthVideo = require('@/assets/videos/AuthVideo.mp4');
const emergencyFallbackVideo = require('@/assets/videos/getStartedVideo.mp4');
const bundledAuthPoster = require('@/assets/images/AuthVideoPoster.jpg');
const REMOTE_READY_TIMEOUT_MS = 15_000;
const AUTH_AD_MAX_BIT_RATE = maxBitRateForQuality('720p');

export default function WelcomeAdPlayer({
  ads,
  muted,
  paused,
  requestComplete,
}: Props) {
  const eligibleAds = useMemo(() => getEligibleWelcomeAds(ads), [ads]);
  const eligibleKey = eligibleAds.map(ad => `${ad._id}:${ad.videoUrl}`).join('|');
  const [failedAdIds, setFailedAdIds] = useState<string[]>([]);
  const [remoteSlots, setRemoteSlotsState] = useState<RemoteSlots>([null, null]);
  const [readySlots, setReadySlotsState] = useState<ReadySlots>([false, false]);
  const [activeSlot, setActiveSlotState] = useState<RemoteSlotIndex | null>(null);
  const [introFinished, setIntroFinished] = useState(false);
  const [localReady, setLocalReady] = useState(false);
  const [useEmergencyFallback, setUseEmergencyFallback] = useState(false);

  const remoteSlotsRef = useRef<RemoteSlots>([null, null]);
  const readySlotsRef = useRef<ReadySlots>([false, false]);
  const activeSlotRef = useRef<RemoteSlotIndex | null>(null);
  const preferredSlotRef = useRef<RemoteSlotIndex | null>(0);
  const introFinishedRef = useRef(false);
  const localRef = useRef<VideoRef | null>(null);
  const remoteRefs = useRef<[VideoRef | null, VideoRef | null]>([null, null]);
  const durations = useRef<[number, number]>([0, 0]);
  const trackedEvents = useRef<Set<string>>(new Set());

  const playableAds = useMemo(
    () => eligibleAds.filter(ad => !failedAdIds.includes(ad._id)),
    [eligibleAds, failedAdIds],
  );
  const playableKey = playableAds.map(ad => `${ad._id}:${ad.videoUrl}`).join('|');

  const setActiveSlot = useCallback((slot: RemoteSlotIndex | null) => {
    activeSlotRef.current = slot;
    setActiveSlotState(slot);
    if (slot !== null) preferredSlotRef.current = null;
  }, []);

  const setReadySlots = useCallback((slots: ReadySlots) => {
    readySlotsRef.current = slots;
    setReadySlotsState(slots);
  }, []);

  const setRemoteSlots = useCallback((slots: RemoteSlots) => {
    remoteSlotsRef.current = slots;
    setRemoteSlotsState(slots);
  }, []);

  const trackOnce = useCallback(
    (
      id: string,
      eventType:
        | 'house_ad_impression'
        | 'house_ad_video_start'
        | 'house_ad_video_25'
        | 'house_ad_video_50'
        | 'house_ad_video_75'
        | 'house_ad_video_complete',
    ) => {
      const key = `${id}:${eventType}`;
      if (trackedEvents.current.has(key)) return;
      trackedEvents.current.add(key);
      trackHouseAd(eventType, id, 'WelcomeAuth');
    },
    [],
  );

  const markAdFailed = useCallback((adId: string) => {
    setFailedAdIds(ids => (ids.includes(adId) ? ids : [...ids, adId]));
  }, []);

  useEffect(() => {
    setFailedAdIds([]);
  }, [eligibleKey]);

  useEffect(() => {
    if (!requestComplete || playableAds.length === 0) {
      setRemoteSlots([null, null]);
      setReadySlots([false, false]);
      preferredSlotRef.current = null;
      setActiveSlot(null);
      return;
    }

    setRemoteSlots([
      playableAds[0],
      playableAds.length > 1 ? playableAds[1] : null,
    ]);
    setReadySlots([false, false]);
    durations.current = [0, 0];
    preferredSlotRef.current = 0;
    setActiveSlot(null);
  }, [
    playableAds,
    playableKey,
    requestComplete,
    setActiveSlot,
    setReadySlots,
    setRemoteSlots,
  ]);

  useEffect(() => {
    if (paused) return;
    const timers = remoteSlots.map((ad, index) => {
      if (!ad || readySlots[index]) return undefined;
      return setTimeout(() => markAdFailed(ad._id), REMOTE_READY_TIMEOUT_MS);
    });
    return () => timers.forEach(timer => timer && clearTimeout(timer));
  }, [markAdFailed, paused, readySlots, remoteSlots]);

  const activateReadySlot = useCallback(
    (slot: RemoteSlotIndex) => {
      if (!introFinishedRef.current || !readySlotsRef.current[slot]) return;
      if (!remoteSlotsRef.current[slot]) return;
      setActiveSlot(slot);
    },
    [setActiveSlot],
  );

  const handleRemoteReady = useCallback(
    (slot: RemoteSlotIndex) => {
      const ready: ReadySlots = [...readySlotsRef.current] as ReadySlots;
      ready[slot] = true;
      setReadySlots(ready);

      if (
        activeSlotRef.current === null &&
        (preferredSlotRef.current === null || preferredSlotRef.current === slot)
      ) {
        activateReadySlot(slot);
      }
    },
    [activateReadySlot, setReadySlots],
  );

  const handleLocalEnd = useCallback(() => {
    if (introFinishedRef.current) return;
    introFinishedRef.current = true;
    setIntroFinished(true);
    localRef.current?.seek(0);

    const preferred = preferredSlotRef.current ?? 0;
    if (readySlotsRef.current[preferred]) {
      activateReadySlot(preferred);
      return;
    }
    const alternate: RemoteSlotIndex = preferred === 0 ? 1 : 0;
    if (readySlotsRef.current[alternate]) activateReadySlot(alternate);
  }, [activateReadySlot]);

  const nextAdAfter = useCallback(
    (ad: IAdsData | null) => {
      if (playableAds.length === 0) return null;
      const currentIndex = ad
        ? playableAds.findIndex(item => item._id === ad._id)
        : -1;
      return playableAds[(currentIndex + 1) % playableAds.length];
    },
    [playableAds],
  );

  const handleRemoteEnd = useCallback(
    (slot: RemoteSlotIndex) => {
      if (activeSlotRef.current !== slot) return;
      const completedAd = remoteSlotsRef.current[slot];
      if (!completedAd) return;
      trackOnce(completedAd._id, 'house_ad_video_complete');

      if (playableAds.length === 1) {
        remoteRefs.current[slot]?.seek(0);
        return;
      }

      const nextSlot: RemoteSlotIndex = slot === 0 ? 1 : 0;
      const nextAd = remoteSlotsRef.current[nextSlot];
      preferredSlotRef.current = nextSlot;

      if (nextAd && readySlotsRef.current[nextSlot]) {
        setActiveSlot(nextSlot);
      } else {
        // Reveal the already-playing bundled video immediately. The preferred
        // remote slot continues preparing without a poster or black frame.
        setActiveSlot(null);
      }

      const slots: RemoteSlots = [...remoteSlotsRef.current] as RemoteSlots;
      const ready: ReadySlots = [...readySlotsRef.current] as ReadySlots;
      slots[slot] = nextAdAfter(nextAd ?? completedAd);
      ready[slot] = false;
      durations.current[slot] = 0;
      setRemoteSlots(slots);
      setReadySlots(ready);
    },
    [nextAdAfter, playableAds.length, setActiveSlot, setReadySlots, setRemoteSlots, trackOnce],
  );

  const handleRemoteError = useCallback(
    (slot: RemoteSlotIndex) => {
      const ad = remoteSlotsRef.current[slot];
      if (ad) markAdFailed(ad._id);
    },
    [markAdFailed],
  );

  const handleRemoteProgress = useCallback(
    (slot: RemoteSlotIndex, currentTime: number) => {
      if (activeSlotRef.current !== slot || currentTime <= 0) return;
      const ad = remoteSlotsRef.current[slot];
      if (!ad) return;
      trackOnce(ad._id, 'house_ad_impression');
      trackOnce(ad._id, 'house_ad_video_start');
      const duration = durations.current[slot];
      if (!duration) return;
      const percent = (currentTime / duration) * 100;
      if (percent >= 25) trackOnce(ad._id, 'house_ad_video_25');
      if (percent >= 50) trackOnce(ad._id, 'house_ad_video_50');
      if (percent >= 75) trackOnce(ad._id, 'house_ad_video_75');
    },
    [trackOnce],
  );

  const localSource: ReactVideoProps['source'] = useEmergencyFallback
    ? emergencyFallbackVideo
    : bundledAuthVideo;

  return (
    <View style={styles.container}>
      <AppVideo
        key={useEmergencyFallback ? 'welcome-emergency' : 'welcome-local'}
        videoRef={localRef}
        source={localSource}
        containerStyle={styles.localLayer}
        style={styles.video}
        resizeMode="cover"
        muted={muted || activeSlot !== null}
        paused={paused}
        controls={false}
        viewType={ViewType.TEXTURE}
        repeat={introFinished}
        hideShutterView
        shutterColor="transparent"
        onReadyForDisplay={() => setLocalReady(true)}
        onEnd={handleLocalEnd}
        onError={() => {
          if (!useEmergencyFallback) {
            setUseEmergencyFallback(true);
            setLocalReady(false);
          }
        }}
      />

      {remoteSlots.map((ad, index) => {
        if (!ad) return null;
        const slot = index as RemoteSlotIndex;
        const isActive = activeSlot === slot;
        return (
          <AppVideo
            key={`${slot}:${ad._id}:${ad.videoUrl}`}
            videoRef={ref => {
              remoteRefs.current[slot] = ref;
            }}
            source={{uri: ad.videoUrl}}
            containerStyle={isActive ? styles.remoteVisible : styles.remoteHidden}
            style={styles.video}
            resizeMode="cover"
            maxBitRate={AUTH_AD_MAX_BIT_RATE}
            muted={muted || !isActive}
            paused={paused || !isActive}
            controls={false}
            viewType={ViewType.TEXTURE}
            repeat={false}
            hideShutterView
            shutterColor="transparent"
            onLoadStart={() => {
              const ready: ReadySlots = [...readySlotsRef.current] as ReadySlots;
              ready[slot] = false;
              setReadySlots(ready);
            }}
            onReadyForDisplay={() => handleRemoteReady(slot)}
            onLoad={data => {
              durations.current[slot] = data.duration;
            }}
            onProgress={data => handleRemoteProgress(slot, data.currentTime)}
            onEnd={() => handleRemoteEnd(slot)}
            onError={() => handleRemoteError(slot)}
          />
        );
      })}

      {!localReady ? (
        <View pointerEvents="none" style={styles.initialPosterLayer}>
          <AppImage
            source={bundledAuthPoster}
            resizeMode="cover"
            style={styles.video}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
  },
  localLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    zIndex: 0,
  },
  remoteVisible: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    opacity: 1,
    zIndex: 2,
  },
  remoteHidden: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: 1,
  },
  initialPosterLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    zIndex: 3,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
