import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import iconDots from '../assets/figma/feed/icon-dots.svg';
import profileRing from '../assets/figma/feed/profile-ring.svg';
import profileRingUser from '../assets/figma/feed/profile-ring-user.svg';
import iconFavorite from '../assets/figma/feed/icon-favorite.svg';
import iconRooms from '../assets/figma/feed/icon-rooms.svg';
import iconStairs from '../assets/figma/feed/icon-stairs.svg';
import iconLocation from '../assets/figma/feed/icon-location.svg';
import pichatBubble from '../assets/figma/feed/pichat-bubble.svg';
import pichatPlane from '../assets/figma/feed/pichat-plane.svg';
import pichatPi from '../assets/figma/feed/pichat-pi.svg';
import star1 from '../assets/rating/1-star.png';
import star2 from '../assets/rating/2-star.png';
import star3 from '../assets/rating/3-star.png';
import star4 from '../assets/rating/4-star.png';
import star5Ring from '../assets/rating/5-ring.png';
import actionLike from '../assets/figma/post/action-like.svg';
import actionComment from '../assets/figma/post/action-comment.svg';
import actionShare from '../assets/figma/post/action-share.svg';
import actionView from '../assets/figma/post/action-view.svg';
import postPin from '../assets/figma/post/pin.svg';
import noProfileImage from '../assets/noprofileimage.png';
import companyChatBubble from '../assets/figma/company/chat-bubble.svg';
import companyChatPlane from '../assets/figma/company/chat-plane.svg';
import companyChatPi from '../assets/figma/company/chat-pi.svg';
import preSaleTag from '../assets/figma/company/presale-tag.svg';
import preSaleHouse from '../assets/figma/company/presale-house.svg';
import {formatCompanyApartments, formatCompanyFloors, formatCount} from '../feed/listingRules';
import {persistAdLike, useIsLiked} from '../feed/likedListings';
import {isPostLiked, togglePostLiked, useIsPostLiked} from '../feed/postLikes';
import {useFeedActions} from '../feed/feedActions';
import {CommentsSheet, listingChatPeer, OptionsSheet, reportTarget, ShareSheet} from '../feed/FeedSheets';
import {likePost, unlikePost} from '../api/client';
import {useSession} from '../auth/session';
import CompanyReportScreen from '../profile/CompanyReportScreen';
import StagePortal from '../feed/StagePortal';
import {collageCells} from '../feed/collage';
import {detectImagePadding} from '../feed/imagePadding';
import {layoutPostTextBlock, postTextFont, postTextFrame, postTextVisual} from '../feed/postText';
import {feedListingProfilePayload, useProfileNav} from '../profile/navigation';
import styles from './FeedCard.module.css';

const PURPOSE_LABEL = {rent: 'להשכרה', sale: 'למכירה'};

const formatPrice = n => `₪${Math.round(n).toLocaleString('en-US')}`;

function Avatar({src, ring = 'user', onClick}) {
  const [failedSrc, setFailedSrc] = useState('');
  const photo = src && failedSrc !== src ? src : noProfileImage;
  return (
    <button type="button" className={styles.avatar} onClick={onClick} aria-label="פרופיל המפרסם">
      <img
        className={styles.avatarRing}
        src={ring === 'gold' ? profileRing : profileRingUser}
        alt=""
        width={38.6667}
        height={38.6667}
      />
      <img
        className={styles.avatarImage}
        src={photo}
        alt=""
        onError={() => {
          if (src) setFailedSrc(src);
        }}
      />
    </button>
  );
}

function PiChat({onClick}) {
  return (
    <button type="button" className={styles.piChat} aria-label="שליחת הודעה" onClick={onClick}>
      <span className={styles.piChatIcon}>
        <img className={styles.piChatBubble} src={pichatBubble} alt="" width={87.262} height={39} />
        <img className={styles.piChatPlane} src={pichatPlane} alt="" />
        <img className={styles.piChatPi} src={pichatPi} alt="" />
        <span className={styles.piChatWord}>Chat</span>
      </span>
      <span className={styles.piChatLabel} dir="auto">
        הודעה
      </span>
    </button>
  );
}

export function CompanyChat({className = '', onClick}) {
  return (
    <button type="button" className={`${styles.companyChat} ${className}`} onClick={onClick}>
      <span className={styles.companyChatIcon}>
        <img className={styles.companyChatBubble} src={companyChatBubble} alt="" width={77} height={34.4138} />
        <img className={styles.companyChatPlane} src={companyChatPlane} alt="" width={15.4} height={8.89443} />
        <img className={styles.companyChatPi} src={companyChatPi} alt="" width={26.6994} height={18.1172} />
        <span className={styles.companyChatWord}>Chat</span>
      </span>
      <span className={styles.companyChatLabel} dir="auto">
        שליחת הודעה
      </span>
    </button>
  );
}

