import messaging from '@react-native-firebase/messaging';
import {PermissionsAndroid, Platform} from 'react-native';
import {getDeviceId} from 'react-native-device-info';
import {deleteNotificationDevice, registerNotificationDevice} from '@/api/notification.api';
import {authGet, authRemove, authSet, AUTH_MMKV_KEYS} from '@/Utils/authMmkv';

export async function registerCurrentNotificationDevice(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    const granted = await PermissionsAndroid.check(permission) ||
      await PermissionsAndroid.request(permission) === PermissionsAndroid.RESULTS.GRANTED;
    if (!granted) return false;
  }

  const authStatus = await messaging().requestPermission();
  const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  if (!enabled) return false;

  if (!messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging().registerDeviceForRemoteMessages();
  }
  const device_token = await messaging().getToken();
  if (!device_token) return false;

  const response = await registerNotificationDevice({
    device_token,
    device_id: getDeviceId(),
    device_type: Platform.OS,
  });
  if (!response.ok) return false;
  await authSet(AUTH_MMKV_KEYS.FCM_TOKEN, device_token);
  return true;
}

export async function syncRefreshedNotificationToken(device_token: string): Promise<void> {
  const previousToken = await authGet(AUTH_MMKV_KEYS.FCM_TOKEN);
  if (!previousToken) return;

  if (previousToken !== device_token) {
    try {
      await deleteNotificationDevice({fcmToken: previousToken});
    } catch {
      // Continue so the new token is not lost if the previous token is stale.
    }
  }

  const response = await registerNotificationDevice({
    device_token,
    device_id: getDeviceId(),
    device_type: Platform.OS,
  });
  if (response.ok) {
    await authSet(AUTH_MMKV_KEYS.FCM_TOKEN, device_token);
  }
}

export async function unregisterNotificationDevice(): Promise<void> {
  const fcmToken = await authGet(AUTH_MMKV_KEYS.FCM_TOKEN);

  if (fcmToken) {
    try {
      await deleteNotificationDevice({fcmToken});
    } catch {
      // Local cleanup must still finish during logout or account deletion.
    }
  }

  try {
    await messaging().deleteToken();
  } catch {
    // The device may not currently have a Firebase token.
  }

  await authRemove(AUTH_MMKV_KEYS.FCM_TOKEN);
}
