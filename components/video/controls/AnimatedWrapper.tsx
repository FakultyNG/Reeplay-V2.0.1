import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface AnimatedWrapperProps {
  animationDuration: number;
  visible: boolean;
  children: React.ReactNode;
  onAnimationEnd?: () => void;
}

export const AnimatedWrapper = ({
  animationDuration,
  visible,
  children,
  onAnimationEnd,
}: AnimatedWrapperProps) => {
  const opacity = useSharedValue(0);
  const display = useSharedValue<'flex' | 'none'>('none');

  useEffect(() => {
    if (visible) {
      display.value = 'flex';
    }

    opacity.value = withTiming(
      visible ? 1 : 0,
      { duration: animationDuration },
      finished => {
        if (finished && !visible) {
          display.value = 'none';
        }

        if (finished && onAnimationEnd) {
          runOnJS(onAnimationEnd)();
        }
      }
    );
  }, [visible, animationDuration, onAnimationEnd]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    display: display.value,
  }));

  return (
    <Animated.View style={[styles.controls, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  controls: {
    position: 'relative',
    height: '100%',
  },
});
