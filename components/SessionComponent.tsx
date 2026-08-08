import {View, Text, Modal, Platform, StyleSheet, Pressable} from 'react-native';
import React from 'react';
import {BlurView as Blur} from '@react-native-community/blur';
import SessionExpired from '@/assets/icons/sesion-expired.svg';
import AuthFormComponent from '@/Screens/authentication/components/AuthFormComponent';
import routes from '@/navigation/routes';
import {useNavigation} from '@react-navigation/native';
import {RootNav} from '@/navigation/AppNavigator';
import Size from '@/Utils/useResponsiveSize';
import {useAppPersistStore} from '@/store/zustand.store';
import {hasUserDetails} from '@/Screens/Splashscreen/Splashscreen';
import {authRemove} from '@/Utils/authMmkv';
import {clearTokens} from '@/Utils/secureTokenStorage';

const SessionComponent = () => {
  const {reset} = useNavigation<RootNav>();
  const {setIsSessionExpired} = useAppPersistStore();

  const handleReturnHome = async () => {
    await clearTokens();
    await authRemove(hasUserDetails);
    setIsSessionExpired(false);
    reset({
      index: 0,
      routes: [{name: routes.AUTH}],
    });
  };

  return (
    <Modal visible transparent>
      <View className="relative w-full h-full items-center">
        <View style={styles.overlay}>
          <Blur
            style={{width: '100%', height: '100%'}}
            blurType="dark"
            blurAmount={3}
            reducedTransparencyFallbackColor="white"
          />
        </View>

        <View style={{marginTop: Size.hp(18)}} className="w-full items-center px-5">
          <SessionExpired />

          <Text className="mt-10 font-MANROPE_600 text-xl text-white text-center">
            Session Expired
          </Text>
          <Text className="font-MANROPE_400 text-white text-base text-center mb-3">
            Please login to continue!
          </Text>

          <AuthFormComponent screen="login" isSession />

          <View className="flex-row items-center mt-5">
            <Text className="text-base text-white font-MANROPE_400 text-center">
              Cancel and return
            </Text>
            <Pressable onPress={handleReturnHome}>
              <Text
                style={[
                  Platform.OS === 'android' && {
                    fontSize: 14,
                  },
                  {color: '#379AE6'},
                ]}
                className="font-MANROPE_400 text-base ml-1">
                Home
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SessionComponent;

const styles = StyleSheet.create({
  overlay: {
    height: '100%',
    width: '100%',
    position: 'absolute',
  },
});
