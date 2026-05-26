// Use ../fonts/ (not ../assets/fonts/) so Metro builds URLs as /assets/fonts/... instead of /assets/assets/fonts/... (500 on web)

/** Loaded before first paint — covers most UI text. */
export const criticalFonts = {
  'Rubik-Regular': require('../fonts/Rubik-Regular.ttf'),
  'Rubik-Medium': require('../fonts/Rubik-Medium.ttf'),
};

/** Bold weights — loaded in background after home is visible. */
export const deferredFonts = {
  'Rubik-Black': require('../fonts/Rubik-Black.ttf'),
  'Rubik-Bold': require('../fonts/Rubik-Bold.ttf'),
  'Rubik-ExtraBold': require('../fonts/Rubik-ExtraBold.ttf'),
  'Rubik-Light': require('../fonts/Rubik-Light.ttf'),
  'Rubik-SemiBold': require('../fonts/Rubik-SemiBold.ttf'),
};

export const fonts = {...criticalFonts, ...deferredFonts};
