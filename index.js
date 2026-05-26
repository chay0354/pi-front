import './i18nManagerWebPatch';
import './rtlInit';
import {registerRootComponent} from 'expo';
import App from './App';

export {textAlign, flexEnd, flexStart} from './utils/rtlLayout';

registerRootComponent(App);
