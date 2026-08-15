package com.pi.frontend

import androidx.core.view.WindowInsetsControllerCompat

import androidx.core.view.WindowInsetsCompat

import androidx.core.view.WindowCompat

import androidx.core.view.ViewCompat

import androidx.core.graphics.Insets

import android.view.View

import android.graphics.drawable.ColorDrawable

import android.graphics.Color

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    window.decorView.layoutDirection = View.LAYOUT_DIRECTION_RTL
    applySystemBarStyle()
    applyBottomBarBoundary()
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  
  override fun onResume() {
    super.onResume()
    applySystemBarStyle()
  }

  private fun applySystemBarStyle() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.parseColor("#1E1D27")
    window.setBackgroundDrawable(ColorDrawable(Color.parseColor("#1E1D27")))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      window.navigationBarDividerColor = Color.TRANSPARENT
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
      window.isStatusBarContrastEnforced = false
    }
    val controller = WindowInsetsControllerCompat(window, window.decorView)
    controller.isAppearanceLightStatusBars = false
    controller.isAppearanceLightNavigationBars = false
  }

  /** App content ends where the Android bottom toolbar starts. */
  private fun applyBottomBarBoundary() {
    val content = findViewById<View>(android.R.id.content)
    // Padding area uses this background — Light AppTheme defaults to white.
    content.setBackgroundColor(Color.parseColor("#1E1D27"))
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val navBars = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      val bottomPad = if (ime.bottom > 0) 0 else navBars.bottom
      view.setPadding(0, 0, 0, bottomPad)
      WindowInsetsCompat.Builder(insets)
        .setInsets(
          WindowInsetsCompat.Type.navigationBars(),
          Insets.of(navBars.left, navBars.top, navBars.right, 0),
        )
        .build()
    }
    ViewCompat.requestApplyInsets(content)
  }

  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
