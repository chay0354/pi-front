import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Icon, Spinner} from './AccountUi';
import styles from './CircleCropModal.module.css';

const CROP_SIZE = 400;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
/** Slack past each image edge — you can keep panning a little after the photo ends. */
const PAN_OVERSCROLL = 80;

function getLayout(imgSize, pan, zoom, fit = 'cover', frameW = CROP_SIZE, frameH = CROP_SIZE) {
  const byWidth = frameW / imgSize.width;
  const byHeight = frameH / imgSize.height;
  const baseScale = fit === 'contain' ? Math.min(byWidth, byHeight) : Math.max(byWidth, byHeight);
  const totalScale = baseScale * zoom;
  const displayW = imgSize.width * totalScale;
  const displayH = imgSize.height * totalScale;
  return {
    totalScale,
    displayW,
    displayH,
    imageLeft: frameW / 2 - displayW / 2 + pan.x,
    imageTop: frameH / 2 - displayH / 2 + pan.y,
  };
}

function clampPan(pan, displayW, displayH, frameW = CROP_SIZE, frameH = CROP_SIZE) {
  const halfX = Math.max(0, (displayW - frameW) / 2) + PAN_OVERSCROLL;
  const halfY = Math.max(0, (displayH - frameH) / 2) + PAN_OVERSCROLL;
  return {
    x: Math.min(halfX, Math.max(-halfX, pan.x)),
    y: Math.min(halfY, Math.max(-halfY, pan.y)),
  };
}

/** The saved file fills the crop window; a circle guide is not baked into the pixels. */
function renderCrop(img, layout, frameW = CROP_SIZE, frameH = CROP_SIZE) {
  const canvas = document.createElement('canvas');
  const outputScale = Math.min(2, Math.max(1, 1 / layout.totalScale));
  canvas.width = Math.round(frameW * outputScale);
  canvas.height = Math.round(frameH * outputScale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1e1d27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(outputScale, outputScale);
  ctx.drawImage(img, layout.imageLeft, layout.imageTop, layout.displayW, layout.displayH);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('crop failed'))), 'image/jpeg', 0.88);
  });
}

/**
 * Circle crop editor. `onConfirm` receives `{uri, type, name, file}` (an uploadable picked file),
 * or `{error}` when the crop could not be produced.
 */
