import {useState} from 'react';
import {fitWidthMediaLayout} from '../lib/fitWidthMedia';

const fill = {position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'};

/**
 * Still media inside a post frame, laid out with the feed's rule: full frame
 * width, height from the natural aspect (letterbox top/bottom, never side bars).
 */
export default function PostFrameFitWidthImage({uri, frameWidth, imageStyle, onError, cover = false}) {
  const [natural, setNatural] = useState(null);
  const [naturalFor, setNaturalFor] = useState(uri);
  if (naturalFor !== uri) {
    setNaturalFor(uri);
    setNatural(null);
  }

  const layout = !cover && natural ? fitWidthMediaLayout(frameWidth, natural.width, natural.height) : null;

  if (!uri) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      <img
        src={uri}
        alt=""
        draggable={false}
        style={{
          ...(layout ? {width: layout.width, height: layout.height, flexShrink: 0, maxWidth: 'none'} : fill),
          ...imageStyle,
        }}
        onLoad={
          cover
            ? undefined
            : e => {
                const w = e.currentTarget.naturalWidth;
                const h = e.currentTarget.naturalHeight;
                if (w > 0 && h > 0) setNatural({width: w, height: h});
              }
        }
        onError={onError}
      />
    </div>
  );
}
