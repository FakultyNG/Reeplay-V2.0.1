/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';

import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import AppNavigator from '@/navigation/AppNavigator';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import store from '@/store/app.store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  AppState,
  BackHandler,
  Platform,
  StatusBar,
} from 'react-native';
import {authGet, authSet, AUTH_MMKV_KEYS} from './Utils/authMmkv';
import {addEventListener} from '@react-native-community/netinfo';
import NetInfo from '@react-native-community/netinfo';
import Orientation from 'react-native-orientation-locker';
import './global.css';
import {useAppPersistStore} from './store/zustand.store';
import NetworkComponent from './components/NetworkComponent';
import SessionComponent from './components/SessionComponent';
import ModalComponent from './components/LockComponent';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppToast from '@/components/AppToast';
import {
  generateAESKeys,
  getAESKeys,
  saveAESKeys,
} from '@/Screens/Preview/utils/downloadUtils';
import {SocketContextProvider} from './context/socketContent';
import codePush from '@revopush/react-native-code-push';
import ErrorBoundaryWrapper from './context/ErrorBoundary';
import routes from '@/navigation/routes';
import {hideSystemNavigationBar} from '@/Utils/systemNav';

const LEFT_APP_TIME = AUTH_MMKV_KEYS.LEFT_APP_TIME;

const PUBLIC_ROUTES = new Set<string>([
  routes.SPLASH_SCREEN,
  routes.ONBOARDING_SCREEN,
  routes.AUTH,
  routes.GET_STARTED_SCREEN,
  routes.LOGIN_SCREEN,
  routes.SIGNUP_SCREEN,
  routes.RESET_PASSWORD_SCREEN,
  routes.VEERIFY_PHONE,
  routes.PROFILE_PIC_UPDATE,
  routes.SET_PIN,
  routes.SET_NEW_PIN,
  routes.APP_PIN,
  routes.INTEREST_SCREEN,
]);

function App(): React.JSX.Element {
  const appState = useRef(AppState.currentState);
  const [stage, setStage] = useState<string>('network');
  const [network, setNetwork] = useState<boolean | null>(true);
  const [showNetworkModal, setShowNetworkModal] = useState<boolean>(false);
  const navigationRef = useRef<any>(null);
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>();
  const {isSessionExpired, isLock, setIsLock, setIsSessionExpired} =
    useAppPersistStore();

  // const requestUserPermission = async () => {
  //   await PermissionsAndroid.request(
  //     PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  //   );
  //   const authStatus = await messaging().requestPermission();
  //   const enabled =
  //     authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
  //     authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  //   return enabled;
  // };


//  TODO: ADD EXPIRED SESSION MODAL

  const handleBackButtonPress = () => {
    console.log('checking...');
    if (
      navigationRef.current &&
      navigationRef.current.getCurrentRoute().index === 0
    ) {
      console.log('User pressed back button at index 0');
      return true;
    }
    // return false;
  };

  function refreshNetwork() {
    NetInfo.refresh().then(state => {
      if (state.isConnected) setNetwork(state.isConnected);
    });
  }

  const ensureAESKeysExist = async () => {
  const keys = await getAESKeys();
  if (!keys) {
    const { key, iv } = await generateAESKeys();
    await saveAESKeys(key, iv);
  }
};

  async function checkLockAppLogic() {
    const date = new Date();
    const lastLeftTime = await authGet(LEFT_APP_TIME);
    if (lastLeftTime) {
      if (date.getTime() >= Number(lastLeftTime)) {
        console.log(
          'The difference between the timestamps is greater than or equal to 10 minutes.',
        );
        setIsLock(true);
      } else {
        console.log(
          'The difference between the timestamps is less than 10 minutes.',
        );
      }
    }
  }

  async function setLeftAppTime() {
    const date = new Date();

    await authSet(
      LEFT_APP_TIME,
      date.setTime(date.getTime() + 10 * 60 * 1000).toString(),
    );
  }

  async function handleTest() {
    // if (await requestUserPermission()) {
    //   getToken();

    //   messaging()
    //     .getInitialNotification()
    //     .then(async rm => {
    //       if (rm) {
    //         console.log('Notification: ', rm.notification);
    //       }
    //     });
    // }
  }

  useEffect(() => {
    hideSystemNavigationBar();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        checkLockAppLogic();
        hideSystemNavigationBar();
      }

      appState.current = nextAppState;
      if (appState.current === 'background') {
        console.log('first background');
        setLeftAppTime();
      }
    });

    let backHandler: any = null;
    if (Platform.OS === 'android') {
      backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackButtonPress,
      );
    }

    return () => {
      subscription.remove();
      if (backHandler) {
        backHandler.remove();
      }
    };
  }, []);

  useEffect(() => {
    handleTest();
    ensureAESKeysExist();
    Orientation.lockToPortrait();
  }, []);

  useEffect(() => {
    const unsubscribe = addEventListener(state => {
      setNetwork(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);
  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: '#000',
    },
  };
  const showSessionModal =
    !!isSessionExpired &&
    !!currentRouteName &&
    !PUBLIC_ROUTES.has(currentRouteName);

  return (
    <ErrorBoundaryWrapper>
    <Provider store={store}>
      <SocketContextProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        <SafeAreaProvider style={{flex:1}}>
        <StatusBar backgroundColor="#000" />
        <NavigationContainer
          ref={navigationRef}
          theme={navTheme}
          onReady={() => {
            setCurrentRouteName(navigationRef.current?.getCurrentRoute()?.name);
          }}
          onStateChange={() => {
            const routeName = navigationRef.current?.getCurrentRoute()?.name;
            setCurrentRouteName(routeName);
            if (routeName && PUBLIC_ROUTES.has(routeName)) {
              setIsSessionExpired(false);
            }
          }}>
          {stage !== 'downloadScreen' && <AppNavigator />}
          {isLock && <ModalComponent />}
          {showSessionModal && <SessionComponent />}
          {!network && <NetworkComponent 
          refreshNetwork={refreshNetwork} 
          setStage={setStage}
          stage={stage}
          />}
          <AppToast />
        </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
      </SocketContextProvider>
    </Provider>
    </ErrorBoundaryWrapper>
  );
}


const CodePushRoot = codePush({
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
})(App);

export default CodePushRoot;