export function PreSaleTag() {
  return (
    <span className={styles.preSale}>
      <img className={styles.preSaleShape} src={preSaleTag} alt="" width={93.1582} height={34} />
      <img className={styles.preSaleHouse} src={preSaleHouse} alt="" width={23.0954} height={21.4737} />
      <span className={styles.preSaleText}>Pre-sale</span>
    </span>
  );
}

const RATING_STARS = [star1, star2, star3, star4];

export function PiRating({value, large = false}) {
  const n = Math.min(5, Math.max(1, Math.round(Number(value)) || 1));
  if (n < 5) {
    return (
      <img
        className={large ? `${styles.ratingComposite} ${styles.ratingCompositeLarge}` : styles.ratingComposite}
        src={RATING_STARS[n - 1]}
        alt=""
        width={559}
        height={446}
      />
    );
  }
  return (
    <span className={large ? `${styles.ratingFive} ${styles.ratingFiveLarge}` : styles.ratingFive}>
      <span className={styles.ratingNum} dir="auto">
        {n}
      </span>
      <img className={styles.ratingRing} src={star5Ring} alt="" width={285} height={285} />
    </span>
  );
}

function PostAction({icon, count, label, onClick, pressed = false}) {
  const body = (
    <>
      <img src={icon} alt="" width={32} height={32} />
      <span className={styles.postCount} dir="auto">
        {formatCount(count)}
      </span>
    </>
  );
  if (!onClick) {
    return (
      <div className={styles.postAction} aria-label={`${label} ${formatCount(count)}`}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={pressed ? `${styles.postAction} ${styles.postActionOn}` : styles.postAction}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}>
      {body}
    </button>
  );
}

/** Flat, saturated edges mean a color-background post — extend that color sideways. */
function sampleColorEdgeFill(img) {
  const frameW = 338;
  const frameH = 502;
  const scale = Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight);
  const sw = frameW / scale;
  const sh = frameH / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  const strip = Math.max(2, sw * 0.06);
  const canvas = document.createElement('canvas');
  const outW = 16;
  const outH = 48;
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(img, sx, sy, strip, sh, 0, 0, outW / 2, outH);
  ctx.drawImage(img, sx + sw - strip, sy, strip, sh, outW / 2, 0, outW / 2, outH);
  const data = ctx.getImageData(0, 0, outW, outH).data;

  const stats = x0 => {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = 0; y < outH; y += 1) {
      for (let x = x0; x < x0 + outW / 2; x += 1) {
        const i = (y * outW + x) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n += 1;
      }
    }
    r /= n;
    g /= n;
    b /= n;
    let dev = 0;
    for (let y = 0; y < outH; y += 1) {
      for (let x = x0; x < x0 + outW / 2; x += 1) {
        const i = (y * outW + x) * 4;
        dev += Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);
      }
    }
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return {
      css: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
      dev: dev / (n * 3),
      colorful: max > 48 && (max - min) / max > 0.16,
    };
  };

  const left = stats(0);
  const right = stats(outW / 2);
  if (left.dev > 14 || right.dev > 14) return null;
  if (!left.colorful && !right.colorful) return null;
  const [lr, lg, lb] = left.css.match(/\d+/g).map(Number);
  const [rr, rg, rb] = right.css.match(/\d+/g).map(Number);
  const solid = Math.abs(lr - rr) + Math.abs(lg - rg) + Math.abs(lb - rb) < 36;
  return {left: left.css, right: right.css, solid};
}

