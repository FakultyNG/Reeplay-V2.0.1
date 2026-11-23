import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet} from 'react-native';
import {
  ViewType,
  type ReactVideoProps,
  type VideoRef,
} from 'react-native-video';
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
  const videoRefs = useRef<Record<string, VideoRef | null>>({});

  useEffect(() => {
    setIndex(0);
    setFailedAdIds([]);
  }, [eligibleAds]);

  const playableAds = eligibleAds.filter(ad => !failedAdIds.includes(ad._id));
  const useFallback = requestComplete && playableAds.length === 0;
  const playlist: VideoItem[] = useFallback
    ? [fallbackItem]
    : playableAds.map(ad => ({
        id: ad._id,
        source: {uri: ad.videoUrl},
        fallback: false,
      }));
  const activeIndex = index % Math.max(playlist.length, 1);
  const activeItem = playlist[activeIndex];
  const nextItem =
    playlist.length > 1 ? playlist[(activeIndex + 1) % playlist.length] : null;
  const mountedItems = activeItem
    ? nextItem
      ? [activeItem, nextItem]
      : [activeItem]
    : [];

  if (!activeItem) return null;

  return (
    <>
      {mountedItems.map(item => {
        const isActive = item.id === activeItem.id;

        return (
          <AppVideo
            key={item.id}
            videoRef={ref => {
              videoRefs.current[item.id] = ref;
            }}
            source={item.source}
            containerStyle={
              isActive ? styles.activeVideoLayer : styles.preloadedVideoLayer
            }
            style={styles.video}
            resizeMode="cover"
            muted={muted}
            paused={paused || !isActive}
            controls={false}
            viewType={ViewType.TEXTURE}
            repeat={item.fallback || playlist.length === 1}
            hideShutterView
            shutterColor="transparent"
            onEnd={() => {
              if (!item.fallback && isActive) {
                // Reset the completed layer so it is ready when the playlist
                // cycles back to it, then reveal the already-buffered layer.
                videoRefs.current[item.id]?.seek(0);
                setIndex(current => (current + 1) % playlist.length);
              }
            }}
            onError={() => {
              if (!item.fallback) {
                setFailedAdIds(ids =>
                  ids.includes(item.id) ? ids : [...ids, item.id],
                );
                setIndex(0);
              }
            }}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  activeVideoLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 1,
    opacity: 1,
  },
  preloadedVideoLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 0,
    opacity: 0,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
