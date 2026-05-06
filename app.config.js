// Config as JS so Hebrew strings keep correct UTF-8 when manifest is served (avoids Windows encoding issues with app.json)
module.exports = {
  expo: {
    name: 'PI Frontend',
    slug: 'pi-frontend',
    version: '1.0.0',
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
      infoPlist: {
        NSCameraUsageDescription: 'אנחנו צריכים גישה למצלמה כדי להעלות תמונות',
        NSPhotoLibraryUsageDescription: 'אנחנו צריכים גישה לספריית התמונות כדי להעלות תמונות וסרטונים',
        NSPhotoLibraryAddOnlyUsageDescription: 'אנחנו צריכים גישה לספריית התמונות כדי להוסיף תמונות',
      },
    },
    android: {
      package: 'com.pi.frontend',
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
    },
    web: {
      favicon: './assets/logo.png',
      bundler: 'metro', // one server at / so browser gets the app, not manifest JSON
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://opxeruasowoaybceskyp.supabase.co',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weGVydWFzb3dvYXliY2Vza3lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDYyMzcsImV4cCI6MjA4NTA4MjIzN30.pJAaMued3jpnmS9D1pt6zmpNytcvzkhBVBk-TBQFs8w',
    },
  },
};
