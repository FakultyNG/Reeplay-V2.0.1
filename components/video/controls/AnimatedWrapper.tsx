import React, {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
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
  // Seed from `visible` so first paint isn't blank when controls start shown.
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(
      visible ? 1 : 0,
      {duration: animationDuration, easing: Easing.out(Easing.cubic)},
      finished => {
        if (finished && onAnimationEnd) {
          runOnJS(onAnimationEnd)();
        }
      },
    );
  }, [visible, animationDuration, onAnimationEnd, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.controls, animatedStyle]}
      pointerEvents={visible ? 'box-none' : 'none'}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  controls: {
    ...StyleSheet.absoluteFillObject,
  },
});
