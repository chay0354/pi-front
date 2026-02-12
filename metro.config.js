const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use a different port to avoid conflicts when 19006 is in use
config.server = {
  port: 19008,
};

module.exports = config;
