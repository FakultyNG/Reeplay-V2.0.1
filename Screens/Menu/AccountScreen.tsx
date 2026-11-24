import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  AppButton,
  AppImage,
  AppScreen,
  AppText,
  AppView,
  TouchableOpacity,
} from '@/components';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  AccountDashboard,
  ArrowRight,
  EditIcon,
  PasswordDashboard,
  PinDashboard,
} from '@/assets/icons';
import colors from '@/configs/colors';
import Size from '@/Utils/useResponsiveSize';
import routes from '@/navigation/routes';
import AppModal from '@/components/AppModal';
import fonts from '@/configs/fonts';
import { useAppDispatch, useAppSelector } from '@/Hooks/reduxHook';
import {
  selectUser,
  selectUserProfilePic,
  setCredentials,
} from '@/store/slices/userSlice';
import { pickSingleImage } from '@/Utils/MediaPicker';
import {
  getProfileDetails,
  updateProfileDetails,
  uploadProfile,
} from '@/api/profile.api';
import { formatDate } from '@/Utils/formatTime';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import FastImage from 'react-native-fast-image';
import { checkImageUrlValidity } from '@/Utils/ValidateImageUrl';
import { RootNav } from '@/navigation/AppNavigator';
import { MenuNavigatorParams } from '@/navigation/AppStack';
import ToastNotification from '@/components/ToastNotifications';

const AccountScreen = () => {
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const { navigate, goBack } = useNavigation<MenuNavigatorParams>();
  const user = useAppSelector(selectUser);
  const profilePic = useAppSelector(selectUserProfilePic);
  const nav = useNavigation<RootNav>();
  const [showModal, setShowModal] = useState<'logout'|null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isValidImg, setVallid] = useState<boolean>(false)

  async function handleValidImg() {
    const valid = await checkImageUrlValidity(profilePic)
    setVallid(valid)
  }

  const openGallery = async () => {
    setLoading(true);
    const result = await pickSingleImage();
    if (result && result.uri && result.fileName && result.type) {
      let data = new FormData();
      data.append('photo', {
        uri: result.uri,
        name: result.fileName,
        type: result.type,
      });

        const profileRes = await updateProfileDetails(data, user._id);
        if (profileRes.ok && profileRes.data) {
          const profile = await getProfileDetails();
          if (profile.ok && profile.data) {
            dispatch(setCredentials(profile.data.data));
            setLoading(false);
          }
        } else {
          ToastNotification('error', `${profileRes.data?.message}`)
          setLoading(false);
        }
    }
  };

  function handleLogout() {
    nav.navigate(routes.AUTH);
    setShowModal(null);
  }

  useEffect(() => {
    handleValidImg();
  }, [isFocused]);

  useEffect(() =>{
    handleValidImg();
  }, [profilePic])


  return (
    <>
      <AppScreen scrollable containerStyle={{ paddingTop: 20 }}>
        <TouchableOpacity onPress={goBack}>
          <AppText className="font-ROBOTO_400 text-white text-[15px]">
            Back
          </AppText>
        </TouchableOpacity>

        <AppView className="flex-row items-center justify-between mt-3">
          <AppView className="flex-row items-center gap-x-[14px]">
            <AppView className="relative items-center justify-center">
                <AppImage
                  source={!isValidImg ? require('@/assets/images/default-user-profile.webp') :{
                    uri: profilePic,
                    priority: FastImage.priority.high,
                  }}
                  style={styles.image}
                />
              

              {loading && (
                <ActivityIndicator
                  size={16}
                  color={colors.WHITE}
                  style={{ position: 'absolute' }}
                />
              )}
            </AppView>

            <AppView>
              <AppText className="font-MANROPE_700 capitalize text-white text-lg">
                {user.first_name} {user.last_name}
              </AppText>
              <AppText className="font-MANROPE_400 text-grey_100 text-[14px]">
                Joined {formatDate(user.createdAt)}
              </AppText>
            </AppView>
          </AppView>

          <TouchableOpacity onPress={openGallery}>
            <EditIcon />
          </TouchableOpacity>
        </AppView>

        {/* Body */}
        <AppView className="mt-11">
          <AppText className="font-MANROPE_500 text-[16px] text-white uppercase">
            ACCOUNT
          </AppText>
          <AppView className="mt-3 pt-5 pb-7 pl-4 pr-5 border border-[#C4C4C445] rounded-md bg-[#1A1A1AD9]">
            <TouchableOpacity
              onPress={() => navigate(routes.CHANGE_EMAIL)}
              className="flex-row items-center justify-between my-4">
              <AppView className="flex-row items-center">
                <AccountDashboard />
                <AppText className="ml-2 font-MANROPE_400 text-base text-white">
                  {user.email}
                </AppText>
              </AppView>
              {/* Arroa */}
              <ArrowRight />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigate(routes.CHANGE_PASSWORD)}
              className="flex-row items-center justify-between my-4">
              <AppView className="flex-row items-center">
                <PasswordDashboard />
                <AppText className="ml-2 font-MANROPE_400 text-base text-white">
                  Change Password
                </AppText>
              </AppView>
              {/* Arroa */}
              <ArrowRight />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigate(routes.CHANGE_PIN)}
              className="flex-row items-center justify-between my-4">
              <AppView className="flex-row items-center">
                <PinDashboard />
                <AppText className="ml-2 font-MANROPE_400 text-base text-white">
                  Change Pin
                </AppText>
              </AppView>
              {/* Arroa */}
              <ArrowRight />
            </TouchableOpacity>

          </AppView>
        </AppView>

        <AppView className="mt-10">
          <AppText className="font-MANROPE_500 text-[16px] text-white uppercase">
            Purchases
          </AppText>
          <AppView className="mt-3 rounded-xl border border-white/10 bg-[#1A1A1AD9] px-5 py-5">
            <AppText className="font-MANROPE_500 text-[15px] text-white">
              Pay only when you choose a premium title
            </AppText>
            <AppText className="mt-2 font-MANROPE_400 text-[13px] leading-5 text-grey_500">
              Movies and seasons are purchased securely through the App Store or Google Play. Access lasts 30 days and works on your Reeplay account across devices.
            </AppText>
          </AppView>
        </AppView>

        <AppView className="mt-6 ml-6 mb-10">
          <Pressable
            onPress={() =>
              setShowModal('logout')
            }>
            <AppText className=" font-MANROPE_400 text-sm text-[#DE3B40]">
              Log out
            </AppText>
          </Pressable>
          <Pressable onPress={() => navigate(routes.DELETE_ACCOUNT_SCREEN)}>
            <AppText className="mt-3 font-MANROPE_400 text-sm text-light_blue">
              Delete account
            </AppText>
          </Pressable>
        </AppView>
      </AppScreen>

      <AppModal
        isModalVisible={showModal !== null}
        replaceDefaultContent={
          <AppView className=" items-center">
            <AppText className="mt-4 font-ROBOTO_400 text-sm text-black text-center leading-5">
              Are you sure you want to log out?
            </AppText>

            <AppView className="mt-7" />
            <AppButton
              bgColor={colors.DARK_GREY}
              title="No"
              onPress={() => setShowModal(null)}
              style={styles.btn}
              labelStyle={styles.btnLabel}
            />
            <AppButton
              bgColor={colors.RED}
              title="Yes"
              onPress={handleLogout}
              style={styles.btn}
              labelStyle={styles.btnLabel}
            />
          </AppView>
        }
        handleClose={() => setShowModal(null)}
      />
    </>
  );
};

export default AccountScreen;

const styles = StyleSheet.create({
  image:{
                    width: 65,
                    height: 65,
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
