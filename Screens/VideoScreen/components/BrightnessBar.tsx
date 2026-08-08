import {
  Platform,
  StyleSheet,
  View,
  PanResponder,
  type LayoutChangeEvent,
  type PanResponderInstance,
} from 'react-native';
import React, {useEffect, useRef} from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import colors from '@/configs/colors';
import DeviceBrightness from '@adrianso/react-native-device-brightness';
import {isAndroid} from '@/configs/constant';
import ToastNotification from '@/components/ToastNotifications';

interface Props {
  brightLevel?: number | null;
  setLevel?: React.Dispatch<React.SetStateAction<number | null>>;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}

const TRACK_HIT_WIDTH = 44;

const BrightnessBar = ({
  brightLevel = null,
  setLevel,
  onGestureStart,
  onGestureEnd,
}: Props) => {
  /** 0 = full bright (fill at top), 1 = dim (fill near bottom) — stored as fill height from bottom. */
  const fillHeight = useSharedValue(80);
  const trackHeight = useRef(180);
  const touchStartY = useRef(0);
  const levelStart = useRef(0.5);
  const levelRef = useRef(0.5);
  const onGestureStartRef = useRef(onGestureStart);
  const onGestureEndRef = useRef(onGestureEnd);
  onGestureStartRef.current = onGestureStart;
  onGestureEndRef.current = onGestureEnd;

  const applyBrightness = async (level01: number) => {
    const clamped = Math.max(0.01, Math.min(level01, 1));
    levelRef.current = clamped;
    setLevel?.(clamped);
    fillHeight.value = clamped * trackHeight.current;

    try {
      await DeviceBrightness.setBrightnessLevel(clamped);
    } catch (e) {
      console.error('Failed to set brightness:', e);
      ToastNotification('error', 'Could not set screen brightness.');
    }
  };

  const syncFromSystem = async () => {
    try {
      const brightness = brightLevel
        ? brightLevel
        : isAndroid
          ? await DeviceBrightness.getSystemBrightnessLevel()
          : await DeviceBrightness.getBrightnessLevel();
      const clamped = Math.max(0.01, Math.min(brightness, 1));
      levelRef.current = clamped;
      setLevel?.(clamped);
      fillHeight.value = clamped * trackHeight.current;
    } catch (e) {
      console.error('Failed to get initial brightness:', e);
      fillHeight.value = trackHeight.current * 0.5;
      levelRef.current = 0.5;
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      syncFromSystem();
    }
  }, []);

  const panResponderRef = useRef<PanResponderInstance | null>(null);
  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: evt => {
        onGestureStartRef.current?.();
        touchStartY.current = evt.nativeEvent.locationY;
        levelStart.current = levelRef.current;
      },
      onPanResponderMove: evt => {
        const h = trackHeight.current || 1;
        // Drag up = brighter, drag down = dimmer (locationY from top of track).
        const y = Math.max(0, Math.min(evt.nativeEvent.locationY, h));
        const nextLevel = 1 - y / h;
        applyBrightness(nextLevel);
      },
      onPanResponderRelease: () => {
        onGestureEndRef.current?.();
      },
      onPanResponderTerminate: () => {
        onGestureEndRef.current?.();
      },
    });
  }

  const fillStyle = useAnimatedStyle(() => ({
    height: Math.max(6, fillHeight.value),
  }));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      trackHeight.current = h;
      fillHeight.value = levelRef.current * h;
    }
  };

  return (
    <View
      style={styles.hitArea}
      onLayout={onTrackLayout}
      {...panResponderRef.current.panHandlers}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
};

export default BrightnessBar;

const styles = StyleSheet.create({
  hitArea: {
    width: TRACK_HIT_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  track: {
    width: 8,
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#535353',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    backgroundColor: colors.WHITE,
    borderRadius: 5,
  },
});
