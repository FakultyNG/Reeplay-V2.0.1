import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet} from 'react-native';
import {ViewType, type ReactVideoProps} from 'react-native-video';
import {AppVideo} from '@/components';
import {IAdsData} from '@/types/api/content.types';

type VideoItem = {
  id: string;
  source: ReactVideoProps['source'];
  fallback: boolean;
};

interface Props {
  ads: IAdsData[];
  muted: boolean;
  paused: boolean;
  requestComplete: boolean;
}

// This is intentionally the only video bundled in the app for auth-screen
// playback. It is an emergency fallback; current admin-managed ads play first.
const fallbackItem: VideoItem = {
  id: 'welcome-fallback',
  source: require('@/assets/videos/getStartedVideo.mp4'),
  fallback: true,
};

export default function WelcomeAdPlayer({
  ads,
  muted,
  paused,
  requestComplete,
}: Props) {
  const eligibleAds = useMemo(() => {
    const now = Date.now();
    return ads.filter(ad => {
      const startsAt = new Date(ad.start).getTime();
      const expiresAt = new Date(ad.expiry).getTime();
      return (
        ad.type === 'mobile' &&
        ad.active !== false &&
        Boolean(ad.videoUrl) &&
        Number.isFinite(startsAt) &&
        Number.isFinite(expiresAt) &&
        startsAt <= now &&
        expiresAt > now
      );
    });
  }, [ads]);
  const [index, setIndex] = useState(0);
  const [failedAdIds, setFailedAdIds] = useState<string[]>([]);

  useEffect(() => {
    setIndex(0);
    setFailedAdIds([]);
  }, [eligibleAds]);

  const playableAds = eligibleAds.filter(ad => !failedAdIds.includes(ad._id));
  const useFallback = requestComplete && playableAds.length === 0;
  const serverAd = playableAds[index % Math.max(playableAds.length, 1)];
  const item: VideoItem | null = useFallback
    ? fallbackItem
    : serverAd
      ? {
          id: serverAd._id,
          source: {uri: serverAd.videoUrl},
          fallback: false,
        }
      : null;

  if (!item) return null;

  return (
    <AppVideo
      key={item.id}
      source={item.source}
      containerStyle={styles.videoLayer}
      style={styles.video}
      resizeMode="cover"
      muted={muted}
      paused={paused}
      controls={false}
      viewType={ViewType.TEXTURE}
      repeat={item.fallback || playableAds.length === 1}
      hideShutterView
      shutterColor="transparent"
      onEnd={() => {
        if (!item.fallback) {
          setIndex(current => (current + 1) % playableAds.length);
        }
      }}
      onError={() => {
        if (!item.fallback) {
          setFailedAdIds(ids => (ids.includes(item.id) ? ids : [...ids, item.id]));
          setIndex(0);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 0,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
