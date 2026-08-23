import {View} from 'react-native';
import {MotiView} from 'moti';
import {Easing} from 'react-native-reanimated';
import colors from '@/configs/colors';

const DOT_COUNT = 5;
const MAIN_DOT_SIZE = 9;
const SECONDARY_DOT_SIZE = 7;
const INACTIVE_DOT_SIZE = 5;
const MAIN_DOT_COLOR = colors.RED;
const SECONDARY_DOT_COLOR = 'rgba(255, 19, 19, 0.7)';
const INACTIVE_DOT_COLOR = 'rgba(255, 19, 19, 0.35)';
const DOT_TRANSITION = {
  type: 'timing' as const,
  duration: 320,
  easing: Easing.out(Easing.cubic),
};

/**
 * Main travels across the strip with scroll.
 * - Start: main first, two less-active on its right
 * - Middle: main centered between the two less-active
 * - End: main last, two less-active on its left
 */
function getDotRoles(mainDot: number, count: number) {
  if (mainDot <= 0) {
    return {main: 0, secondary: new Set([1, 2])};
  }
  if (mainDot >= count - 1) {
    return {
      main: count - 1,
      secondary: new Set([count - 3, count - 2]),
    };
  }
  return {
    main: mainDot,
    secondary: new Set([mainDot - 1, mainDot + 1]),
  };
}

interface Props {
  currentIndex: number;
  itemCount: number;
  /** How many items are visible at once. Popular row = 3. */
  visibleItems?: number;
}

const InfinityPaginationDots = ({
  currentIndex,
  itemCount,
  visibleItems = 1,
}: Props) => {
  const maxScrollIndex = Math.max(0, itemCount - visibleItems);
  const progress =
    maxScrollIndex === 0
      ? 0
      : Math.min(1, Math.max(0, currentIndex / maxScrollIndex));
  const mainDot = Math.round(progress * (DOT_COUNT - 1));
  const {main, secondary} = getDotRoles(mainDot, DOT_COUNT);

  return (
    <View
      className="flex-row items-center justify-center gap-x-1.5"
      style={{height: MAIN_DOT_SIZE, overflow: 'hidden'}}>
      {[...Array(DOT_COUNT)].map((_, i) => {
        const isMain = i === main;
        const isSecondary = secondary.has(i);
        const size = isMain
          ? MAIN_DOT_SIZE
          : isSecondary
            ? SECONDARY_DOT_SIZE
            : INACTIVE_DOT_SIZE;
        const color = isMain
          ? MAIN_DOT_COLOR
          : isSecondary
            ? SECONDARY_DOT_COLOR
            : INACTIVE_DOT_COLOR;
        return (
          <MotiView
            key={i}
            animate={{
              width: size,
              height: size,
              backgroundColor: color,
            }}
            transition={DOT_TRANSITION}
            style={{borderRadius: 99}}
          />
        );
      })}
    </View>
  );
};

export default InfinityPaginationDots;
