import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import React, {useEffect} from 'react';
import colors from '@/configs/colors';
import {useNavigation} from '@react-navigation/native';
import {SplashScreenProps} from '@/types/typings';
import routes from '@/navigation/routes';
import {useAppDispatch} from '@/Hooks/reduxHook';
import {setCredentials} from '@/store/slices/userSlice';
import {HAS_SET_NEWPIN} from '../authentication/GetStartedScreen';
import LottieView from 'lottie-react-native';
import {authGet, authSet, AUTH_MMKV_KEYS} from '@/Utils/authMmkv';
import {useAppPersistStore} from '@/store/zustand.store';
import {preloadStartupContent} from '@/Utils/startupContentBootstrap';

export const HAS_ONBOARD = AUTH_MMKV_KEYS.HAS_ONBOARD;
export const hasUserDetails = AUTH_MMKV_KEYS.USER;
const HAS_LOCK_APP = AUTH_MMKV_KEYS.HAS_LOCK_APP;

const Splashscreen = () => {
  const navigation = useNavigation<SplashScreenProps>();
  const dispatch = useAppDispatch();
  const setIsSessionExpired = useAppPersistStore(s => s.setIsSessionExpired);

  async function handleNav() {
    const hasOnboard = await authGet(HAS_ONBOARD);
    if (hasOnboard) {
      navigation.replace(routes.AUTH);
    } else {
      await authSet(HAS_ONBOARD, 'true');
      navigation.replace(routes.ONBOARDING_SCREEN);
    }
  }

  async function setDefaultLockState() {
    const lockState = await authGet(HAS_LOCK_APP);
    if (!lockState) {
      await authSet(HAS_LOCK_APP, 'true');
    }
  }

  useEffect(() => {
    // Never show session modal on splash / public bootstrap.
    setIsSessionExpired(false);

    const getUser = async () => {
      const user = await authGet(hasUserDetails);
      if (user) {
        const userDetails = JSON.parse(user);
        dispatch(setCredentials(userDetails));
        if (userDetails.profile.pin) {
          await authSet(HAS_SET_NEWPIN, userDetails.profile.pin);
        }
      }
    };

    getUser();
    setDefaultLockState();
    // Do not await this: public home data warms while the animation plays and
    // navigation remains controlled only by the local splash asset.
    preloadStartupContent().catch(() => {
      // Startup remains cache-first when the network is unavailable.
    });
  }, [dispatch, setIsSessionExpired]);

  return (
    <SafeAreaView style={[styles.center, styles.container]}>
      <StatusBar hidden />
      <LottieView
        source={require('@/assets/lottie/ReeplaySplash.lottie')}
        autoPlay
        loop={false}
        speed={1}
        resizeMode="contain"
        style={styles.animation}
        onAnimationFinish={handleNav}
        onAnimationFailure={handleNav}
      />
    </SafeAreaView>
  );
};

export default Splashscreen;

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.DEEP_BLACK,
    position: 'relative',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
