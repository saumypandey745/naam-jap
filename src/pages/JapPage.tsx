/**
 * JapPage.tsx — Complete Jap Session Screen
 *
 * Integrates:
 * - Voice counter (with fallback to manual)
 * - Session timer + jap/minute rate
 * - Screen wake lock
 * - Ambient sound + mala completion bell
 * - Sankalp modal (if enabled)
 * - Session goal progress
 * - Share achievement
 * - Mala ring progress
 * - Anushthaan day recording
 * - Tithi display
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pause, Play, Square, Plus, Minus, ChevronLeft,
  Mic, MicOff, Bug, Share2, Target
} from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
import { useMantraStore } from '@/store/mantraStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAnushthaanStore } from '@/store/anushthaanStore';
import { useVoiceEngine } from '@/features/voice/useVoiceEngine';
import { MalaRing } from '@/features/jap/MalaRing';
import { VoiceStatusBar, JapDetectedToast } from '@/features/jap/VoiceStatusBar';
import { SankalpModal } from '@/features/jap/SankalpModal';
import { JapDetectedEvent } from '@/types/voice';
import { formatIndianNumber } from '@/utils/normalize';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useAmbientSound } from '@/hooks/useAmbientSound';
import { shareToNative } from '@/utils/shareCard';
import { getTithiInfo, getVaarInfo } from '@/utils/tithi';
import { persistence } from '@/services/persistence/localStorageAdapter';
import { getTodayKey } from '@/utils/normalize';

// ─── Mala Completion Modal ─────────────────────────────────────────

const MalaCompleteModal: React.FC<{
  malaCount: number;
  onDismiss: () => void;
}> = ({ malaCount, onDismiss }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="spiritual-card p-8 max-w-sm w-full text-center animate-scale-in">
      <div className="text-5xl mb-4">📿</div>
      <h2 className="font-devanagari text-2xl text-gold-400 mb-2">मला पूरी हुई!</h2>
      <p className="text-text-secondary mb-1">{malaCount} Mala Completed</p>
      <p className="text-4xl font-bold text-text-primary my-4">{malaCount} × 108</p>
      <p className="text-text-muted text-sm mb-6">= {formatIndianNumber(malaCount * 108)} Jap</p>
      <button onClick={onDismiss} className="btn-primary w-full">Jap Jaari Rakhein 🙏</button>
    </div>
  </div>
);

// ─── Goal Progress Bar ─────────────────────────────────────────────

const GoalProgressBar: React.FC<{ count: number; goal: number }> = ({ count, goal }) => {
  const pct = Math.min(100, (count / goal) * 100);
  const done = count >= goal;
  return (
    <div className="w-full px-6">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-text-muted flex items-center gap-1">
          <Target size={10} /> Goal
        </span>
        <span className={done ? 'text-success font-medium' : 'text-gold-400'}>
          {formatIndianNumber(count)} / {formatIndianNumber(goal)}
          {done && ' ✅'}
        </span>
      </div>
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${done ? 'bg-success' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ─── Main JapPage ──────────────────────────────────────────────────

export const JapPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const { selectedMantra } = useMantraStore();
  const { activeAnushthaan, recordDailyJap } = useAnushthaanStore();
  const {
    activeSession,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    handleJapDetected: storeHandleJapDetected,
    adjustCount,
  } = useSessionStore();

  const [useManualMode, setUseManualMode] = useState(false);
  const [showMalaModal, setShowMalaModal] = useState(false);
  const [lastDetectedCount, setLastDetectedCount] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showSankalp, setShowSankalp] = useState(false);
  const [sessionSankalp, setSessionSankalp] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const prevMalaCountRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const japCountRef = useRef(0); // for jap rate calculation

  const tithi = getTithiInfo();
  const vaar = getVaarInfo();

  // Load today's stats
  useEffect(() => {
    persistence.getDailyStats(getTodayKey()).then((stats) => {
      if (stats) setTodayCount(stats.count);
    });
  }, []);

  // ─── Hooks ────────────────────────────────────────────────

  const timer = useSessionTimer();
  const { playMalaCompletionBell, playJapBell } = useAmbientSound(
    settings.ambientSound ?? 'none',
    settings.ambientVolume ?? 0.5,
    sessionStarted && !activeSession?.isPaused,
    settings.soundEnabled,
  );

  useScreenWakeLock(
    settings.keepScreenOn ?? true,
    sessionStarted && !(activeSession?.isPaused ?? false),
  );

  // ─── Jap detected handler ──────────────────────────────────

  const handleJapDetected = useCallback((event: JapDetectedEvent) => {
    storeHandleJapDetected(event);
    setLastDetectedCount(event.repetitions);
    setToastVisible(true);
    japCountRef.current += event.repetitions;

    if (settings.soundEnabled) playJapBell();
    if (settings.hapticEnabled && navigator.vibrate) navigator.vibrate(40);
    setTodayCount((prev) => prev + event.repetitions);

    if (activeAnushthaan) {
      recordDailyJap(activeAnushthaan.id, event.repetitions);
    }

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 1200);
  }, [storeHandleJapDetected, settings.soundEnabled, settings.hapticEnabled,
      playJapBell, activeAnushthaan, recordDailyJap]);

  // ─── Voice engine ──────────────────────────────────────────

  const {
    voiceState, interimTranscript, errorMessage,
    debugInfo: _debugInfo, isSupported,
    start: startVoice, pause: pauseVoice, resume: resumeVoice, stop: stopVoice,
  } = useVoiceEngine({
    mantraConfig: selectedMantra,
    maxRepetitionsPerEvent: settings.maxRepetitionsPerEvent,
    duplicateWindowMs: settings.duplicateWindowMs,
    onJapDetected: handleJapDetected,
  });

  // ─── Session control ───────────────────────────────────────

  const doStart = useCallback(async (sankalp: string) => {
    if (!selectedMantra) { navigate('/select'); return; }
    setSessionSankalp(sankalp);
    startSession(selectedMantra.id, selectedMantra.displayName, useManualMode ? 'manual' : 'voice');
    setSessionStarted(true);
    prevMalaCountRef.current = 0;
    japCountRef.current = 0;
    timer.start();

    if (!useManualMode && isSupported) await startVoice();
  }, [selectedMantra, useManualMode, isSupported, startSession, startVoice, navigate, timer]);

  const handleStart = useCallback(() => {
    if (settings.sankalpModeEnabled) {
      setShowSankalp(true);
    } else {
      doStart('');
    }
  }, [settings.sankalpModeEnabled, doStart]);

  const handlePause = useCallback(() => {
    pauseSession();
    timer.pause();
    if (!useManualMode) pauseVoice();
  }, [pauseSession, timer, pauseVoice, useManualMode]);

  const handleResume = useCallback(() => {
    resumeSession();
    timer.resume();
    if (!useManualMode) resumeVoice();
  }, [resumeSession, timer, resumeVoice, useManualMode]);

  const handleStop = useCallback(async () => {
    if (!useManualMode) stopVoice();
    timer.stop();
    await endSession();
    setSessionStarted(false);
    navigate('/history');
  }, [useManualMode, stopVoice, timer, endSession, navigate]);

  const handleShare = useCallback(async () => {
    if (!selectedMantra || !activeSession) return;
    setIsSharing(true);
    try {
      await shareToNative({
        mantraName: selectedMantra.displayName,
        count: activeSession.count,
        malaCount: activeSession.malaCount,
        date: new Date().toLocaleDateString('hi-IN'),
      });
    } finally {
      setIsSharing(false);
    }
  }, [selectedMantra, activeSession]);

  // ─── Mala completion ───────────────────────────────────────

  useEffect(() => {
    if (!activeSession) return;
    const newMalaCount = activeSession.malaCount;
    if (newMalaCount > prevMalaCountRef.current && settings.autoMalaProgression) {
      prevMalaCountRef.current = newMalaCount;
      setShowMalaModal(true);
      playMalaCompletionBell();
      if (settings.hapticEnabled && navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    }
  }, [activeSession?.malaCount]);

  // ─── Navigate to select if no mantra ──────────────────────

  useEffect(() => {
    if (!selectedMantra) navigate('/select');
  }, [selectedMantra, navigate]);

  // Auto-start session on page load
  useEffect(() => {
    if (selectedMantra && !sessionStarted && !activeSession) {
      handleStart();
    }
  }, []);

  // ─── Render ────────────────────────────────────────────────

  if (!selectedMantra) return null;

  const count = activeSession?.count ?? 0;
  const malaCount = activeSession?.malaCount ?? 0;
  const malaProgress = activeSession?.currentMalaProgress ?? 0;
  const isPaused = activeSession?.isPaused ?? false;
  const malaSize = settings.malaSize ?? 108;
  const dailyGoal = settings.dailyGoalTarget;

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-safe-top safe-top pb-2">
        <button onClick={() => navigate('/')} className="btn-ghost p-2 -ml-2" aria-label="Go back">
          <ChevronLeft size={22} />
        </button>

        {/* Tithi display */}
        {settings.showTithiDisplay && (
          <div className="text-center">
            <p className="text-xs text-gold-400/70">{vaar.hindi} · {tithi.tithiHindi}</p>
          </div>
        )}

        <div className="flex items-center gap-1">
          {!useManualMode && isSupported ? (
            <span className="text-xs text-text-muted px-2 py-1 rounded-full bg-bg-elevated border border-bg-card">
              🎙 Voice
            </span>
          ) : (
            <span className="text-xs text-text-muted px-2 py-1 rounded-full bg-bg-elevated border border-bg-card">
              ✋ Manual
            </span>
          )}
          {import.meta.env.DEV && settings.showDebugPage && (
            <button onClick={() => navigate('/debug')} className="btn-ghost p-1.5" aria-label="Debug">
              <Bug size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-2 gap-4">

        {/* Mantra name */}
        <div className="text-center animate-fade-in">
          <h1 className="mantra-text-xl text-center">{selectedMantra.displayName}</h1>
          {sessionSankalp && (
            <p className="text-xs text-text-muted mt-1 italic">"{sessionSankalp}"</p>
          )}
        </div>

        {/* Timer + Rate row */}
        {sessionStarted && (
          <div className="flex items-center gap-6 text-center">
            <div>
              <div className="text-xs text-text-muted">Samay</div>
              <div className="text-sm font-mono text-text-primary">{timer.formattedTime}</div>
            </div>
            {timer.japRate > 0 && (
              <div>
                <div className="text-xs text-text-muted">Speed</div>
                <div className="text-sm font-mono text-gold-400">{timer.japRate}/min</div>
              </div>
            )}
          </div>
        )}

        {/* Counter */}
        <div className="relative flex flex-col items-center">
          <JapDetectedToast count={lastDetectedCount} visible={toastVisible} />
          <div
            className={`jap-counter text-center ${toastVisible ? 'pop' : ''}`}
            aria-live="polite"
            aria-atomic="true"
            aria-label={`${formatIndianNumber(count)} jap`}
          >
            {formatIndianNumber(count)}
          </div>
          <span className="text-text-muted text-sm mt-1 tracking-widest uppercase">Jap</span>
        </div>

        {/* Mala ring */}
        <div className="flex flex-col items-center gap-1">
          <MalaRing progress={malaProgress} malaCount={malaCount} size={88} />
          <span className="text-xs text-text-muted mt-1">
            {malaProgress} / {malaSize} this mala
          </span>
        </div>

        {/* Daily Goal */}
        {dailyGoal && sessionStarted && (
          <GoalProgressBar count={todayCount} goal={dailyGoal} />
        )}

        {/* Voice status */}
        {!useManualMode && isSupported && sessionStarted && (
          <VoiceStatusBar
            voiceState={voiceState}
            interimTranscript={interimTranscript}
            lastDetectedCount={lastDetectedCount}
            errorMessage={errorMessage}
            isSupported={isSupported}
          />
        )}

        {/* Mic not supported */}
        {!isSupported && !useManualMode && (
          <div className="bg-bg-elevated border border-error/20 rounded-xl p-4 text-center max-w-xs">
            <MicOff size={20} className="text-error mx-auto mb-2" />
            <p className="text-sm text-text-secondary mb-3">Voice unavailable in this browser.</p>
            <button onClick={() => setUseManualMode(true)} className="btn-secondary text-sm">
              Manual Mode
            </button>
          </div>
        )}

        {/* Mic denied */}
        {voiceState === 'denied' && !useManualMode && (
          <div className="bg-bg-elevated border border-error/20 rounded-xl p-4 text-center max-w-xs">
            <MicOff size={20} className="text-error mx-auto mb-2" />
            <p className="text-sm text-text-secondary mb-1 font-medium">Microphone permission required</p>
            <p className="text-xs text-text-muted mb-3">Allow mic access for voice counting.</p>
            <button onClick={() => setUseManualMode(true)} className="btn-secondary text-sm">
              Manual Mode
            </button>
          </div>
        )}

        {/* Manual controls */}
        {(useManualMode || !isSupported) && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => adjustCount(-1)}
              disabled={count === 0}
              className="btn-ghost border border-text-muted/20 rounded-full w-12 h-12 flex items-center justify-center"
              aria-label="Decrease"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => {
                const event: JapDetectedEvent = {
                  id: `manual-${Date.now()}`,
                  mantraId: selectedMantra.id,
                  repetitions: 1,
                  transcript: 'manual',
                  timestamp: Date.now(),
                  mode: 'voice' as const,
                };
                storeHandleJapDetected(event);
                handleJapDetected(event);
              }}
              className="btn-primary w-20 h-20 rounded-full text-3xl shadow-glow-gold"
              aria-label="One jap"
            >
              +1
            </button>
            <button
              onClick={() => adjustCount(1)}
              className="btn-ghost border border-text-muted/20 rounded-full w-12 h-12 flex items-center justify-center"
              aria-label="Increase"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
      </main>

      {/* Bottom stats + controls */}
      <div className="px-4 pb-4 safe-bottom">
        <div className="spiritual-divider" />

        {/* Stats row */}
        <div className="flex justify-around mb-4">
          <div className="text-center">
            <div className="text-xs text-text-muted mb-0.5">Today</div>
            <div className="text-lg font-semibold text-text-primary">{formatIndianNumber(todayCount)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-text-muted mb-0.5">Session</div>
            <div className="text-lg font-semibold text-text-primary">{formatIndianNumber(count)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-text-muted mb-0.5">Mala</div>
            <div className="text-lg font-semibold text-gold-400">{malaCount}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {sessionStarted ? (
            <>
              {isPaused ? (
                <button onClick={handleResume} className="btn-primary flex-1 max-w-xs" aria-label="Resume">
                  <Play size={18} /> Resume
                </button>
              ) : (
                <button onClick={handlePause} className="btn-secondary flex-1 max-w-xs" aria-label="Pause">
                  <Pause size={18} /> Pause
                </button>
              )}
              {/* Share */}
              <button
                onClick={handleShare}
                disabled={isSharing || count === 0}
                className="btn-ghost border border-gold-600/30 text-gold-400 px-3 h-11 rounded-xl"
                aria-label="Share"
              >
                <Share2 size={16} />
              </button>
              <button onClick={handleStop} className="btn-ghost border border-error/20 text-error px-4 h-11" aria-label="End">
                <Square size={16} /> End
              </button>
            </>
          ) : (
            <button onClick={handleStart} className="btn-primary flex-1 max-w-xs">
              <Mic size={18} /> Start Jap
            </button>
          )}
        </div>
      </div>

      {/* Mala Modal */}
      {showMalaModal && (
        <MalaCompleteModal malaCount={malaCount} onDismiss={() => setShowMalaModal(false)} />
      )}

      {/* Sankalp Modal */}
      {showSankalp && (
        <SankalpModal
          mantraName={selectedMantra.displayName}
          onConfirm={(sankalp) => {
            setShowSankalp(false);
            doStart(sankalp);
          }}
          onSkip={() => {
            setShowSankalp(false);
            doStart('');
          }}
        />
      )}
    </div>
  );
};
