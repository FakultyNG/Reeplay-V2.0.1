import {
  type DimensionValue,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import type {CustomStyles, VideoPlayerProps} from 'react-native-video-player';
import {useCallback, useEffect, useRef, useState} from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const parsePadding = (value: DimensionValue, layoutWidth: number) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.endsWith('%')) {
    return (parseFloat(value) / 100) * layoutWidth;
  }
  return 0;
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

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
  const barPageX = useRef(0);
  const seekProgressRef = useRef(progress);
  const wasPlayingBeforeSeek = useRef(autoplay || isPlaying);
  const isSeekingRef = useRef(false);

  const progressValue = useSharedValue(progress);

  useEffect(() => {
    if (isSeekingRef.current) {
      return;
    }
    seekProgressRef.current = progress;
    progressValue.value = withTiming(progress, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
  }, [progress, progressValue]);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    flexGrow: progressValue.value,
  }));

  const backgroundAnimatedStyle = useAnimatedStyle(() => ({
    flexGrow: 1 - progressValue.value,
  }));

  const onSeekBarLayout = useCallback(
    ({nativeEvent}: LayoutChangeEvent) => {
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
      seekBarWidth.current = Math.max(layoutWidth - totalPadding, 1);
    },
    [seekBarCustomStyles],
  );

  const applySeekProgress = useCallback(
    (next: number) => {
      const clamped = clamp01(next);
      seekProgressRef.current = clamped;
      progressValue.value = clamped;
      onSeeking(clamped);
    },
    [onSeeking, progressValue],
  );

  const endSeek = useCallback(() => {
    if (!isSeekingRef.current) {
      return;
    }

    const next = seekProgressRef.current;
    isSeekingRef.current = false;
    setIsSeeking(false);
    setIsPlaying(wasPlayingBeforeSeek.current);
    onSeek(next * duration);
    showControls();
  }, [duration, onSeek, setIsPlaying, showControls]);

  const canSeek = !fullWidth && !disableSeek && duration > 0;

  const onGrant = useCallback(
    (e: GestureResponderEvent) => {
      if (!canSeek) {
        return;
      }

      const {pageX, locationX} = e.nativeEvent;
      barPageX.current = pageX - locationX;
      isSeekingRef.current = true;
      wasPlayingBeforeSeek.current = isPlaying;
      setIsSeeking(true);
      setIsPlaying(false);

      const width = Math.max(seekBarWidth.current, 1);
      applySeekProgress(locationX / width);
    },
    [applySeekProgress, canSeek, isPlaying, setIsPlaying],
  );

  const onMove = useCallback(
    (e: GestureResponderEvent) => {
      if (!isSeekingRef.current) {
        return;
      }
      const width = Math.max(seekBarWidth.current, 1);
      applySeekProgress((e.nativeEvent.pageX - barPageX.current) / width);
    },
    [applySeekProgress],
  );

  return (
    <View
      style={[
        styles.seekBar,
        seekBarCustomStyles,
        fullWidth && styles.seekBarFullWidth,
        fullWidth && seekBarFullWidthCustomStyles,
      ]}
      onLayout={onSeekBarLayout}
      onStartShouldSetResponder={() => canSeek}
      onMoveShouldSetResponder={() => canSeek}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={endSeek}
      onResponderTerminate={endSeek}>
      <Animated.View
        pointerEvents="none"
        style={[progressAnimatedStyle, seekBarProgressCustomStyles]}
        className={`bg-red ${isFullscreeen ? 'h-[3px]' : 'h-1'} rounded-full`}
      />

      {canSeek && (
        <View
          pointerEvents="none"
          style={[
            styles.seekBarKnob,
            isFullscreeen && {width: 14, height: 14},
            seekBarKnobCustomStyles,
            isSeeking && styles.seekBarKnobSeeking,
            isSeeking && seekBarKnobSeekingCustomStyles,
          ]}
        />
      )}

      <Animated.View
        pointerEvents="none"
        style={[backgroundAnimatedStyle, seekBarBackgroundCustomStyles]}
        className={`bg-white/25 ${isFullscreeen ? 'h-[3px]' : 'h-1'} rounded-full`}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  seekBar: {
    alignItems: 'center',
    height: 36,
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
    width: 14,
    height: 14,
    marginHorizontal: -7,
    marginVertical: -10,
    borderRadius: 99,
    backgroundColor: '#fff',
    transform: [{scale: 0.85}],
    zIndex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 3,
  },
  seekBarKnobSeeking: {
    transform: [{scale: 1.15}],
  },
});
