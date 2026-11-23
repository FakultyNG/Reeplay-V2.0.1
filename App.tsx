/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';

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
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import {
  authGet,
  authMultiRemove,
  authRemove,
  authSet,
  AUTH_MMKV_KEYS,
} from './Utils/authMmkv';
import {addEventListener} from '@react-native-community/netinfo';
import NetInfo from '@react-native-community/netinfo';
import Orientation from 'react-native-orientation-locker';
import './global.css';
import {appPersistStorage, useAppPersistStore} from './store/zustand.store';
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
import ErrorBoundaryWrapper from './context/ErrorBoundary';
import routes from '@/navigation/routes';
import {hideSystemNavigationBar} from '@/Utils/systemNav';
import {BASE_URL} from '@env';
import {clearTokens} from '@/Utils/secureTokenStorage';
import {clearContentCache} from '@/Utils/contentMmkv';
import {getGuestAccessSetting} from '@/api/platformSettings.api';
import {useGuestAccessStore} from '@/store/guestAccess.store';
import {endGuestSession} from '@/Utils/guestAccess';
import LoginRequiredModal from '@/components/LoginRequiredModal';
import messaging from '@react-native-firebase/messaging';
import {
  queueNotificationOpen,
  registerNotificationOpenHandler,
  registerNotificationReceivedHandler,
} from '@/Utils/notificationNavigation';
import {fetchCastDetails, fetchVODNotificationDetails} from '@/api/content.api';
import {setPreviewContent} from '@/store/slices/previewContentSlice';
import {previewContentType} from '@/navigation/AppNavigator';
import {syncRefreshedNotificationToken} from '@/Utils/notificationDevice';
import {getAllNotifications} from '@/api/notification.api';
import {setNoticationsList} from '@/store/slices/userSlice';
import {parseShareDeepLink} from '@/Utils/shareLinks';
import {getAllLiveEvents} from '@/api/live.api';
import {setLiveModalContent} from '@/store/slices/fullScreenVideo.slice';
import {
  flushAnalyticsEvents,
  queueAnalyticsEvent,
  startAnalyticsSession,
  trackScreenView,
} from '@/api/analytics.api';

const LEFT_APP_TIME = AUTH_MMKV_KEYS.LEFT_APP_TIME;
const API_ENVIRONMENT_KEY = 'API_BASE_URL';

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

const GUEST_PROTECTED_ROUTES = new Set<string>([
  routes.DOWNLOAD_SCREEN,
  routes.WATCHLIST_SCREEN,
  routes.CREATE_ADS_SCREEN,
  routes.NOTIFICATION_SCREEN,
  routes.SUGGESTION_SCREEN,
  routes.SETTINGS_SCREEN,
  routes.NOTIFICATION_SCREEN_S,
  routes.ACCOUNT_SCREEN,
  routes.CHANGE_EMAIL,
  routes.CHANGE_PASSWORD,
  routes.CHANGE_PIN,
  routes.ADD_PAYMENT_METHOD,
  routes.SUBSCRIPTION_SCREEN,
  routes.GIFT_CARD_SCREEN,
  routes.TRANSACTION_HISTORY_SCREEN,
  routes.PAYMENT_SCREEN,
  routes.DELETE_ACCOUNT_SCREEN,
  routes.CANCEL_SUBSCRIPTION_SCREEN,
  routes.VOTE_SCREEN,
  routes.INTEREST_SCREEN,
]);

