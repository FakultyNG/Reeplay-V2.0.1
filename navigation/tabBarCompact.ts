import {makeMutable} from 'react-native-reanimated';

/**
 * Android floating TabBar compact progress (0 = labels + full size, 1 = compact).
 * Driven by main bottom-tab screen scroll via useTabBarCompactOnScroll.
 */
export const tabBarCompactProgress = makeMutable(0);

export const TAB_BAR_COMPACT_THRESHOLD = 48;
