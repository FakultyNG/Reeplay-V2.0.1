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
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PlayButton = memo(
  ({isPlaying, isFullscreen, onPlayPress}: PlayButtonProps) => {
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
        {!isPlaying ? (
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