function App(): React.JSX.Element {
  const appState = useRef(AppState.currentState);
  const [stage, setStage] = useState<string>('network');
  const [network, setNetwork] = useState<boolean | null>(null);
  const [isBackendEnvironmentReady, setIsBackendEnvironmentReady] =
    useState(false);
  const navigationRef = useRef<any>(null);
  const [navigationReady, setNavigationReady] = useState(false);
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>();
  const {isSessionExpired, isLock, setIsLock, setIsSessionExpired} =
    useAppPersistStore();
  const {
    isGuest,
    setEnabled: setGuestAccessEnabled,
    setGuest,
    showLoginRequired,
    hideLoginRequired,
    needsAuthRedirect,
    clearAuthRedirect,
  } = useGuestAccessStore();

  useEffect(() => {
    let isMounted = true;

    const migrateBackendEnvironment = async () => {
      try {
        let hasSkipped = (await authGet(AUTH_MMKV_KEYS.HAS_SKIPPED)) === 'true';
        setGuest(hasSkipped);
        const previousBaseUrl = await authGet(API_ENVIRONMENT_KEY);
        if (previousBaseUrl !== BASE_URL) {
          await clearTokens();
          await authMultiRemove([
            AUTH_MMKV_KEYS.USER,
            AUTH_MMKV_KEYS.HAS_SET_NEWPIN,
            AUTH_MMKV_KEYS.HAS_LOCK_APP,
            AUTH_MMKV_KEYS.LEFT_APP_TIME,
            AUTH_MMKV_KEYS.HAS_SKIPPED,
          ]);
          clearContentCache();
          appPersistStorage.clearAll();
          useAppPersistStore.setState({
            userDetails: undefined,
            isSessionExpired: false,
            isLock: false,
            biometrics: false,
            downloadedList: [],
          });
          await authSet(API_ENVIRONMENT_KEY, BASE_URL);
          hasSkipped = false;
        }

        const guestSetting = await getGuestAccessSetting();
        if (guestSetting.ok && guestSetting.data?.data) {
          const enabled = guestSetting.data.data.enabled;
          setGuestAccessEnabled(enabled);
          setGuest(enabled && hasSkipped);
          if (!enabled && hasSkipped) {
            await authRemove(AUTH_MMKV_KEYS.HAS_SKIPPED);
            await clearTokens();
          }
        }
      } finally {
        if (isMounted) {
          setIsBackendEnvironmentReady(true);
        }
      }
    };

    migrateBackendEnvironment();

    return () => {
      isMounted = false;
    };
  }, [setGuest, setGuestAccessEnabled]);

  useEffect(() => {
    const tokenSubscription = messaging().onTokenRefresh(token => {
      syncRefreshedNotificationToken(token).catch(() => {});
    });
    const openedSubscription = messaging().onNotificationOpenedApp(message => {
      queueNotificationOpen({...message.data, _messageId: message.messageId || ''});
    });

    messaging().getInitialNotification().then(message => {
      if (message) {
        queueNotificationOpen({...message.data, _messageId: message.messageId || ''});
      }
    });

    return () => {
      tokenSubscription();
      openedSubscription();
    };
  }, []);

  const openSharedUrl = useCallback(async (url: string) => {
    const shared = parseShareDeepLink(url);
    if (!shared || !navigationRef.current) return;

    if (shared.type === 'cast') {
      const response = await fetchCastDetails(shared.id);
      if (response.ok && response.data?.data) {
        navigationRef.current.navigate(routes.CAST_SCREEN, {
          cast: response.data.data,
          vodId: shared.params.vodId || '',
        });
      }
      return;
    }

    if (shared.type === 'live') {
      const response = await getAllLiveEvents();
      const live = response.ok && response.data
        ? response.data.data.find(item => item._id === shared.id)
        : undefined;
      if (live) store.dispatch(setLiveModalContent(live));
      navigationRef.current.navigate(routes.TAB_MAIN, {
        screen: routes.LIVE_SCREEN,
      });
      return;
    }

    const response = await fetchVODNotificationDetails({_id: shared.id});
    if (!response.ok || !response.data?.data) return;
    const vod = response.data.data;
    store.dispatch(setPreviewContent(vod));
    const content = vod.type?.includes('series')
      ? previewContentType['tv series']
      : vod.type?.includes('music')
        ? previewContentType['music video']
        : previewContentType.film;
    navigationRef.current.navigate(routes.PREVIEW_SCREEN, {
      content,
      videoURL: vod.video ?? '',
    });
  }, []);

  useEffect(() => {
    if (!navigationReady) return;
    const subscription = Linking.addEventListener('url', event => {
      openSharedUrl(event.url).catch(() => {});
    });
    Linking.getInitialURL().then(url => {
      if (url) openSharedUrl(url).catch(() => {});
    });
    return () => subscription.remove();
  }, [navigationReady, openSharedUrl]);

  useEffect(() => registerNotificationReceivedHandler(async data => {
    queueAnalyticsEvent({
      eventType: 'notification_received',
      notificationId: String(data._messageId ?? data.notificationId ?? ''),
    });
    const response = await getAllNotifications({page: 1, limit: 20});
    if (response.ok && response.data) {
      store.dispatch(setNoticationsList(response.data.data));
    }
  }), []);

  useEffect(() => {
    if (!navigationReady) return;

    return registerNotificationOpenHandler(async data => {
      queueAnalyticsEvent({
        eventType: 'notification_open',
        notificationId: String(data._messageId ?? data.notificationId ?? ''),
      });
      let metadata: Record<string, unknown> = {};
      try {
        metadata = data.metadata ? JSON.parse(data.metadata) : {};
      } catch {
        metadata = {};
      }

      const vodId = String(metadata.vodId ?? metadata.videoId ?? metadata.contentId ?? '');
      if (vodId) {
        const response = await fetchVODNotificationDetails({_id: vodId});
        if (response.ok && response.data?.data) {
          const vod = response.data.data;
          store.dispatch(setPreviewContent(vod));
          const content = vod.type?.includes('series')
            ? previewContentType['tv series']
            : vod.type?.includes('video')
              ? previewContentType['music video']
              : previewContentType.film;
          navigationRef.current?.navigate(routes.PREVIEW_SCREEN, {
            content,
            videoURL: vod.video ?? '',
          });
          return;
        }
      }

      if (data.type === 'LIVE_EVENT_REMINDER' || metadata.liveId) {
        const isLiveNow = data.body?.toLowerCase().includes("it's live now") || metadata.destination === 'live';
        navigationRef.current?.navigate(routes.TAB_MAIN, {
          screen: isLiveNow ? routes.LIVE_SCREEN : routes.UPCOMING_SCREEN,
        });
        return;
      }

      navigationRef.current?.navigate(routes.MAIN, {
        screen: routes.NOTIFICATION_SCREEN,
      });
    });
  }, [navigationReady]);

  useEffect(() => {
    if (!needsAuthRedirect || !navigationRef.current) return;
    clearAuthRedirect();
    navigationRef.current.reset({
      index: 0,
      routes: [{name: routes.AUTH}],
    });
  }, [clearAuthRedirect, needsAuthRedirect]);

  const openLogin = async () => {
    hideLoginRequired();
    await endGuestSession();
    navigationRef.current?.reset({
      index: 0,
      routes: [{name: routes.AUTH, params: {screen: routes.LOGIN_SCREEN}}],
    });
  };

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

  const applyNetworkState = useCallback(
    (state: {isConnected: boolean | null; isInternetReachable: boolean | null}) => {
      const isOnline =
        state.isConnected === true && state.isInternetReachable !== false;
      setNetwork(isOnline);

      if (isOnline) {
        setStage('network');
        void flushAnalyticsEvents();
      }
    },
    [],
  );

  function refreshNetwork() {
    NetInfo.refresh().then(applyNetworkState);
  }

  const ensureAESKeysExist = async () => {
  const keys = await getAESKeys();
  if (!keys) {
    const { key, iv } = await generateAESKeys();
    await saveAESKeys(key, iv);
  }
};

  const checkLockAppLogic = useCallback(async () => {
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
  }, [setIsLock]);

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
        startAnalyticsSession();
        void flushAnalyticsEvents();
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
  }, [checkLockAppLogic]);

  useEffect(() => {
    startAnalyticsSession();
    handleTest();
    ensureAESKeysExist();
    Orientation.lockToPortrait();
  }, []);

  useEffect(() => {
    NetInfo.fetch().then(applyNetworkState);
    const unsubscribe = addEventListener(applyNetworkState);

    return () => {
      unsubscribe();
    };
  }, [applyNetworkState]);
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

  if (!isBackendEnvironmentReady) {
    return <GestureHandlerRootView style={{flex: 1, backgroundColor: '#000'}} />;
  }

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
            setNavigationReady(true);
            const routeName = navigationRef.current?.getCurrentRoute()?.name;
            setCurrentRouteName(routeName);
            if (routeName) trackScreenView(routeName);
          }}
          onStateChange={() => {
            const routeName = navigationRef.current?.getCurrentRoute()?.name;
            if (routeName && routeName !== currentRouteName) {
              trackScreenView(routeName, currentRouteName);
            }
            setCurrentRouteName(routeName);
            if (isGuest && routeName && GUEST_PROTECTED_ROUTES.has(routeName)) {
              navigationRef.current?.reset({
                index: 0,
                routes: [{name: routes.TAB_MAIN}],
              });
              showLoginRequired();
              return;
            }
            if (routeName && PUBLIC_ROUTES.has(routeName)) {
              setIsSessionExpired(false);
            }
          }}>
          {stage !== 'downloadScreen' && <AppNavigator />}
          {isLock && <ModalComponent />}
          {showSessionModal && <SessionComponent />}
          <LoginRequiredModal onLogin={openLogin} />
          {network === false && <NetworkComponent 
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


export default App;
