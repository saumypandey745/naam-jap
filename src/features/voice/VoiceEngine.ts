/**
 * VoiceEngine.ts
 *
 * The central voice processing engine.
 * Completely independent of React — pure TypeScript class.
 *
 * Architecture:
 *   SpeechRecognition (browser API)
 *     → ResultAccumulator    (dedup finalized slots)
 *     → MantraMatchEngine    (does transcript match the mantra?)
 *     → RepetitionParser     (how many times in this segment?)
 *     → DuplicateGuard       (prevent same event counted twice)
 *     → emit JapDetectedEvent
 *
 * NEVER counts based on:
 *   - Interim results
 *   - Raw recognition events without matching
 *   - Duplicate events for the same finalized text
 *
 * Manages:
 *   - Recognition lifecycle (start, pause, stop, auto-restart)
 *   - State machine: idle → listening → paused → stopped
 *   - Memory cleanup (periodic pruning of stale state)
 */

import { MantraConfig } from '@/types/mantra';
import {
  VoiceState,
  JapDetectedEvent,
  VoiceEngineDebugInfo,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
  MatchResult,
} from '@/types/voice';
import { match } from './MantraMatchEngine';
import { countRepetitions } from './RepetitionParser';
import { DuplicateGuard } from './DuplicateGuard';
import { ResultAccumulator } from './ResultAccumulator';
// ─────────────────────────────────────────────────────────────────
// Browser SpeechRecognition API detection
// The Web Speech API uses SpeechRecognition (unprefixed) in modern browsers
// and webkitSpeechRecognition in older Chrome/Safari.
// We use 'any' here because TypeScript's lib.dom.d.ts doesn't declare
// the constructor as a class that can be instantiated with 'new'.
// ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getSpeechRecognitionClass(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isSpeechRecognitionSupported = (): boolean =>
  getSpeechRecognitionClass() !== null;

// ─────────────────────────────────────────────────────────────────
// Event callback types
// ─────────────────────────────────────────────────────────────────

type JapDetectedCallback = (event: JapDetectedEvent) => void;
type StateChangedCallback = (state: VoiceState, error?: string) => void;
type InterimTranscriptCallback = (transcript: string) => void;
type DebugUpdateCallback = (info: VoiceEngineDebugInfo) => void;

// ─────────────────────────────────────────────────────────────────
// VoiceEngine
// ─────────────────────────────────────────────────────────────────

export class VoiceEngine {
  private recognition: SpeechRecognitionInstance | null = null;
  private mantraConfig: MantraConfig | null = null;
  private maxRepetitionsPerEvent: number;

  // State machine
  private _state: VoiceState = 'idle';
  private isStarting = false;
  private isStopping = false;
  private sessionActive = false;

  // Sub-components
  private accumulator = new ResultAccumulator();
  private duplicateGuard: DuplicateGuard;

  // Debug info
  private debugInfo: VoiceEngineDebugInfo = this.createInitialDebugInfo();

  // Callbacks (set by the React hook)
  private onJapDetected: JapDetectedCallback | null = null;
  private onStateChanged: StateChangedCallback | null = null;
  private onInterimTranscript: InterimTranscriptCallback | null = null;
  private onDebugUpdate: DebugUpdateCallback | null = null;

