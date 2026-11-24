import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {ViewType, type ReactVideoProps, type VideoRef} from 'react-native-video';
import {AppImage, AppVideo} from '@/components';
import {IAdsData} from '@/types/api/content.types';
import {trackHouseAd} from '@/api/analytics.api';
import {
  getEligibleWelcomeAds,
  getNextWelcomeAdIndex,
} from '@/Utils/welcomeAds';

interface Props {
  ads: IAdsData[];
  muted: boolean;
  paused: boolean;
  requestComplete: boolean;
}

const bundledAuthVideo = require('@/assets/videos/AuthVideo.mp4');
const emergencyFallbackVideo = require('@/assets/videos/getStartedVideo.mp4');
const bundledAuthPoster = require('@/assets/images/AuthVideoPoster.jpg');
const REMOTE_READY_TIMEOUT_MS = 15_000;

export default function WelcomeAdPlayer({
  ads,
  muted,
  paused,
  requestComplete,
}: Props) {
  const eligibleAds = useMemo(() => getEligibleWelcomeAds(ads), [ads]);
  const eligibleKey = eligibleAds.map(ad => `${ad._id}:${ad.videoUrl}`).join('|');
  const [failedAdIds, setFailedAdIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'local' | 'remote'>('local');
  const [remoteIndex, setRemoteIndex] = useState(0);
  const [useEmergencyFallback, setUseEmergencyFallback] = useState(false);
  const [ready, setReady] = useState(false);
  const playerRef = useRef<VideoRef | null>(null);
  const duration = useRef(0);
  const trackedEvents = useRef<Set<string>>(new Set());

  const playableAds = useMemo(
    () => eligibleAds.filter(ad => !failedAdIds.includes(ad._id)),
    [eligibleAds, failedAdIds],
  );
  const activeRemoteAd =
    mode === 'remote' && playableAds.length > 0
      ? playableAds[remoteIndex % playableAds.length]
      : undefined;
  const activeId = activeRemoteAd?._id ??
    (useEmergencyFallback ? 'welcome-emergency' : 'welcome-local');
  const source = useMemo<ReactVideoProps['source']>(
    () =>
      activeRemoteAd
        ? {uri: activeRemoteAd.videoUrl}
        : useEmergencyFallback
          ? emergencyFallbackVideo
          : bundledAuthVideo,
    [activeRemoteAd, useEmergencyFallback],
  );

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

  const returnToLocal = useCallback((failedAdId?: string) => {
    if (failedAdId) {
      setFailedAdIds(ids =>
        ids.includes(failedAdId) ? ids : [...ids, failedAdId],
      );
    }
    setMode('local');
    setRemoteIndex(0);
    setReady(false);
  }, []);

  useEffect(() => {
    setFailedAdIds([]);
    setRemoteIndex(0);
  }, [eligibleKey]);

  useEffect(() => {
    if (mode === 'remote' && !activeRemoteAd) returnToLocal();
  }, [activeRemoteAd, mode, returnToLocal]);

  useEffect(() => {
    setReady(false);
    duration.current = 0;
  }, [activeId]);

  useEffect(() => {
    if (mode !== 'remote' || ready || paused || !activeRemoteAd) return;
    const timeout = setTimeout(
      () => returnToLocal(activeRemoteAd._id),
      REMOTE_READY_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [activeRemoteAd, mode, paused, ready, returnToLocal]);

  const handleEnd = () => {
    if (!activeRemoteAd) {
      if (requestComplete && playableAds.length > 0) {
        setRemoteIndex(0);
        setMode('remote');
        return;
      }
      playerRef.current?.seek(0);
      return;
    }

    trackOnce(activeRemoteAd._id, 'house_ad_video_complete');
    if (playableAds.length > 1) {
      setRemoteIndex(current =>
        getNextWelcomeAdIndex(current, playableAds.length),
      );
      return;
    }
    playerRef.current?.seek(0);
  };

  const handleError = () => {
    if (activeRemoteAd) {
      returnToLocal(activeRemoteAd._id);
      return;
    }
    if (!useEmergencyFallback) {
      setUseEmergencyFallback(true);
      setReady(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppVideo
        key={activeId}
        videoRef={playerRef}
        source={source}
        containerStyle={styles.videoLayer}
        style={styles.video}
        resizeMode="cover"
        muted={muted}
        paused={paused}
        controls={false}
        viewType={ViewType.TEXTURE}
        repeat={false}
        hideShutterView
        shutterColor="transparent"
        onLoadStart={() => setReady(false)}
        onReadyForDisplay={() => setReady(true)}
        onLoad={data => {
          duration.current = data.duration;
        }}
        onProgress={data => {
          if (!activeRemoteAd || data.currentTime <= 0) return;
          trackOnce(activeRemoteAd._id, 'house_ad_impression');
          trackOnce(activeRemoteAd._id, 'house_ad_video_start');
          if (!duration.current) return;
          const percent = (data.currentTime / duration.current) * 100;
          if (percent >= 25) trackOnce(activeRemoteAd._id, 'house_ad_video_25');
          if (percent >= 50) trackOnce(activeRemoteAd._id, 'house_ad_video_50');
          if (percent >= 75) trackOnce(activeRemoteAd._id, 'house_ad_video_75');
        }}
        onEnd={handleEnd}
        onError={handleError}
      />

      {!ready ? (
        <View pointerEvents="none" style={styles.posterLayer}>
          <AppImage
            source={bundledAuthPoster}
            resizeMode="cover"
            style={styles.poster}
          />
          {activeRemoteAd?.photoUrl ? (
            <AppImage
              source={{uri: activeRemoteAd.photoUrl}}
              resizeMode="cover"
              style={[styles.poster, styles.remotePoster]}
            />
          ) : null}
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
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  posterLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  remotePoster: {
    ...StyleSheet.absoluteFillObject,
  },
});
