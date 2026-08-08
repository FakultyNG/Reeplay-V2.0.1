import * as Keychain from 'react-native-keychain';

export const AUTH_TOKEN_KEY = 'AUTH_TOKEN';
export const REFRESH_TOKEN_KEY = 'REFRESH_TOKEN';

const AUTH_KEYCHAIN_SERVICE = 'com.reeplay.auth.tokens';
const AUTH_KEYCHAIN_USERNAME = 'reeplay.auth';

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

/** In-memory cache so post-login API calls never race Keychain reads. */
let memoryTokens: AuthTokens | null = null;

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  if (!tokens.accessToken) {
    throw new Error('[secureTokenStorage] accessToken is required');
  }

  memoryTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken || undefined,
  };

  const payload = JSON.stringify({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? '',
  });

  const result = await Keychain.setGenericPassword(
    AUTH_KEYCHAIN_USERNAME,
    payload,
    {
      service: AUTH_KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    },
  );

  console.log('[secureTokenStorage] saveTokens', {
    keychainSetOk: result !== false,
    accessTokenLen: tokens.accessToken.length,
    hasRefreshToken: !!tokens.refreshToken,
  });

  if (result === false) {
    throw new Error('[secureTokenStorage] Keychain setGenericPassword returned false');
  }
}

export async function getTokens(): Promise<AuthTokens | null> {
  if (memoryTokens?.accessToken) {
    return memoryTokens;
  }

  try {
    const result = await Keychain.getGenericPassword({
      service: AUTH_KEYCHAIN_SERVICE,
    });
    if (!result) {
      console.log('[secureTokenStorage] getTokens: no Keychain entry');
      return null;
    }

    const parsed = JSON.parse(result.password) as AuthTokens;
    if (!parsed?.accessToken) {
      console.log('[secureTokenStorage] getTokens: Keychain payload missing accessToken');
      return null;
    }

    memoryTokens = {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken || undefined,
    };
    return memoryTokens;
  } catch (error) {
    console.log('[secureTokenStorage] getTokens failed', error);
    return null;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  return tokens?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const tokens = await getTokens();
  return tokens?.refreshToken ?? null;
}

export async function clearTokens(): Promise<void> {
  memoryTokens = null;
  try {
    await Keychain.resetGenericPassword({service: AUTH_KEYCHAIN_SERVICE});
  } catch (error) {
    console.log('[secureTokenStorage] clearTokens failed', error);
  }
}
