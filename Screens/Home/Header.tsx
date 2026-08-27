import { Platform, StyleSheet, View } from 'react-native';
import React, { memo } from 'react';
import { AppImage, AppView, TouchableOpacity } from '@/components';
import Size from '@/Utils/useResponsiveSize';
import { HamBurger, SearchIcon } from '@/assets/icons';
import { useNavigation } from '@react-navigation/native';
import routes from '@/navigation/routes';
import AndroidBlur from 'react-native-blur-effect';
import { BlurView as CommunityBlur } from '@react-native-community/blur';
import { RootNav } from '@/navigation/AppNavigator';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

const BLUR_FADE_DISTANCE = 16;

interface HeaderProps {
  scrollY: SharedValue<number>;
  isCast?: boolean;
}

const Header = ({ scrollY, isCast }: HeaderProps) => {
  const { navigate } = useNavigation<RootNav>();

  const blurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, BLUR_FADE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const headerRow = (
    <AppView className="flex-row justify-between items-center px-6">
      <TouchableOpacity disabled={isCast} onPress={() => navigate(routes.MAIN)}>
        <HamBurger />
      </TouchableOpacity>

      {!isCast && (
        <>
          <AppImage source={require('@/assets/images/smallLogo.png')} />
          <TouchableOpacity
            onPress={() => navigate(routes.SEARCH_SCREEN)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 99,
              backgroundColor: '#FF1313',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <SearchIcon />
          </TouchableOpacity>
        </>
      )}
    </AppView>
  );

  return (
    <View style={[styles.container, isCast && styles.cast]} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={[styles.blurLayer, blurStyle]}>
        {Platform.OS === 'ios' ? (
          <CommunityBlur
            blurType="dark"
            blurAmount={16}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.72)"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={StyleSheet.absoluteFill}>
            <AndroidBlur
              backgroundColor="rgba(0, 0, 0, 0.4)"
              blurRadius={10}
            />
          </View>
        )}
      </Animated.View>

      {Platform.OS === 'android' ? (
        <AppView
          style={[
            {
              justifyContent: isCast ? 'center' : 'flex-end',
              height: Size.hp(12),
            },
            isCast && { paddingTop: 25 },
          ]}
          className="absolute w-full z-40 pb-3">
          {headerRow}
        </AppView>
      ) : (
        headerRow
      )}
    </View>
  );
};

export default memo(Header);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    elevation: 40,
    width: '100%',
    height: Platform.OS === 'ios' ? Size.hp(12) : Size.hp(10),
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  blurLayer: {
    ...StyleSheet.absoluteFill,
    // backgroundColor: 'rgba(0,0,0,0.72)',
  },
  cast: {
    height: Platform.OS === 'ios' ? Size.calcHeight(110) : Size.calcHeight(115),
    justifyContent: 'center',
    paddingTop: 30,
  },
});
