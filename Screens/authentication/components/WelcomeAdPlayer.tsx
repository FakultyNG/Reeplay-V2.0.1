import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import RNFS from 'react-native-fs';
import {ViewType, type ReactVideoProps} from 'react-native-video';
import {AppImage, AppVideo} from '@/components';
import {IAdsData} from '@/types/api/content.types';
import {trackHouseAd} from '@/api/analytics.api';
import {getEligibleWelcomeAds} from '@/Utils/welcomeAds';

interface Props {
  ads: IAdsData[];
  muted: boolean;
  paused: boolean;
  requestComplete: boolean;
}

interface PreparedAd {
  ad: IAdsData;
  uri: string;
}

const bundledAuthVideo = require('@/assets/videos/AuthVideo.mp4');
const emergencyFallbackVideo = require('@/assets/videos/getStartedVideo.mp4');
const bundledAuthPoster = require('@/assets/images/AuthVideoPoster.jpg');

const cacheIdentity = (ad: IAdsData) => {
  const sourcePath = ad.videoUrl.split('?')[0];
  let hash = 0;
  for (let index = 0; index < sourcePath.length; index += 1) {
    hash = (hash * 31 + sourcePath.charCodeAt(index)) % 2147483647;
  }
  return `${ad._id.replace(/[^a-zA-Z0-9_-]/g, '')}-${Math.abs(hash)}`;
};

