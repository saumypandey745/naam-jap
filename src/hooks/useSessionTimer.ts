/**
 * useSessionTimer.ts
 *
 * Live session stopwatch.
 * Returns elapsed seconds and formatted time string.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDuration } from '@/utils/normalize';

interface UseSessionTimerReturn {
  elapsedSeconds: number;
  formattedTime: string;
  japRate: number; // jap per minute (live)
  start: (startedAt?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSessionTimer(): UseSessionTimerReturn {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [japRate, setJapRate] = useState(0);

  const startedAtRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0); // elapsed before last pause
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const japCountRef = useRef<number>(0);

  const start = useCallback((sessionStartedAt?: number) => {
    const base = sessionStartedAt
      ? Math.floor((Date.now() - sessionStartedAt) / 1000)
      : 0;
    baseElapsedRef.current = base;
    startedAtRef.current = Date.now();
    setElapsedSeconds(base);
    setRunning(true);
    japCountRef.current = 0;
  }, []);

  const pause = useCallback(() => {
    baseElapsedRef.current = elapsedSeconds;
    setRunning(false);
  }, [elapsedSeconds]);

  const resume = useCallback(() => {
    startedAtRef.current = Date.now();
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    baseElapsedRef.current = 0;
    setElapsedSeconds(0);
    setJapRate(0);
    japCountRef.current = 0;
  }, []);

  const reset = useCallback(() => {
    stop();
    setElapsedSeconds(0);
  }, [stop]);

  // Count jap (called externally via ref)
  const addJap = useCallback((count: number) => {
    japCountRef.current += count;
  }, []);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const elapsed =
        baseElapsedRef.current +
        Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsedSeconds(elapsed);

      // Jap rate: jap per minute, calculated over elapsed time
      if (elapsed > 0 && japCountRef.current > 0) {
        setJapRate(Math.round((japCountRef.current / elapsed) * 60));
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  return {
    elapsedSeconds,
    formattedTime: formatDuration(elapsedSeconds),
    japRate,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
