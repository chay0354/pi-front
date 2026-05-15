/**
 * Must load before `./App` so I18nManager prefs apply before any screen reads isRTL.
 * Native mirrors: Android MainApplication + iOS AppDelegate (RCTI18nUtil).
 */
import {I18nManager, Platform} from 'react-native';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
I18nManager.swapLeftAndRightInRTL(true);

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.style.direction = 'rtl';
  if (document.body) {
    document.body.setAttribute('dir', 'rtl');
    document.body.style.direction = 'rtl';
  }
}
