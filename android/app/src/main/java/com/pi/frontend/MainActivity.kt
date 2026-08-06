package com.pi.frontend

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.core.graphics.Insets
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Android 12+ — solid boot background instead of the default app-icon splash.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      installSplashScreen()
    }
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    window.decorView.layoutDirection = View.LAYOUT_DIRECTION_RTL
    applySystemBarStyle()
    applyBottomBarBoundary()
  }

  override fun onResume() {
    super.onResume()
    // Release APKs (targetSdk 35) can re-apply a light/white nav bar after splash.
    applySystemBarStyle()
  }

  /**
   * Dark system bars. Status bar stays transparent (app draws under it as
   * before); nav bar is painted app-dark since content never sits under it.
   */
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

  /**
   * App content must END where the Android bottom toolbar starts. Pad the root
   * content view by the nav-bar height and consume that inset so the JS
   * safe-area doesn't pad a second time. (Relying on each screen's
   * insets.bottom padding left parts of the UI covered in standalone APKs.)
   */
  private fun applyBottomBarBoundary() {
    val content = findViewById<View>(android.R.id.content)
    // Light AppTheme window/content defaults to white — that shows in the pad.
    content.setBackgroundColor(Color.parseColor("#1E1D27"))
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val navBars = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      // When the soft keyboard is open it replaces the nav bar — keep padding
      // only while the keyboard is closed so toolbars sit flush on the keys.
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

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
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