export default function CircleCropModal({
  imageUri,
  title = 'חתוך את הלוגו',
  shape = 'circle',
  fit = 'cover',
  contained = false,
  frameWidth = CROP_SIZE,
  frameHeight = CROP_SIZE,
  media = 'image',
  onCancel,
  onConfirm,
}) {
  const frameW = frameWidth || CROP_SIZE;
  const frameH = frameHeight || CROP_SIZE;
  const [img, setImg] = useState(null);
  const [videoSize, setVideoSize] = useState(null);
  const [pan, setPan] = useState({x: 0, y: 0});
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const drag = useRef(null);

  useEffect(() => {
    if (!imageUri || media === 'video') return undefined;
    let cancelled = false;
    const el = new window.Image();
    if (/^https?:/i.test(imageUri)) el.crossOrigin = 'anonymous';
    el.onload = () => !cancelled && setImg(el);
    el.src = imageUri;
    setPan({x: 0, y: 0});
    setZoom(1);
    return () => {
      cancelled = true;
    };
  }, [imageUri, media]);

  useEffect(() => {
    setPan({x: 0, y: 0});
    setZoom(1);
    setVideoSize(null);
  }, [imageUri, media]);

  const imgSize = useMemo(() => {
    if (media === 'video') return videoSize || {width: 1, height: 1};
    return img ? {width: img.naturalWidth || 1, height: img.naturalHeight || 1} : {width: 1, height: 1};
  }, [img, media, videoSize]);
  const layout = useMemo(
    () => getLayout(imgSize, pan, zoom, fit, frameW, frameH),
    [imgSize, pan, zoom, fit, frameW, frameH],
  );

  const applyPan = useCallback(
    next => {
      const {displayW, displayH} = getLayout(imgSize, next, zoom, fit, frameW, frameH);
      setPan(clampPan(next, displayW, displayH, frameW, frameH));
    },
    [imgSize, zoom, fit, frameW, frameH],
  );

  useEffect(() => {
    setPan(p => {
      const {displayW, displayH} = getLayout(imgSize, p, zoom, fit, frameW, frameH);
      return clampPan(p, displayW, displayH, frameW, frameH);
    });
  }, [zoom, imgSize, fit, frameW, frameH]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const adjustZoom = delta =>
    setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((prev + delta) * 10) / 10)));

  const onPointerDown = e => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {x: e.clientX, y: e.clientY, pan};
  };
  const onPointerMove = e => {
    if (!drag.current) return;
    // The stage is CSS-scaled; convert screen pixels back to stage pixels.
    const rect = e.currentTarget.getBoundingClientRect();
    const k = CROP_SIZE / rect.width;
    applyPan({
      x: drag.current.pan.x + (e.clientX - drag.current.x) * k,
      y: drag.current.pan.y + (e.clientY - drag.current.y) * k,
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const handleConfirm = async () => {
    if (saving) return;
    if (media === 'video') {
      if (!videoSize || videoSize.width <= 1 || videoSize.height <= 1) {
        onConfirm?.({error: 'הסרטון עדיין נטען. נסו שוב.'});
        return;
      }
      onConfirm?.({
        crop: {
          aspect: videoSize.width / videoSize.height,
          frameLeft: layout.imageLeft / frameW,
          frameTop: layout.imageTop / frameH,
          frameWidth: layout.displayW / frameW,
          frameHeight: layout.displayH / frameH,
        },
      });
      return;
    }
    if (!img) return;
    setSaving(true);
    try {
      const blob = await renderCrop(img, layout, frameW, frameH);
      const name = `crop-${Date.now()}.jpg`;
      onConfirm?.({uri: URL.createObjectURL(blob), type: 'image/jpeg', name, file: blob});
    } catch (err) {
      onConfirm?.({error: err?.message || 'לא ניתן לחתוך את התמונה. נסה/י שוב.'});
    } finally {
      setSaving(false);
    }
  };

  if (!imageUri) return null;

  return (
    <div
      className={`${styles.overlay} ${contained ? styles.overlayContained : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-account-modal="">
      <div className={styles.panel}>
        <header className={styles.header}>
          <button type="button" className={styles.iconBtn} onClick={onCancel} aria-label="ביטול">
            <Icon name="close" size={28} />
          </button>
          <h2 className={styles.title}>{title}</h2>
          <span className={styles.iconBtn} />
        </header>

        <div
          className={styles.stage}
          style={{width: frameW, height: frameH}}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={e => adjustZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)}>
          {media === 'video' ? (
            <video
              src={imageUri}
              className={styles.image}
              muted
              playsInline
              autoPlay
              loop
              style={
                videoSize
                  ? {width: layout.displayW, height: layout.displayH, left: layout.imageLeft, top: layout.imageTop}
                  : {width: frameW, height: frameH, left: 0, top: 0, opacity: 0}
              }
              onLoadedMetadata={event => {
                const width = event.currentTarget.videoWidth;
                const height = event.currentTarget.videoHeight;
                if (width > 0 && height > 0) setVideoSize({width, height});
              }}
            />
          ) : null}
          {media !== 'video' && img ? (
            <img
              src={imageUri}
              alt=""
              draggable={false}
              className={styles.image}
              style={{
                width: layout.displayW,
                height: layout.displayH,
                left: layout.imageLeft,
                top: layout.imageTop,
              }}
            />
          ) : null}
          {media === 'video' ? (videoSize ? null : <Spinner />) : img ? null : <Spinner />}
          {shape === 'circle' ? <span className={styles.mask} aria-hidden="true" /> : null}
          <span className={shape === 'circle' ? styles.ring : styles.square} aria-hidden="true" />
        </div>
        <p className={styles.hint}>
          {shape === 'circle' ? 'גרור כדי למקם · השתמש בזום לדיוק' : 'גרור כדי לבחור את החלק · השתמש בזום לדיוק'}
        </p>

        <div className={styles.zoomRow}>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={() => adjustZoom(-ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            aria-label="הקטן">
            <Icon name="minus" size={24} />
          </button>
          <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className={styles.zoomBtn}
            onClick={() => adjustZoom(ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="הגדל">
            <Icon name="plus" size={24} />
          </button>
        </div>

        <button type="button" className={styles.confirm} onClick={handleConfirm} disabled={saving || !img}>
          {saving ? <Spinner /> : 'אישור'}
        </button>
      </div>
    </div>
  );
}
