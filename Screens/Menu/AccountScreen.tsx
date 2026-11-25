import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import React, {useCallback, useEffect, useState} from 'react';
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
  ArrowLeft,
  ArrowRight,
  EditIcon,
  PasswordDashboard,
  PinDashboard,
  WalletIcon,
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
} from '@/api/profile.api';
import { formatDate } from '@/Utils/formatTime';
import FastImage from 'react-native-fast-image';
import {checkImageUrlValidity} from '@/Utils/ValidateImageUrl';
import {RootNav} from '@/navigation/AppNavigator';
import {MenuNavigatorParams} from '@/navigation/AppStack';
import ToastNotification from '@/components/ToastNotifications';

type AccountRowProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  divider?: boolean;
};

const AccountRow = ({icon, label, onPress, divider = true}: AccountRowProps) => (
  <TouchableOpacity
    activeOpacity={0.75}
    onPress={onPress}
    style={[styles.accountRow, divider && styles.accountRowDivider]}>
    <AppView style={styles.accountRowContent}>
      <AppView style={styles.accountIcon}>{icon}</AppView>
      <AppText style={styles.accountRowLabel} numberOfLines={1}>
        {label}
      </AppText>
    </AppView>
    <ArrowRight width={8} height={14} />
  </TouchableOpacity>
);

