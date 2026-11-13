import {Keyboard, Platform, ScrollView, StatusBar, StyleSheet, View} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import FastImage from 'react-native-fast-image';
import {AppImage, AppText} from '@/components';
import Size from '@/Utils/useResponsiveSize';
import AuthFormComponent from './components/AuthFormComponent';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '@/navigation/AuthNavigation';
import {RootStackParamList} from '@/navigation/AppNavigator';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SignUpNavigationProps = NativeStackScreenProps<AuthStackParamList>;

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

const SignUpScreen = () => {
  const [keyboardStatus, setKeyboardStatus] = useState<boolean>(false);
  const ref = useRef<ScrollView|null>(null)
  const {bottom} = useSafeAreaInsets()


  useEffect(() => {
    const showKeyboard = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardStatus(true);
    });
    const hideKeyboard = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardStatus(false);
      if(ref.current) ref.current.scrollTo(0)
    });

    return () => {
      showKeyboard.remove();
      hideKeyboard.remove();
    };
  }, [Keyboard]);

  return (
    <>
      <View
        style={{
          position: 'relative',
          width: '100%',
        }}>
        <StatusBar hidden />

        <FastImage
          source={require('@/assets/images/Login-bg.png')}
          style={styles.imageContainer}
        />

        <LinearGradient
          colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.95)', 'rgba(0,0,0,0.99)']}
          style={[styles.gradientStyles]}
        />

        <AppImage
          source={require('@/assets/images/authLogo.png')}
          style={{
            width: 300,
            height: 200,
            marginTop: Size.getHeight() < 668 ? 10 : 50 - bottom,
            alignSelf: 'center',
          }}
          resizeMode='contain'
        />

        <AppText
          style={{
            marginTop: Size.getHeight() < 668 ? -30 : -24,
          }}
          className="font-MANROPE_600 text-white text-xl text-center -mt-3">
          Create an Account
        </AppText>
        <AppText className="text-base text-white font-MANROPE_400 text-center">
          Watch your favorite contents.
        </AppText>

        <ScrollView
        ref={ref}
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={{
            paddingHorizontal: Size.calcHeight(20),
            marginTop: Size.getHeight() < 668 ? 12 : 0,
            width: '100%',
            height:'70%',
          }}
          contentContainerStyle={{
            paddingBottom: keyboardStatus
              ? Size.hp(25)
              : Platform.OS === 'ios'
              ? 350
              : 0,
          }}>
          <AuthFormComponent screen="signUp" />
        </ScrollView>
      </View>
    </>
  );
};

export default SignUpScreen;

const styles = StyleSheet.create({
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    alignSelf: 'center',
    justifyContent: 'center',
    objectFit: 'contain',
    top: 0,
  },
  gradientStyles: {
    height: Size.getHeight() + 300,
    width: Size.getWidth(),
    // zIndex: 10,
    position: 'absolute',
  },
});