  // Restart control
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly RESTART_DELAY_MS = 300;
  private readonly PRUNE_INTERVAL_MS = 60_000; // 1 minute
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: { maxRepetitionsPerEvent?: number; duplicateWindowMs?: number }) {
    this.maxRepetitionsPerEvent = options?.maxRepetitionsPerEvent ?? 20;
    this.duplicateGuard = new DuplicateGuard(options?.duplicateWindowMs ?? 1500);
  }

  // ─── Public API ────────────────────────────────────────────────

  setCallbacks(callbacks: {
    onJapDetected?: JapDetectedCallback;
    onStateChanged?: StateChangedCallback;
    onInterimTranscript?: InterimTranscriptCallback;
    onDebugUpdate?: DebugUpdateCallback;
  }): void {
    this.onJapDetected = callbacks.onJapDetected ?? null;
    this.onStateChanged = callbacks.onStateChanged ?? null;
    this.onInterimTranscript = callbacks.onInterimTranscript ?? null;
    this.onDebugUpdate = callbacks.onDebugUpdate ?? null;
  }

  setMantra(config: MantraConfig): void {
    this.mantraConfig = config;
  }

  get state(): VoiceState {
    return this._state;
  }

  get isSupported(): boolean {
    return isSpeechRecognitionSupported();
  }

  getDebugInfo(): VoiceEngineDebugInfo {
    return { ...this.debugInfo };
  }

  /**
   * Start a new Jap session with voice recognition.
   * Idempotent: calling while already listening has no effect.
   */
  async start(): Promise<void> {
    if (!this.isSupported) {
      this.setState('unsupported');
      return;
    }
    if (this.sessionActive || this.isStarting) return;

    this.setState('requesting-permission');
    this.isStarting = true;
    this.sessionActive = true;

    // Reset accumulator for fresh session
    this.accumulator.reset();
    this.duplicateGuard.reset();

    try {
      // Request microphone permission explicitly first so we can
      // handle denial with a clear error state
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Permission granted — create and start recognition
      this.createRecognition();
      this.startRecognition();
      this.startPruneTimer();
    } catch (err) {
      const error = err as Error;
      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        this.setState('denied', 'Microphone permission denied');
      } else if (
        error.name === 'NotFoundError' ||
        error.name === 'DevicesNotFoundError'
      ) {
        this.setState('error', 'No microphone found');
      } else {
        this.setState('error', error.message);
      }
      this.sessionActive = false;
    } finally {
      this.isStarting = false;
    }
  }

  /**
   * Pause recognition (keeps session active, stops microphone).
   */
  pause(): void {
    if (!this.sessionActive || this._state === 'paused') return;
    this.setState('paused');
    this.stopRecognition();
    this.clearRestartTimer();
  }

  /**
   * Resume recognition after pause.
   */
  resume(): void {
    if (!this.sessionActive || this._state !== 'paused') return;
    this.createRecognition();
    this.startRecognition();
  }

  /**
   * Stop the session completely. Clears all state.
   */
  stop(): void {
    this.sessionActive = false;
    this.isStopping = true;
    this.clearRestartTimer();
    this.stopPruneTimer();
    this.stopRecognition();
    // Don't reset accumulator here — keep for post-session correction context
    this.setState('idle');
    this.isStopping = false;
  }

  // ─── Recognition lifecycle ─────────────────────────────────────

  private createRecognition(): void {
    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass || !this.mantraConfig) return;

    // Destroy any existing instance first
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition = null;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = this.mantraConfig.language;
    recognition.maxAlternatives = 1;

    recognition.onresult = this.handleResult.bind(this);
    recognition.onerror = this.handleError.bind(this);
    recognition.onend = this.handleEnd.bind(this);
    recognition.onstart = () => {
      this.setState('listening');
    };

    this.recognition = recognition;
  }

  private startRecognition(): void {
    if (!this.recognition) return;
    try {
      this.recognition.start();
    } catch (err) {
      const error = err as Error;
      // "already started" is benign — ignore it
      if (!error.message.includes('already started')) {
        this.setState('error', error.message);
      }
    }
  }

  private stopRecognition(): void {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch {
      // ignore
    }
  }

  private scheduleRestart(): void {
    if (!this.sessionActive || this._state === 'paused' || this.isStopping) return;
    this.clearRestartTimer();
    this.restartTimer = setTimeout(() => {
      if (!this.sessionActive || this._state === 'paused' || this.isStopping) return;
      this.createRecognition();
      this.startRecognition();
    }, this.RESTART_DELAY_MS);
  }

  private clearRestartTimer(): void {
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  // ─── Result processing ─────────────────────────────────────────

  private handleResult(event: SpeechRecognitionEvent): void {
    if (!this.mantraConfig || !this.sessionActive) return;

    const results = event.results;
    const resultIndex = event.resultIndex;

    // Iterate from resultIndex (the newly changed result)
    for (let i = resultIndex; i < results.length; i++) {
      const result = results[i];
      const alternative = result[0];
      const transcript = alternative.transcript;
      const isFinal = result.isFinal;

      if (!isFinal) {
        // Interim: only use for UI display, never for counting
        this.debugInfo.lastInterimTranscript = transcript;
        this.onInterimTranscript?.(transcript);
        this.emitDebugUpdate();
        continue;
      }

      // Process through accumulator
      const accumulated = this.accumulator.process(
        i,
        transcript,
        isFinal,
        Date.now(),
      );

      if (!accumulated.isNew) {
        this.debugInfo.duplicateCount++;
        this.emitDebugUpdate();
        continue;
      }

      // Process the final transcript
      this.processFinalTranscript(
        accumulated.transcript,
        accumulated.normalizedTranscript,
        i,
      );
    }
  }

  private processFinalTranscript(
    transcript: string,
    normalizedTranscript: string,
    resultIndex: number,
  ): void {
    if (!this.mantraConfig) return;

    this.debugInfo.lastFinalTranscript = transcript;
    this.debugInfo.lastNormalizedTranscript = normalizedTranscript;
    this.setState('processing');

    // Duplicate guard check
    const timestamp = Date.now();
    const guardResult = this.duplicateGuard.isAccepted(
      resultIndex,
      transcript,
      timestamp,
    );

    if (!guardResult.accepted) {
      this.debugInfo.duplicateCount++;
      this.debugInfo.rejectedCount++;
      this.debugInfo.lastMatchResult = null;
      this.setState('listening');
      this.emitDebugUpdate();
      return;
    }

    // Run mantra match engine
    const matchResult: MatchResult = match(transcript, this.mantraConfig);
    this.debugInfo.lastMatchResult = matchResult;
    this.debugInfo.processedSegmentCount++;

    if (!matchResult.matched) {
      this.debugInfo.rejectedCount++;
      this.setState('listening');
      this.emitDebugUpdate();
      return;
    }

    // Count repetitions
    const repetitions = countRepetitions(
      transcript,
      this.mantraConfig,
      this.maxRepetitionsPerEvent,
    );

    if (repetitions <= 0) {
      this.debugInfo.rejectedCount++;
      this.setState('listening');
      this.emitDebugUpdate();
      return;
    }

    // All checks passed — emit jap detected
    this.debugInfo.acceptedCount++;
    const eventId = `jap-${timestamp}-${Math.random().toString(36).slice(2)}`;
    this.debugInfo.lastEventId = eventId;

    const japEvent: JapDetectedEvent = {
      id: eventId,
      mantraId: this.mantraConfig.id,
      repetitions,
      transcript,
      timestamp,
      mode: 'voice',
      debugInfo: matchResult.debugInfo,
    };

    this.onJapDetected?.(japEvent);
    this.setState('listening');
    this.emitDebugUpdate();
  }

  private handleError(event: SpeechRecognitionErrorEvent): void {
    const error = event.error;

    // 'no-speech' and 'aborted' are expected during normal operation
    if (error === 'no-speech' || error === 'aborted') {
      return;
    }

    // 'not-allowed' means permission was revoked
    if (error === 'not-allowed') {
      this.setState('denied', 'Microphone permission revoked');
      this.sessionActive = false;
      return;
    }

    // Network/service errors — log but don't crash
    if (error === 'network' || error === 'service-not-allowed') {
      // Will auto-restart on 'end' event
      return;
    }

    // Other errors
    this.setState('error', error);
  }

  private handleEnd(): void {
    if (!this.sessionActive || this._state === 'paused' || this.isStopping) {
      return;
    }
    // Recognition ended unexpectedly — schedule restart
    this.scheduleRestart();
  }

  // ─── State machine ─────────────────────────────────────────────

  private setState(newState: VoiceState, error?: string): void {
    if (this._state === newState && !error) return;
    this._state = newState;
    this.debugInfo.state = newState;
    this.onStateChanged?.(newState, error);
  }

  // ─── Memory management ─────────────────────────────────────────

  private startPruneTimer(): void {
    this.pruneTimer = setInterval(() => {
      const now = Date.now();
      this.duplicateGuard.evictStale(now);
      this.accumulator.pruneOlderThan(now - this.PRUNE_INTERVAL_MS * 2);
    }, this.PRUNE_INTERVAL_MS);
  }

  private stopPruneTimer(): void {
    if (this.pruneTimer !== null) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  // ─── Debug ─────────────────────────────────────────────────────

  private createInitialDebugInfo(): VoiceEngineDebugInfo {
    return {
      state: 'idle',
      lastInterimTranscript: '',
      lastFinalTranscript: '',
      lastNormalizedTranscript: '',
      lastDelta: '',
      lastMatchResult: null,
      lastEventId: '',
      processedSegmentCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      duplicateCount: 0,
      isSupported: isSpeechRecognitionSupported(),
      recognitionRestartCount: 0,
    };
  }

  private emitDebugUpdate(): void {
    this.onDebugUpdate?.({ ...this.debugInfo });
  }

  /**
   * Clean up everything. Call when the component using this engine unmounts.
   */
  destroy(): void {
    this.stop();
    this.recognition = null;
    this.onJapDetected = null;
    this.onStateChanged = null;
    this.onInterimTranscript = null;
    this.onDebugUpdate = null;
  }
}
