package com.reeplay

import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ReeplaySystemUiModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    @Volatile var isVideoImmersive: Boolean = false
      private set
  }

  override fun getName(): String = "ReeplaySystemUi"

  @ReactMethod
  fun setVideoImmersive(enabled: Boolean, promise: Promise) {
    isVideoImmersive = enabled
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      promise.resolve(null)
      return
    }

    activity.runOnUiThread {
      try {
        val controller =
            WindowCompat.getInsetsController(activity.window, activity.window.decorView)
        if (enabled) {
          controller.systemBarsBehavior =
              WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
          controller.hide(WindowInsetsCompat.Type.systemBars())
        } else {
          controller.show(WindowInsetsCompat.Type.systemBars())
        }
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("SYSTEM_UI_ERROR", error)
      }
    }
  }
}