export default function WelcomeAdPlayer({ads, muted, paused, requestComplete}: Props) {
  const eligibleAds = useMemo(() => getEligibleWelcomeAds(ads), [ads]);
  const eligibleKey = eligibleAds.map(ad => `${ad._id}:${ad.videoUrl}`).join('|');
  const [failedAdIds, setFailedAdIds] = useState<string[]>([]);
  const [current, setCurrentState] = useState<PreparedAd | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [useEmergencyFallback, setUseEmergencyFallback] = useState(false);

  const currentRef = useRef<PreparedAd | null>(null);
  const playableAdsRef = useRef<IAdsData[]>([]);
  const prepared = useRef<Map<string, PreparedAd>>(new Map());
  const preparing = useRef<Map<string, Promise<PreparedAd | null>>>(new Map());
  const duration = useRef(0);
  const trackedEvents = useRef<Set<string>>(new Set());
  const mounted = useRef(true);

  const playableAds = useMemo(
    () => eligibleAds.filter(ad => !failedAdIds.includes(ad._id)),
    [eligibleAds, failedAdIds],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    playableAdsRef.current = playableAds;
  }, [playableAds]);

  const setCurrent = useCallback((value: PreparedAd | null) => {
    currentRef.current = value;
    duration.current = 0;
    setCurrentState(value);
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
    prepared.current.delete(adId);
    setFailedAdIds(ids => (ids.includes(adId) ? ids : [...ids, adId]));
  }, []);

  const prepareAd = useCallback(async (ad: IAdsData) => {
    const cached = prepared.current.get(ad._id);
    if (cached && cacheIdentity(cached.ad) === cacheIdentity(ad)) return cached;

    const inProgress = preparing.current.get(ad._id);
    if (inProgress) return inProgress;

    const task = (async (): Promise<PreparedAd | null> => {
      const identity = cacheIdentity(ad);
      const destination = `${RNFS.CachesDirectoryPath}/reeplay-welcome-${identity}.mp4`;
      const temporary = `${destination}.part`;
      try {
        if (!(await RNFS.exists(destination))) {
          if (await RNFS.exists(temporary)) await RNFS.unlink(temporary);
          const result = await RNFS.downloadFile({
            fromUrl: ad.videoUrl,
            toFile: temporary,
            background: true,
            discretionary: false,
          }).promise;
          if (result.statusCode < 200 || result.statusCode >= 300) {
            throw new Error(`Auth ad download failed with HTTP ${result.statusCode}`);
          }
          await RNFS.moveFile(temporary, destination);
        }
        const value = {ad, uri: `file://${destination}`};
        prepared.current.set(ad._id, value);
        return value;
      } catch {
        if (await RNFS.exists(temporary)) await RNFS.unlink(temporary).catch(() => undefined);
        if (mounted.current) markAdFailed(ad._id);
        return null;
      } finally {
        preparing.current.delete(ad._id);
      }
    })();

    preparing.current.set(ad._id, task);
    return task;
  }, [markAdFailed]);

  const nextAdAfter = useCallback((ad: IAdsData | null) => {
    const available = playableAdsRef.current;
    if (available.length === 0) return null;
    const index = ad ? available.findIndex(item => item._id === ad._id) : -1;
    return available[(index + 1) % available.length];
  }, []);

  useEffect(() => {
    setFailedAdIds([]);
    prepared.current.clear();
    preparing.current.clear();
    setCurrent(null);
  }, [eligibleKey, setCurrent]);

  useEffect(() => {
    if (!requestComplete || playableAds.length === 0) return;
    prepareAd(playableAds[0]);
  }, [playableAds, prepareAd, requestComplete]);

  useEffect(() => {
    if (!current) return;
    const next = nextAdAfter(current.ad);
    if (next && next._id !== current.ad._id) prepareAd(next);
  }, [current, nextAdAfter, prepareAd]);

  const activatePrepared = useCallback((ad: IAdsData | null) => {
    if (!ad) return false;
    const value = prepared.current.get(ad._id);
    if (!value || cacheIdentity(value.ad) !== cacheIdentity(ad)) return false;
    setCurrent(value);
    return true;
  }, [setCurrent]);

  const handleEnd = useCallback(() => {
    const completed = currentRef.current;
    if (completed) trackOnce(completed.ad._id, 'house_ad_video_complete');

    const next = nextAdAfter(completed?.ad ?? null);
    if (completed && next?._id === completed.ad._id) return;
    if (activatePrepared(next)) return;

    if (completed && next) {
      // Keep the completed ad's final frame on the single native surface until
      // the next MP4 is fully prepared, then change only that surface's source.
      prepareAd(next).then(value => {
        if (!mounted.current || currentRef.current?.ad._id !== completed.ad._id) return;
        setCurrent(value);
      });
      return;
    }

    // The bundled MP4 loops when there is no usable remote campaign.
    setCurrent(null);
    if (next) prepareAd(next);
  }, [activatePrepared, nextAdAfter, prepareAd, setCurrent, trackOnce]);

  const handleProgress = useCallback((currentTime: number) => {
    const active = currentRef.current;
    if (!active || currentTime <= 0) return;
    trackOnce(active.ad._id, 'house_ad_impression');
    trackOnce(active.ad._id, 'house_ad_video_start');
    if (!duration.current) return;
    const percent = (currentTime / duration.current) * 100;
    if (percent >= 25) trackOnce(active.ad._id, 'house_ad_video_25');
    if (percent >= 50) trackOnce(active.ad._id, 'house_ad_video_50');
    if (percent >= 75) trackOnce(active.ad._id, 'house_ad_video_75');
  }, [trackOnce]);

  const localSource: ReactVideoProps['source'] = useEmergencyFallback
    ? emergencyFallbackVideo
    : bundledAuthVideo;
  const source: ReactVideoProps['source'] = current ? {uri: current.uri} : localSource;

  return (
    <View style={styles.container}>
      <AppVideo
        source={source}
        containerStyle={styles.videoLayer}
        style={styles.video}
        resizeMode="cover"
        muted={muted}
        paused={paused}
        controls={false}
        viewType={ViewType.TEXTURE}
        repeat={!current || playableAds.length === 1}
        hideShutterView
        shutterColor="transparent"
        onReadyForDisplay={() => setLocalReady(true)}
        onLoad={data => {
          duration.current = data.duration;
        }}
        onProgress={data => handleProgress(data.currentTime)}
        onEnd={handleEnd}
        onError={() => {
          if (currentRef.current) {
            markAdFailed(currentRef.current.ad._id);
            setCurrent(null);
          } else if (!useEmergencyFallback) {
            setUseEmergencyFallback(true);
            setLocalReady(false);
          }
        }}
      />

      {!localReady ? (
        <View pointerEvents="none" style={styles.initialPosterLayer}>
          <AppImage source={bundledAuthPoster} resizeMode="cover" style={styles.video} />
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
  initialPosterLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050505',
    zIndex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
