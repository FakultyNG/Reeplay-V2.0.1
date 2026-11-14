import {BASE_URL} from '@env';
import {ApiResponse, ApisauceInstance, create} from 'apisauce';
import {AxiosError, InternalAxiosRequestConfig} from 'axios';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getTokens,
  saveTokens,
} from '@/Utils/secureTokenStorage';
import {useAppPersistStore} from '@/store/zustand.store';
import {useGuestAccessStore} from '@/store/guestAccess.store';
import {endGuestSession} from '@/Utils/guestAccess';

/** Ignore auth-failure side effects right after a successful login. */
let authGraceUntil = 0;

export function armAuthGrace(ms = 60_000): void {
  authGraceUntil = Date.now() + ms;
  useAppPersistStore.getState().setIsSessionExpired(false);
}

function isAuthGraceActive(): boolean {
  return Date.now() < authGraceUntil;
}

type RetryConfig = InternalAxiosRequestConfig & {_authRetry?: boolean};

/** Public client — login / signup / refresh (no auth interceptors). */
export const publicApi = create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 12000,
});

/** Authenticated client — token attach + single-flight refresh on 401. */
export const api = create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 1_200_000,
});

let refreshInFlight: Promise<string | null> | null = null;
let authFailureInFlight: Promise<void> | null = null;

/**
 * Session expired modal ONLY when refresh cannot renew the session
 * (missing/rejected refresh token) — never on a lone access-token 401.
 */
async function handleAuthFailure(): Promise<void> {
  if (isAuthGraceActive()) {
    console.log('[auth] skip session expire during post-login grace');
    return;
  }

  if (authFailureInFlight) {
    return authFailureInFlight;
  }

  authFailureInFlight = (async () => {
    await clearTokens();
    useAppPersistStore.getState().setIsSessionExpired(true);
  })().finally(() => {
    authFailureInFlight = null;
  });

  return authFailureInFlight;
}

async function rotateAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const existing = await getTokens();
      const refToken = existing?.refreshToken ?? (await getRefreshToken());
      if (!refToken) {
        // No refresh token available — fail the retry quietly (do not open session modal).
        console.warn('[auth] 401 recovery skipped — no refresh token');
        return null;
      }

      const refresh = await publicApi.get<{
        data?: {accessToken?: string; refreshToken?: string};
      }>(`/customers/general/renew-accesstoken?ref_token=${refToken}`);

      if (!refresh.ok || !refresh.data?.data?.accessToken) {
        // Refresh token rejected / expired — only place that opens session modal.
        await handleAuthFailure();
        return null;
      }

      const nextAccess = refresh.data.data.accessToken;
      const nextRefresh =
        refresh.data.data.refreshToken ??
        existing?.refreshToken ??
        refToken;

      await saveTokens({
        accessToken: nextAccess,
        refreshToken: nextRefresh,
      });

      return nextAccess;
    } catch (error) {
      console.error('Token rotation failed', error);
      // Network/throw during refresh — do not treat as expired refresh token.
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export const getAuthToken = async (
  forceRefresh = false,
): Promise<string | null> => {
  try {
    if (!forceRefresh) {
      return await getAccessToken();
    }
    return await rotateAccessToken();
  } catch (error) {
    console.error('Failed to fetch AUTH_TOKEN from Keychain', error);
    return null;
  }
};

function isAuthRefreshUrl(url?: string): boolean {
  if (!url) {
    return false;
  }
  return (
    url.includes('renew-accesstoken') ||
    url.includes('validate-reftoken') ||
    url.includes('general-signin') ||
    url.includes('/customers/signup')
  );
}

api.axiosInstance.interceptors.request.use(async config => {
  const token = await getAccessToken();
  if (token) {
    config.headers['customer-auth'] = token;
  }
  return config;
});

api.axiosInstance.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetryConfig | undefined;

    if (status === 403 && useGuestAccessStore.getState().isGuest) {
      const message = String((error.response?.data as {message?: string})?.message || '');
      if (message.toLowerCase().includes('guest access is disabled')) {
        await endGuestSession();
        useGuestAccessStore.getState().setEnabled(false);
        useGuestAccessStore.getState().requestAuthRedirect();
      } else {
        useGuestAccessStore.getState().showLoginRequired();
      }
      return Promise.reject(error);
    }

    if (!original || status !== 401 || original._authRetry) {
      return Promise.reject(error);
    }

    if (isAuthRefreshUrl(original.url)) {
      return Promise.reject(error);
    }

    original._authRetry = true;
    const newToken = await rotateAccessToken();
    if (!newToken) {
      return Promise.reject(error);
    }

    original.headers['customer-auth'] = newToken;
    return api.axiosInstance.request(original);
  },
);

/**
 * Authenticated API helper.
 * Token attach + refresh are handled by axios interceptors on `api`.
 * Session wipe only when refresh token rotation fails.
 */
export const apiCall = async <T>(
  apiFunction: (instanceApi: ApisauceInstance) => Promise<ApiResponse<T>>,
  _baseURL?: string,
): Promise<ApiResponse<T>> => {
  return apiFunction(api);
};
