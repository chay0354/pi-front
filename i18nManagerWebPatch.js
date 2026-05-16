/**
 * react-native-web's I18nManager omits swapLeftAndRightInRTL; rtlInit.js expects it.
 * No-op on web only — native still uses the real implementation.
 */
import {I18nManager, Platform} from 'react-native';

if (
  Platform.OS === 'web' &&
  typeof I18nManager.swapLeftAndRightInRTL !== 'function'
) {
  I18nManager.swapLeftAndRightInRTL = () => {};
}
