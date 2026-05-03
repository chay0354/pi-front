'use strict';

/**
 * Full-screen collage cell geometries for TikTok-style feed (קולאז').
 * Supports 1–5 images; each count has a distinct layout:
 *   1 — full bleed
 *   2 — two columns (equal width)
 *   3 — hero top, two tiles bottom
 *   4 — 2×2 grid
 *   5 — 2 tiles left column, 3 tiles right column
 *
 * Coordinates are absolute within the viewport (same convention as TikTokFeedScreen ImageSwiper).
 *
 * @param {number} imageCount — number of images (clamped 1–5)
 * @param {number} screenWidth
 * @param {number} screenHeight
 * @returns {Array<{width: number, height: number, top: number, left: number}>}
 */
export function getCollageCellLayouts(imageCount, screenWidth, screenHeight) {
  const count = Math.min(Math.max(Math.floor(Number(imageCount)) || 1, 1), 5);
  const COLLAGE_INSET = count > 1 ? 3 : 0;
  const COLLAGE_GUTTER = count > 1 ? 6 : 0;
  const iw = screenWidth - 2 * COLLAGE_INSET;
  const ih = screenHeight - 2 * COLLAGE_INSET;

  const layouts = [];

  switch (count) {
    case 1:
      layouts.push({
        width: screenWidth,
        height: screenHeight,
        top: 0,
        left: 0,
      });
      break;

    case 2: {
      const cw = (iw - COLLAGE_GUTTER) / 2;
      for (let index = 0; index < 2; index++) {
        layouts.push({
          width: cw,
          height: ih,
          top: COLLAGE_INSET,
          left: COLLAGE_INSET + index * (cw + COLLAGE_GUTTER),
        });
      }
      break;
    }

    case 3: {
      const hRow = (ih - COLLAGE_GUTTER) / 2;
      const cw = (iw - COLLAGE_GUTTER) / 2;
      layouts.push({
        width: iw,
        height: hRow,
        top: COLLAGE_INSET,
        left: COLLAGE_INSET,
      });
      for (let index = 1; index < 3; index++) {
        layouts.push({
          width: cw,
          height: hRow,
          top: COLLAGE_INSET + hRow + COLLAGE_GUTTER,
          left: COLLAGE_INSET + (index - 1) * (cw + COLLAGE_GUTTER),
        });
      }
      break;
    }

    case 4: {
      const cw = (iw - COLLAGE_GUTTER) / 2;
      const ch = (ih - COLLAGE_GUTTER) / 2;
      for (let index = 0; index < 4; index++) {
        const isTopRow = index < 2;
        layouts.push({
          width: cw,
          height: ch,
          top: COLLAGE_INSET + (isTopRow ? 0 : ch + COLLAGE_GUTTER),
          left: COLLAGE_INSET + (index % 2) * (cw + COLLAGE_GUTTER),
        });
      }
      break;
    }

    case 5: {
      const leftColW = (iw - COLLAGE_GUTTER) / 2;
      const leftCellH = (ih - COLLAGE_GUTTER) / 2;
      const rightCellH = (ih - 2 * COLLAGE_GUTTER) / 3;
      for (let index = 0; index < 5; index++) {
        if (index <= 1) {
          layouts.push({
            width: leftColW,
            height: leftCellH,
            top: COLLAGE_INSET + index * (leftCellH + COLLAGE_GUTTER),
            left: COLLAGE_INSET,
          });
        } else {
          const rightIndex = index - 2;
          layouts.push({
            width: leftColW,
            height: rightCellH,
            top: COLLAGE_INSET + rightIndex * (rightCellH + COLLAGE_GUTTER),
            left: COLLAGE_INSET + leftColW + COLLAGE_GUTTER,
          });
        }
      }
      break;
    }

    default:
      break;
  }

  return layouts;
}
