import {Dimensions} from 'react-native';

/** Card photo height in בעלי מקצוע בתחום הנדל״ן. The horizontal crop uses this frame. */
export const DIRECTORY_CARD_MEDIA_HEIGHT = 212;

export function directoryCardMediaFrame() {
  const width = Math.max(240, Dimensions.get('window').width - 48);
  return {width, height: DIRECTORY_CARD_MEDIA_HEIGHT};
}

/** Framing saved from עריכת תצוגה אופקית on a profile video. */
export function parseDirectoryVideoCrop(value) {
  if (!value) return null;
  let crop = value;
  if (typeof value === 'string') {
    try {
      crop = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!crop || typeof crop !== 'object') return null;
  const aspect = Number(crop.aspect);
  const frameWidth = Number(crop.frameWidth);
  const frameHeight = Number(crop.frameHeight);
  const frameLeft = Number(crop.frameLeft);
  const frameTop = Number(crop.frameTop);
  if (![aspect, frameWidth, frameHeight, frameLeft, frameTop].every(Number.isFinite)) {
    return null;
  }
  if (aspect <= 0 || frameWidth <= 0 || frameHeight <= 0) return null;
  return {aspect, frameWidth, frameHeight, frameLeft, frameTop};
}

/** Place the video inside the directory card using the saved frame. */
export function placedMediaStyle(crop, cardW, cardH) {
  if (!crop || !cardW || !cardH) return null;
  const centerX = (crop.frameLeft + crop.frameWidth / 2) * cardW;
  const centerY = (crop.frameTop + crop.frameHeight / 2) * cardH;
  const height = crop.frameHeight * cardH;
  const width = height * crop.aspect;
  return {
    position: 'absolute',
    width,
    height,
    left: centerX - width / 2,
    top: centerY - height / 2,
  };
}
