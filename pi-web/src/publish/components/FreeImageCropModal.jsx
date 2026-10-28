import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {mdiClose} from '@mdi/js';
import MdiIcon from '../MdiIcon';
import styles from './FreeImageCropModal.module.css';

const MIN_CROP = 94;
const HANDLE = 57;
const MAX_ZOOM = 5;
const ZOOM_STEP = 1.1;
/** Corner brackets overhang the frame; keep the frame this far inside the stage so they never clip. */
const CROP_INSET = 23;
const CORNERS = ['nw', 'ne', 'sw', 'se'];

function loadImage(uri, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = uri;
  });
}

function renderCrop(img, rect) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, rect.originX, rect.originY, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('crop failed'))), 'image/jpeg', 0.9);
  });
}

function resizeCrop(start, dx, dy, corner, bounds) {
  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;
  if (corner === 'nw' || corner === 'sw') left = start.x + dx;
  if (corner === 'ne' || corner === 'se') right = start.x + start.w + dx;
  if (corner === 'nw' || corner === 'ne') top = start.y + dy;
  if (corner === 'sw' || corner === 'se') bottom = start.y + start.h + dy;

  const bL = bounds.x;
  const bT = bounds.y;
  const bR = bounds.x + bounds.width;
  const bB = bounds.y + bounds.height;
  left = Math.max(bL, Math.min(left, bR - MIN_CROP));
  right = Math.min(bR, Math.max(right, bL + MIN_CROP));
  top = Math.max(bT, Math.min(top, bB - MIN_CROP));
  bottom = Math.min(bB, Math.max(bottom, bT + MIN_CROP));
  if (right - left < MIN_CROP) {
    if (corner === 'nw' || corner === 'sw') left = right - MIN_CROP;
    else right = left + MIN_CROP;
  }
  if (bottom - top < MIN_CROP) {
    if (corner === 'nw' || corner === 'ne') top = bottom - MIN_CROP;
    else bottom = top + MIN_CROP;
  }
  return {x: left, y: top, w: right - left, h: bottom - top};
}

function moveCrop(start, dx, dy, bounds) {
  const x = Math.max(bounds.x, Math.min(start.x + dx, bounds.x + bounds.width - start.w));
  const y = Math.max(bounds.y, Math.min(start.y + dy, bounds.y + bounds.height - start.h));
  return {x, y, w: start.w, h: start.h};
}

/** Smallest zoom at which the image still fills the crop window. */
function minZoomFor(crop, base) {
  if (!crop || !base?.width || !base?.height) return 1;
  return Math.max(1, crop.w / base.width, crop.h / base.height);
}

/** Keep the zoomed image covering the crop window so it never shows empty edges. */
function clampView(view, crop, base) {
  const zoom = Math.min(MAX_ZOOM, Math.max(minZoomFor(crop, base), view.zoom));
  const width = base.width * zoom;
  const height = base.height * zoom;
  const left = Math.min(crop.x, Math.max(view.left, crop.x + crop.w - width));
  const top = Math.min(crop.y, Math.max(view.top, crop.y + crop.h - height));
  return {zoom, left, top};
}

/** Scales the photo around the crop centre; the window itself stays put. */
function zoomView(start, factor, crop, base) {
  const zoom = Math.min(MAX_ZOOM, Math.max(minZoomFor(crop, base), start.zoom * factor));
  const cx = crop.x + crop.w / 2;
  const cy = crop.y + crop.h / 2;
  const fx = (cx - start.left) / (base.width * start.zoom);
  const fy = (cy - start.top) / (base.height * start.zoom);
  return clampView(
    {zoom, left: cx - fx * base.width * zoom, top: cy - fy * base.height * zoom},
    crop,
    base,
  );
}

function normalizeCropFractions(value) {
  if (!value) return null;
  const left = Number(value.left);
  const top = Number(value.top);
  const width = Number(value.width);
  const height = Number(value.height);
  if (![left, top, width, height].every(n => Number.isFinite(n))) return null;
  if (width <= 0.02 || height <= 0.02) return null;
  const l = Math.max(0, Math.min(left, 0.98));
  const t = Math.max(0, Math.min(top, 0.98));
  return {
    left: l,
    top: t,
    width: Math.max(0.02, Math.min(width, 1 - l)),
    height: Math.max(0.02, Math.min(height, 1 - t)),
  };
}

