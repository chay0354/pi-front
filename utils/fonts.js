// Use ../fonts/ (not ../assets/fonts/) so Metro builds URLs as /assets/fonts/... instead of /assets/assets/fonts/... (500 on web)
import {SecularOne_400Regular} from '@expo-google-fonts/secular-one';
import {IBMPlexSansHebrew_700Bold} from '@expo-google-fonts/ibm-plex-sans-hebrew';
import {Alef_400Regular} from '@expo-google-fonts/alef';
import {NotoSans_400Regular} from '@expo-google-fonts/noto-sans';

/** Loaded before first paint — covers most UI text. */
export const criticalFonts = {
  'Rubik-Regular': require('../fonts/Rubik-Regular.ttf'),
  'Rubik-Medium': require('../fonts/Rubik-Medium.ttf'),
};

/**
 * Bold weights + post-editor Figma text styles (node 35:293454).
 * Loaded in background after home is visible.
 */
export const deferredFonts = {
  'Rubik-Black': require('../fonts/Rubik-Black.ttf'),
  'Rubik-Bold': require('../fonts/Rubik-Bold.ttf'),
  'Rubik-ExtraBold': require('../fonts/Rubik-ExtraBold.ttf'),
  'Rubik-Light': require('../fonts/Rubik-Light.ttf'),
  'Rubik-SemiBold': require('../fonts/Rubik-SemiBold.ttf'),
  // Post editor סטייל 1–6 (Figma exact families)
  'SecularOne-Regular': SecularOne_400Regular,
  'IBMPlexSansHebrew-Bold': IBMPlexSansHebrew_700Bold,
  'Alef-Regular': Alef_400Regular,
  'NotoSans-Regular': NotoSans_400Regular,
};

export const fonts = {...criticalFonts, ...deferredFonts};
