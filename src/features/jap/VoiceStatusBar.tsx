/**
 * VoiceStatusBar.tsx
 *
 * Shows the current microphone/recognition state clearly.
 * Never shows error messages for every rejected word.
 */

import React from 'react';
import { Mic, MicOff, Loader2, PauseCircle, AlertCircle, WifiOff } from 'lucide-react';
import { VoiceState } from '@/types/voice';

interface VoiceStatusBarProps {
  voiceState: VoiceState;
  interimTranscript: string;
  lastDetectedCount?: number;
  errorMessage?: string;
  isSupported: boolean;
}

interface StatusConfig {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  className: string;
  dotClass?: string;
}

export const VoiceStatusBar: React.FC<VoiceStatusBarProps> = ({
  voiceState,
  interimTranscript,
  lastDetectedCount,
  errorMessage,
  isSupported,
}) => {
  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-elevated border border-red-500/20">
        <WifiOff size={14} className="text-error" />
        <span className="text-sm text-error">Voice recognition not supported</span>
      </div>
    );
  }

  const statusMap: Record<VoiceState, StatusConfig> = {
    idle: {
      icon: <MicOff size={14} className="text-text-muted" />,
      label: 'Tap to start',
      className: 'text-text-muted border-text-muted/20',
    },
    'requesting-permission': {
      icon: <Loader2 size={14} className="text-gold-500 animate-spin" />,
      label: 'Requesting microphone...',
      className: 'text-gold-500 border-gold-500/30',
    },
    listening: {
      icon: <span className="voice-listening-dot" aria-hidden="true" />,
      label: interimTranscript ? interimTranscript.slice(0, 30) + (interimTranscript.length > 30 ? '…' : '') : 'Listening...',
      className: 'text-success border-success/30',
    },
    processing: {
      icon: <Loader2 size={14} className="text-gold-500 animate-spin" />,
      label: 'Processing...',
      className: 'text-gold-500 border-gold-500/30',
    },
    paused: {
      icon: <PauseCircle size={14} className="text-text-secondary" />,
      label: 'Paused',
      className: 'text-text-secondary border-text-secondary/20',
    },
    denied: {
      icon: <MicOff size={14} className="text-error" />,
      label: 'Microphone access denied',
      className: 'text-error border-error/30',
    },
    unsupported: {
      icon: <MicOff size={14} className="text-text-muted" />,
      label: 'Voice unavailable',
      className: 'text-text-muted border-text-muted/20',
    },
    error: {
      icon: <AlertCircle size={14} className="text-error" />,
      label: errorMessage || 'Recognition error',
      className: 'text-error border-error/30',
    },
  };

  const config = statusMap[voiceState];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full bg-bg-elevated border ${config.className}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {config.icon}
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    </div>
  );
};

/**
 * JapDetectedToast
 * Brief floating notification shown when jap is detected.
 */
interface JapDetectedToastProps {
  count: number;
  visible: boolean;
}

export const JapDetectedToast: React.FC<JapDetectedToastProps> = ({
  count,
  visible,
}) => {
  if (!visible) return null;

  return (
    <div
      className="jap-toast absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 flex items-center gap-1 px-3 py-1 rounded-full bg-success/20 border border-success/40"
      aria-live="assertive"
    >
      <span className="text-success text-sm font-semibold">+{count}</span>
    </div>
  );
};