function useColorEdgeFill(src) {
  const [fill, setFill] = useState(null);
  useEffect(() => {
    if (!src) {
      setFill(null);
      return undefined;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        setFill(sampleColorEdgeFill(img));
      } catch {
        setFill(null);
      }
    };
    img.onerror = () => {
      if (!cancelled) setFill(null);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  return fill;
}

/** Play only while the card is on screen, and pause again when it leaves. */
/* Browsers refuse autoplay with sound before the first user gesture, so those videos start
   muted and get their sound back on the first click / key / touch anywhere on the page. */
const awaitingGesture = new Set();
const GESTURES = ['pointerdown', 'keydown', 'touchstart'];

function unmuteOnFirstGesture(video) {
  if (awaitingGesture.size === 0) {
    const unlock = () => {
      awaitingGesture.forEach(v => {
        if (v.isConnected && !v.paused) v.muted = false;
      });
      awaitingGesture.clear();
      GESTURES.forEach(type => document.removeEventListener(type, unlock, true));
    };
    GESTURES.forEach(type => document.addEventListener(type, unlock, true));
  }
  awaitingGesture.add(video);
}

function playWithSound(video) {
  video.muted = false;
  video.play().catch(err => {
    if (err?.name !== 'NotAllowedError') return;
    video.muted = true;
    video.play().catch(() => {});
    unmuteOnFirstGesture(video);
  });
}

/**
 * Plays the card's videos while it is the active feed item, like mobile's FeedVideoPlayer:
 * the `bindSound` video is audible, `bind` videos (blurred backdrops) stay muted.
 */
function useVideoPlayback(active) {
  const nodes = useRef(new Map());
  const bind = useCallback(node => {
    if (node) nodes.current.set(node, false);
  }, []);
  const bindSound = useCallback(node => {
    if (node) nodes.current.set(node, true);
  }, []);
  useEffect(() => {
    nodes.current.forEach((audible, video) => {
      if (!video.isConnected) {
        nodes.current.delete(video);
        awaitingGesture.delete(video);
        return;
      }
      if (active && audible) {
        playWithSound(video);
      } else if (active) {
        video.play().catch(() => {});
      } else {
        awaitingGesture.delete(video);
        video.pause();
        video.muted = true;
      }
    });
  }, [active]);
  return {bind, bindSound};
}

function PostTextLayer({payload}) {
  if (!payload?.overlays?.length) return null;
  const frame = postTextFrame(
    AD_FRAME.width,
    AD_FRAME.height,
    payload.previewWidth,
    payload.previewHeight,
  );
  const space = {
    previewWidth: payload.previewWidth,
    previewHeight: payload.previewHeight,
    feedWidth: frame.width,
    feedHeight: frame.height,
  };
  return (
    <div className={styles.postTextLayer}>
      {payload.overlays.map((block, index) => {
        const layout = layoutPostTextBlock(block, space);
        const visual = postTextVisual(block.color, Number(block.bgMode) || 0);
        const font = postTextFont(block.textStyleIndex ?? 0);
        const chip = Number(block.bgMode) > 0;
        const chipScale = layout.chipScale;
        return (
          <div
            key={`${index}-${String(block.text || '').slice(0, 12)}`}
            className={styles.postTextBlock}
            style={{left: frame.left + layout.x, top: frame.top + layout.y, width: layout.width}}>
            <p
              className={styles.postText}
              dir="rtl"
              style={{
                color: visual.textColor,
                fontSize: layout.fontSize,
                lineHeight: `${layout.lineHeight}px`,
                textAlign: block.align || 'center',
                fontFamily: `'${font.family}', 'Rubik', sans-serif`,
                fontWeight: font.weight,
                background: chip ? visual.backgroundColor : 'transparent',
                padding: chip
                  ? `${Math.max(1, Math.floor(4 * chipScale))}px ${Math.max(1, Math.floor(10 * chipScale))}px`
                  : 0,
                borderRadius: chip ? Math.max(2, Math.floor(8 * chipScale)) : 0,
              }}>
              {block.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function PostMedia({item, active}) {
  const [index, setIndex] = useState(0);
  const showVideo = Boolean(item.videoUrl) && (item.preferVideo || item.images.length === 0);
  const still = item.images[index] || item.images[0] || '';
  const count = item.images.length;
  const colorFill = useColorEdgeFill(!showVideo ? still : '');
  const {bind: bindVideo, bindSound} = useVideoPlayback(active && showVideo);

  return (
    <div
      className={styles.postMedia}
      style={
        colorFill
          ? {
              background: colorFill.solid
                ? colorFill.left
                : `linear-gradient(to right, ${colorFill.left}, ${colorFill.right})`,
            }
          : undefined
      }>
      {colorFill && still ? (
        <img
          className={colorFill.solid ? styles.postColorContain : styles.postColorFill}
          src={still}
          alt={item.description || ''}
        />
      ) : null}
      {showVideo ? (
        <>
          {still ? (
            <img className={styles.postBlur} src={still} alt="" />
          ) : (
            <video
              ref={bindVideo}
              className={styles.postBlur}
              src={item.videoUrl}
              muted
              loop
              playsInline
            />
          )}
          <video
            ref={bindSound}
            className={styles.postVideo}
            src={item.videoUrl}
            poster={still || undefined}
            muted
            loop
            playsInline
          />
        </>
      ) : !colorFill && still ? (
        <img className={styles.postBlur} src={still} alt="" />
      ) : null}
      {!colorFill && !showVideo && <div className={styles.postFrame}>
        {still ? (
          <img className={styles.postFrameMedia} src={still} alt={item.description || ''} />
        ) : (
          <p className={styles.postFrameText} dir="auto">
            {item.description}
          </p>
        )}
      </div>}
      {item.postText ? <PostTextLayer payload={item.postText} /> : null}
      {!showVideo && count > 1 && (
        <>
          <button
            type="button"
            className={`${styles.galleryHit} ${styles.galleryPrev}`}
            aria-label="התמונה הקודמת"
            onClick={() => setIndex(i => (i - 1 + count) % count)}
          />
          <button
            type="button"
            className={`${styles.galleryHit} ${styles.galleryNext}`}
            aria-label="התמונה הבאה"
            onClick={() => setIndex(i => (i + 1) % count)}
          />
        </>
      )}
    </div>
  );
}

function Spec({icon, children}) {
  return (
    <div className={styles.spec}>
      <p className={styles.specText} dir="auto">
        {children}
      </p>
      {icon}
    </div>
  );
}

/** Ad frame inside the 930×702 card (100px header + 100px footer). */
const AD_FRAME = {width: 930, height: 502};

/**
 * Size that fills the frame height. Null when the picture is at least as wide
 * as the frame, so it can cover edge to edge. Narrower pictures keep side gaps.
 */
function containedMediaSize(width, height) {
  if (!width || !height) return null;
  const displayHeight = AD_FRAME.height;
  const displayWidth = Math.round(width * (displayHeight / height));
  if (displayWidth >= AD_FRAME.width - 0.5) return null;
  return {width: displayWidth, height: displayHeight};
}

const NO_LAYOUT = {fit: null, crop: null};

/** Measured image frames, so a slide never paints in the previous photo's box. */
const imageLayouts = new Map();
const imageLayoutPending = new Map();

function imageLayoutFrom(img) {
  const box = detectImagePadding(img);
  const crop = box && {...box, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight};
  return {
    fit: crop ? containedMediaSize(crop.width, crop.height) : containedMediaSize(img.naturalWidth, img.naturalHeight),
    crop,
  };
}

function measureImageLayout(src) {
  if (!src) return Promise.resolve(NO_LAYOUT);
  const hit = imageLayouts.get(src);
  if (hit) return Promise.resolve(hit);
  const pending = imageLayoutPending.get(src);
  if (pending) return pending;
  const task = new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const finish = layout => {
      imageLayouts.set(src, layout);
      imageLayoutPending.delete(src);
      resolve(layout);
    };
    img.onload = () => finish(imageLayoutFrom(img));
    img.onerror = () => finish(NO_LAYOUT);
    img.src = src;
  });
  imageLayoutPending.set(src, task);
  return task;
}

/**
 * `fit`: contained size (see containedMediaSize). `crop`: for images with
 * baked-in solid padding, the photo's box in natural pixels plus the natural size.
 */
function useMediaLayout(src, kind) {
  const cached = kind === 'image' ? imageLayouts.get(src) : null;
  const [layout, setLayout] = useState(cached || NO_LAYOUT);
  const [tracked, setTracked] = useState(src);
  if (src !== tracked) {
    setTracked(src);
    setLayout(kind === 'image' ? imageLayouts.get(src) || NO_LAYOUT : NO_LAYOUT);
  }
  useEffect(() => {
    if (!src) {
      setLayout(NO_LAYOUT);
      return undefined;
    }
    let cancelled = false;
    const apply = next => {
      if (!cancelled) setLayout(next);
    };
    if (kind === 'video') {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () =>
        apply({fit: containedMediaSize(video.videoWidth, video.videoHeight), crop: null});
      video.onerror = () => apply(NO_LAYOUT);
      video.src = src;
      return () => {
        cancelled = true;
        video.src = '';
      };
    }
    measureImageLayout(src).then(apply);
    return () => {
      cancelled = true;
    };
  }, [src, kind]);
  return layout;
}

/** Image positioned so its `crop` box covers a boxWidth × boxHeight window. */
function cropStyle(crop, boxWidth, boxHeight) {
  const s = Math.max(boxWidth / crop.width, boxHeight / crop.height);
  return {
    position: 'absolute',
    maxWidth: 'none',
    width: crop.naturalWidth * s,
    height: crop.naturalHeight * s,
    left: boxWidth / 2 - (crop.x + crop.width / 2) * s,
    top: boxHeight / 2 - (crop.y + crop.height / 2) * s,
  };
}

const BLUR_BLEED = 40;

/** A still photo in the ad frame: contained with a blurred backdrop, or cover. */
function FrameImage({src, layout, alt}) {
  const {fit, crop} = layout;
  if (!crop) {
    return (
      <>
        {fit && <img className={styles.mediaBlur} src={src} alt="" />}
        <img className={fit ? styles.mediaFit : styles.media} style={fit || undefined} src={src} alt={alt} />
      </>
    );
  }
  const box = fit || AD_FRAME;
  return (
    <>
      {fit && (
        <div className={`${styles.mediaBlur} ${styles.cropBox}`}>
          <img
            src={src}
            alt=""
            style={cropStyle(crop, AD_FRAME.width + 2 * BLUR_BLEED, AD_FRAME.height + 2 * BLUR_BLEED)}
          />
        </div>
      )}
      <div className={`${fit ? styles.mediaFit : styles.media} ${styles.cropBox}`} style={fit || undefined}>
        <img src={src} alt={alt} style={cropStyle(crop, box.width, box.height)} />
      </div>
    </>
  );
}

/** Same timings as the mobile feed ImageSwiper. */
const SLIDESHOW_AUTO_ADVANCE_MS = 900;
const SLIDESHOW_FADE_MS = 450;
const SLIDESHOW_EASE = 'cubic-bezier(0.42, 0, 0.58, 1)';

function pinLayer(el, opacity) {
  if (!el) return;
  el.style.transition = 'none';
  el.style.opacity = String(opacity);
}

function GalleryControls({images, index, onSelect}) {
  const count = images.length;
  if (count < 2) return null;
  return (
    <>
      <button
        type="button"
        className={`${styles.galleryHit} ${styles.galleryPrev}`}
        aria-label="התמונה הקודמת"
        onClick={() => onSelect((index - 1 + count) % count)}
      />
      <button
        type="button"
        className={`${styles.galleryHit} ${styles.galleryNext}`}
        aria-label="התמונה הבאה"
        onClick={() => onSelect((index + 1) % count)}
      />
      <div className={styles.pager} role="tablist" aria-label="תמונות">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`תמונה ${i + 1}`}
            className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </>
  );
}

function SlideFrame({src, layout, description}) {
  if (!src) return null;
  return <FrameImage src={src} layout={layout} alt={description || ''} />;
}

/**
 * Two stacked photos. The front fades out while the next fades in,
 * matching the mobile ad slideshow (450ms, then the next step at 900ms).
 */
function AdSlideshow({images, active, description}) {
  const count = images.length;
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const layerARef = useRef(null);
  const layerBRef = useRef(null);
  const frontRef = useRef('a');
  const idxA = useRef(0);
  const idxB = useRef(0);
  const lock = useRef(false);
  const fadeToken = useRef(0);
  const fadeTimer = useRef(0);
  const jobRef = useRef(null);
  const reduceRef = useRef(false);
  const [aIndex, setAIndex] = useState(0);
  const [bIndex, setBIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [fadeGen, setFadeGen] = useState(0);
  const layoutA = useMediaLayout(images[aIndex] || '', 'image');
  const layoutB = useMediaLayout(images[bIndex] || '', 'image');

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncReduce = () => {
      reduceRef.current = mq.matches || document.documentElement.classList.contains('pi-a11y-reduce-motion');
    };
    syncReduce();
    const onChange = () => {
      syncReduce();
    };
    mq.addEventListener('change', onChange);
    window.addEventListener('pi-a11y', onChange);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('pi-a11y', onChange);
    };
  }, []);

  useLayoutEffect(() => {
    pinLayer(layerARef.current, 1);
    pinLayer(layerBRef.current, 0);
  }, []);

  useLayoutEffect(() => {
    const job = jobRef.current;
    if (!job) return;
    jobRef.current = null;
    if (!lock.current) return;
    const inEl = job.incoming === 'b' ? layerBRef.current : layerARef.current;
    const outEl = job.incoming === 'b' ? layerARef.current : layerBRef.current;
    if (!inEl || !outEl) {
      lock.current = false;
      return;
    }
    if (job.reduce) {
      frontRef.current = job.incoming;
      pinLayer(inEl, 1);
      pinLayer(outEl, 0);
      setShown(job.next);
      lock.current = false;
      return;
    }
    // The current photo stays solid. The next one fades in on top of it, so the
    // two frames never show through each other.
    inEl.style.zIndex = '1';
    outEl.style.zIndex = '0';
    outEl.style.transition = 'none';
    outEl.style.opacity = '1';
    inEl.style.transition = 'none';
    inEl.style.opacity = '0';
    void inEl.offsetHeight;
    inEl.style.transition = `opacity ${SLIDESHOW_FADE_MS}ms ${SLIDESHOW_EASE}`;
    inEl.style.opacity = '1';
    fadeTimer.current = window.setTimeout(() => {
      frontRef.current = job.incoming;
      pinLayer(inEl, 1);
      pinLayer(outEl, 0);
      setShown(job.next);
      lock.current = false;
    }, SLIDESHOW_FADE_MS);
  }, [fadeGen]);

  useEffect(() => {
    images.forEach(src => {
      measureImageLayout(src);
    });
  }, [images]);

  const snapToFront = useCallback(() => {
    const frontA = frontRef.current === 'a';
    pinLayer(layerARef.current, frontA ? 1 : 0);
    pinLayer(layerBRef.current, frontA ? 0 : 1);
  }, []);

  const fadeTo = useCallback(nextIndex => {
    const n = imagesRef.current.length;
    if (lock.current || n < 2) return;
    const current = frontRef.current === 'a' ? idxA.current : idxB.current;
    const next = ((nextIndex % n) + n) % n;
    if (next === current) return;

    lock.current = true;
    const token = ++fadeToken.current;
    const incoming = frontRef.current === 'a' ? 'b' : 'a';
    // The next photo must already have its frame, or it paints stretched in the
    // previous photo's box for the first moment of the fade.
    measureImageLayout(imagesRef.current[next]).then(() => {
      if (token !== fadeToken.current) return;
      const inEl = incoming === 'b' ? layerBRef.current : layerARef.current;
      if (incoming === 'b') {
        idxB.current = next;
        setBIndex(next);
      } else {
        idxA.current = next;
        setAIndex(next);
      }
      pinLayer(inEl, 0);
      jobRef.current = {incoming, next, reduce: reduceRef.current};
      setFadeGen(g => g + 1);
    });
  }, []);

  useEffect(() => {
    if (!active || count < 2) return undefined;
    const id = window.setInterval(() => {
      if (reduceRef.current) return;
      const n = imagesRef.current.length;
      const current = frontRef.current === 'a' ? idxA.current : idxB.current;
      fadeTo((current + 1) % n);
    }, SLIDESHOW_AUTO_ADVANCE_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeTimer.current);
      fadeToken.current += 1;
      jobRef.current = null;
      lock.current = false;
      snapToFront();
    };
  }, [active, count, fadeTo, snapToFront]);

  return (
    <>
      <div ref={layerARef} className={styles.fadeLayer}>
        <SlideFrame src={images[aIndex]} layout={layoutA} description={description} />
      </div>
      <div ref={layerBRef} className={styles.fadeLayer}>
        <SlideFrame src={images[bIndex]} layout={layoutB} description="" />
      </div>
      <GalleryControls images={images} index={shown} onSelect={fadeTo} />
    </>
  );
}

function AdCollage({images, description}) {
  const slice = images.slice(0, 5);
  const cells = collageCells(slice.length, AD_FRAME.width, AD_FRAME.height);
  return (
    <div className={styles.collage}>
      {slice.map((src, i) => {
        const cell = cells[i];
        return (
          <div
            key={`${i}-${src}`}
            className={styles.collageCell}
            style={{left: cell.left, top: cell.top, width: cell.width, height: cell.height}}>
            <img className={styles.collageImage} src={src} alt={i === 0 ? description || '' : ''} />
          </div>
        );
      })}
    </div>
  );
}

function Media({item, active}) {
  const [index, setIndex] = useState(0);
  const showVideo = item.videoUrl && (item.preferVideo || item.images.length === 0);
  const collage = !showVideo && item.images.length > 1 && item.displayOption === 'collage';
  const slideshow = !showVideo && item.images.length > 1 && !collage;
  const still = item.images[index] || item.images[0] || '';
  const layout = useMediaLayout(
    showVideo ? item.videoUrl : slideshow || collage ? '' : still,
    showVideo ? 'video' : 'image',
  );
  const fitted = layout.fit;
  const {bind: bindVideo, bindSound} = useVideoPlayback(active && showVideo);

  if (showVideo) {
    return (
      <>
        {fitted && (
          <video ref={bindVideo} className={styles.mediaBlur} src={item.videoUrl} muted loop playsInline />
        )}
        <video
          ref={bindSound}
          className={fitted ? styles.mediaFit : styles.media}
          style={fitted || undefined}
          src={item.videoUrl}
          poster={item.images[0]}
          muted
          loop
          playsInline
        />
      </>
    );
  }

  if (!item.images.length) {
    return (
      <div className={`${styles.media} ${styles.textOnly}`}>
        <p dir="auto">{item.description}</p>
      </div>
    );
  }

  if (collage) {
    return <AdCollage images={item.images} description={item.description} />;
  }

  if (slideshow) {
    return <AdSlideshow images={item.images} active={active} description={item.description} />;
  }

  return (
    <>
      <FrameImage src={item.images[index]} layout={layout} alt={item.description || ''} />
      <GalleryControls images={item.images} index={index} onSelect={setIndex} />
    </>
  );
}

function AdDescription({text, onExpanded}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    setOverflows(el.scrollWidth > el.clientWidth + 1);
  }, [text, expanded]);

  if (!text) return null;
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    onExpanded?.(next);
  };
  return (
    <p className={expanded ? styles.descriptionOpen : styles.description} dir="rtl">
      <span ref={textRef} className={styles.descriptionText}>
        {text}
      </span>
      {(overflows || expanded) && (
        <button type="button" className={styles.moreText} onClick={toggle}>
          {expanded ? 'פחות' : 'עוד...'}
        </button>
      )}
    </p>
  );
}

