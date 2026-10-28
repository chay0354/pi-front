import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Icon, Spinner} from './AccountUi';
import styles from './CircleCropModal.module.css';

const CROP_SIZE = 400;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
/** Slack past each image edge — you can keep panning a little after the photo ends. */
const PAN_OVERSCROLL = 80;

function getLayout(imgSize, pan, zoom, fit = 'cover') {
  const byWidth = CROP_SIZE / imgSize.width;
  const byHeight = CROP_SIZE / imgSize.height;
  const baseScale = fit === 'contain' ? Math.min(byWidth, byHeight) : Math.max(byWidth, byHeight);
  const totalScale = baseScale * zoom;
  const displayW = imgSize.width * totalScale;
  const displayH = imgSize.height * totalScale;
  return {
    totalScale,
    displayW,
    displayH,
    imageLeft: CROP_SIZE / 2 - displayW / 2 + pan.x,
    imageTop: CROP_SIZE / 2 - displayH / 2 + pan.y,
  };
}

function clampPan(pan, displayW, displayH) {
  const halfX = Math.max(0, (displayW - CROP_SIZE) / 2) + PAN_OVERSCROLL;
  const halfY = Math.max(0, (displayH - CROP_SIZE) / 2) + PAN_OVERSCROLL;
  return {
    x: Math.min(halfX, Math.max(-halfX, pan.x)),
    y: Math.min(halfY, Math.max(-halfY, pan.y)),
  };
}

/** The saved file stays a full square (no baked-in dark corners); the circle is only a guide. */
function renderCrop(img, layout) {
  const canvas = document.createElement('canvas');
  const outputScale = Math.min(2, Math.max(1, 1 / layout.totalScale));
  canvas.width = Math.round(CROP_SIZE * outputScale);
  canvas.height = Math.round(CROP_SIZE * outputScale);
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
  onCancel,
  onConfirm,
}) {
  const [img, setImg] = useState(null);
  const [pan, setPan] = useState({x: 0, y: 0});
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const drag = useRef(null);

  useEffect(() => {
    if (!imageUri) return undefined;
    let cancelled = false;
    const el = new window.Image();
    el.onload = () => !cancelled && setImg(el);
    el.src = imageUri;
    setPan({x: 0, y: 0});
    setZoom(1);
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const imgSize = useMemo(
    () => (img ? {width: img.naturalWidth || 1, height: img.naturalHeight || 1} : {width: 1, height: 1}),
    [img],
  );
  const layout = useMemo(() => getLayout(imgSize, pan, zoom, fit), [imgSize, pan, zoom, fit]);

  const applyPan = useCallback(
    next => {
      const {displayW, displayH} = getLayout(imgSize, next, zoom, fit);
      setPan(clampPan(next, displayW, displayH));
    },
    [imgSize, zoom, fit],
  );

  useEffect(() => {
    setPan(p => {
      const {displayW, displayH} = getLayout(imgSize, p, zoom, fit);
      return clampPan(p, displayW, displayH);
    });
  }, [zoom, imgSize, fit]);

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
    if (!img || saving) return;
    setSaving(true);
    try {
      const blob = await renderCrop(img, layout);
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
          style={{width: CROP_SIZE, height: CROP_SIZE}}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={e => adjustZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)}>
          {img ? (
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
          ) : (
            <Spinner />
          )}
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
