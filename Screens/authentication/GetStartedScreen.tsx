import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
} from 'react-native';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AppButton,
  AppText,
  AppVideo,
  AppView,
  TouchableOpacity,
} from '@/components';
import { BiometricsIcon, MuteIcon, UnmuteIcon } from '@/assets/icons';
import useToggle from '@/Hooks/useToggle';
import colors from '@/configs/colors';
import Size from '@/Utils/useResponsiveSize';
import fonts from '@/configs/fonts';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import { useAppDispatch, useAppSelector } from '@/Hooks/reduxHook';
import { selectUser } from '@/store/slices/userSlice';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import routes from '@/navigation/routes';
import { authGet, AUTH_MMKV_KEYS } from '@/Utils/authMmkv';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { VideoRef } from 'react-native-video';
import { randomAds } from '@/api/content.api';
import { selectAdsContent, setAdsContent } from '@/store/slices/adsSlice.slice';
import { RootNav } from '@/navigation/AppNavigator';
import { AuthParamsNavigator } from '@/navigation/AuthNavigation';
import { useAppPersistStore } from '@/store/zustand.store';
import PrivacyScreen from '../support/PrivacyScreen';
import TermScreen from '../support/TermScreen';
import { setCategories } from '@/store/slices/bannerSlice.slice';
import { contentGetJson, CONTENT_MMKV_KEYS } from '@/Utils/contentMmkv';
import {useGuestAccessStore} from '@/store/guestAccess.store';
import {startGuestSession} from '@/Utils/guestAccess';

export const HAS_SET_NEWPIN = AUTH_MMKV_KEYS.HAS_SET_NEWPIN;
const HAS_LOCK_APP = AUTH_MMKV_KEYS.HAS_LOCK_APP;

