import {
  type DimensionValue,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import type { CustomStyles, VideoPlayerProps } from 'react-native-video-player';
import { useCallback, useRef, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { ProgressRef } from '../Controls';
import colors from '@/configs/colors';

const parsePadding = (value: DimensionValue, layoutWidth: number) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.endsWith('%')) {
    return (parseFloat(value) / 100) * layoutWidth;
  }
  return 0;
};

export interface SeekbarProps {
  autoplay: VideoPlayerProps['autoplay'];
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  progress: number; // 0–1
  fullWidth?: boolean;
  disableSeek: VideoPlayerProps['disableSeek'];
  showControls: () => void;
  onSeek: (seconds: number) => void;
  onSeeking: (progress: number) => void;
  duration: number;
  isFullscreeen: boolean;
  seekBarCustomStyles?: CustomStyles['seekBar'];
  seekBarFullWidthCustomStyles?: CustomStyles['seekBarFullWidth'];
  seekBarProgressCustomStyles?: CustomStyles['seekBarProgress'];
  seekBarKnobCustomStyles?: CustomStyles['seekBarKnob'];
  seekBarKnobSeekingCustomStyles?: CustomStyles['seekBarKnobSeeking'];
  seekBarBackgroundCustomStyles?: CustomStyles['seekBarBackground'];
}

export const Seekbar = ({
  fullWidth,
  autoplay,
  isPlaying,
  setIsPlaying,
  disableSeek,
  showControls,
  onSeek,
  onSeeking,
  duration,
  isFullscreeen,
  progress,
  seekBarCustomStyles,
  seekBarFullWidthCustomStyles,
  seekBarKnobCustomStyles,
  seekBarKnobSeekingCustomStyles,
  seekBarProgressCustomStyles,
  seekBarBackgroundCustomStyles,
}: SeekbarProps) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const seekBarWidth = useRef(200);
  const seekTouchStart = useRef(0);
  const seekProgressStart = useRef(0);
  const wasPlayingBeforeSeek = useRef(autoplay || isPlaying);

  // Reanimated shared value
  const progressValue = useSharedValue(progress);

  // useReaction updates the progressValue whenever the prop changes
  useAnimatedReaction(
    () => progress,
    (value) => {
      progressValue.value = withTiming(value, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
    }
  );

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    flexGrow: progressValue.value,
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    flexGrow: 1 - progressValue.value,
  }));

  const onSeekBarLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      const layoutWidth = nativeEvent.layout.width;
      const customStyle = seekBarCustomStyles;

      const paddingHorizontal = customStyle?.paddingHorizontal
        ? parsePadding(customStyle.paddingHorizontal, layoutWidth) * 2
        : 0;

      const paddingLeft = customStyle?.paddingLeft
        ? parsePadding(customStyle.paddingLeft, layoutWidth)
        : 0;

      const paddingRight = customStyle?.paddingRight
        ? parsePadding(customStyle.paddingRight, layoutWidth)
        : 0;

      const totalPadding = paddingHorizontal || paddingLeft + paddingRight;
      seekBarWidth.current = layoutWidth - totalPadding;
    },
    [seekBarCustomStyles]
  );

  const onSeekGrant = useCallback(
    (e: GestureResponderEvent) => {
      seekTouchStart.current = e.nativeEvent.pageX;
      seekProgressStart.current = progress;
      wasPlayingBeforeSeek.current = isPlaying;

      setIsSeeking(true);
      setIsPlaying(false);
    },
    [isPlaying, progress, setIsPlaying]
  );

  const onSeekMove = useCallback(
    (e: GestureResponderEvent) => {
      const diff = e.nativeEvent.pageX - seekTouchStart.current;
      const ratio = diff / seekBarWidth.current;
      const nextProgress = Math.min(Math.max(seekProgressStart.current + ratio, 0), 1);
      onSeeking(nextProgress);
    },
    [onSeeking]
  );

  const onSeekRelease = useCallback(() => {
    setIsSeeking(false);
    setIsPlaying(wasPlayingBeforeSeek.current);
    onSeek(progress * duration);
    showControls();
  }, [duration, onSeek, progress, setIsPlaying, showControls]);

  // console.log(progress)

  return (
    <View
      style={[
        styles.seekBar,
        seekBarCustomStyles,
        fullWidth && styles.seekBarFullWidth,
        fullWidth && seekBarFullWidthCustomStyles,
      ]}
      onLayout={onSeekBarLayout}
    >
      <Animated.View
        style={[progressAnimatedStyle, seekBarProgressCustomStyles]}
        className={`bg-red ${isFullscreeen ? 'h-[6px]' : 'h-1'} rounded-[5px]`}
      />

      {!fullWidth && !disableSeek && (
        <View
          style={[
            styles.seekBarKnob,
            isFullscreeen && { width: 18, height: 18 },
            seekBarKnobCustomStyles,
            isSeeking && styles.seekBarKnobSeeking,
            isSeeking && seekBarKnobSeekingCustomStyles,
          ]}
          hitSlop={{ top: 20, bottom: 20, left: 10, right: 20 }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onSeekGrant}
          onResponderMove={onSeekMove}
          onResponderRelease={onSeekRelease}
          onResponderTerminate={onSeekRelease}
        />
      )}

      <Animated.View
        style={[backgroundAnimatedStyle, seekBarBackgroundCustomStyles]}
        className={`bg-grey_white_90 ${isFullscreeen ? 'h-[6px]' : 'h-1'} rounded-[5px]`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  seekBar: {
    alignItems: 'center',
    height: 30,
    flexGrow: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingRight: 0,
    marginLeft: -10,
    marginRight: -5,
    marginBottom: -8,
  },
  seekBarFullWidth: {
    marginLeft: 0,
    marginRight: 0,
    paddingHorizontal: 0,
    marginTop: -3,
    height: 4,
  },
  seekBarKnob: {
    width: 16,
    height: 16,
    marginHorizontal: -8,
    marginVertical: -10,
    borderRadius: 99,
    backgroundColor: '#fff',
    transform: [{ scale: 0.8 }],
    zIndex: 1,
  },
  seekBarKnobSeeking: {
    transform: [{ scale: 1 }],
  },
});
