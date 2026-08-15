/**
 * Android 12+ shows a system splash with the launcher icon unless the theme
 * sets windowSplashScreenAnimatedIcon. Expo SDK 50 prebuild only writes
 * values/styles.xml, and EAS drops the local android/ folder (.easignore), so
 * release builds flash the app icon before BootSplashFrame paints.
 *
 * Runs as a finalized mod so it lands after expo-splash-screen's own mods.
 */
const fs = require('fs');
const path = require('path');
const {withFinalizedMod} = require('@expo/config-plugins');

const SPLASH_BG = '#1E1D27';

const SPLASH_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
  <solid android:color="@android:color/transparent"/>
  <size android:width="1dp" android:height="1dp"/>
</shape>
`;

const SPLASH_STYLES_V31 = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools">
  <style name="Theme.App.SplashScreen" parent="AppTheme">
    <item name="android:windowSplashScreenBackground" tools:targetApi="31">${SPLASH_BG}</item>
    <item name="android:windowSplashScreenAnimatedIcon" tools:targetApi="31">@drawable/splashscreen_icon</item>
    <item name="android:windowSplashScreenIconBackgroundColor" tools:targetApi="31">${SPLASH_BG}</item>
    <item name="android:windowSplashScreenAnimationDuration" tools:targetApi="31">0</item>
    <item name="android:windowBackground">@drawable/splashscreen</item>
    <item name="android:windowDrawsSystemBarBackgrounds">true</item>
    <item name="android:statusBarColor">@android:color/transparent</item>
    <item name="android:navigationBarColor">@color/navigationBar</item>
  </style>
</resources>
`;

function withAndroidBootSplash(config) {
  return withFinalizedMod(config, [
    'android',
    async cfg => {
      const res = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
      );

      const drawableDir = path.join(res, 'drawable');
      fs.mkdirSync(drawableDir, {recursive: true});
      fs.writeFileSync(
        path.join(drawableDir, 'splashscreen_icon.xml'),
        SPLASH_ICON_XML,
      );

      const v31Dir = path.join(res, 'values-v31');
      fs.mkdirSync(v31Dir, {recursive: true});
      fs.writeFileSync(path.join(v31Dir, 'styles.xml'), SPLASH_STYLES_V31);

      return cfg;
    },
  ]);
}

module.exports = withAndroidBootSplash;
