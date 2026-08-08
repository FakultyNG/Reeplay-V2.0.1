import {createMMKV} from 'react-native-mmkv';
import {MMKV_ENCRYPTION_KEY} from '@env';

export const AUTH_MMKV_KEYS = {
  HAS_ONBOARD: 'isOnboard',
  USER: 'user',
  HAS_SET_NEWPIN: 'new_pin',
  HAS_SKIPPED: 'SKIPPED',
  HAS_LOCK_APP: 'HAS_LOCK_APP',
  LEFT_APP_TIME: 'LEFT_APP_TIME',
  FCM_TOKEN: 'FCM_TOKEN',
} as const;

export type AuthMmkvKey =
  (typeof AUTH_MMKV_KEYS)[keyof typeof AUTH_MMKV_KEYS];

const authMmkv = createMMKV({
  id: 'reeplay-auth-mmkv',
  encryptionKey: MMKV_ENCRYPTION_KEY,
});

export async function authGet(key: AuthMmkvKey | string): Promise<string | undefined> {
  return authMmkv.getString(key);
}

export async function authSet(
  key: AuthMmkvKey | string,
  value: string,
): Promise<void> {
  authMmkv.set(key, value);
}

export async function authRemove(key: AuthMmkvKey | string): Promise<void> {
  authMmkv.remove(key);
}

export async function authMultiRemove(keys: Array<AuthMmkvKey | string>): Promise<void> {
  await Promise.all(keys.map(key => authRemove(key)));
}

export function authGetSync(key: AuthMmkvKey | string): string | undefined {
  return authMmkv.getString(key);
}

export function authSetSync(key: AuthMmkvKey | string, value: string): void {
  authMmkv.set(key, value);
}

export function authRemoveSync(key: AuthMmkvKey | string): void {
  authMmkv.remove(key);
}
