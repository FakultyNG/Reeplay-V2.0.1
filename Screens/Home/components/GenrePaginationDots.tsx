import {useMemo} from 'react';
import {View} from 'react-native';
import {MotiView} from 'moti';
import {Easing} from 'react-native-reanimated';
import colors from '@/configs/colors';
import Size from '@/Utils/useResponsiveSize';

const MAIN_DOT_SIZE = 9;
const INACTIVE_DOT_SIZE = 5;
const DOT_SLOT = 16;
const MAX_VISIBLE = Math.max(
  5,
  Math.floor((Size.getWidth() * 0.5) / DOT_SLOT),
);
const MAIN_DOT_COLOR = colors.RED;
const INACTIVE_DOT_COLOR = 'rgba(255, 19, 19, 0.35)';
const DOT_TRANSITION = {
  type: 'timing' as const,
  duration: 280,
  easing: Easing.out(Easing.cubic),
};

function getWindowStart(activeIndex: number, count: number, maxVisible: number) {
  if (count <= maxVisible) {
    return 0;
  }
  const maxStart = count - maxVisible;
  const centered = activeIndex - Math.floor((maxVisible - 1) / 2);
  return Math.min(maxStart, Math.max(0, centered));
}

interface Props {
  currentIndex: number;
  itemCount: number;
}

const GenrePaginationDots = ({currentIndex, itemCount}: Props) => {
  const active = Math.min(Math.max(0, currentIndex), Math.max(0, itemCount - 1));
  const visibleCount = Math.min(itemCount, MAX_VISIBLE);
  const windowStart = getWindowStart(active, itemCount, MAX_VISIBLE);
  const indexes = useMemo(
    () => Array.from({length: itemCount}, (_, i) => i),
    [itemCount],
  );

  if (itemCount < 2) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        alignSelf: 'center',
        width: visibleCount * DOT_SLOT,
        height: MAIN_DOT_SIZE,
        overflow: 'hidden',
      }}>
      <MotiView
        animate={{translateX: -windowStart * DOT_SLOT}}
        transition={DOT_TRANSITION}
        style={{flexDirection: 'row', alignItems: 'center'}}>
        {indexes.map(i => {
          const isActive = i === active;
          const size = isActive ? MAIN_DOT_SIZE : INACTIVE_DOT_SIZE;
          return (
            <View
              key={i}
              style={{
                width: DOT_SLOT,
                height: MAIN_DOT_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MotiView
                animate={{
                  width: size,
                  height: size,
                  backgroundColor: isActive
                    ? MAIN_DOT_COLOR
                    : INACTIVE_DOT_COLOR,
                }}
                transition={DOT_TRANSITION}
                style={{borderRadius: 99}}
              />
            </View>
          );
        })}
      </MotiView>
    </View>
  );
};

export default GenrePaginationDots;
