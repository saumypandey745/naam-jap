/**
 * useAmbientSound.ts
 *
 * Ambient background sound during jap sessions.
 * Uses Web Audio API to generate or play audio buffers.
 * No external audio files needed for generated sounds.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AmbientSound } from '@/types/settings';

// Gentle bell tone generated via Web Audio API
function playBellTone(ctx: AudioContext, frequency = 528, duration = 2.0, volume = 0.3): void {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

// Soft pink noise generator for river/rain ambience
function createNoiseNode(ctx: AudioContext, volume: number): { stop: () => void } {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Pink noise approximation
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume, ctx.currentTime);

  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start();

  return {
    stop: () => {
      try {
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        setTimeout(() => { try { source.stop(); } catch {} }, 600);
      } catch {}
    },
  };
}

interface UseAmbientSoundReturn {
  playMalaCompletionBell: () => void;
  playJapBell: () => void;
}

export function useAmbientSound(
  ambientType: AmbientSound,
  volume: number,
  isActive: boolean,
  soundEnabled: boolean,
): UseAmbientSoundReturn {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<{ stop: () => void } | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new AudioContext();
      } catch {
        return null;
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Start/stop ambient sound
  useEffect(() => {
    if (!isActive || ambientType === 'none' || ambientType === 'silence') {
      noiseNodeRef.current?.stop();
      noiseNodeRef.current = null;
      return;
    }

    const ctx = getCtx();
    if (!ctx) return;

    // Stop existing
    noiseNodeRef.current?.stop();

    if (ambientType === 'river' || ambientType === 'rain') {
      const noiseVol = volume * (ambientType === 'rain' ? 0.15 : 0.08);
      noiseNodeRef.current = createNoiseNode(ctx, noiseVol);
    } else if (ambientType === 'temple-bells') {
      // Temple bells: periodic soft bell tone
      const bellInterval = setInterval(() => {
        const ctx2 = getCtx();
        if (ctx2) playBellTone(ctx2, 432, 3, volume * 0.2);
      }, 8000);
      noiseNodeRef.current = { stop: () => clearInterval(bellInterval) };
      // Play one immediately
      playBellTone(ctx, 432, 3, volume * 0.2);
    }

    return () => {
      noiseNodeRef.current?.stop();
      noiseNodeRef.current = null;
    };
  }, [isActive, ambientType, volume, getCtx]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      noiseNodeRef.current?.stop();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const playMalaCompletionBell = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    // Three ascending tones for mala completion
    playBellTone(ctx, 396, 2.5, 0.4);
    setTimeout(() => playBellTone(ctx, 528, 2.5, 0.4), 300);
    setTimeout(() => playBellTone(ctx, 639, 3.0, 0.5), 600);
  }, [soundEnabled, getCtx]);

  const playJapBell = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getCtx();
    if (!ctx) return;
    playBellTone(ctx, 528, 0.8, 0.15);
  }, [soundEnabled, getCtx]);

  return { playMalaCompletionBell, playJapBell };
}
