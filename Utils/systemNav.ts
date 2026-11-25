import {NativeModules, Platform} from 'react-native';

const systemUi = NativeModules.ReeplaySystemUi as
  | {setVideoImmersive: (enabled: boolean) => Promise<void>}
  | undefined;

/**
 * Retained for compatibility with older call sites. Normal app screens keep
 * system navigation available; only fullscreen video uses immersive mode.
 */
export async function hideSystemNavigationBar() {
  return;
}

/** Used when entering landscape video; pairs with restoreAppSystemChrome. */
export async function enterVideoImmersive() {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await systemUi?.setVideoImmersive(true);
  } catch {
    // ignore
  }
}

/** Leave video fullscreen and restore app chrome (nav bar stays hidden). */
export async function restoreAppSystemChrome() {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await systemUi?.setVideoImmersive(false);
  } catch {
    // ignore
  }
}
