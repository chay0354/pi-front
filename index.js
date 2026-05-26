import './i18nManagerWebPatch';
import './rtlInit';
import {disableAndroidImageFade} from './utils/preloadAppAssets';

disableAndroidImageFade();

import {registerRootComponent} from 'expo';
import App from './App';

export {textAlign, flexEnd, flexStart} from './utils/rtlLayout';

registerRootComponent(App);
