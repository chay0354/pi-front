// Single source of truth for Expo (static app.json removed — avoid drift).
// Config as JS so Hebrew strings keep correct UTF-8 when manifest is served (avoids Windows encoding issues).
const {withMainApplication} = require('@expo/config-plugins');

/** Dev client loads /index.bundle — avoids Metro rewrite of .expo/.virtual-metro-entry if RN CLI drops it. */
function withAndroidIndexDevEntry(config) {
  return withMainApplication(config, async c => {
    const contents = c.modResults.contents;
    if (typeof contents === 'string') {
      c.modResults.contents = contents.replace(
        /getJSMainModuleName\(\)\s*:\s*String\s*=\s*"\.expo\/\.virtual-metro-entry"/,
        'getJSMainModuleName(): String = "index"',
      );
    }
    return c;
  });
}

/** Force Hebrew RTL layout on Android regardless of device system language. */
function withAndroidForceRtl(config) {
  return withMainApplication(config, async c => {
    let contents = c.modResults.contents;
    if (typeof contents !== 'string') return c;

    if (!contents.includes('com.facebook.react.modules.i18nmanager.I18nUtil')) {
      contents = contents.replace(
        /import com\.facebook\.react\.ReactHost\n/,
        'import com.facebook.react.ReactHost\nimport com.facebook.react.modules.i18nmanager.I18nUtil\n',
      );
    }

    if (!contents.includes('sharedI18nUtilInstance')) {
      contents = contents.replace(
        /super\.onCreate\(\)/,
        `super.onCreate()
    val sharedI18nUtilInstance = I18nUtil.getInstance()
    sharedI18nUtilInstance.allowRTL(applicationContext, true)
    sharedI18nUtilInstance.forceRTL(applicationContext, true)`,
      );
    }

    c.modResults.contents = contents;
    return c;
  });
}

module.exports = {
  expo: {
    name: 'pi 2701',
    slug: 'pi-frontend',
    version: '1.0.3',
    scheme: 'pifrontend',
    orientation: 'portrait',
    icon: './assets/app-icon/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/SplashScreen.png',
      resizeMode: 'cover',
      backgroundColor: '#252525',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      bundleIdentifier: 'com.pi.frontend',
      supportsTablet: true,
      ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY
        ? {
            config: {
              googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY,
            },
          }
        : {}),
      buildNumber: '1',
      infoPlist: {
        CFBundleDevelopmentRegion: 'he',
        UIViewSemanticContentAttribute: 'ForceRightToLeft',
        NSCameraUsageDescription:
          'אנחנו צריכים גישה למצלמה כדי לצלם תמונות וסרטונים לפוסט',
        NSPhotoLibraryUsageDescription:
          'אנחנו צריכים גישה לספריית התמונות כדי להעלות תמונות וסרטונים',
        NSPhotoLibraryAddOnlyUsageDescription:
          'אנחנו צריכים גישה לספריית התמונות כדי להוסיף תמונות',
        NSMicrophoneUsageDescription:
          'אנחנו צריכים גישה למיקרופון כדי לשלוח הודעות קול',
        NSLocationWhenInUseUsageDescription:
          'אנחנו צריכים גישה למיקום שלך כדי לסנן מודעות לפי מרחק ממך',
      },
    },
    android: {
      package: 'com.pi.frontend',
      versionCode: 17,
      supportsRTL: true,
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        foregroundImage: './assets/app-icon/adaptive-foreground.png',
        backgroundColor: '#FFFFFF',
      },
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'READ_MEDIA_VIDEO',
        'RECORD_AUDIO',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
      ],
      ...(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY
        ? {
            config: {
              googleMaps: {
                apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY,
              },
            },
          }
        : {}),
    },
    web: {
      favicon: './assets/logo.png',
      bundler: 'metro', // one server at / so browser gets the app, not manifest JSON
    },
    plugins: [
      'expo-font',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'אנחנו צריכים גישה למיקום שלך כדי לסנן מודעות לפי מרחק ממך',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            // Only needed for local dev against http://localhost — never ship to production.
            usesCleartextTraffic: process.env.NODE_ENV !== 'production',
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 23,
            ndkVersion: '26.1.10909125',
            kotlinVersion: '1.8.22',
          },
        },
      ],
      withAndroidIndexDevEntry,
      withAndroidForceRtl,
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || '',
      eas: {
        projectId: '76dac87d-af46-4a44-96a6-88fa003f32b0',
      },
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        'https://opxeruasowoaybceskyp.supabase.co',
      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weGVydWFzb3dvYXliY2Vza3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDYyMzcsImV4cCI6MjA4NTA4MjIzN30.pJAaMued3jpnmS9D1pt6zmpNytcvzkhBVBk-TBQFs8w',
    },
  },
};
