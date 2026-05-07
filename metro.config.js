const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep Metro on the default port (8081). The Android dev build asks 10.0.2.2:8081.
// A custom port here causes 404: /.expo/.virtual-metro-entry.bundle (nothing listening on 8081).

// Allow .mjs so Metro can resolve packages like @supabase/supabase-js (fixes 500 / MIME type error on web bundle)
const { sourceExts } = config.resolver;
config.resolver = {
  ...config.resolver,
  sourceExts: [...(sourceExts || []), 'mjs'],
};

module.exports = config;
