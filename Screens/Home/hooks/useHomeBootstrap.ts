import {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {InteractionManager} from 'react-native';
import Orientation, {PORTRAIT} from 'react-native-orientation-locker';
import FastImage from 'react-native-fast-image';
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
  setWalletInfo,
} from '@/store/slices/userSlice';
import {hasUserDetails} from '../../Splashscreen/Splashscreen';
import {getSponsoredLiveEvents} from '@/api/live.api';
import {setSponsoredEventProps} from '@/store/slices/liveEvents/sponsoredSlice';
import {
  bannerApi,
  contentCostApi,
  deleteContinueWatchingById,
  fetchEnums,
  fetchHomeAds,
  getContinueWatching,
  randomAds,
} from '@/api/content.api';
import {
  setBannerContent,
  setCategories,
  setContinueWatching,
  setGenres,
  setPremiumContentCost,
} from '@/store/slices/bannerSlice.slice';
import {setAdsContent, setHomeAdsContent} from '@/store/slices/adsSlice.slice';
import {walletBalance} from '@/api/payment.api';
import {resetFullVideo} from '@/store/slices/fullScreenVideo.slice';
import {getAllNotifications} from '@/api/notification.api';
import {setOrientations} from '@/store/slices/orientationSlize';
import {useFocusEffect} from '@react-navigation/native';
import {registerCurrentNotificationDevice} from '@/Utils/notificationDevice';

let notificationDeviceSynced = false;

export function useHomeBootstrap(isFullscreen: boolean) {
  const dispatch = useAppDispatch();
  const [orientation, setOrientation] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deferHeavyRows, setDeferHeavyRows] = useState(true);

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

    const posterUris = (snapshot.banner?.vods ?? [])
      .slice(0, 6)
      .map(v => v.portraitPhoto)
      .filter(Boolean)
      .map(uri => ({
        uri,
        priority: FastImage.priority.high,
        cache: FastImage.cacheControl.immutable,
      }));
    if (posterUris.length) {
      FastImage.preload(posterUris);
    }
  }, [dispatch]);

  const getWallet = useCallback(async () => {
    const res = await walletBalance();
    if (res.ok && res.data) {
      dispatch(setWalletInfo(res.data.data));
    }
  }, [dispatch]);

  const handlePremiumContentCost = useCallback(async () => {
    const res = await contentCostApi();
    if (res.ok && res.data) {
      dispatch(setPremiumContentCost(res.data.data));
    }
  }, [dispatch]);

  const userProfile = useCallback(async () => {
    try {
      const [res, banner, categories, genres, cW, resAds, homeAds] = await Promise.all([
        getProfileDetails(),
        bannerApi(),
        fetchEnums('categories'),
        fetchEnums('genres'),
        getContinueWatching({page: 1, limit: 10}),
        randomAds(),
        fetchHomeAds(),
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

      const categoryData = categories.data?.data;
      const genreData = genres.data?.data;
      if (categories.ok && Array.isArray(categoryData)) {
        dispatch(setCategories(categoryData));
      }
      if (genres.ok && Array.isArray(genreData)) {
        dispatch(setGenres(genreData));
      }
      if (banner.ok && banner.data?.data?.vods) {
        dispatch(setBannerContent(banner.data.data));
        const preload = (banner.data.data.vods ?? [])
          .slice(0, 6)
          .map((v: {portraitPhoto?: string}) => v.portraitPhoto)
          .filter((uri): uri is string => Boolean(uri))
          .map(uri => ({
            uri,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }));
        if (preload.length) {
          FastImage.preload(preload);
        }
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
        banner:
          banner.ok && banner.data?.data?.vods
            ? banner.data.data
            : prev?.banner,
        categories:
          categories.ok && Array.isArray(categoryData)
            ? categoryData
            : prev?.categories,
        genres:
          genres.ok && Array.isArray(genreData)
            ? genreData
            : prev?.genres,
        continueWatching: cW.ok ? continueWatchingData : prev?.continueWatching,
        fetchedAt: Date.now(),
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

  const loadFunc = useCallback(async () => {
    Orientation.lockToPortrait();
    checkOrientation();
    dispatch(resetFullVideo());
    await Promise.allSettled([
      userProfile(),
      getSponsoredEvents(),
      getWallet(),
      handlePremiumContentCost(),
      handleNotifications(),
    ]);
  }, [
    checkOrientation,
    dispatch,
    getSponsoredEvents,
    getWallet,
    handleNotifications,
    handlePremiumContentCost,
    userProfile,
  ]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await loadFunc();
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
        loadFunc();
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
