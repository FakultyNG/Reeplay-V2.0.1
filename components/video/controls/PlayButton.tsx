import {Pressable} from 'react-native';
import {memo} from 'react';
import {B_PauseBtn, B_PlayBtn, BigPlayIcon} from '@/assets/icons';
import {View} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface PlayButtonProps {
  isPlaying: boolean;
  isFullscreen: boolean;
  onPlayPress: () => void;
  minimal?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PlayButton = memo(
  ({isPlaying, isFullscreen, onPlayPress, minimal = false}: PlayButtonProps) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{scale: scale.value}],
    }));

    return (
      <AnimatedPressable
        onPress={onPlayPress}
        onPressIn={() => {
          scale.value = withSpring(0.88, {damping: 16, stiffness: 320});
        }}
        onPressOut={() => {
          scale.value = withSpring(1, {damping: 14, stiffness: 280});
        }}
        hitSlop={16}
        style={animatedStyle}
        className="w-[56px] h-[72px] justify-center items-center">
        {minimal ? (
          !isPlaying ? (
            <View style={styles.minimalPlay} />
          ) : (
            <View style={styles.minimalPause}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          )
        ) : !isPlaying ? (
          !isFullscreen ? (
            <BigPlayIcon />
          ) : (
            <B_PlayBtn />
          )
        ) : !isFullscreen ? (
          <View className="flex-row items-center gap-x-[9px] justify-center">
            <View className="w-1.5 h-[25px] bg-white rounded" />
            <View className="w-1.5 h-[25px] bg-white rounded" />
          </View>
        ) : (
          <B_PauseBtn style={{marginLeft: -20}} />
        )}
      </AnimatedPressable>
    );
  },
);

const styles = {
  minimalPlay: {
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderBottomWidth: 15,
    borderLeftWidth: 23,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
    marginLeft: 5,
  },
  minimalPause: {
    flexDirection: 'row' as const,
    gap: 9,
    alignItems: 'center' as const,
  },
  pauseBar: {
    width: 7,
    height: 34,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
};
