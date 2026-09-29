/**
 * HistoryPage.tsx
 *
 * Session history with session cards, grouping by date, CSV export,
 * individual session delete, and clear-all history.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, BookOpen, BarChart2, Settings, Mic,
  Award, Download, Share2, Trash2, X, AlertTriangle
} from 'lucide-react';
import { JapSession } from '@/types/session';
import { persistence } from '@/services/persistence/localStorageAdapter';
import { formatIndianNumber, formatDuration } from '@/utils/normalize';
import { shareToNative } from '@/utils/shareCard';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
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

const SessionCard: React.FC<{
  session: JapSession;
  onDelete: (id: string) => void;
}> = ({ session, onDelete }) => {
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
    <div className="spiritual-card p-4 relative group">
      {/* Delete button — visible on hover/tap */}
      <button
        onClick={() => onDelete(session.id)}
        className="absolute top-2 right-2 btn-ghost p-1.5 text-text-muted hover:text-error opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        aria-label={`Delete session`}
      >
        <Trash2 size={14} />
      </button>

      <div className="flex items-start justify-between gap-3 pr-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-devanagari text-gold-400 text-base truncate">
              {session.mantraDisplayName || session.mantraId}
            </span>
            {session.mode === 'voice' && (
              <span className="text-xs bg-gold-800/30 text-gold-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                🎤 Voice
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">
            {formatTime(session.startedAt)}
            {duration > 0 && ` · ${formatDuration(duration)}`}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xl font-bold text-text-primary">
            {formatIndianNumber(finalCount)}
          </div>
          <div className="text-xs text-text-muted">
            {session.malaCount > 0 ? `${session.malaCount} mala` : 'jap'}
          </div>
        </div>
      </div>

      {/* Share button */}
      <div className="mt-3 pt-3 border-t border-bg-elevated flex justify-end">
        <button
          onClick={handleShare}
          className="btn-ghost flex items-center gap-1 text-xs text-text-muted hover:text-gold-400"
        >
          <Share2 size={12} /> Share
        </button>
      </div>
    </div>
  );
};

// ─── Date Group ─────────────────────────────────────────────────────

const DateGroup: React.FC<{
  date: string;
  sessions: JapSession[];
  onDeleteSession: (id: string) => void;
}> = ({ date, sessions, onDeleteSession }) => {
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
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} onDelete={onDeleteSession} />
        ))}
      </div>
    </div>
  );
};

// ─── Confirm Dialog ─────────────────────────────────────────────────

const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="spiritual-card p-6 max-w-sm w-full animate-scale-in">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={18} className="text-error" />
        </div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      </div>
      <p className="text-sm text-text-secondary mb-5 leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-error/80 text-white hover:bg-error transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<JapSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showClearAll, setShowClearAll] = useState(false);

  const loadSessions = useCallback(async () => {
    const data = await persistence.getSessions(200);
    setSessions(data);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const grouped = useMemo(() => groupByDate(sessions), [sessions]);

  const handleExportCSV = useCallback(() => exportCSV(sessions), [sessions]);

  const handleDeleteSession = async (id: string) => {
    await persistence.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleteTargetId(null);
  };

  const handleClearAll = async () => {
    await persistence.clearAllSessions();
    setSessions([]);
    setShowClearAll(false);
  };

  const deleteTarget = sessions.find((s) => s.id === deleteTargetId);

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col">
      <header className="px-4 pt-safe-top safe-top pb-3 border-b border-bg-elevated sticky top-0 bg-bg-base/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2" aria-label="Go back">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Jap History</h1>

          {sessions.length > 0 && (
            <div className="ml-auto flex items-center gap-1">
              {/* CSV Export */}
              <button
                onClick={handleExportCSV}
                className="btn-ghost p-2 text-text-muted hover:text-text-primary"
                title="Export CSV"
                aria-label="Export as CSV"
              >
                <Download size={17} />
              </button>
              {/* Clear All */}
              <button
                onClick={() => setShowClearAll(true)}
                className="btn-ghost p-2 text-text-muted hover:text-error"
                title="Clear all history"
                aria-label="Clear all history"
              >
                <Trash2 size={17} />
              </button>
            </div>
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

            {/* Tip */}
            <p className="text-xs text-text-muted text-center -mt-2">
              Session card pe hover/tap karein → delete karne ke liye 🗑️
            </p>

            {/* Grouped list */}
            {Array.from(grouped.entries()).map(([date, daySessions]) => (
              <DateGroup
                key={date}
                date={date}
                sessions={daySessions}
                onDeleteSession={(id) => setDeleteTargetId(id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-bg-elevated bg-bg-surface/80 backdrop-blur-sm safe-bottom" aria-label="Main navigation">
        <div className="flex items-center justify-around py-2 px-4">
          <button onClick={() => navigate('/')} className="nav-item">
            <Mic size={20} /><span className="text-xs">Jap</span>
          </button>
          <button onClick={() => navigate('/history')} className="nav-item active" aria-current="page">
            <BookOpen size={20} /><span className="text-xs">History</span>
          </button>
          <button onClick={() => navigate('/stats')} className="nav-item">
            <BarChart2 size={20} /><span className="text-xs">Stats</span>
          </button>
          <button onClick={() => navigate('/anushthaan')} className="nav-item">
            <Award size={20} /><span className="text-xs">Anushthaan</span>
          </button>
          <button onClick={() => navigate('/settings')} className="nav-item">
            <Settings size={20} /><span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>

      {/* Delete single session confirm */}
      {deleteTargetId && deleteTarget && (
        <ConfirmDialog
          title="Session delete karein?"
          message={`"${deleteTarget.mantraDisplayName || deleteTarget.mantraId}" ka ${formatIndianNumber(deleteTarget.count + deleteTarget.correctionOffset)} jap ka record hamesha ke liye hata jaayega.`}
          confirmLabel="Delete"
          onConfirm={() => handleDeleteSession(deleteTargetId)}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}

      {/* Clear all confirm */}
      {showClearAll && (
        <ConfirmDialog
          title="Poori history clear karein?"
          message={`Aapke saare ${sessions.length} sessions hamesha ke liye delete ho jaayenge. Yeh action undo nahi ho sakta.`}
          confirmLabel="Sab Delete Karein"
          onConfirm={handleClearAll}
          onCancel={() => setShowClearAll(false)}
        />
      )}
    </div>
  );
};
