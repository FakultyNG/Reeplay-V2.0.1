import {Platform} from 'react-native';
import SystemNavigationBar from 'react-native-system-navigation-bar';

/**
 * Hide the Android system navigation bar while Reeplay is open.
 * Status bar stays visible. If the user swipes the bar back, it will
 * re-hide on next apply (e.g. app resume / leaving video fullscreen).
 */
export async function hideSystemNavigationBar() {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    // If the bar flashes back into view, keep it black (not white).
    await SystemNavigationBar.setNavigationColor('#000000', 'light');
    await SystemNavigationBar.navigationHide();
  } catch {
    // Native module may be unavailable in some builds — ignore.
  }
}

/** Used when entering landscape video; pairs with restoreAppSystemChrome. */
export async function enterVideoImmersive() {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await SystemNavigationBar.fullScreen(true);
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
    await SystemNavigationBar.fullScreen(false);
  } catch {
    // ignore
  }
  await hideSystemNavigationBar();
}
