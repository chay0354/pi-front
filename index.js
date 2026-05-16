import './i18nManagerWebPatch';
import './rtlInit';
import {registerRootComponent} from 'expo';
import {I18nManager} from 'react-native';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
const isRTL = I18nManager.isRTL;
console.log('isRTL', isRTL);
export const textAlign = 'left'; // isRTL ? 'left' : 'right';
export const flexEnd = 'flex-end'; // isRTL ? 'flex-end' : 'flex-start';
export const flexStart = 'flex-start'; // isRTL ? 'flex-start' : 'flex-end';
registerRootComponent(App);
