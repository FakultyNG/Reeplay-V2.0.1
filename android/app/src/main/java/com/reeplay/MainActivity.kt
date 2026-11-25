package com.reeplay

import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.os.Bundle
import android.util.Rational
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.reactnative.googlecast.api.RNGCCastContext

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Reeplay"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    try {
      // Initialize the React Native Cast bridge and its discovery manager.
      RNGCCastContext.getSharedInstance(this)
    } catch (e: Exception) {
      // Safe fallback if Cast framework is not available
      e.printStackTrace()
    }
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()

    // Video playback is the only app flow that deliberately enters landscape.
    // Keep normal portrait screens out of PiP while allowing playback to continue
    // when the user presses Home or switches apps.
    if (
        ReeplaySystemUiModule.isVideoImmersive &&
        resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE &&
        !isInPictureInPictureMode
    ) {
      try {
        val params =
            PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
                .build()
        enterPictureInPictureMode(params)
      } catch (e: IllegalStateException) {
        // The device or current activity state may not permit PiP.
        e.printStackTrace()
      }
    }
  }
}
