import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {InteractionManager} from 'react-native';
import Orientation, {PORTRAIT} from 'react-native-orientation-locker';
import {useAppDispatch} from '@/Hooks/reduxHook';
import {authSet} from '@/Utils/authMmkv';
import {
  getHomeSnapshot,
  hydrateLegacyFlatKeysIntoSnapshot,
  setHomeSnapshot,
} from '@/Utils/contentMmkv';
import {getProfileDetails} from '@/api/profile.api';
import {
  setCredentials,
  setHideTabBar,
  setNoticationsList,
} from '@/store/slices/userSlice';
import {hasUserDetails} from '../../Splashscreen/Splashscreen';
import {getSponsoredLiveEvents} from '@/api/live.api';
import {setSponsoredEventProps} from '@/store/slices/liveEvents/sponsoredSlice';
import {
  deleteContinueWatchingById,
  fetchHomeAds,
  getContinueWatching,
  randomAds,
} from '@/api/content.api';
import {
  setBannerContent,
  setCategories,
  setContinueWatching,
  setGenres,
} from '@/store/slices/bannerSlice.slice';
import {setAdsContent, setHomeAdsContent} from '@/store/slices/adsSlice.slice';
import {resetFullVideo} from '@/store/slices/fullScreenVideo.slice';
import {getAllNotifications} from '@/api/notification.api';
import {setOrientations} from '@/store/slices/orientationSlize';
import {useFocusEffect} from '@react-navigation/native';
import {registerCurrentNotificationDevice} from '@/Utils/notificationDevice';
import {preloadStartupContent} from '@/Utils/startupContentBootstrap';

let notificationDeviceSynced = false;
const HOME_REFRESH_TTL_MS = 60_000;
let accountLastFetchedAt = 0;

export function useHomeBootstrap(isFullscreen: boolean) {
  const dispatch = useAppDispatch();
  const [orientation, setOrientation] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deferHeavyRows, setDeferHeavyRows] = useState(true);
  const loadInFlight = useRef<Promise<void> | null>(null);

  const hydrateFromSnapshot = useCallback(() => {
    const snapshot = getHomeSnapshot() ?? hydrateLegacyFlatKeysIntoSnapshot();
    if (!snapshot) {
      return;
    }
    if (snapshot.banner?.vods) {
      dispatch(setBannerContent(snapshot.banner));
    }
    if (snapshot.categories?.length) {
      dispatch(setCategories(snapshot.categories));
    }
    if (snapshot.genres?.length) {
      dispatch(setGenres(snapshot.genres));
    }
    if (snapshot.continueWatching?.length) {
      dispatch(setContinueWatching(snapshot.continueWatching));
    }

  }, [dispatch]);

  const userProfile = useCallback(async () => {
    try {
      const [res, cW, resAds, homeAds] = await Promise.all([
        getProfileDetails(),
        getContinueWatching({page: 1, limit: 10}),
        randomAds(),
        fetchHomeAds(),
        // Shares the splash request (or resolves immediately from fresh cache).
        preloadStartupContent(),
      ]);

      if (resAds.ok && resAds.data) {
        dispatch(setAdsContent(resAds.data.data));
      }
      if (homeAds.ok && homeAds.data) {
        dispatch(setHomeAdsContent(homeAds.data.data));
      }

      const continueWatchingData =
        cW.ok && cW.data && Array.isArray(cW.data.data)
          ? cW.data.data.filter(x => x.duration !== x.totalDuration)
          : [];
      if (cW.ok && cW.data && Array.isArray(cW.data.data)) {
        const completedContent = cW.data.data.filter(
          x => x.duration === x.totalDuration,
        );

        Promise.all(
          completedContent.map(x =>
            deleteContinueWatchingById(x.watchedDocumentId),
          ),
        ).catch(() => {});

        dispatch(setContinueWatching(continueWatchingData));
      }

      if (res.ok && res.data) {
        dispatch(setCredentials(res.data.data));
        await authSet(hasUserDetails, JSON.stringify(res.data.data));
        if (
          res.data.data.profile.settings_info.allow_notifications &&
          !notificationDeviceSynced
        ) {
          notificationDeviceSynced = await registerCurrentNotificationDevice();
        }
      }

      const prev = getHomeSnapshot();
      setHomeSnapshot({
        banner: prev?.banner,
        categories: prev?.categories,
        genres: prev?.genres,
        continueWatching: cW.ok ? continueWatchingData : prev?.continueWatching,
        fetchedAt: prev?.fetchedAt ?? Date.now(),
      });
    } catch (error) {
      console.log('[HomeScreen] userProfile failed', error);
    }
  }, [dispatch]);

  const getSponsoredEvents = useCallback(async () => {
    try {
      const res = await getSponsoredLiveEvents();
      if (res.ok && res.data) {
        dispatch(setSponsoredEventProps(res.data.data));
      }
    } catch {
      // ignore
    }
  }, [dispatch]);

  const handleNotifications = useCallback(async () => {
    const res = await getAllNotifications({page: 1, limit: 20});
    if (res.ok && res.data) {
      dispatch(setNoticationsList(res.data.data));
    }
  }, [dispatch]);

  const checkOrientation = useCallback(() => {
    Orientation.getOrientation(orient => {
      dispatch(setOrientations(orient));

      if (orient !== PORTRAIT) {
        Orientation.lockToPortrait();
        checkOrientation();
      } else {
        setOrientation(orient);
      }
    });
  }, [dispatch]);

  const loadFunc = useCallback(async (force = false) => {
    if (
      !force &&
      accountLastFetchedAt > 0 &&
      Date.now() - accountLastFetchedAt < HOME_REFRESH_TTL_MS
    ) {
      return;
    }
    if (loadInFlight.current) {
      await loadInFlight.current;
      return;
    }

    const request = (async () => {
      Orientation.lockToPortrait();
      checkOrientation();
      dispatch(resetFullVideo());
      // Catalogue/profile data controls first paint. Secondary account data is
      // fetched only after it so eleven simultaneous requests no longer fight
      // over the mobile connection whenever Home regains focus.
      await userProfile();
      accountLastFetchedAt = Date.now();
      await Promise.allSettled([
        getSponsoredEvents(),
        handleNotifications(),
      ]);
    })();
    loadInFlight.current = request;
    try {
      await request;
    } finally {
      loadInFlight.current = null;
    }
  }, [
    checkOrientation,
    dispatch,
    getSponsoredEvents,
    handleNotifications,
    userProfile,
  ]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await loadFunc(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadFunc]);

  useLayoutEffect(() => {
    hydrateFromSnapshot();
  }, [hydrateFromSnapshot]);

  useFocusEffect(
    useCallback(() => {
      if (!isFullscreen) {
        loadFunc(false);
      }
    }, [isFullscreen, loadFunc]),
  );

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setDeferHeavyRows(false);
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    dispatch(setHideTabBar(isFullscreen));
  }, [dispatch, isFullscreen]);

  return {
    orientation,
    isRefreshing,
    deferHeavyRows,
    handleRefresh,
  };
}
