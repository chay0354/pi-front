const GUTTER = 6;

/**
 * Collage cells for 2–5 photos inside the ad media frame (mobile `getCollageCellLayouts`).
 * Index 0 sits on the right, matching the app's RTL mirror.
 *   2 — two equal columns
 *   3 — wide hero on top, two tiles below
 *   4 — 2×2 grid
 *   5 — three tiles in the right column, two in the left (Figma 232:25882)
 */
export function collageCells(imageCount, width, height) {
  const count = Math.min(Math.max(Math.floor(Number(imageCount)) || 0, 2), 5);
  const colW = (width - GUTTER) / 2;
  const halfH = (height - GUTTER) / 2;
  const cells = [];

  switch (count) {
    case 2:
      for (let i = 0; i < 2; i++) {
        cells.push({left: i * (colW + GUTTER), top: 0, width: colW, height});
      }
      break;

    case 3:
      cells.push({left: 0, top: 0, width, height: halfH});
      for (let i = 0; i < 2; i++) {
        cells.push({left: i * (colW + GUTTER), top: halfH + GUTTER, width: colW, height: halfH});
      }
      break;

    case 4:
      for (let i = 0; i < 4; i++) {
        cells.push({
          left: (i % 2) * (colW + GUTTER),
          top: i < 2 ? 0 : halfH + GUTTER,
          width: colW,
          height: halfH,
        });
      }
      break;

    default: {
      const thirdH = (height - 2 * GUTTER) / 3;
      for (let i = 0; i < 3; i++) {
        cells.push({left: 0, top: i * (thirdH + GUTTER), width: colW, height: thirdH});
      }
      for (let i = 0; i < 2; i++) {
        cells.push({left: colW + GUTTER, top: i * (halfH + GUTTER), width: colW, height: halfH});
      }
      break;
    }
  }

  return cells.map(cell => ({...cell, left: width - cell.left - cell.width}));
}
