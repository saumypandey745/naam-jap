/**
 * useScreenWakeLock.ts
 *
 * Prevents the device screen from sleeping during active jap.
 * Uses the Screen Wake Lock API (supported in Chrome 84+, Safari 16.4+).
 */

import { useEffect, useRef, useCallback } from 'react';

export function useScreenWakeLock(enabled: boolean, active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!enabled || !active) return;
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // Permission denied or feature unavailable — silently ignore
    }
  }, [enabled, active]);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (active && enabled) {
      acquire();
    } else {
      release();
    }

    return () => {
      release();
    };
  }, [active, enabled, acquire, release]);

  // Re-acquire if page becomes visible again (tab switching releases the lock)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active && enabled) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [active, enabled, acquire]);
}
