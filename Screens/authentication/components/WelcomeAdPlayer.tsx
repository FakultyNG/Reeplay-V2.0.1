import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet} from 'react-native';
import type {ReactVideoProps} from 'react-native-video';
import {AppVideo} from '@/components';
import {IAdsData} from '@/types/api/content.types';

type SlotId = 'a' | 'b';
type VideoItem = {
  id: string;
  source: ReactVideoProps['source'];
  fallback: boolean;
};

interface Props {
  ads: IAdsData[];
  muted: boolean;
  paused: boolean;
}

const fallbackItem: VideoItem = {
  id: 'welcome-fallback',
  source: require('@/assets/videos/getStartedVideo.mp4'),
  fallback: true,
};

const otherSlot = (slot: SlotId): SlotId => (slot === 'a' ? 'b' : 'a');

export default function WelcomeAdPlayer({ads, muted, paused}: Props) {
  const eligibleAds = useMemo(
    () => ads.filter(ad => ad.type === 'mobile' && Boolean(ad.videoUrl)),
    [ads],
  );
  const cursor = useRef(0);
  const transitionRunning = useRef(false);
  const opacity = useRef({
    a: new Animated.Value(1),
    b: new Animated.Value(0),
  }).current;
  const [items, setItems] = useState<Record<SlotId, VideoItem | null>>({
    a: fallbackItem,
    b: null,
  });
  const [activeSlot, setActiveSlot] = useState<SlotId>('a');
  const [loaded, setLoaded] = useState<Record<SlotId, boolean>>({a: false, b: false});
  const [displayReady, setDisplayReady] = useState<Record<SlotId, boolean>>({
    a: false,
    b: false,
  });
  const [advancePending, setAdvancePending] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<SlotId | null>(null);

  const nextItem = useCallback((): VideoItem => {
    if (eligibleAds.length === 0) return fallbackItem;
    const ad = eligibleAds[cursor.current % eligibleAds.length];
    cursor.current += 1;
    return {id: ad._id, source: {uri: ad.videoUrl}, fallback: false};
  }, [eligibleAds]);

  const prepareSlot = useCallback(
    (slot: SlotId, item: VideoItem) => {
      opacity[slot].setValue(0);
      setLoaded(current => ({...current, [slot]: false}));
      setDisplayReady(current => ({...current, [slot]: false}));
      setItems(current => ({...current, [slot]: item}));
    },
    [opacity],
  );

  useEffect(() => {
    cursor.current = 0;
    const inactive = otherSlot(activeSlot);
    prepareSlot(inactive, nextItem());
    // The active video remains mounted until it ends, preserving its final frame.
  }, [eligibleAds, nextItem, prepareSlot]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestAdvance = useCallback(
    (slot: SlotId) => {
      if (slot !== activeSlot || transitionRunning.current) return;
      const target = otherSlot(slot);
      setAdvancePending(true);
      if (loaded[target]) setTransitionTarget(target);
    },
    [activeSlot, loaded],
  );

  useEffect(() => {
    if (!advancePending || transitionTarget || transitionRunning.current) return;
    const target = otherSlot(activeSlot);
    if (loaded[target]) setTransitionTarget(target);
  }, [activeSlot, advancePending, loaded, transitionTarget]);

  useEffect(() => {
    if (!transitionTarget || !displayReady[transitionTarget] || transitionRunning.current) return;
    transitionRunning.current = true;
    const previous = activeSlot;
    Animated.timing(opacity[transitionTarget], {
      toValue: 1,
      duration: 360,
      useNativeDriver: true,
    }).start(({finished}) => {
      transitionRunning.current = false;
      if (!finished) return;
      opacity[previous].setValue(0);
      setActiveSlot(transitionTarget);
      setTransitionTarget(null);
      setAdvancePending(false);
      prepareSlot(previous, nextItem());
    });
  }, [activeSlot, displayReady, nextItem, opacity, prepareSlot, transitionTarget]);

  useEffect(() => {
    if (!transitionTarget) return;
    const timeout = setTimeout(() => {
      if (transitionRunning.current) return;
      const failedSlot = transitionTarget;
      setTransitionTarget(null);
      prepareSlot(failedSlot, fallbackItem);
    }, 6000);
    return () => clearTimeout(timeout);
  }, [prepareSlot, transitionTarget]);

  const handleError = (slot: SlotId) => {
    if (slot === activeSlot) {
      const target = otherSlot(slot);
      prepareSlot(target, fallbackItem);
      setAdvancePending(true);
      return;
    }
    prepareSlot(slot, fallbackItem);
  };

  return (
    <>
      {(['a', 'b'] as SlotId[]).map(slot => {
        const item = items[slot];
        if (!item) return null;
        const shouldPlay = slot === activeSlot || slot === transitionTarget;
        return (
          <Animated.View
            key={slot}
            pointerEvents="none"
            style={[styles.videoLayer, {opacity: opacity[slot]}]}>
            <AppVideo
              key={item.id}
              source={item.source}
              style={styles.video}
              resizeMode="cover"
              muted={muted}
              paused={paused || !shouldPlay}
              controls={false}
              repeat={item.fallback && eligibleAds.length === 0 && slot === activeSlot}
              hideShutterView
              shutterColor="transparent"
              onLoad={() => setLoaded(current => ({...current, [slot]: true}))}
              onReadyForDisplay={() =>
                setDisplayReady(current => ({...current, [slot]: true}))
              }
              onEnd={() => requestAdvance(slot)}
              onError={() => handleError(slot)}
            />
          </Animated.View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
