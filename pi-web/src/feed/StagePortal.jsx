import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

/** Sheets must sit on the scaled stage, outside cards that clip overflow. */
export default function StagePortal({children}) {
  const [host, setHost] = useState(null);
  useEffect(() => {
    setHost(document.getElementById('pi-stage'));
  }, []);
  if (!host) return null;
  return createPortal(
    <div style={{position: 'absolute', inset: 0, zIndex: 40}}>{children}</div>,
    host,
  );
}
