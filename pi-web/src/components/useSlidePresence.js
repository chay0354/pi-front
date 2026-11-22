import {useEffect, useLayoutEffect, useState} from 'react';

const SLIDE_MS = 480;

/** Keep a side panel mounted long enough to slide closed the same way it opened. */
export function useSlidePresence(open) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setShown(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [open, mounted]);

  useEffect(() => {
    if (open || !mounted) return undefined;
    const timer = window.setTimeout(() => setMounted(false), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  return {mounted, shown};
}