export default function FeedCard({item, active}) {
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [report, setReport] = useState(null);
  const [counts, setCounts] = useState({like: item.likeCount, comment: item.commentCount, share: item.shareCount});
  const likeLock = useRef(false);
  const nav = useProfileNav();
  const {currentUser} = useSession();
  const {onOpenChat, onNeedLogin} = useFeedActions();
  const postLiked = useIsPostLiked(item.id);
  const userId = currentUser?.id || currentUser?.subscription_id || null;

  useEffect(() => {
    setCounts({like: item.likeCount, comment: item.commentCount, share: item.shareCount});
    setSheet(null);
    setReport(null);
  }, [item.id, item.likeCount, item.commentCount, item.shareCount]);

  const requireUser = () => {
    if (userId) return true;
    onNeedLogin();
    return false;
  };
  const openProfile = () => nav.open(feedListingProfilePayload(item.raw));
  const openMessage = () => {
    if (!requireUser()) return;
    const peer = listingChatPeer(item);
    if (!peer.email && !peer.subscriptionId) {
      window.alert('לא ניתן לפתוח שיחה עבור המודעה הזו');
      return;
    }
    onOpenChat(peer);
  };
  const togglePostLike = async () => {
    if (!requireUser() || likeLock.current) return;
    likeLock.current = true;
    const will = !isPostLiked(item.id);
    togglePostLiked(item.id);
    setCounts(c => ({...c, like: Math.max(0, c.like + (will ? 1 : -1))}));
    try {
      if (will) await likePost(item.id, userId);
      else await unlikePost(item.id, userId);
    } catch (err) {
      togglePostLiked(item.id);
      setCounts(c => ({...c, like: Math.max(0, c.like + (will ? -1 : 1))}));
      window.alert(err?.message || 'לא ניתן לעדכן לייק');
    } finally {
      likeLock.current = false;
    }
  };
  const openComments = () => {
    if (!requireUser()) return;
    setSheet(current => (current === 'comments' ? null : 'comments'));
  };
  const openShare = () => {
    if (!requireUser()) return;
    setSheet('share');
  };
  const openOptions = () => setSheet('options');
  const openReport = () => {
    if (!requireUser()) return;
    const target = reportTarget(item);
    if (!target) {
      window.alert('הדיווח נשלח בהצלחה.');
      return;
    }
    setReport(target);
  };
  const overlays = (
    <>
      {sheet === 'share' ? (
        <ShareSheet
          item={item}
          user={currentUser}
          onClose={() => setSheet(null)}
          onShared={serverCount =>
            setCounts(c => ({...c, share: typeof serverCount === 'number' ? serverCount : c.share + 1}))
          }
          onOpenChat={onOpenChat}
        />
      ) : null}
      {sheet === 'options' ? <OptionsSheet item={item} onClose={() => setSheet(null)} onShare={openShare} onReport={openReport} /> : null}
      {report ? (
        <StagePortal>
          <CompanyReportScreen {...report} onClose={() => setReport(null)} />
        </StagePortal>
      ) : null}
    </>
  );

  if (item.isPost) {
    return (
      <>
      <article className={`${styles.card} ${styles.cardPost}`} aria-label={item.creatorName || 'פוסט'}>
        <header className={styles.topInfo}>
          <div className={`${styles.topRow} ${styles.topRowPost}`}>
            <button type="button" className={styles.more} aria-label="אפשרויות" onClick={openOptions}>
              <img src={iconDots} alt="" width={20} height={4} />
            </button>
            <div className={styles.postIdentity}>
              {item.piRating != null && <PiRating value={item.piRating} />}
              <div className={`${styles.publisherText} ${styles.postPublisherText}`}>
                <button
                  type="button"
                  className={`${styles.name} ${styles.nameLink} ${styles.postName}`}
                  dir="auto"
                  onClick={openProfile}>
                  {item.creatorName}
                </button>
                <p className={styles.time} dir="auto">
                  {item.timeAgo}
                </p>
              </div>
              <Avatar src={item.creatorAvatar} ring={item.avatarRing} onClick={openProfile} />
            </div>
          </div>
        </header>

        <PostMedia item={item} active={active} />

        <footer className={`${styles.bottomInfo} ${styles.postBottom}`}>
          <div className={styles.postBottomRow}>
          <PiChat onClick={openMessage} />
          <div className={styles.postSide}>
            <div className={styles.postActions}>
              <PostAction icon={actionLike} count={counts.like} label="לייק" pressed={postLiked} onClick={togglePostLike} />
              <PostAction
                icon={actionComment}
                count={counts.comment}
                label="תגובות"
                pressed={sheet === 'comments'}
                onClick={openComments}
              />
              <PostAction icon={actionShare} count={counts.share} label="שיתוף" onClick={openShare} />
              <PostAction icon={actionView} count={item.viewCount} label="צפיות" />
            </div>
            {(item.hashtags.length > 0 || item.postAddress) && (
              <div className={styles.postMeta}>
                {item.hashtags.length > 0 && (
                  <div className={styles.postTags} dir="rtl">
                    {item.hashtags.map(tag => (
                      <span key={tag} className={styles.postTag} dir="auto">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {item.postAddress && (
                  <div className={styles.postLocation}>
                    <p className={styles.postAddress} dir="auto">
                      {item.postAddress}
                    </p>
                    <img src={postPin} alt="" width={28} height={28} />
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
          {sheet === 'comments' ? (
            <CommentsSheet
              postId={item.id}
              userId={userId}
              onClose={() => setSheet(null)}
              onCount={n => setCounts(c => ({...c, comment: n}))}
            />
          ) : null}
        </footer>
      </article>
      {overlays}
      </>
    );
  }

  return (
    <>
    <article className={styles.card} aria-label={item.creatorName || 'מודעה'}>
      <header className={`${styles.topInfo} ${descriptionOpen ? styles.topInfoOpen : ''}`}>
        <div className={styles.topRow}>
          <button type="button" className={styles.more} aria-label="אפשרויות" onClick={openOptions}>
            <img src={iconDots} alt="" width={20} height={4} />
          </button>
          <div className={styles.topMain}>
            <div className={`${styles.publisher} ${item.piRating != null ? styles.publisherRated : ''}`}>
              {item.piRating != null && <PiRating value={item.piRating} />}
              <div className={`${styles.publisherText} ${item.piRating != null ? styles.postPublisherText : ''}`}>
                <button type="button" className={`${styles.name} ${styles.nameLink}`} dir="auto" onClick={openProfile}>
                  {item.creatorName}
                </button>
                <p className={styles.time} dir="auto">
                  {item.timeAgo}
                </p>
              </div>
              <Avatar src={item.creatorAvatar} ring={item.avatarRing} onClick={openProfile} />
            </div>
            <AdDescription text={item.description} onExpanded={setDescriptionOpen} />
          </div>
        </div>
      </header>

      <div className={styles.mediaArea}>
        <Media item={item} active={active} />
      </div>

      {item.company ? (
        <CompanyFooter item={item} onChat={openMessage} />
      ) : (
      <footer className={styles.bottomInfo}>
        <PiChat onClick={openMessage} />
        <div className={styles.details}>
          <div className={styles.priceRow}>
            {item.price != null && (
              <p className={styles.price} dir="auto">
                {formatPrice(item.price)}
              </p>
            )}
            <div className={styles.priceActions}>
              <FavoriteButton id={item.id} />
              <span className={styles.tag} dir="auto">
                {PURPOSE_LABEL[item.purpose]}
              </span>
            </div>
          </div>
          <div className={styles.specs}>
            {item.area != null && (
              <Spec icon={<span className={styles.sqmIcon} aria-hidden />}>{`${item.area} מ״ר`}</Spec>
            )}
            {item.floor != null && Number.isFinite(item.floor) && (
              <Spec icon={<img className={styles.specIcon} src={iconStairs} alt="" />}>{`קומה ${item.floor}`}</Spec>
            )}
            {item.rooms != null && (
              <Spec icon={<img className={styles.specIcon} src={iconRooms} alt="" />}>{`${item.rooms} חד׳`}</Spec>
            )}
            {item.address && (
              <Spec icon={<img className={styles.specIcon} src={iconLocation} alt="" />}>{item.address}</Spec>
            )}
          </div>
        </div>
      </footer>
      )}
    </article>
    {overlays}
    </>
  );
}

function FavoriteButton({id}) {
  const liked = useIsLiked(id);
  const {currentUser} = useSession();
  const {onNeedLogin} = useFeedActions();
  return (
    <button
      type="button"
      className={styles.favorite}
      aria-label="הוספה למועדפים"
      aria-pressed={liked}
      onClick={() => {
        const userId = currentUser?.id || currentUser?.subscription_id;
        if (!userId) {
          onNeedLogin();
          return;
        }
        persistAdLike(id, userId).catch(err => window.alert(err?.message || 'לא ניתן לעדכן מועדפים'));
      }}>
      {liked ? (
        <span className={styles.favoriteLiked} style={{'--icon': `url("${iconFavorite}")`}} aria-hidden />
      ) : (
        <img src={iconFavorite} alt="" width={32} height={32} />
      )}
    </button>
  );
}

function CompanyFooter({item, onChat}) {
  const {preSale, floors, apartments} = item.company;
  return (
    <footer className={`${styles.bottomInfo} ${styles.companyBottomInfo}`}>
      <CompanyChat onClick={onChat} />
      <div className={styles.details}>
        <div className={styles.priceRow}>
          <div className={styles.priceActions}>
            <FavoriteButton id={item.id} />
            {preSale && <PreSaleTag />}
          </div>
        </div>
        <div className={`${styles.specs} ${styles.companySpecs}`}>
          {item.area != null && (
            <Spec icon={<span className={styles.sqmIcon} aria-hidden />}>{`${item.area} מ״ר`}</Spec>
          )}
          {floors != null && (
            <Spec icon={<img className={styles.specIcon} src={iconStairs} alt="" />}>{formatCompanyFloors(floors)}</Spec>
          )}
          {apartments != null && (
            <Spec icon={<img className={styles.specIcon} src={iconRooms} alt="" />}>
              {formatCompanyApartments(apartments)}
            </Spec>
          )}
          {item.address && (
            <Spec icon={<img className={styles.specIcon} src={iconLocation} alt="" />}>{item.address}</Spec>
          )}
        </div>
      </div>
    </footer>
  );
}