const GetStartedScreen = ({ handleFunc, screen }: { handleFunc?: () => void, screen?: "getStarted" | "pin" }) => {
  const { replace, navigate, getParent } = useNavigation<AuthParamsNavigator>();
  const navigation = useNavigation<RootNav>();
  const videoRef = useRef<VideoRef>(null);
  const [toogle, setToogle] = useToggle(false);
  const user = useAppSelector(selectUser);
  const [lock, setLock] = useState(false);
  const [biometricsIsSupport, setBiometricsIsSupport] = useState(true);
  const isFocused = useIsFocused();
  const rnBiometrics = new ReactNativeBiometrics();
  const dispatch = useAppDispatch();
  const ads = useAppSelector(selectAdsContent).ads
  const { isLock, setIsLock, isSessionExpired, biometrics } = useAppPersistStore()
  const [modal, setModal] = useState<'privacy' | 'terms' | null>(null)
  const [adsReady, setAdsReady] = useState(ads.length > 0);
  const [videoReady, setVideoReady] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const guestAccessEnabled = useGuestAccessStore(state => state.enabled);
  const adVideoUrl = ads[currentAdIndex]?.videoUrl;
  const videoSource = adVideoUrl
    ? { uri: adVideoUrl }
    : require('@/assets/videos/getStartedVideo.mp4');

  const handleAdEnd = () => {
    if (ads.length <= 1) return;
    setVideoReady(false);
    setCurrentAdIndex(index => (index + 1) % ads.length);
  };

  async function handleLogin() {
    if (lock) {
      const hasPin = await authGet(HAS_SET_NEWPIN);
      console.log(hasPin)
      if (hasPin) {
        if (handleFunc) {
          handleFunc()
        } else {
          navigate(routes.APP_PIN);
        }
      } else {
        replace(routes.SET_PIN);
      }
    } else {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: routes.TAB_MAIN,
          },
        ],
      });
    }
  }

  async function handleGuestAccess() {
    await startGuestSession();
    navigation.reset({index: 0, routes: [{name: routes.TAB_MAIN}]});
  }

  async function getLockState() {
    const lockState = await authGet(HAS_LOCK_APP);
    if (lockState) {
      setLock(JSON.parse(lockState));
      console.log(lockState)
    }

    try {
      const res = await randomAds();
      if (res.ok && res.data) dispatch(setAdsContent(res.data.data))
    } catch (error) {
      console.log(error);
    } finally {
      setAdsReady(true);
    }
  }

  function handleLockPress() {
    if (!lock)
      Alert.alert('Turn on the Lock App feature in settings to use biometrics');
    if (!biometricsIsSupport)
      Alert.alert('Sorry, your device has no biometrics settings active.');
    if (lock && biometricsIsSupport) {
      rnBiometrics
        .simplePrompt({ promptMessage: 'Confirm biometrics' })
        .then(resultObject => {
          const { success } = resultObject;

          if (success) {
            console.log('successful biometrics provided');
            if (isLock) {
              setIsLock(false)
            } else {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: routes.TAB_MAIN,
                  },
                ],
              });
            }
          } else {
            console.log('user cancelled biometric prompt');
          }
        })
        .catch(() => {
          console.log('biometrics failed');
        });
    }
  }

  async function checkBiometrics() {
    rnBiometrics.isSensorAvailable().then(resultObject => {
      const { available, biometryType } = resultObject;

      if (
        !available &&
        (biometryType !== BiometryTypes.TouchID ||
          biometryType !== BiometryTypes.FaceID ||
          biometryType === BiometryTypes.Biometrics)
      ) {
        console.log('TouchID is not supported');
        setBiometricsIsSupport(false);
      } else {
        setBiometricsIsSupport(true);
      }
    });
  }

  async function handleFetchCache() {
    const dataC = contentGetJson<unknown[]>(CONTENT_MMKV_KEYS.CATEGORY);
    const dataG = contentGetJson<unknown[]>(CONTENT_MMKV_KEYS.GENRE);
    const dataB = contentGetJson<unknown>(CONTENT_MMKV_KEYS.BANNER);

    if (dataC) dispatch(setCategories(dataC as any))
    if (dataG) dispatch(setCategories(dataG as any))
    if (dataB) dispatch(setCategories(dataB as any))
  }

  useEffect(() => {
    handleFetchCache();
  }, []);

  useLayoutEffect(() => {
    if (!getParent()) setIsLock(false)
    // backgroundLogin();
    getLockState();
    checkBiometrics();
  }, []);

  console.log(user)

  useEffect(() => {
    if (!isFocused) {
      setVideoReady(false);
    }
  }, [isFocused]);

  useEffect(() => {
    // A newly fetched list is already randomized by the API. Starting at zero
    // keeps the existing restart behaviour while playback rotates thereafter.
    setCurrentAdIndex(0);
  }, [ads]);

  return (
    <AppView className="relative" style={{ backgroundColor: colors.DEEP_BLACK }}>
      <StatusBar hidden />
      {isFocused && adsReady && (
        <AppVideo
          key={ads[currentAdIndex]?._id ?? 'welcome-fallback'}
          source={videoSource}
          videoRef={videoRef}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          muted={toogle}
          paused={modal !== null || isSessionExpired || (isLock && !screen)}
          controls={false}
          repeat={ads.length <= 1}
          onEnd={handleAdEnd}
          onReadyForDisplay={() => setVideoReady(true)}
          onLoad={() => setVideoReady(true)}
          onError={() => setVideoReady(true)}
        />
      )}

      {(!adsReady || !videoReady) && (
        <AppView style={styles.loadingOverlay} pointerEvents="none">
          <LottieView
            source={require('@/assets/icons/RPlay.json')}
            autoPlay
            loop
            style={styles.loadingLogo}
          />
        </AppView>
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,1)']}
        style={styles.gradientStyles}
      />

      <AppView className="absolute top-5 left-5 z-[99px]">
        <TouchableOpacity onPress={setToogle}>
          {toogle ? (
            <MuteIcon
              style={{
                marginTop: Platform.OS === 'ios' ? 29 : 18,
                marginBottom: 20,
                marginLeft: 3,
              }}
            />
          ) : (
            <UnmuteIcon style={{ marginTop: Platform.OS === 'ios' ? 0 : -10 }} />
          )}
        </TouchableOpacity>
        {user._id !== '' && (
          <>
            <AppText className="-mt-1 text-[24px] text-white font-LEXEND_700">
              Welcome back
            </AppText>
            <AppText
              style={Platform.OS === 'ios' && { marginTop: -3 }}
              className="capitalize text-[24px] -mt-[8px] text-white font-LEXEND_700">
              {user.first_name}
            </AppText>
            <AppText className="text-base -mt-[2px] text-white font-MANROPE_400">
              Login to continue
            </AppText>
          </>
        )}
      </AppView>

      <AppView className="absolute bottom-8 z-[99px] items-center w-full">
        {(user._id !== '' || isLock) ? (
          <AppView className="flex-row items-center justify-center gap-x-1">
            <AppButton
              title="Continue to Login"
              bgColor={colors.RED}
              onPress={handleLogin}
              style={{
                borderRadius: 0,
                width: Size.getWidth() * 0.5,
                height: 51,
                paddingVertical: Size.calcHeight(14),
              }}
              labelStyle={styles.labelStyle}
            />
            <TouchableOpacity
              onPress={handleLockPress}
              activeOpacity={0.7}
              disabled={!biometrics}
              style={{
                backgroundColor: (!biometricsIsSupport || !biometrics)
                  ? colors.GREY_BIOMETRICS
                  : !lock
                    ? colors.GREY_BIOMETRICS
                    : colors.RED,
              }}
              className="px-6 py-[6px]">
              <BiometricsIcon />
            </TouchableOpacity>
          </AppView>
        ) : (
          <>
            <AppButton
              title="Login"
              bgColor="transparent"
              onPress={() => replace(routes.LOGIN_SCREEN)}
              style={styles.loginBtn}
              labelStyle={styles.labelStyle}
            />

            <AppButton
              title={guestAccessEnabled ? 'SKIP' : 'Create a New Account'}
              bgColor={colors.RED}
              onPress={guestAccessEnabled ? handleGuestAccess : () => replace(routes.SIGNUP_SCREEN)}
              style={{ marginTop: Size.calcHeight(20) }}
              labelStyle={styles.labelStyle}
            />
          </>
        )}

        <AppView className="mt-5 mb-2 flex-row items-center justify-center gap-x-1">
          <AppText style={styles.privacyText}>Read the</AppText>
          <Pressable onPress={() => setModal('terms')}>
            <AppText style={[styles.privacyText, styles.underline]}>
              Terms
            </AppText>
          </Pressable>
          <AppText style={styles.privacyText}>of Use and</AppText>
          <Pressable onPress={() => setModal('privacy')}>
            <AppText style={[styles.privacyText, styles.underline]}>
              Privacy Policy
            </AppText>
          </Pressable>
        </AppView>
      </AppView>

      <Modal visible={modal !== null} onRequestClose={() => setModal(null)} animationType='slide'>
        {modal === 'privacy' ?
          <PrivacyScreen handleFunc={() => setModal(null)} />
          :
          <TermScreen handleFunc={() => setModal(null)} />
        }
      </Modal>
    </AppView>
  );
};

export default GetStartedScreen;

const styles = StyleSheet.create({
  loginBtn: {
    borderColor: 'white',
    borderWidth: 2,
  },
  privacyText: {
    fontFamily: fonts.ROBOTO_400,
    fontSize: Size.calcHeight(15),
    color: colors.GREY_100,
  },
  underline: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.GREY_100,
  },
  gradientStyles: {
    width: '100%',
    height: '100%',
    zIndex: 1,
    position: 'absolute',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.DEEP_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    height: Size.hp(100)
  },
  loadingLogo: {
    width: 340,
    height: 340,
  },
  labelStyle: {
    fontSize: 13,
    fontFamily: fonts.MANROPE_700,
    color: '#E5E5E5',
  },
});
