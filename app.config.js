// Single source of truth for Expo (static app.json removed — avoid drift).
// Config as JS so Hebrew strings keep correct UTF-8 when manifest is served (avoids Windows encoding issues).
const { withMainApplication } = require('@expo/config-plugins');

/** Dev client loads /index.bundle — avoids Metro rewrite of .expo/.virtual-metro-entry if RN CLI drops it. */
function withAndroidIndexDevEntry(config) {
  return withMainApplication(config, async (c) => {
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

module.exports = {
  expo: {
    name: 'PI Frontend',
    slug: 'pi-frontend',
    version: '1.0.0',
    scheme: 'pifrontend',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
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
        NSCameraUsageDescription: 'אנחנו צריכים גישה למצלמה כדי להעלות תמונות',
        NSPhotoLibraryUsageDescription: 'אנחנו צריכים גישה לספריית התמונות כדי להעלות תמונות וסרטונים',
        NSPhotoLibraryAddOnlyUsageDescription: 'אנחנו צריכים גישה לספריית התמונות כדי להוסיף תמונות',
        NSMicrophoneUsageDescription: 'אנחנו צריכים גישה למיקרופון כדי לשלוח הודעות קול',
      },
    },
    android: {
      package: 'com.pi.frontend',
      versionCode: 6,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'READ_MEDIA_VIDEO',
        'RECORD_AUDIO',
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
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 23,
            // Must match RN 0.73 prebuild (see react-native/template/android/build.gradle: kotlin 1.8.x).
            // Kotlin 1.9.x here has caused release Gradle failures on EAS for some projects.
            kotlinVersion: '1.8.22',
          },
        },
      ],
      withAndroidIndexDevEntry,
    ],
    extra: {
      eas: {
        projectId: '76dac87d-af46-4a44-96a6-88fa003f32b0',
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://opxeruasowoaybceskyp.supabase.co',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weGVydWFzb3dvYXliY2Vza3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDYyMzcsImV4cCI6MjA4NTA4MjIzN30.pJAaMued3jpnmS9D1pt6zmpNytcvzkhBVBk-TBQFs8w',
    },
  },
};
