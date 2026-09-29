/**
 * AnushthaanPage.tsx
 *
 * 40/108 day Jap challenge tracker.
 * Features:
 * - Create new anushthaan with sankalp
 * - Visual calendar grid showing daily completion
 * - Progress bar and streak
 * - Daily jap counter integration
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Plus, Flame, Calendar, Target,
  CheckCircle2, Circle, Award, Mic, BookOpen, BarChart2, Settings
} from 'lucide-react';
import { useAnushthaanStore } from '@/store/anushthaanStore';
import { useMantraStore } from '@/store/mantraStore';
import { PRESET_MANTRAS } from '@/features/mantra/mantraData';
import { Anushthaan } from '@/types/stats';
import { formatIndianNumber } from '@/utils/normalize';

// ─── Create Anushthaan Modal ──────────────────────────────────────

const CreateModal: React.FC<{
  onSave: (params: {
    name: string;
    mantraId: string;
    mantraDisplayName: string;
    durationDays: number;
    dailyTarget: number;
    sankalp: string;
  }) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('Naam Jap Anushthaan');
  const [mantraId, setMantraId] = useState('ram');
  const [duration, setDuration] = useState(40);
  const [dailyTarget, setDailyTarget] = useState(108);
  const [sankalp, setSankalp] = useState('');

  const selectedMantra = PRESET_MANTRAS.find((m) => m.id === mantraId);

  const handleSave = () => {
    if (!selectedMantra) return;
    onSave({
      name,
      mantraId,
      mantraDisplayName: selectedMantra.displayName,
      durationDays: duration,
      dailyTarget,
      sankalp,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="spiritual-card w-full max-w-md p-6 max-h-[85vh] overflow-y-auto animate-slide-up">
        <h2 className="text-lg font-semibold text-text-primary mb-5">Naya Anushthaan</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Naam</label>
            <input className="spiritual-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Mantra</label>
            <select className="spiritual-input" value={mantraId} onChange={(e) => setMantraId(e.target.value)}>
              {PRESET_MANTRAS.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">Kitne Din?</label>
            <div className="grid grid-cols-3 gap-2">
              {[40, 108, 21].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                    duration === d
                      ? 'border-gold-600 bg-gold-600/20 text-gold-400'
                      : 'border-bg-elevated text-text-muted'
                  }`}
                >
                  {d} Din
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Daily Lakshya (Min Jap)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[108, 216, 324, 1008].map((t) => (
                <button
                  key={t}
                  onClick={() => setDailyTarget(t)}
                  className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                    dailyTarget === t
                      ? 'border-gold-600 bg-gold-600/20 text-gold-400'
                      : 'border-bg-elevated text-text-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="number"
              className="spiritual-input mt-2"
              value={dailyTarget}
              onChange={(e) => setDailyTarget(Math.max(1, parseInt(e.target.value) || 108))}
              placeholder="Ya custom likhein..."
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Sankalp (optional)
            </label>
            <textarea
              className="spiritual-input resize-none"
              rows={3}
              value={sankalp}
              onChange={(e) => setSankalp(e.target.value)}
              placeholder="Main yeh anushthaan... ke liye kar raha/rahi hoon"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button onClick={onCancel} className="btn-secondary flex-1">Radd Karo</button>
            <button onClick={handleSave} className="btn-primary flex-1">Shuru Karo</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Anushthaan Card ─────────────────────────────────────────────

const AnushthaanCard: React.FC<{ anushthaan: Anushthaan }> = ({ anushthaan }) => {
  const { getProgressPercent, getCompletedDays, getStreakDays } = useAnushthaanStore();
  const progress = getProgressPercent(anushthaan);
  const completed = getCompletedDays(anushthaan);
  const streak = getStreakDays(anushthaan);

  // Build day grid
  const days = Array.from({ length: anushthaan.durationDays }, (_, i) => {
    const dayRecord = anushthaan.days[i];
    if (!dayRecord) return 'future';
    if (dayRecord.completed) return 'done';
    if (dayRecord.skipped) return 'skip';
    return 'partial';
  });

  const dayCount = Math.min(anushthaan.durationDays, 40);

  return (
    <div className="spiritual-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-text-primary font-semibold">{anushthaan.name}</h3>
          <p className="text-gold-400 font-devanagari text-lg">
            {PRESET_MANTRAS.find((m) => m.id === anushthaan.mantraId)?.displayName ?? anushthaan.mantraId}
          </p>
        </div>
        {anushthaan.active ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
            Active
          </span>
        ) : anushthaan.completedAt ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-600/20 text-gold-400 border border-gold-600/30">
            ✅ Siddh
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-text-muted border border-bg-card">
            Radd
          </span>
        )}
      </div>

      {/* Day mini-grid */}
      <div className="flex flex-wrap gap-1 mb-3">
        {days.slice(0, dayCount).map((status, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-sm ${
              status === 'done' ? 'bg-gold-500' :
              status === 'partial' ? 'bg-gold-700/50' :
              status === 'skip' ? 'bg-error/40' :
              'bg-bg-elevated'
            }`}
            title={`Din ${i + 1}`}
          />
        ))}
        {anushthaan.durationDays > dayCount && (
          <span className="text-xs text-text-muted self-center">
            +{anushthaan.durationDays - dayCount}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track mb-2">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-base font-bold text-text-primary">{completed}</div>
          <div className="text-xs text-text-muted">Purey Din</div>
        </div>
        <div>
          <div className="text-base font-bold text-gold-400">{anushthaan.durationDays - completed}</div>
          <div className="text-xs text-text-muted">Bache Din</div>
        </div>
        <div>
          <div className="text-base font-bold text-orange-400 flex items-center justify-center gap-0.5">
            <Flame size={13} />
            {streak}
          </div>
          <div className="text-xs text-text-muted">Streak</div>
        </div>
      </div>

      {/* Sankalp */}
      {anushthaan.sankalp && (
        <p className="text-xs text-text-muted mt-3 italic border-t border-bg-elevated pt-2">
          "{anushthaan.sankalp}"
        </p>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────

export const AnushthaanPage: React.FC = () => {
  const navigate = useNavigate();
  const { anushthaans, loadAnushthaans, createAnushthaan } = useAnushthaanStore();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadAnushthaans(); }, []);

  const active = anushthaans.filter((a) => a.active);
  const past = anushthaans.filter((a) => !a.active);

  const handleCreate = async (params: Parameters<typeof createAnushthaan>[0]) => {
    await createAnushthaan(params);
    setShowCreate(false);
  };

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col">
      <header className="px-4 pt-safe-top safe-top pb-3 border-b border-bg-elevated">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2" aria-label="Go back">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Anushthaan</h1>
          <span className="text-xs text-text-muted ml-auto">40/108 Din Challenge</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          {/* Info banner */}
          {anushthaans.length === 0 && (
            <div className="spiritual-card p-5 text-center animate-fade-in">
              <div className="text-4xl mb-3">🪔</div>
              <h2 className="text-text-primary font-semibold mb-2">Apna Anushthaan Shuru Karein</h2>
              <p className="text-text-secondary text-sm mb-4">
                40 ya 108 din tak har roz ek fixed target jap karein.
                Sankalp lo, lakshya rakhho, aur apni sadhna mein niyamitata laao.
              </p>
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus size={18} /> Naya Anushthaan
              </button>
            </div>
          )}

          {/* Active anushthaans */}
          {active.length > 0 && (
            <div>
              <h2 className="text-xs text-text-muted uppercase tracking-widest mb-2">Chal Raha Hai</h2>
              {active.map((a) => <AnushthaanCard key={a.id} anushthaan={a} />)}
            </div>
          )}

          {/* Past anushthaans */}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs text-text-muted uppercase tracking-widest mb-2">Purana</h2>
              {past.map((a) => <AnushthaanCard key={a.id} anushthaan={a} />)}
            </div>
          )}
        </div>
      </main>

      {/* FAB */}
      {anushthaans.length > 0 && (
        <div className="fixed bottom-20 right-4">
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary w-14 h-14 rounded-full shadow-glow-gold"
            aria-label="New anushthaan"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {showCreate && (
        <CreateModal onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      )}

      {/* Bottom nav */}
      <nav className="border-t border-bg-elevated bg-bg-surface/80 backdrop-blur-sm safe-bottom" aria-label="Main navigation">
        <div className="flex items-center justify-around py-2 px-4">
          <button onClick={() => navigate('/')} className="nav-item"><Mic size={20} /><span className="text-xs">Jap</span></button>
          <button onClick={() => navigate('/history')} className="nav-item"><BookOpen size={20} /><span className="text-xs">History</span></button>
          <button onClick={() => navigate('/stats')} className="nav-item"><BarChart2 size={20} /><span className="text-xs">Stats</span></button>
          <button onClick={() => navigate('/anushthaan')} className="nav-item active" aria-current="page"><Award size={20} /><span className="text-xs">Anushthaan</span></button>
          <button onClick={() => navigate('/settings')} className="nav-item"><Settings size={20} /><span className="text-xs">Settings</span></button>
        </div>
      </nav>
    </div>
  );
};
