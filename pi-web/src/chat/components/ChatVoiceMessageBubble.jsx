import {useEffect, useMemo, useRef, useState} from 'react';
import {mdiCheckAll, mdiMicrophone, mdiPause, mdiPlay} from '@mdi/js';
import MdiIcon from '../../publish/MdiIcon';
import {DEFAULT_PI_PROFILE_AVATAR} from '../../profile/lib/userProfileImage';
import styles from './ChatVoiceMessageBubble.module.css';

const VOICE_WAVE_BAR_COUNT = 28;

function buildVoiceWaveform(seed, count = VOICE_WAVE_BAR_COUNT) {
  let h = 2166136261;
  const s = String(seed ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Array.from({length: count}, (_, i) => {
    const v = Math.abs(Math.sin((h + i * 17) * 0.41)) * 0.72 + 0.28;
    return 4 + Math.round(v * 20);
  });
}

function formatVoiceClock(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatSentTime(createdAt) {
  if (!createdAt) return '';
  try {
    return new Date(createdAt).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function WaveformBars({bars, barColor, messageId}) {
  return (
    <div className={styles.waveBarsRow} dir="ltr">
      {bars.map((height, index) => (
        <span key={`${messageId}-bar-${index}`} className={styles.waveBarSlot}>
          <span className={styles.waveBar} style={{height, backgroundColor: barColor}} />
        </span>
      ))}
    </div>
  );
}

export default function ChatVoiceMessageBubble({
  messageId,
  mediaUrl,
  isMe,
  createdAt,
  avatarUri,
  isPlaying,
  progress = 0,
  durationMs = 0,
  playStartedAt = 0,
  playStartProgress = 0,
  onTogglePlay,
  onDurationKnown,
  showReadTicks = false,
  isRead = false,
}) {
  const bars = useMemo(() => buildVoiceWaveform(messageId, VOICE_WAVE_BAR_COUNT), [messageId]);
  const clampedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  const durationSec = durationMs > 0 ? Math.max(1, Math.round(durationMs / 1000)) : 0;
  const [trackWidth, setTrackWidth] = useState(0);
  const [fillProgress, setFillProgress] = useState(clampedProgress);
  const trackRef = useRef(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = Math.round(el.offsetWidth);
      if (w > 0) setTrackWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (playStartedAt > 0 && durationMs > 0) {
      const start = Math.max(0, Math.min(1, Number(playStartProgress) || 0));
      const remaining = Math.max(0, (1 - start) * durationMs);
      setFillProgress(start);
      if (remaining <= 0) {
        setFillProgress(1);
        return undefined;
      }
      const begun = performance.now();
      let frame = 0;
      const tick = now => {
        const t = Math.min(1, (now - begun) / remaining);
        setFillProgress(start + (1 - start) * t);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [playStartedAt, durationMs, playStartProgress]);

  useEffect(() => {
    if (playStartedAt === 0) setFillProgress(clampedProgress);
  }, [clampedProgress, playStartedAt]);

  useEffect(() => {
    if (!mediaUrl || durationMs > 0 || !onDurationKnown) return undefined;
    let cancelled = false;
    const audio = new Audio();
    audio.preload = 'metadata';
    const onLoaded = () => {
      if (cancelled) return;
      const ms = Number(audio.duration) * 1000;
      if (Number.isFinite(ms) && ms > 0) onDurationKnown(messageId, ms);
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.src = mediaUrl;
    return () => {
      cancelled = true;
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.src = '';
    };
  }, [mediaUrl, durationMs, messageId, onDurationKnown]);

  const theme = isMe
    ? {
        play: '#fff',
        bar: 'rgba(255,255,255,0.38)',
        barPlayed: 'rgba(255,255,255,0.95)',
        scrubber: '#fff',
        meta: 'rgba(255,255,255,0.88)',
        micBadge: '#fff',
        micBadgeIcon: '#2DD4BF',
      }
    : {
        play: 'rgba(55,53,72,0.72)',
        bar: 'rgba(55,53,72,0.28)',
        barPlayed: 'rgba(55,53,72,0.72)',
        scrubber: '#25D366',
        meta: 'rgba(55,53,72,0.62)',
        micBadge: '#25D366',
        micBadgeIcon: '#fff',
      };

  const pct = `${Math.max(0, Math.min(100, fillProgress * 100))}%`;

  return (
    <div className={styles.root}>
      <div className={styles.mainRow}>
        <div className={styles.waveColumn}>
          <div ref={trackRef} className={styles.waveTrack}>
            <WaveformBars bars={bars} barColor={theme.bar} messageId={messageId} />
            <div className={styles.playedMask} style={{width: pct}}>
              <div className={styles.waveBarsOverlay} style={{width: trackWidth || 1}}>
                <WaveformBars bars={bars} barColor={theme.barPlayed} messageId={`${messageId}-played`} />
              </div>
            </div>
            <div
              className={styles.scrubber}
              style={{left: pct, backgroundColor: theme.scrubber}}
            />
          </div>
          <div className={styles.metaRow} dir="ltr">
            <div className={styles.metaTimeRow}>
              {showReadTicks ? (
                <MdiIcon
                  path={mdiCheckAll}
                  size={18}
                  color={isRead ? '#34B7F1' : theme.meta}
                  title={isRead ? 'נקראה' : 'נשלחה'}
                />
              ) : null}
              <span className={styles.metaText} style={{color: theme.meta}}>
                {formatSentTime(createdAt)}
              </span>
            </div>
            <span className={styles.metaText} style={{color: theme.meta}}>
              {durationSec > 0 ? formatVoiceClock(durationSec) : '0:00'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={styles.playBtn}
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'השהה הקלטה' : 'נגן הקלטה'}>
          <MdiIcon
            path={isPlaying ? mdiPause : mdiPlay}
            size={29}
            color={theme.play}
            style={!isPlaying ? {marginInlineStart: 2} : undefined}
          />
        </button>
        {!isMe ? (
          <div className={styles.avatarWrap}>
            <img className={styles.avatar} src={avatarUri || DEFAULT_PI_PROFILE_AVATAR} alt="" />
            <span className={styles.micBadge} style={{backgroundColor: theme.micBadge}}>
              <MdiIcon path={mdiMicrophone} size={12} color={theme.micBadgeIcon} />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
