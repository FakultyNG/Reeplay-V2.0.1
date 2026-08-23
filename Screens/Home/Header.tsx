import {Animated, Platform, StyleSheet, View} from 'react-native';
import React, {memo} from 'react';
import {AppImage, AppView, TouchableOpacity} from '@/components';
import Size from '@/Utils/useResponsiveSize';
import {HamBurger, SearchIcon} from '@/assets/icons';
import {useNavigation} from '@react-navigation/native';
import routes from '@/navigation/routes';
import BlurView from 'react-native-blur-effect';
import {BlurView as Blur} from '@react-native-community/blur';
import {RootNav} from '@/navigation/AppNavigator';

/** Fade fully in over a short distance so blur tracks the finger, not a remount. */
const BLUR_FADE_DISTANCE = 12;

interface HeaderProps {
  scrollY: Animated.Value;
  isCast?: boolean;
}

const Header = ({scrollY, isCast}: HeaderProps) => {
  const {navigate} = useNavigation<RootNav>();

  const blurOpacity = scrollY.interpolate({
    inputRange: [0, BLUR_FADE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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
    <View style={[styles.container, isCast && styles.cast]}>
      <Animated.View
        pointerEvents="none"
        collapsable={false}
        style={[StyleSheet.absoluteFillObject, {opacity: blurOpacity}]}>
        {Platform.OS === 'ios' ? (
          <Blur
            overlayColor="transparent"
            blurType="dark"
            blurAmount={5}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <BlurView
            backgroundColor="rgba(0, 0, 0, 0.4)"
            blurRadius={5}
          />
        )}
      </Animated.View>

      {Platform.OS === 'android' ? (
        <AppView
          style={[
            {
              justifyContent: isCast ? 'center' : 'flex-end',
              height: Size.hp(12),
            },
            isCast && {paddingTop: 25},
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
    zIndex: 10,
    width: '100%',
    height: Platform.OS === 'ios' ? Size.hp(12) : Size.hp(10),
    justifyContent: 'flex-end',
  },
  cast: {
    height: Platform.OS === 'ios' ? Size.calcHeight(110) : Size.calcHeight(115),
    justifyContent: 'center',
    paddingTop: 30,
  },
});
