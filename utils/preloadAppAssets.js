import {InteractionManager, Platform} from 'react-native';
import {Asset} from 'expo-asset';
import * as Font from 'expo-font';
import {MaterialCommunityIcons} from '@expo/vector-icons';

const FEED_ICON_MODULES = [
  require('../assets/top-filters/pics.png'),
  require('../assets/top-filters/list.png'),
  require('../assets/top-filters/video.png'),
  require('../assets/top-filters/liked.png'),
  require('../assets/buttom-bar/price.png'),
  require('../assets/buttom-bar/post.png'),
  require('../assets/buttom-bar/city.png'),
  require('../assets/buttom-bar/rooms_number.png'),
  require('../assets/buttom-bar/appartment_type.png'),
  require('../assets/bottom-bar-new.png'),
  require('../assets/lands/Frame 2 (2).png'),
  require('../assets/par/Frame 2 (3).png'),
  require('../assets/tiktok/meter-new.png'),
  require('../assets/tiktok/kind-new.png'),
  require('../assets/tiktok/prefrences.png'),
  require('../assets/donam.png'),
  require('../assets/tiktok/location.png'),
  require('../assets/tiktok/likes.png'),
  require('../assets/tiktok/comments.png'),
  require('../assets/tiktok/shere.png'),
  require('../assets/tiktok/views.png'),
  require('../assets/tiktok/new.png'),
  require('../assets/tiktok/new-2.png'),
  require('../assets/tiktok/company-home.png'),
  require('../assets/tiktok/on-pre-sell.png'),
  require('../assets/tiktok/ready.png'),
  require('../assets/tiktok/under-constraction.png'),
  require('../assets/tiktok/comment-like.png'),
  require('../assets/tiktok/comment-like-active.png'),
  require('../assets/tiktok/comments-card-reply.png'),
  require('../assets/tiktok/cam-comments.png'),
  require('../assets/tiktok/1-4hurt.png'),
  require('../assets/tiktok/5stars.png'),
  require('../assets/pre-sale.png'),
  require('../assets/side-filters/posts.png'),
  require('../assets/side-filters/services.png'),
  require('../assets/side-filters/private.png'),
  require('../assets/side-filters/broker.png'),
  require('../assets/partners-filters/posts.png'),
  require('../assets/partners-filters/profetional.png'),
  require('../assets/partners-filters/looking-to-get-in.png'),
  require('../assets/partners-filters/looking-for-somone-for-my-apaprtment.png'),
  require('../assets/partners-filters/looking-for-patner.png'),
];

let preloadPromise = null;

/** Decode bundled PNG/SVG assets + vector icon font once so chrome icons appear instantly. */
export function preloadAppAssets() {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    const tasks = [
      Font.loadAsync(MaterialCommunityIcons.font),
      ...FEED_ICON_MODULES.map(module =>
        Asset.fromModule(module).downloadAsync(),
      ),
    ];
    await Promise.allSettled(tasks);
  })();

  return preloadPromise;
}

/** After home is interactive — avoids competing with fonts / first paint. */
export function schedulePreloadAppAssets() {
  const task = InteractionManager.runAfterInteractions(() => {
    preloadAppAssets().catch(() => {});
  });
  return () => task.cancel();
}

/** Android fades bundled images in over ~300ms by default — looks like slow icon loading. */
export function disableAndroidImageFade() {
  if (Platform.OS !== 'android') return;
  const Image = require('react-native').Image;
  Image.defaultProps = Image.defaultProps || {};
  Image.defaultProps.fadeDuration = 0;
}
