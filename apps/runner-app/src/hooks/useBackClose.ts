import { useEffect, useRef } from 'react';
import { pushBackHandler } from '../lib/backStack';

// Makes the Android/browser back button close this screen instead of
// leaving the runner app entirely. Call unconditionally with the screen's
// own "is this open" flag — the effect only does anything while true.
export function useBackClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const close = pushBackHandler(() => onCloseRef.current());
    return () => close();
  }, [isOpen]);
}
