import {Pressable, StyleSheet, View} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
import {
  AppButton,
  AppImage,
  AppScreen,
  AppText,
  AppView,
  TouchableOpacity,
} from '@/components';
import {
  AccountIcon,
  BigClose,
  CreateADIcon,
  DownloadIcon,
  GiftCardIcon,
  NotificationIcon,
  SettingsIcon,
  SuggestionIcon,
  Watchlists,
} from '@/assets/icons';
import Size from '@/Utils/useResponsiveSize';
import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import {
  AppStackNavigation,
  DashboardNavProps,
} from '@/types/typings';
import routes from '@/navigation/routes';
import colors from '@/configs/colors';
import fonts from '@/configs/fonts';
import appVersion from '@/version.json';
import AppModal from '@/components/AppModal';
import {RootNav} from '@/navigation/AppNavigator';
import {authGet, authMultiRemove, AUTH_MMKV_KEYS} from '@/Utils/authMmkv';
import {HAS_SKIPPED} from '../authentication/components/AuthFormComponent';
import {hasUserDetails} from '../Splashscreen/Splashscreen';
import {useAppDispatch, useAppSelector} from '@/Hooks/reduxHook';
import {
  logout,
  selectUser,
  selectUserProfilePic,
  setWalletInfo,
  setWatchListContents,
} from '@/store/slices/userSlice';
import FastImage from 'react-native-fast-image';
import {checkImageUrlValidity} from '@/Utils/ValidateImageUrl';
import {walletBalance} from '@/api/payment.api';
import {fetchWatchList} from '@/api/watchlist.api';
import {HAS_LOCK_APP} from '../Settings/SettingScreen';
import {clearTokens} from '@/Utils/secureTokenStorage';
import {unregisterNotificationDevice} from '@/Utils/notificationDevice';
import {useAppPersistStore} from '@/store/zustand.store';
import {fetchBackendVersion} from '@/api/version.api';

const tabs = [
  'Account',
  'Downloads',
  'Watchlist',
  'Create AD',
  'Notifications',
  'Suggestions',
  'Giftcards',
  'Settings',
];

const skippedTab = ['Log In', 'About Reeplay'];