const AccountScreen = () => {
  const dispatch = useAppDispatch();
  const isFocused = useIsFocused();
  const { navigate, goBack } = useNavigation<MenuNavigatorParams>();
  const user = useAppSelector(selectUser);
  const profilePic = useAppSelector(selectUserProfilePic);
  const nav = useNavigation<RootNav>();
  const [showModal, setShowModal] = useState<'logout' | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isValidImg, setValidImage] = useState<boolean>(false);

  const handleValidImg = useCallback(async () => {
    if (!profilePic) {
      setValidImage(false);
      return;
    }
    const valid = await checkImageUrlValidity(profilePic);
    setValidImage(valid);
  }, [profilePic]);

  const openGallery = async () => {
    try {
      setLoading(true);
      const result = await pickSingleImage();
      if (result?.uri && result.fileName && result.type) {
        const data = new FormData();
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
          }
        } else {
          ToastNotification('error', `${profileRes.data?.message}`);
        }
      }
    } catch {
      ToastNotification('error', 'Unable to update profile photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  function handleLogout() {
    nav.navigate(routes.AUTH);
    setShowModal(null);
  }

  useEffect(() => {
    handleValidImg();
  }, [handleValidImg, isFocused]);

  const displayName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();


  return (
    <>
      <AppScreen
        scrollable
        containerStyle={styles.screen}
        scrollContentStyle={styles.scrollContent}>
        <AppView style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goBack}
            style={styles.backButton}>
            <ArrowLeft />
          </TouchableOpacity>
          <AppText style={styles.pageTitle}>Account</AppText>
          <AppView style={styles.headerSpacer} />
        </AppView>

        <AppView style={styles.profileCard}>
          <AppView style={styles.profileImageWrapper}>
            <AppImage
              source={
                isValidImg
                  ? {
                      uri: profilePic,
                      priority: FastImage.priority.high,
                    }
                  : require('@/assets/images/default-user-profile.webp')
              }
              style={styles.image}
            />
            {loading && (
              <AppView style={styles.imageLoadingOverlay}>
                <ActivityIndicator size={18} color={colors.WHITE} />
              </AppView>
            )}
          </AppView>

          <AppView style={styles.profileDetails}>
            <AppText style={styles.profileName} numberOfLines={1}>
              {displayName || 'Reeplay user'}
            </AppText>
            <AppText style={styles.profileEmail} numberOfLines={1}>
              {user.email}
            </AppText>
            <AppText style={styles.joinedText}>
              Joined {formatDate(user.createdAt)}
            </AppText>
          </AppView>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            activeOpacity={0.75}
            disabled={loading}
            onPress={openGallery}
            style={styles.editButton}>
            <EditIcon width={18} height={18} />
          </TouchableOpacity>
        </AppView>

        <AppView style={styles.section}>
          <AppText style={styles.sectionTitle}>ACCOUNT DETAILS</AppText>
          <AppView style={styles.card}>
            <AccountRow
              icon={<AccountDashboard width={24} height={24} />}
              label={user.email}
              onPress={() => navigate(routes.CHANGE_EMAIL)}
            />
            <AccountRow
              icon={<PasswordDashboard width={24} height={24} />}
              label="Change password"
              onPress={() => navigate(routes.CHANGE_PASSWORD)}
            />
            <AccountRow
              icon={<PinDashboard width={24} height={24} />}
              label="Change PIN"
              divider={false}
              onPress={() => navigate(routes.CHANGE_PIN)}
            />
          </AppView>
        </AppView>

        <AppView style={styles.section}>
          <AppText style={styles.sectionTitle}>PURCHASES</AppText>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View purchase and transaction history"
            activeOpacity={0.78}
            onPress={() => navigate(routes.TRANSACTION_HISTORY_SCREEN)}
            style={styles.historyButton}>
            <AppView style={styles.historyIcon}>
              <WalletIcon width={21} height={20} />
            </AppView>
            <AppText style={styles.historyLabel}>
              Purchase &amp; transaction history
            </AppText>
            <ArrowRight width={8} height={14} />
          </TouchableOpacity>
        </AppView>

        <AppView style={styles.accountActions}>
          <Pressable onPress={() => setShowModal('logout')} style={styles.actionButton}>
            <AppText style={styles.logoutText}>Log out</AppText>
          </Pressable>
          <AppView style={styles.actionDivider} />
          <Pressable
            onPress={() => navigate(routes.DELETE_ACCOUNT_SCREEN)}
            style={styles.actionButton}>
            <AppText style={styles.deleteText}>Delete account</AppText>
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
  screen: {
    paddingTop: Size.calcHeight(12),
  },
  scrollContent: {
    paddingBottom: Size.calcHeight(36),
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Size.calcHeight(24),
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#181818',
    borderColor: '#FFFFFF14',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pageTitle: {
    color: colors.WHITE,
    fontFamily: fonts.MANROPE_700,
    fontSize: 20,
  },
  headerSpacer: {
    width: 36,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#131313',
    borderColor: '#FFFFFF14',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 16,
  },
  profileImageWrapper: {
    borderColor: '#FFFFFF24',
    borderRadius: 38,
    borderWidth: 1,
    height: 76,
    overflow: 'hidden',
    width: 76,
  },
  image: {
    borderRadius: 38,
    height: 74,
    width: 74,
  },
  imageLoadingOverlay: {
    alignItems: 'center',
    backgroundColor: '#00000099',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  profileDetails: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  profileName: {
    color: colors.WHITE,
    fontFamily: fonts.MANROPE_700,
    fontSize: 17,
    textTransform: 'capitalize',
  },
  profileEmail: {
    color: '#B6B6B6',
    fontFamily: fonts.MANROPE_400,
    fontSize: 12,
    marginTop: 3,
  },
  joinedText: {
    color: '#777777',
    fontFamily: fonts.MANROPE_400,
    fontSize: 11,
    marginTop: 5,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: '#272727',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  section: {
    marginTop: Size.calcHeight(28),
  },
  sectionTitle: {
    color: '#858585',
    fontFamily: fonts.MANROPE_700,
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#131313',
    borderColor: '#FFFFFF14',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  accountRowDivider: {
    borderBottomColor: '#FFFFFF12',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accountRowContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 16,
  },
  accountIcon: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  accountRowLabel: {
    color: colors.WHITE,
    flex: 1,
    fontFamily: fonts.MANROPE_500,
    fontSize: 14,
    marginLeft: 12,
  },
  historyButton: {
    alignItems: 'center',
    backgroundColor: '#171313',
    borderColor: '#FF13132E',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 16,
  },
  historyIcon: {
    alignItems: 'center',
    backgroundColor: '#FF13131A',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  historyLabel: {
    color: colors.WHITE,
    flex: 1,
    fontFamily: fonts.MANROPE_600,
    fontSize: 14,
    marginHorizontal: 13,
  },
  accountActions: {
    backgroundColor: '#101010',
    borderColor: '#FFFFFF10',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: Size.calcHeight(30),
    overflow: 'hidden',
  },
  actionButton: {
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  actionDivider: {
    backgroundColor: '#FFFFFF10',
    height: StyleSheet.hairlineWidth,
  },
  logoutText: {
    color: '#FF565A',
    fontFamily: fonts.MANROPE_600,
    fontSize: 14,
  },
  deleteText: {
    color: '#A7BBDD',
    fontFamily: fonts.MANROPE_500,
    fontSize: 13,
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
