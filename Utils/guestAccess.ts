import {GUEST_TOKEN} from '@env';
import {AUTH_MMKV_KEYS, authRemove, authSet} from './authMmkv';
import {clearTokens, saveTokens} from './secureTokenStorage';
import {useGuestAccessStore} from '@/store/guestAccess.store';
import {clearContentCache} from './contentMmkv';

export async function startGuestSession(): Promise<void> {
  await authSet(AUTH_MMKV_KEYS.HAS_SKIPPED, 'true');
  await saveTokens({accessToken: GUEST_TOKEN});
  clearContentCache();
  useGuestAccessStore.getState().setGuest(true);
}

export async function endGuestSession(): Promise<void> {
  await authRemove(AUTH_MMKV_KEYS.HAS_SKIPPED);
  await clearTokens();
  useGuestAccessStore.getState().setGuest(false);
}
