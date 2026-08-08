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

const MyTabBar = ({state, descriptors, navigation}: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Size.calcHeight(10));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, {paddingBottom: bottomPad}]}>
      <View style={styles.pill}>
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

        <View style={styles.row}>
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
                <View
                  style={[
                    styles.tabInner,
                    isFocused && styles.tabInnerActive,
                  ]}>
                  {labelText === 'Home' &&
                    (isFocused ? <FHomeIcon /> : <HomeIcon />)}
                  {labelText === 'Live' &&
                    (isFocused ? <FLiveIcon /> : <LiveIcon />)}
                  {labelText === 'Upcoming' &&
                    (isFocused ? <FUpcomingIcon /> : <UpcomingIcon />)}
                  {labelText === 'Library' &&
                    (isFocused ? <FLibraryIcon /> : <Library />)}
                  <Text
                    style={[
                      styles.tabLabel,
                      {color: isFocused ? colors.RED : colors.GREY_100},
                    ]}>
                    {labelText}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
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
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Size.calcHeight(6),
    paddingHorizontal: Size.calcWidth(8),
    borderRadius: 999,
  },
  tabInnerActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  tabLabel: {
    marginTop: Size.calcHeight(4),
    fontFamily: fonts.ROBOTO_700,
    fontSize: Size.calcWidth(11),
  },
});
