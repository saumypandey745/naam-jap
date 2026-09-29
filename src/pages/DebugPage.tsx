/**
 * DebugPage.tsx
 *
 * Development-only voice engine diagnostics.
 * NEVER shown to normal users — only accessible in DEV mode with the setting enabled.
 *
 * Shows:
 * - Recognition state
 * - Interim/final/normalized transcripts
 * - Match result
 * - Repetition count
 * - Duplicate guard status
 * - Acceptance/rejection reason
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Square } from 'lucide-react';
import { useMantraStore } from '@/store/mantraStore';
import { useVoiceEngine } from '@/features/voice/useVoiceEngine';
import { JapDetectedEvent, VoiceEngineDebugInfo } from '@/types/voice';

interface LogEntry {
  ts: number;
  type: 'accept' | 'reject' | 'interim' | 'info';
  message: string;
  details?: Record<string, unknown>;
}

export const DebugPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedMantra } = useMantraStore();
  const [isActive, setIsActive] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [currentDebug, setCurrentDebug] = useState<VoiceEngineDebugInfo | null>(null);
  const [totalAccepted, setTotalAccepted] = useState(0);

  const addLog = useCallback((entry: LogEntry) => {
    setLog((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const handleJapDetected = useCallback((event: JapDetectedEvent) => {
    setTotalAccepted((n) => n + event.repetitions);
    addLog({
      ts: Date.now(),
      type: 'accept',
      message: `✓ ACCEPT: +${event.repetitions} jap`,
      details: {
        transcript: event.transcript,
        repetitions: event.repetitions,
        mantra: event.mantraId,
      },
    });
  }, [addLog]);

  const { voiceState, interimTranscript, debugInfo, isSupported, start, stop } =
    useVoiceEngine({
      mantraConfig: selectedMantra,
      onJapDetected: handleJapDetected,
    });

  // Update debug display
  React.useEffect(() => {
    if (debugInfo) {
      setCurrentDebug(debugInfo);
      if (debugInfo.lastMatchResult && !debugInfo.lastMatchResult.matched) {
        addLog({
          ts: Date.now(),
          type: 'reject',
          message: `✗ REJECT (${debugInfo.lastMatchResult.reason}): "${debugInfo.lastFinalTranscript}"`,
          details: {
            similarity: debugInfo.lastMatchResult.similarity.toFixed(3),
            reason: debugInfo.lastMatchResult.reason,
          },
        });
      }
    }
  }, [debugInfo?.processedSegmentCount]);

  React.useEffect(() => {
    if (interimTranscript) {
      addLog({ ts: Date.now(), type: 'interim', message: `⋯ Interim: "${interimTranscript}"` });
    }
  }, [interimTranscript]);

  const handleStart = async () => {
    setLog([]);
    setTotalAccepted(0);
    setIsActive(true);
    await start();
  };

  const handleStop = () => {
    stop();
    setIsActive(false);
  };

  if (!import.meta.env.DEV) {
    return (
      <div className="min-h-dvh bg-spiritual flex items-center justify-center">
        <p className="text-text-muted">Debug page is only available in development mode.</p>
      </div>
    );
  }

  const mr = currentDebug?.lastMatchResult;

  return (
    <div className="min-h-dvh bg-bg-base flex flex-col text-sm font-mono">
      <header className="px-4 py-3 border-b border-bg-elevated flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2" aria-label="Go back">
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-text-primary font-bold">🔬 Voice Engine Debug</h1>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${
          isSupported ? 'text-success border-success/30' : 'text-error border-error/30'
        }`}>
          {isSupported ? 'Supported' : 'Unsupported'}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Controls + State */}
        <div className="flex flex-col gap-3">
          {/* Mantra */}
          <div className="bg-bg-elevated rounded-lg p-3">
            <p className="text-text-muted text-xs mb-1">Selected Mantra</p>
            <p className="text-gold-400 font-devanagari text-base">
              {selectedMantra?.displayName ?? <span className="text-error">None selected</span>}
            </p>
            {selectedMantra && (
              <div className="mt-2 text-text-muted text-xs">
                <p>Lang: {selectedMantra.language}</p>
                <p>Min similarity: {selectedMantra.minimumSimilarity}</p>
                <p>Dedup window: {selectedMantra.duplicateWindowMs}ms</p>
                <p>Forms: {selectedMantra.normalizedForms.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={isActive || !selectedMantra}
              className="btn-primary flex-1 text-sm py-2"
            >
              <Play size={14} />
              Start Listening
            </button>
            <button
              onClick={handleStop}
              disabled={!isActive}
              className="btn-secondary flex-1 text-sm py-2"
            >
              <Square size={14} />
              Stop
            </button>
          </div>

          {/* State */}
          <div className="bg-bg-elevated rounded-lg p-3 space-y-1">
            <p className="text-text-muted text-xs mb-2">State</p>
            <div className="flex justify-between"><span className="text-text-muted">Voice state:</span><span className="text-text-primary">{voiceState}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Processed:</span><span className="text-text-primary">{currentDebug?.processedSegmentCount ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Accepted:</span><span className="text-success">{currentDebug?.acceptedCount ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Rejected:</span><span className="text-error">{currentDebug?.rejectedCount ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Duplicates:</span><span className="text-warning">{currentDebug?.duplicateCount ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Total Jap:</span><span className="text-gold-400 font-bold">{totalAccepted}</span></div>
          </div>

          {/* Last match result */}
          {mr && (
            <div className={`bg-bg-elevated rounded-lg p-3 border ${mr.matched ? 'border-success/30' : 'border-error/30'}`}>
              <p className="text-text-muted text-xs mb-2">Last Match Result</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-text-muted">Matched:</span><span className={mr.matched ? 'text-success' : 'text-error'}>{mr.matched ? 'YES' : 'NO'}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Repetitions:</span><span className="text-text-primary">{mr.repetitions}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Similarity:</span><span className="text-text-primary">{mr.similarity.toFixed(3)}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Reason:</span><span className="text-text-primary">{mr.reason}</span></div>
                <div className="pt-1 border-t border-bg-card">
                  <p className="text-text-muted text-xs">Raw: "{mr.debugInfo.rawTranscript}"</p>
                  <p className="text-text-muted text-xs">Normalized: "{mr.debugInfo.normalizedTranscript}"</p>
                  <p className="text-text-muted text-xs">Target: "{mr.debugInfo.normalizedTarget}"</p>
                </div>
              </div>
            </div>
          )}

          {/* Interim */}
          <div className="bg-bg-elevated rounded-lg p-3">
            <p className="text-text-muted text-xs mb-1">Interim Transcript (not counted)</p>
            <p className="text-text-secondary break-words">{interimTranscript || '—'}</p>
          </div>
        </div>

        {/* Event log */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-xs uppercase tracking-widest">Event Log</p>
            <button onClick={() => setLog([])} className="text-xs text-text-muted hover:text-text-primary">
              Clear
            </button>
          </div>
          <div className="bg-bg-elevated rounded-lg p-3 flex-1 overflow-y-auto max-h-[60vh] space-y-1">
            {log.length === 0 && (
              <p className="text-text-muted text-xs">Waiting for events...</p>
            )}
            {log.map((entry, i) => (
              <div key={i} className={`text-xs py-0.5 ${
                entry.type === 'accept' ? 'text-success' :
                entry.type === 'reject' ? 'text-error' :
                entry.type === 'interim' ? 'text-text-muted' :
                'text-text-secondary'
              }`}>
                <span className="text-text-muted mr-2">
                  {new Date(entry.ts).toLocaleTimeString()}
                </span>
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
