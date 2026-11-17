package com.reeplay

import android.os.Bundle
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
}
