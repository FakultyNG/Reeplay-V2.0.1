import Size from '@/Utils/useResponsiveSize';
import {
  FHomeIcon,
  FLibraryIcon,
  FLiveIcon,
  FUpcomingIcon,
  HomeIcon,
  Library,
  LiveIcon,
  UpcomingIcon,
} from '@/assets/icons';
import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {BlurView as CommunityBlur} from '@react-native-community/blur';
import AndroidBlur from 'react-native-blur-effect';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {tabBarCompactProgress} from '../tabBarCompact';

const TabLabel = ({
  text,
  focused,
  compact,
}: {
  text: string;
  focused: boolean;
  compact: SharedValue<number>;
}) => {
  const style = useAnimatedStyle(() => {
    const p = compact.value;
    return {
      opacity: interpolate(p, [0, 0.35, 1], [1, 0, 0], Extrapolation.CLAMP),
      height: interpolate(p, [0, 1], [16, 0], Extrapolation.CLAMP),
      marginTop: interpolate(p, [0, 1], [4, 0], Extrapolation.CLAMP),
      overflow: 'hidden' as const,
      transform: [
        {
          translateY: interpolate(p, [0, 1], [0, -4], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View style={style}>
      <Text
        style={[
          styles.tabLabel,
          {color: focused ? colors.RED : colors.GREY_100},
        ]}
        numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
};

const MyTabBar = ({state, descriptors, navigation}: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Size.calcHeight(10));

  const pillStyle = useAnimatedStyle(() => {
    const p = tabBarCompactProgress.value;
    const scale = interpolate(p, [0, 1], [1, 0.83], Extrapolation.CLAMP);
    return {
      transform: [{scale}],
    };
  });

  const rowStyle = useAnimatedStyle(() => {
    const p = tabBarCompactProgress.value;
    return {
      paddingVertical: interpolate(p, [0, 1], [6, 10], Extrapolation.CLAMP),
    };
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, {paddingBottom: bottomPad}]}>
      <Animated.View style={[styles.pill, pillStyle]}>
        {Platform.OS === 'ios' ? (
          <CommunityBlur
            blurType="dark"
            blurAmount={28}
            reducedTransparencyFallbackColor="rgba(20,20,20,0.92)"
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <View style={StyleSheet.absoluteFillObject}>
            <AndroidBlur
              backgroundColor="rgba(18, 18, 18, 0.72)"
              blurRadius={40}
            />
          </View>
        )}
        <View style={styles.border} pointerEvents="none" />

        <Animated.View style={[styles.row, rowStyle]}>
          {state.routes.map((route, index) => {
            const {options} = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;

            const isFocused = state.index === index;
            const labelText =
              typeof label === 'string' ? label : route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? {selected: true} : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}>
                <View style={styles.tabInner}>
                  {labelText === 'Home' &&
                    (isFocused ? <FHomeIcon /> : <HomeIcon />)}
                  {labelText === 'Live' && (
                    <View style={styles.liveIconWrap}>
                      {isFocused ? <FLiveIcon /> : <LiveIcon />}
                    </View>
                  )}
                  {labelText === 'Upcoming' &&
                    (isFocused ? <FUpcomingIcon /> : <UpcomingIcon />)}
                  {labelText === 'Library' &&
                    (isFocused ? <FLibraryIcon /> : <Library />)}
                  <TabLabel
                    text={labelText}
                    focused={isFocused}
                    compact={tabBarCompactProgress}
                  />
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export default MyTabBar;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: Size.calcWidth(24),
    paddingTop: Size.calcHeight(8),
  },
  pill: {
    overflow: 'hidden',
    alignSelf: 'center',
    width: '90%',
    borderRadius: 999,
    minHeight: Size.calcHeight(62),
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 18, 0.55)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 16,
        shadowOffset: {width: 0, height: 8},
      },
      android: {
        elevation: 12,
      },
    }),
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Size.calcWidth(6),
    paddingVertical: Size.calcHeight(6),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  liveIconWrap: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Size.calcHeight(6),
    paddingHorizontal: Size.calcWidth(8),
  },
  tabLabel: {
    fontFamily: fonts.ROBOTO_700,
    fontSize: Size.calcWidth(11),
    textAlign: 'center',
  },
});
