/**
 * useVoiceEngine.ts
 *
 * React hook that bridges the pure TypeScript VoiceEngine with React state.
 * The engine itself has zero React dependencies — this hook is the only
 * integration point.
 *
 * Responsibilities:
 * - Singleton engine instance (stable across renders)
 * - Convert engine callbacks to React state updates
 * - Expose clean API to consuming components
 * - Cleanup on unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { VoiceEngine, isSpeechRecognitionSupported } from './VoiceEngine';
import { MantraConfig } from '@/types/mantra';
import { VoiceState, JapDetectedEvent, VoiceEngineDebugInfo } from '@/types/voice';

interface UseVoiceEngineOptions {
  mantraConfig: MantraConfig | null;
  maxRepetitionsPerEvent?: number;
  duplicateWindowMs?: number;
  onJapDetected: (event: JapDetectedEvent) => void;
}

interface UseVoiceEngineReturn {
  voiceState: VoiceState;
  interimTranscript: string;
  errorMessage: string;
  debugInfo: VoiceEngineDebugInfo | null;
  isSupported: boolean;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function useVoiceEngine({
  mantraConfig,
  maxRepetitionsPerEvent = 20,
  duplicateWindowMs = 1500,
  onJapDetected,
}: UseVoiceEngineOptions): UseVoiceEngineReturn {
  const engineRef = useRef<VoiceEngine | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<VoiceEngineDebugInfo | null>(null);

  // Stable callback refs to avoid re-creating engine on every render
  const onJapDetectedRef = useRef(onJapDetected);
  onJapDetectedRef.current = onJapDetected;

  // Create the engine once
  useEffect(() => {
    const engine = new VoiceEngine({ maxRepetitionsPerEvent, duplicateWindowMs });

    engine.setCallbacks({
      onJapDetected: (event) => onJapDetectedRef.current(event),
      onStateChanged: (state, error) => {
        setVoiceState(state);
        if (error) setErrorMessage(error);
        else setErrorMessage('');
      },
      onInterimTranscript: (transcript) => setInterimTranscript(transcript),
      onDebugUpdate: (info) => setDebugInfo({ ...info }),
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only create once

  // Update mantra config on the engine when it changes
  useEffect(() => {
    if (engineRef.current && mantraConfig) {
      engineRef.current.setMantra(mantraConfig);
    }
  }, [mantraConfig]);

  const start = useCallback(async () => {
    if (!engineRef.current || !mantraConfig) return;
    engineRef.current.setMantra(mantraConfig);
    await engineRef.current.start();
  }, [mantraConfig]);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    setInterimTranscript('');
  }, []);

  const resume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setInterimTranscript('');
  }, []);

  return {
    voiceState,
    interimTranscript,
    errorMessage,
    debugInfo,
    isSupported: isSpeechRecognitionSupported(),
    start,
    pause,
    resume,
    stop,
  };
}
