import {postTextFont} from '../../feed/postText';
import {getPostTextVisualStyle, scalePostTextOverlayBlock} from '../lib/postTextOverlay';

/**
 * Renders saved post text over feed media (port of mobile PostTextOverlays).
 * Coordinates are physical-left based, so the root is forced LTR.
 */
export default function PostTextOverlays({
  overlays,
  previewWidth = 0,
  previewHeight = 0,
  coordsSpace = 'preview',
  feedWidth,
  feedHeight,
  canvas = 'preview',
}) {
  if (!Array.isArray(overlays) || overlays.length === 0) return null;

  return (
    <div dir="ltr" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {overlays.map((block, index) => {
        const visual = getPostTextVisualStyle(block.color, block.bgMode);
        const layout = scalePostTextOverlayBlock(block, {
          previewWidth,
          previewHeight,
          feedWidth,
          feedHeight,
          coordsSpace,
          canvas,
        });
        const font = postTextFont(block.textStyleIndex ?? 0);
        const hasBackground = visual.backgroundColor !== 'transparent';
        const align = block.align || 'center';
        const chipScale = layout.scale > 0 ? layout.scale : 1;
        const w = Math.max(0, Math.round(layout.width));

        return (
          <div
            key={`${index}-${String(block.text || '').slice(0, 12)}`}
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              left: Math.round(layout.translateX),
              top: layout.translateY,
              width: w,
              maxWidth: w,
              padding: layout.padding ?? 0,
            }}>
            <div
              style={{
                alignSelf: layout.normalized
                  ? 'stretch'
                  : align === 'left'
                    ? 'flex-start'
                    : align === 'right'
                      ? 'flex-end'
                      : 'center',
                maxWidth: '100%',
                ...(hasBackground
                  ? {
                      backgroundColor: visual.backgroundColor,
                      padding: `${Math.max(1, Math.floor(4 * chipScale))}px ${Math.max(1, Math.floor(10 * chipScale))}px`,
                      borderRadius: Math.max(2, Math.floor(8 * chipScale)),
                      overflow: 'hidden',
                    }
                  : null),
              }}>
              <p
                dir="rtl"
                style={{
                  margin: 0,
                  color: visual.textColor,
                  fontSize: layout.fontSize,
                  lineHeight: `${layout.lineHeight}px`,
                  textAlign: align,
                  fontFamily: `'${font.family}', 'Rubik', sans-serif`,
                  fontWeight: font.weight,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                }}>
                {block.text}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
