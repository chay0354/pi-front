module.exports = function(api) {
  // Disable Babel cache so code changes always show after refresh (slower rebuild, fresh bundle)
  api.cache(false);
  return {
    presets: ['babel-preset-expo'],
  };
};
