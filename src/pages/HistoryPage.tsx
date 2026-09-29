/**
 * HistoryPage.tsx
 *
 * Session history with session cards, grouping by date, and CSV export.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, BookOpen, BarChart2, Settings, Mic,
  Award, Download, Share2
} from 'lucide-react';
import { JapSession } from '@/types/session';
import { persistence } from '@/services/persistence/localStorageAdapter';
import { formatIndianNumber, formatDuration } from '@/utils/normalize';
import { shareToNative } from '@/utils/shareCard';
import { persistence as store } from '@/services/persistence/localStorageAdapter';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByDate(sessions: JapSession[]): Map<string, JapSession[]> {
  const map = new Map<string, JapSession[]>();
  for (const s of sessions) {
    const dateKey = new Date(s.startedAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    const existing = map.get(dateKey) ?? [];
    existing.push(s);
    map.set(dateKey, existing);
  }
  return map;
}

function exportCSV(sessions: JapSession[]): void {
  const headers = ['Date', 'Time', 'Mantra', 'Count', 'Malas', 'Duration (s)', 'Mode'];
  const rows = sessions.map((s) => [
    new Date(s.startedAt).toLocaleDateString('en-IN'),
    new Date(s.startedAt).toLocaleTimeString('en-IN'),
    s.mantraDisplayName || s.mantraId,
    String(s.count + s.correctionOffset),
    String(s.malaCount),
    String(s.duration ?? 0),
    s.mode,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `naam-jap-history-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Session Card ───────────────────────────────────────────────────

const SessionCard: React.FC<{ session: JapSession }> = ({ session }) => {
  const duration = session.duration ?? 0;
  const finalCount = session.count + session.correctionOffset;

  const handleShare = async () => {
    await shareToNative({
      mantraName: session.mantraDisplayName || session.mantraId,
      count: finalCount,
      malaCount: session.malaCount,
      date: new Date(session.startedAt).toLocaleDateString('hi-IN'),
    });
  };

  return (
    <div className="spiritual-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-devanagari text-gold-400 text-base leading-tight">
            {session.mantraDisplayName || session.mantraId}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {formatTime(session.startedAt)}
            {duration > 0 && ` · ${formatDuration(duration)}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            session.mode === 'voice'
              ? 'text-success border-success/30 bg-success/10'
              : 'text-text-muted border-text-muted/20'
          }`}>
            {session.mode === 'voice' ? '🎙 Voice' : '✋ Manual'}
          </span>
          <button
            onClick={handleShare}
            className="btn-ghost p-1.5"
            aria-label="Share this session"
          >
            <Share2 size={14} className="text-text-muted" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-bg-elevated">
        <div className="text-center">
          <div className="text-lg font-bold text-text-primary">
            {formatIndianNumber(finalCount)}
          </div>
          <div className="text-xs text-text-muted">Jap</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gold-400">
            {session.malaCount}
          </div>
          <div className="text-xs text-text-muted">Malas</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-text-primary">
            {formatDuration(duration)}
          </div>
          <div className="text-xs text-text-muted">Duration</div>
        </div>
      </div>
    </div>
  );
};

// ─── Date Group ───────────────────────────────────────────────────

const DateGroup: React.FC<{ date: string; sessions: JapSession[] }> = ({ date, sessions }) => {
  const dayTotal = sessions.reduce((s, sess) => s + sess.count + sess.correctionOffset, 0);
  const dayMalas = sessions.reduce((s, sess) => s + sess.malaCount, 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted uppercase tracking-widest">{date}</span>
        <span className="text-xs text-gold-400">
          {formatIndianNumber(dayTotal)} jap · {dayMalas} mala
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {sessions.map((s) => <SessionCard key={s.id} session={s} />)}
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<JapSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    persistence.getSessions(200).then((data) => {
      setSessions(data);
      setIsLoading(false);
    });
  }, []);

  const grouped = useMemo(() => groupByDate(sessions), [sessions]);

  const handleExportCSV = useCallback(() => {
    exportCSV(sessions);
  }, [sessions]);

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col">
      <header className="px-4 pt-safe-top safe-top pb-3 border-b border-bg-elevated sticky top-0 bg-bg-base/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2" aria-label="Go back">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Jap History</h1>
          {sessions.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="ml-auto btn-ghost flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
              title="Export as CSV"
              aria-label="Export sessions as CSV"
            >
              <Download size={16} />
              <span className="hidden sm:inline">CSV Export</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center gap-4">
            <div className="text-5xl">🙏</div>
            <p className="text-text-muted">Abhi tak koi session nahi.</p>
            <p className="text-text-muted text-sm">Pehla jap karein, phir history yahan aayegi.</p>
            <button onClick={() => navigate('/')} className="btn-primary mt-2">
              Start Jap
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="spiritual-card p-3 text-center">
                <div className="text-xl font-bold text-text-primary">
                  {formatIndianNumber(sessions.reduce((s, sess) => s + sess.count + sess.correctionOffset, 0))}
                </div>
                <div className="text-xs text-text-muted">Total Jap</div>
              </div>
              <div className="spiritual-card p-3 text-center">
                <div className="text-xl font-bold text-gold-400">
                  {sessions.reduce((s, sess) => s + sess.malaCount, 0)}
                </div>
                <div className="text-xs text-text-muted">Total Mala</div>
              </div>
              <div className="spiritual-card p-3 text-center">
                <div className="text-xl font-bold text-text-primary">{sessions.length}</div>
                <div className="text-xs text-text-muted">Sessions</div>
              </div>
            </div>

            {/* Grouped list */}
            {Array.from(grouped.entries()).map(([date, daySessions]) => (
              <DateGroup key={date} date={date} sessions={daySessions} />
            ))}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-bg-elevated bg-bg-surface/80 backdrop-blur-sm safe-bottom" aria-label="Main navigation">
        <div className="flex items-center justify-around py-2 px-4">
          <button onClick={() => navigate('/')} className="nav-item">
            <Mic size={20} />
            <span className="text-xs">Jap</span>
          </button>
          <button onClick={() => navigate('/history')} className="nav-item active" aria-current="page">
            <BookOpen size={20} />
            <span className="text-xs">History</span>
          </button>
          <button onClick={() => navigate('/stats')} className="nav-item">
            <BarChart2 size={20} />
            <span className="text-xs">Stats</span>
          </button>
          <button onClick={() => navigate('/anushthaan')} className="nav-item">
            <Award size={20} />
            <span className="text-xs">Anushthaan</span>
          </button>
          <button onClick={() => navigate('/settings')} className="nav-item">
            <Settings size={20} />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
