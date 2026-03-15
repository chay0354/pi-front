const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use a different port to avoid conflicts when 19006 is in use
config.server = {
  port: 19008,
};

// Allow .mjs so Metro can resolve packages like @supabase/supabase-js (fixes 500 / MIME type error on web bundle)
const { sourceExts } = config.resolver;
config.resolver = {
  ...config.resolver,
  sourceExts: [...(sourceExts || []), 'mjs'],
};

module.exports = config;