/** Fractions are of the source image, so the same window comes back on the next edit. */
function cropFromFractions(box, fractions) {
  if (!fractions || !box?.width || !box?.height) return null;
  const maxR = box.left + box.width;
  const maxB = box.top + box.height;
  const w = Math.max(MIN_CROP, Math.min(fractions.width * box.width, box.width));
  const h = Math.max(MIN_CROP, Math.min(fractions.height * box.height, box.height));
  let x = box.left + fractions.left * box.width;
  let y = box.top + fractions.top * box.height;
  x = Math.max(box.left, Math.min(x, maxR - w));
  y = Math.max(box.top, Math.min(y, maxB - h));
  return {x, y, w, h};
}

/**
 * Free (rectangular) crop editor for ad and post images.
 * `onConfirm` receives `{uri, type, name, file, crop}` — `crop` holds source-image fractions
 * to reopen the same window — or `{error}` when the crop could not be produced.
 */
export default function FreeImageCropModal({imageUri, title = 'עריכת תמונה', initialCrop = null, onCancel, onConfirm}) {
  const [img, setImg] = useState(null);
  const [tainted, setTainted] = useState(false);
  const [crop, setCrop] = useState(null);
  const [view, setView] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState({width: 0, height: 0});
  const stageRef = useRef(null);
  const initialCropRef = useRef(null);
  const seededRef = useRef(false);
  const drag = useRef(null);

  useEffect(() => {
    initialCropRef.current = normalizeCropFractions(initialCrop);
    seededRef.current = false;
    setImg(null);
    setCrop(null);
    setView(null);
    setTainted(false);
    if (!imageUri) return undefined;
    let cancelled = false;
    loadImage(imageUri, true)
      .catch(() => loadImage(imageUri, false).then(el => (cancelled ? el : (setTainted(true), el))))
      .then(el => !cancelled && setImg(el))
      .catch(() => !cancelled && onConfirm?.({error: 'לא ניתן לטעון את התמונה.'}));
    return () => {
      cancelled = true;
    };
    // Read initialCrop only when this image opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUri]);

  const imgSize = useMemo(
    () => (img ? {width: img.naturalWidth || 1, height: img.naturalHeight || 1} : null),
    [img],
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => {
      const width = Math.round(el.clientWidth);
      const height = Math.round(el.clientHeight);
      setStage(prev => (prev.width === width && prev.height === height ? prev : {width, height}));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [imageUri]);

  /** Image fitted to the stage at zoom 1 — the reference for crop fractions. */
  const baseBox = useMemo(() => {
    if (!imgSize || stage.width < 2 || stage.height < 2) return null;
    const availW = stage.width - CROP_INSET * 2;
    const availH = stage.height - CROP_INSET * 2;
    const scale = Math.min(availW / imgSize.width, availH / imgSize.height);
    const width = imgSize.width * scale;
    const height = imgSize.height * scale;
    return {left: CROP_INSET + (availW - width) / 2, top: CROP_INSET + (availH - height) / 2, width, height};
  }, [imgSize, stage]);

  useEffect(() => {
    if (!baseBox || seededRef.current) return;
    seededRef.current = true;
    setView({zoom: 1, left: baseBox.left, top: baseBox.top});
    setCrop(
      cropFromFractions(baseBox, initialCropRef.current) || {
        x: baseBox.left,
        y: baseBox.top,
        w: baseBox.width,
        h: baseBox.height,
      },
    );
  }, [baseBox]);

  const imageBox = useMemo(() => {
    if (!baseBox || !view) return null;
    return {left: view.left, top: view.top, width: baseBox.width * view.zoom, height: baseBox.height * view.zoom};
  }, [baseBox, view]);

  const bounds = useMemo(() => {
    if (!imageBox) return null;
    const x = Math.max(CROP_INSET, imageBox.left);
    const y = Math.max(CROP_INSET, imageBox.top);
    const right = Math.min(stage.width - CROP_INSET, imageBox.left + imageBox.width);
    const bottom = Math.min(stage.height - CROP_INSET, imageBox.top + imageBox.height);
    return {x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y)};
  }, [imageBox, stage]);

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

  const onPointerDown = e => {
    if (!crop || !bounds) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const k = stage.width / rect.width;
    const corner = e.target.closest?.('[data-corner]')?.dataset.corner || null;
    const x = (e.clientX - rect.left) * k;
    const y = (e.clientY - rect.top) * k;
    const inside = x >= crop.x && x <= crop.x + crop.w && y >= crop.y && y <= crop.y + crop.h;
    if (!corner && !inside) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    drag.current = {corner, k, startX: e.clientX, startY: e.clientY, crop, bounds};
  };

  const onPointerMove = e => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) * d.k;
    const dy = (e.clientY - d.startY) * d.k;
    setCrop(d.corner ? resizeCrop(d.crop, dx, dy, d.corner, d.bounds) : moveCrop(d.crop, dx, dy, d.bounds));
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const onWheel = useCallback(
    e => {
      if (!view || !crop || !baseBox) return;
      setView(zoomView(view, e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, crop, baseBox));
    },
    [view, crop, baseBox],
  );

  const sourceRect = useMemo(() => {
    if (!crop || !imageBox || !imgSize) return null;
    const scale = imgSize.width / imageBox.width;
    const originX = Math.max(0, (crop.x - imageBox.left) * scale);
    const originY = Math.max(0, (crop.y - imageBox.top) * scale);
    const width = Math.min(imgSize.width - originX, crop.w * scale);
    const height = Math.min(imgSize.height - originY, crop.h * scale);
    return {originX, originY, width, height};
  }, [crop, imageBox, imgSize]);

  const handleConfirm = async () => {
    if (!img || !sourceRect || saving) return;
    setSaving(true);
    try {
      const cropFractions = normalizeCropFractions({
        left: sourceRect.originX / imgSize.width,
        top: sourceRect.originY / imgSize.height,
        width: sourceRect.width / imgSize.width,
        height: sourceRect.height / imgSize.height,
      });
      const full =
        sourceRect.originX <= 1 &&
        sourceRect.originY <= 1 &&
        sourceRect.width >= imgSize.width - 2 &&
        sourceRect.height >= imgSize.height - 2;
      if (tainted) {
        if (!full) throw new Error('לא ניתן לחתוך את התמונה הזו. נסה/י להעלות אותה מחדש.');
        onConfirm?.({uri: imageUri, crop: cropFractions});
        return;
      }
      const blob = await renderCrop(img, sourceRect);
      const name = `crop-${Date.now()}.jpg`;
      onConfirm?.({uri: URL.createObjectURL(blob), type: 'image/jpeg', name, file: blob, crop: cropFractions});
    } catch (err) {
      onConfirm?.({error: err?.message || 'לא ניתן לחתוך את התמונה. נסה/י שוב.'});
    } finally {
      setSaving(false);
    }
  };

  if (!imageUri) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.panel} dir="rtl">
        <header className={styles.header}>
          <button type="button" className={styles.headerBtn} onClick={onCancel} aria-label="ביטול">
            <MdiIcon path={mdiClose} size={34} color="#FFFFFF" />
          </button>
          <h2 className={styles.title}>{title}</h2>
          <span className={styles.headerBtn} />
        </header>

        <div
          ref={stageRef}
          className={styles.stage}
          dir="ltr"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}>
          {imageBox && crop ? (
            <>
              <img
                src={imageUri}
                alt=""
                draggable={false}
                className={styles.image}
                style={{left: imageBox.left, top: imageBox.top, width: imageBox.width, height: imageBox.height}}
              />
              <span className={styles.dim} style={{left: 0, top: 0, width: stage.width, height: crop.y}} />
              <span
                className={styles.dim}
                style={{left: 0, top: crop.y + crop.h, width: stage.width, height: Math.max(0, stage.height - crop.y - crop.h)}}
              />
              <span className={styles.dim} style={{left: 0, top: crop.y, width: crop.x, height: crop.h}} />
              <span
                className={styles.dim}
                style={{left: crop.x + crop.w, top: crop.y, width: Math.max(0, stage.width - crop.x - crop.w), height: crop.h}}
              />
              <span className={styles.frame} style={{left: crop.x, top: crop.y, width: crop.w, height: crop.h}}>
                <span className={styles.gridV} style={{left: '33.33%'}} />
                <span className={styles.gridV} style={{left: '66.66%'}} />
                <span className={styles.gridH} style={{top: '33.33%'}} />
                <span className={styles.gridH} style={{top: '66.66%'}} />
              </span>
              {CORNERS.map(corner => (
                <span
                  key={corner}
                  data-corner={corner}
                  className={`${styles.handleHit} ${styles[`handle_${corner}`]}`}
                  style={{
                    left: (corner === 'nw' || corner === 'sw' ? crop.x : crop.x + crop.w) - HANDLE / 2,
                    top: (corner === 'nw' || corner === 'ne' ? crop.y : crop.y + crop.h) - HANDLE / 2,
                    width: HANDLE,
                    height: HANDLE,
                  }}>
                  <span className={styles.bracket} />
                </span>
              ))}
            </>
          ) : (
            <span className={styles.spinner} />
          )}
        </div>

        <p className={styles.hint}>גררו את המסגרת, גללו כדי להגדיל או להקטין את התמונה, או משכו את הפינות</p>

        <button type="button" className={styles.confirm} onClick={handleConfirm} disabled={saving || !crop}>
          {saving ? <span className={styles.spinner} /> : 'אישור'}
        </button>
      </div>
    </div>
  );
}