const MenuScreen = () => {
  const user = useAppSelector(selectUser);
  const { goBack, navigate } = useNavigation<DashboardNavProps>();
  const navigation = useNavigation<AppStackNavigation>();
  const nav = useNavigation<RootNav>();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);
  const [ads, setAds] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const profilePic = useAppSelector(selectUserProfilePic);
  const [isValidImg, setVallid] = useState<boolean>(false)
  const [backendVersion, setBackendVersion] = useState(
    appVersion.backendVersion,
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchBackendVersion()
        .then(response => {
          if (isActive && response.ok && response.data?.data.version) {
            setBackendVersion(response.data.data.version);
          }
        })
        .catch(() => {
          // Keep the bundled version while the device or backend is unavailable.
        });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const getSkippedState = useCallback(async () => {
    const hasSkipped = await authGet(HAS_SKIPPED);
    if (hasSkipped) {
      setIsSkipped(true);
      return true;
    }
    setIsSkipped(false);
    return false;
  }, []);

  const handleValidImg = useCallback(async () => {
    if (!profilePic) {
      setVallid(false);
      return;
    }
    const valid = await checkImageUrlValidity(profilePic);
    setVallid(valid);
  }, [profilePic]);

  function handleNavigation(selectedTab: string) {
    if (selectedTab === 'Account') navigate(routes.ACCOUNT_SCREEN);
    if (selectedTab === 'Log In')
      navigation.navigate(routes.AUTH, { screen: routes.LOGIN_SCREEN });
    if (selectedTab === 'About Reeplay') nav.navigate(routes.ABOUT_SCREEN);
    if (selectedTab === 'Watchlist') {
      // Watchlist lives on the root stack, not the menu stack.
      nav.navigate(routes.WATCHLIST_SCREEN);
    }
    if (selectedTab === 'Create AD') setAds(true);
    if (selectedTab === 'Notifications') navigate(routes.NOTIFICATION_SCREEN);
    if (selectedTab === 'Suggestions') navigate(routes.SUGGESTION_SCREEN);
    if (selectedTab === 'Giftcards') navigate(routes.GIFT_CARD_SCREEN);
    if (selectedTab === 'Settings') navigation.navigate(routes.SETTINGS_SCREEN);
    if (selectedTab === 'Downloads')
      navigation.navigate(routes.DOWNLOAD_SCREEN);
  }

  async function handleLogout() {
    await unregisterNotificationDevice();
    await clearTokens();
    await authMultiRemove([
      hasUserDetails,
      HAS_LOCK_APP,
      AUTH_MMKV_KEYS.FCM_TOKEN,
    ]);
    useAppPersistStore.getState().setIsSessionExpired(false);
    dispatch(logout());
    setShowModal(false);
    nav.reset({
      index: 0,
      routes: [{ name: routes.AUTH }],
    });
  }

   const getWallet = useCallback(async () => {
      try {
        const res = await walletBalance();
        if (res.ok && res.data) {
          dispatch(setWalletInfo(res.data.data));
        }
      } catch {
        // non-fatal on menu open
      }
    }, [dispatch]);

   const getWatchList = useCallback(async () => {
      try {
        const res = await fetchWatchList({page:1, limit:20});
        if (res.ok && Array.isArray(res.data?.data)) {
          dispatch(setWatchListContents(res.data.data));
        }
      } catch {
        // non-fatal on menu open
      }
    }, [dispatch]);

  useEffect(() => {
    getSkippedState().then(skipped => {
      if (!skipped) {
        getWatchList();
        getWallet();
      }
    });
    handleValidImg();
  }, [getWatchList, getWallet, getSkippedState, handleValidImg, user?._id]);

  const displayName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <>
      <AppScreen scrollable containerStyle={{ paddingTop: Size.calcHeight(20) }}>
        <AppView className="flex-row items-center justify-between">
          {!isSkipped && (
            <AppView className="flex-row items-center gap-x-3">
                <AppImage
                  source={
                    isValidImg && profilePic
                      ? {
                          uri: profilePic,
                          priority: FastImage.priority.high,
                        }
                      : require('@/assets/images/default-user-profile.webp')
                  }
                  style={styles.image}
                />
              <AppText className="font-MANROPE_700 capitalize text-base text-white ml-2">
                {displayName || 'User'}
              </AppText>
            </AppView>
          )}
          <TouchableOpacity className="ml-auto" onPress={goBack}>
            <BigClose />
          </TouchableOpacity>
        </AppView>

        <View className="mt-6 pl-5 flex-1 mb-5">
          {(isSkipped ? skippedTab : tabs).map((tab, i) => {
            return (
              <TouchableOpacity
                onPress={() => handleNavigation(tab)}
                key={i}
                className="my-5 py-1.5 flex-row items-center gap-x-5">
                {(tab === 'Account' || tab === 'Log In') && <AccountIcon />}
                {tab === 'About Reeplay' && <SettingsIcon />}
                {tab === 'Downloads' && <DownloadIcon />}
                {tab === 'Watchlist' && <Watchlists />}
                {tab === 'Create AD' && <CreateADIcon />}
                {tab === 'Notifications' && <NotificationIcon />}
                {tab === 'Suggestions' && <SuggestionIcon />}
                {tab === 'Giftcards' && <GiftCardIcon />}
                {tab === 'Settings' && <SettingsIcon />}
                <AppText className="font-MANROPE_400 text-[14.5px] text-white">
                  {tab}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <AppView className="pl-5 my-10 mt-20">
          <Pressable
            onPress={() =>
              isSkipped
                ? navigation.navigate(routes.AUTH, {
                  screen: routes.SIGNUP_SCREEN,
                })
                : setShowModal(true)
            }>
            <AppText className="font-MANROPE_400 text-sm text-red">
              {isSkipped ? 'Sign Up' : 'Log out'}
            </AppText>
          </Pressable>
          <AppText className="mt-4 font-MANROPE_400 text-sm text-light_blue">
            Reeplay Version {backendVersion}
          </AppText>
        </AppView>
      </AppScreen>

      <AppModal
        isModalVisible={showModal}
        hideCloseBtn
        replaceDefaultContent={
          <AppView className="">
            <AppText className="mt-4 font-ROBOTO_400 text-sm text-black text-center leading-5">
              Are you sure you want to {'\n'}Logout?
            </AppText>

            <AppView className="mt-7" />
            <AppButton
              bgColor={colors.DARK_GREY}
              title="No"
              onPress={() => setShowModal(false)}
              style={styles.btn}
              labelStyle={styles.btnLabel}
            />
            <AppButton
              bgColor={colors.RED}
              title="Yes"
              onPress={async () => await handleLogout()}
              style={styles.btn}
              labelStyle={styles.btnLabel}
            />
            <AppView className="mb-3" />
          </AppView>
        }
        handleClose={() => setShowModal(false)}
      />

      <AppModal
        isModalVisible={ads}
        redCloseBtn
        LogoStyle={{ marginBottom: -30, marginTop: -15 }}
        style={{ height: 383 }}
        replaceDefaultContent={
          <AppView className="mb-3 mt-5 items-center">
            <AppText className="mt-5 leading-5 font-ROBOTO_500 text-[14px] text-black text-center">
              Sorry, you are not authorized {'\n'}to create Ads.
            </AppText>
            <AppText className="mt-5 leading-5 font-ROBOTO_400 text-[14px] text-black text-center">
              Kindly go through a {'\n'} licensed agent, who already has a
              relationship with Reeplay.
            </AppText>
          </AppView>
        }
        handleClose={() => setAds(false)}
      />
    </>
  );
};

export default MenuScreen;

const styles = StyleSheet.create({
  image:{
                    width: 40,
                    height: 40,
                    borderRadius: 99,
                  },
  btnLabel: {
    fontFamily: fonts.ROBOTO_700,
    fontSize: 16,
    color: colors.GREY_100,
    marginLeft: 8,
    marginTop: 1,
  },
  btn: {
    width: Size.getWidth() * 0.4,
    paddingTop: Size.calcHeight(9),
    paddingBottom: Size.calcHeight(8),
    borderRadius: 4,
    marginVertical: 5,
  },
});
