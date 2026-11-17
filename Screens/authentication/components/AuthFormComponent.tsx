import {
  Modal,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import React, { useState } from 'react';
import { AppButton, AppText, AppView, TouchableOpacity } from '@/components';
import colors from '@/configs/colors';
import Size from '@/Utils/useResponsiveSize';
import fonts from '@/configs/fonts';
import { EyeIcon, EyeIcon_C } from '@/assets/icons';
import useToggle from '@/Hooks/useToggle';
import { useNavigation } from '@react-navigation/native';
import routes from '@/navigation/routes';
import { handleLoginAPI, handleSignUpAPI, resendToken } from '@/api/auth.api';
import { WEB_CLIENT_ID } from '@env';
import { getProfileDetails, armAuthGrace, replaceInterests } from '@/api/profile.api';
import { useAppDispatch } from '@/Hooks/reduxHook';
import { setCredentials } from '@/store/slices/userSlice';
import { hasUserDetails } from '@/Screens/Splashscreen/Splashscreen';
import { HAS_SET_NEWPIN } from '../GetStartedScreen';
import { saveTokens } from '@/Utils/secureTokenStorage';
import {authRemove, authSet} from '@/Utils/authMmkv';
import { bannerApi, fetchEnums } from '@/api/content.api';
import { setBannerContent, setCategories, setGenres } from '@/store/slices/bannerSlice.slice';
import GoogleIcon from '@/assets/icons/LOGO.svg'
import {
  GoogleSignin,
} from '@react-native-google-signin/google-signin';
import { AuthParamsNavigator } from '@/navigation/AuthNavigation';
import { RootNav } from '@/navigation/AppNavigator';
import { useAppPersistStore } from '@/store/zustand.store';
import PrivacyScreen from '@/Screens/support/PrivacyScreen';
import TermScreen from '@/Screens/support/TermScreen';
import {clearGuestInterestPreferences, getGuestInterestPreferences} from '@/Utils/interestPreferences';
import {useGuestAccessStore} from '@/store/guestAccess.store';
import {registerCurrentNotificationDevice} from '@/Utils/notificationDevice';


const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const HAS_SKIPPED = 'SKIPPED';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

interface Props {
  screen: string;
  trigger?: () => void;
  setEmail?: React.Dispatch<React.SetStateAction<string>>;
  isSession?: boolean
}

const confirmInterestMerge = () => new Promise<boolean>(resolve => {
  Alert.alert(
    'Keep your interests?',
    'Use the interests you chose as a guest to personalise this account.',
    [
      {text: 'Not now', style: 'cancel', onPress: () => resolve(false)},
      {text: 'Use interests', onPress: () => resolve(true)},
    ],
    {cancelable: false},
  );
});

const AuthFormComponent = ({
  screen,
  trigger,
  setEmail: setResetEmail,
  isSession
}: Props) => {
  const dispatch = useAppDispatch();
  const nav = useNavigation<AuthParamsNavigator>();
  const { reset } = useNavigation<RootNav>();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [preferredName, setPreferredName] = useState<string>('');
  const [toogle, setToogle] = useToggle(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const { setIsSessionExpired } = useAppPersistStore()
  const [modal, setModal] = useState<'privacy' | 'terms' | null>(null)

  async function resetState() {
    setEmail('');
    setPassword('');
    setPreferredName('');
    setError('');
    await authRemove(HAS_SKIPPED);
    useGuestAccessStore.getState().setGuest(false);
  }

  async function handleLogin() {
    if (email === '' && password === '') {
      setError('Invalid Credentials');
      setTimeout(() => {
        setError('');
      }, 2000);
    } else {
      try {
        setLoading(true);
        if (regex.test(email)) {
          const res = await handleLoginAPI({
            email: email.trim(),
            password,
          });
          if (res.ok && res.data) {
            const raw = res.data as unknown as Record<string, unknown>;
            const loginData = (raw.data ?? raw) as {
              accessToken?: string;
              refreshToken?: string;
              token?: string;
              access_token?: string;
              refresh_token?: string;
            };
            const accessToken =
              loginData.accessToken ??
              loginData.token ??
              loginData.access_token;
            const refreshToken =
              loginData.refreshToken ?? loginData.refresh_token;
            console.log('[auth] login response tokens', {
              hasAccessToken: !!accessToken,
              accessTokenLen: accessToken?.length ?? 0,
              hasRefreshToken: !!refreshToken,
              refreshTokenLen: refreshToken?.length ?? 0,
              loginDataKeys: Object.keys(loginData),
              rawTopKeys: Object.keys(raw),
            });
            if (!accessToken) {
              console.log('[auth] login payload keys', Object.keys(loginData));
              setError('Login succeeded but no access token was returned.');
              setTimeout(() => setError(''), 5000);
              return;
            }

            await saveTokens({accessToken, refreshToken});
            // Prevent home boot / FCM 401s from wiping this fresh session.
            armAuthGrace(60_000);
            setIsSessionExpired(false);

            let profileRes = await getProfileDetails();
            console.log('[auth] post-login profile', {
              ok: profileRes.ok,
              status: profileRes.status,
              problem: profileRes.problem,
            });
            const banner = await bannerApi();
            const categories = await fetchEnums('categories');
            const genres = await fetchEnums('genres');
            if (banner.ok && banner.data) dispatch(setBannerContent(banner.data.data))
            const categoryItems = categories.data?.data;
            const genreItems = genres.data?.data;
            if (categories.ok && Array.isArray(categoryItems)) {
              dispatch(setCategories(categoryItems))
            }
            if (genres.ok && Array.isArray(genreItems)) {
              dispatch(setGenres(genreItems))
            }

            if (profileRes.ok && profileRes.data) {
              const guestPreferences = await getGuestInterestPreferences();
              const hasGuestPreferences =
                guestPreferences.genreIds.length > 0 ||
                guestPreferences.categoryIds.length > 0;
              if (hasGuestPreferences && await confirmInterestMerge()) {
                const merged = await replaceInterests(guestPreferences);
                if (merged.ok) {
                  await clearGuestInterestPreferences();
                  profileRes = await getProfileDetails();
                }
              }
              if (!profileRes.ok || !profileRes.data) {
                setError('Logged in but could not refresh your profile. Try again.');
                setTimeout(() => setError(''), 5000);
                return;
              }
              if (profileRes.data.data.profile.settings_info.allow_notifications) {
                await registerCurrentNotificationDevice();
              }
              await authSet(
                hasUserDetails,
                JSON.stringify(profileRes.data.data),
              );
              if (profileRes.data.data.profile.pin && profileRes.data.data.profile.pin !== '')
                await authSet(
                  HAS_SET_NEWPIN,
                  profileRes.data.data.profile.pin,
                );
              dispatch(setCredentials(profileRes.data.data));
              armAuthGrace(60_000);
              setIsSessionExpired(false);

              if (!isSession) {
                reset({
                  index: 0,
                  routes: [
                    {
                      name: routes.TAB_MAIN,
                    },
                  ],
                });
              }
              resetState();
            } else {
              console.log(
                '[auth] profile after login failed',
                profileRes.status,
                profileRes.problem,
              );
              setError('Logged in but could not load your profile. Try again.');
              setTimeout(() => setError(''), 5000);
            }
          } else {
            if (
              res.data &&
              res.data.message.split(':')[1].trim() ===
              'user account not verified, check your email for verification code'
            ) {
              let userData = {
                email,
              };
              nav.navigate(routes.VEERIFY_PHONE, {
                userDetails: userData,
              });
            } else {
              setError(
                res.data?.message.split(':')[1] ||
                'Opps, something weent wrong.',
              );
              setTimeout(() => {
                setError('');
              }, 5000);
            }
          }
        } else {
          setError('Invalid Email');
          setTimeout(() => {
            setError('');
          }, 2000);
        }
      } catch {
        setError('Opps! Something went wrong');
        setTimeout(() => {
          setError('');
        }, 2000);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleRest() {
    if (email === '') {
      setError('Invalid Credentials');
      setTimeout(() => {
        setError('');
      }, 2000);
    } else {
      if (regex.test(email)) {
        setLoading(true);
        //Auth endpoint
        const res = await resendToken({ email: email.trim() });
        console.log(res)
        if (res.ok) {
          setLoading(false);
          setResetEmail && setResetEmail(email.trim());
          if (trigger) trigger();
          resetState();
        } else {
          const msg = res.data ? res.data.message : '';
          setError(msg.split(':')[1]);
          setTimeout(() => {
            setError('');
          }, 2000);
          setLoading(false);
        }
      } else {
        setError('Invalid Email');
        setTimeout(() => {
          setError('');
        }, 2000);
      }
    }
  }

  async function handleSignUp() {
    const trimmedEmail = email.trim();
    const trimmedName = preferredName.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setError('Complete all required fields.');
      return;
    }

    if (!regex.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(password)) {
      setError('Password must contain upper and lowercase letters, a number, and at least 8 characters.');
      return;
    }

    setError('');
    setLoading(true);

    try {
          let userData = {
            email: trimmedEmail,
          };

          const res = await handleSignUpAPI({
            name: trimmedName,
            email: trimmedEmail,
            password,
          });
          if (res.ok && res.data) {
            nav.navigate(routes.VEERIFY_PHONE, {
              userDetails: userData,
            });
            resetState();
          } else {
            const serverMessage = res.data?.message?.replace(/^[^:]*:\s*/, '');
            setError(
              serverMessage ||
                (res.problem === 'TIMEOUT_ERROR'
                  ? 'Registration timed out while sending the verification email. Please try again.'
                  : 'Registration failed. Please try again.'),
            );
          }
    } catch (error) {
      console.error('[auth] registration failed', error);
      setError('Registration failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppView className="w-full pt-7 pb-[18px] items-center">
      {screen === 'reset' && (
        <AppText className="text-xl text-white font-MANROPE_600 text-center mt-4 mb-6">
          Reset your password
        </AppText>
      )}
      {error !== '' && screen !== 'signUp' && (
        <AppText className="font-MANROPE_500 text-sm text-red mb-4 -mt-2">
          {error}
        </AppText>
      )}

      {screen === 'signUp' && (
        <TextInput
          placeholder="Preferred name (What should we call you?)"
          value={preferredName}
          onChangeText={setPreferredName}
          placeholderTextColor={colors.GREY_100}
          autoCapitalize="words"
          autoCorrect={false}
          style={[styles.textInput, {marginBottom: Size.calcHeight(20)}]}
        />
      )}
      <TextInput
        placeholder="Email address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor={colors.GREY_100}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.textInput,
          Platform.OS === 'android' && {
            fontSize: Size.calcHeight(14.5),
            paddingTop: Size.calcHeight(14),
            paddingBottom: Size.calcHeight(15),
          },
        ]}
      />

      {screen !== 'reset' && (
        <AppView
          style={[
            styles.textInput,
            Platform.OS === 'android' && [
              styles.adjust,
              { paddingTop: 2, paddingBottom: 3 },
            ],
          ]}
          className="flex-row items-center my-6 mt-5 mb-5">
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={colors.GREY_100}
            secureTextEntry={toogle}
            style={[styles.text, { flex: 1 }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={setToogle}
            className="mx-3 mr-5"
            style={Platform.OS === 'android' && { marginRight: 15 }}>
            {!toogle ? <EyeIcon /> : <EyeIcon_C />}
          </TouchableOpacity>
        </AppView>
      )}

      {screen === 'reset' && (
        <AppView className="w-full mt-2">
          <AppButton
            title="Reset password"
            isLoading={loading}
            bgColor={colors.RED}
            onPress={() => handleRest()}
            style={{
              marginTop: Size.calcHeight(24),
              borderRadius: 4,
              width: '100%',
              paddingVertical: Size.calcHeight(16),
            }}
            labelStyle={{ fontSize: 16 }}
          />
        </AppView>
      )}

      {screen === 'login' && (
        <>
          <View style={{ marginTop: Size.calcHeight(24) }} className='flex-row w-full items-center gap-x-1.5'>
            <View className='flex-1'>
              <AppButton
                isLoading={loading}
                title="Login"
                bgColor={colors.RED}
                onPress={handleLogin}
                style={{
                  borderRadius: 0,
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                  width: '100%',
                  // paddingVertical: 0,
                  // height:10
                }}
                labelStyle={{ fontSize: 16 }}
              />
            </View>

            <TouchableOpacity activeOpacity={.7} className='opacity-40 w-[65px] h-[54px] items-center justify-center bg-[#fff4f4] rounded-r-[4px]'>
              <GoogleIcon />
            </TouchableOpacity>
          </View>

          {/* {!isSession && <AppButton
            title="Skip"
            bgColor={colors.GREY_700}
            onPress={handleSkip}
            style={{
              marginTop: Size.calcHeight(16),
              borderRadius: 4,
              width: '100%',
              paddingVertical: Size.calcHeight(16),
            }}
            labelStyle={{ fontSize: 16 }}
          />} */}
        </>
      )}

      {screen === 'signUp' && (
        <AppView style={{ marginTop: Size.calcHeight(15) }} className="w-full">
          {error !== '' && (
            <AppText className="font-MANROPE_500 text-sm text-red mb-3 text-center">
              {error}
            </AppText>
          )}
          <AppView className="w-full flex-row gap-x-1.5 items-center">
          <View className='flex-1'>
            <AppButton
              isLoading={loading}
              isDisable={loading}
              title="Create account"
              bgColor={colors.RED}
              onPress={handleSignUp}
              style={{
                borderRadius: 0,
                borderTopLeftRadius: 4,
                borderBottomLeftRadius: 4,
                width: '100%',
                paddingVertical: Size.calcHeight(15.8),
              }}
              labelStyle={{ fontSize: 16 }}
            />
          </View>
          <TouchableOpacity activeOpacity={.7} className='opacity-40 w-[65px] h-[54px] items-center justify-center bg-[#fff4f4] rounded-r-[4px]'>
            <GoogleIcon />
          </TouchableOpacity>
          </AppView>
        </AppView>
      )}

      {screen === 'signUp' && (
        <>
          <AppText
            style={{ fontFamily: fonts.INTER_400 }}
            className="mt-4 text-[13px] text-[#9095A0] text-center">
            By signing up, you agree to REEPLAY's
          </AppText>
          <AppView className="mt-1 mb-4 flex-row items-center justify-center gap-x-1">
            <Pressable onPress={() => setModal('terms')}>
              <AppText style={[styles.privacyText, styles.underline]}>
                Terms of Service
              </AppText>
            </Pressable>
            <AppText style={[styles.privacyText, { color: '#9095A0' }]}>
              and
            </AppText>
            <Pressable
              onPress={() => setModal('privacy')}>
              <AppText style={[styles.privacyText, styles.underline]}>
                Privacy Policy
              </AppText>
            </Pressable>
          </AppView>
        </>
      )}

      {screen === 'login' && !isSession && (
        <Pressable
          onPress={() => nav.navigate(routes.SIGNUP_SCREEN)}
          style={{ marginTop: Size.calcHeight(38) }}>
          <AppText className="font-MANROPE_400 text-base text-red">
            Create new account
          </AppText>
        </Pressable>
      )}

      {(screen === 'login' || screen === 'signUp') && !isSession && (
        <AppView
          style={Platform.OS === 'android' && { marginTop: screen !== 'login' ? -5 : 1 }}
          className="flex-row items-center mt-3">
          <AppText className="text-base text-[#BCC1CA] font-MANROPE_400 text-center">
            {screen === 'login'
              ? 'Forgot your Password?'
              : 'Already had an account?'}
          </AppText>
          <Pressable
            onPress={() =>
              nav.navigate(
                screen === 'login'
                  ? routes.RESET_PASSWORD_SCREEN
                  : routes.LOGIN_SCREEN,
              )
            }>
            <AppText
              style={[
                Platform.OS === 'android' && {
                  fontSize: 14,
                },
                { color: screen === 'login' ? '#379AE6' : colors.RED },
              ]}
              className="font-MANROPE_400 text-base ml-1">
              {screen === 'login' ? 'Reset it' : 'Log in'}
            </AppText>
          </Pressable>
        </AppView>
      )}

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

export default AuthFormComponent;

const styles = StyleSheet.create({
  textInput: {
    width: '100%',
    borderColor: '#BCC1CA73',
    borderWidth: 1,
    fontFamily: fonts.MANROPE_400,
    fontSize: Platform.OS === 'ios' ? Size.calcHeight(16) : Size.calcHeight(16),
    color: '#BCC1CA',
    paddingLeft:
      Platform.OS === 'ios' ? Size.calcHeight(20) : Size.calcHeight(26),
    paddingTop:
      Platform.OS === 'ios' ? Size.calcHeight(18) : Size.calcHeight(15),
    paddingBottom:
      Platform.OS === 'ios' ? Size.calcHeight(19) : Size.calcHeight(19),
    borderRadius: 4,
    height: 53
  },
  adjust: {
    paddingVertical: Size.calcHeight(3),
    paddingLeft: Size.calcHeight(18),
  },
  text: {
    fontFamily: fonts.MANROPE_400,
    fontSize: Platform.OS === 'ios' ? Size.calcHeight(16) : Size.calcHeight(16),
    color: '#BCC1CA',
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyText: {
    fontFamily: fonts.INTER_400,
    fontSize: Size.calcHeight(14),
    color: '#379AE6',
  },
  underline: {
    textDecorationLine: 'underline',
    textDecorationColor: '#379AE6',
  },
});
