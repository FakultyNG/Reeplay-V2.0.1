import {useCallback, useEffect} from 'react';
import {Platform} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {
  Easing,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  TAB_BAR_COMPACT_THRESHOLD,
  tabBarCompactProgress,
} from './tabBarCompact';

const COMPACT_CFG = {
  duration: 280,
  easing: Easing.out(Easing.cubic),
};

/**
 * Android floating TabBar compact-on-scroll (same behavior as Taron).
 * Use `scrollHandler` with Reanimated scroll views, or `reportScrollOffset`
 * from a JS `onScroll` (ScrollView / FlatList).
 */
export function useTabBarCompactOnScroll() {
  const isFocused = useIsFocused();
  const scrollY = useSharedValue(0);
  const isAndroid = Platform.OS === 'android';

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useAnimatedReaction(
    () => scrollY.value > TAB_BAR_COMPACT_THRESHOLD,
    (shouldCompact, prev) => {
      if (!isAndroid || !isFocused) {
        return;
      }
      if (shouldCompact === prev) {
        return;
      }
      tabBarCompactProgress.value = withTiming(
        shouldCompact ? 1 : 0,
        COMPACT_CFG,
      );
    },
    [isAndroid, isFocused],
  );

  useEffect(() => {
    if (!isAndroid || !isFocused) {
      return;
    }
    tabBarCompactProgress.value = withTiming(
      scrollY.value > TAB_BAR_COMPACT_THRESHOLD ? 1 : 0,
      COMPACT_CFG,
    );
  }, [isFocused, isAndroid, scrollY]);

  const reportScrollOffset = useCallback(
    (y: number) => {
      if (!isAndroid) {
        return;
      }
      scrollY.value = y;
    },
    [isAndroid, scrollY],
  );

  return {scrollHandler, scrollY, reportScrollOffset};
}
