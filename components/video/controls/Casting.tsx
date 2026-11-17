import React, {memo, useCallback} from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import GoogleCast, {
  CastButton,
  PlayServicesState,
} from 'react-native-google-cast';
import {VideoCastingIcon} from '@/assets/icons';

interface VideoCastingProps {
  handleCastingFunc?: () => void;
}

const Casting = memo(({handleCastingFunc}: VideoCastingProps) => {
  const openAndroidCastDialog = useCallback(async () => {
    try {
      if (Number(Platform.Version) >= 33) {
        const permission = PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES;
        const result = await PermissionsAndroid.request(permission, {
          title: 'Find nearby TVs',
          message:
            'Allow Reeplay to find Cast-enabled TVs on your Wi-Fi network.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        });
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Nearby devices permission required',
            'Allow Nearby devices for Reeplay in Settings, then try casting again.',
          );
          return;
        }
      }

      const playServicesState = await GoogleCast.getPlayServicesState();
      if (
        playServicesState &&
        playServicesState !== PlayServicesState.SUCCESS
      ) {
        await GoogleCast.showPlayServicesErrorDialog(playServicesState);
        return;
      }

      handleCastingFunc?.();
      const shown = await GoogleCast.showCastDialog();
      if (!shown) {
        Alert.alert(
          'Cast is unavailable',
          'Confirm Wi-Fi is enabled and that your TV supports Google Cast.',
        );
      }
    } catch (error) {
      console.warn('Unable to open the Cast device picker', error);
      Alert.alert(
        'Could not search for TVs',
        'Check the Nearby devices permission and Wi-Fi connection, then try again.',
      );
    }
  }, [handleCastingFunc]);

  return (
    <View
      accessibilityLabel="Cast video"
      accessibilityRole="button"
      style={styles.container}>
      <View pointerEvents="none" style={styles.icon}>
        <VideoCastingIcon />
      </View>
      <CastButton
        accessibilityLabel="Cast video"
        pointerEvents={Platform.OS === 'android' ? 'none' : 'auto'}
        style={styles.nativeButton}
      />
      {Platform.OS === 'android' ? (
        <Pressable
          accessibilityLabel="Cast video"
          accessibilityRole="button"
          hitSlop={8}
          onPress={openAndroidCastDialog}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
});

export default Casting;

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeButton: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
  },
});
