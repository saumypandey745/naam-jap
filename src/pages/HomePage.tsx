/**
 * HomePage.tsx
 *
 * The spiritual landing page — peaceful, elegant, conversion-focused.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, BookOpen, BarChart2, Settings, Flame, Award, Users, Cloud, CloudOff } from 'lucide-react';
import { useAnushthaanStore } from '@/store/anushthaanStore';
import { PRESET_MANTRAS as _PM } from '@/features/mantra/mantraData';
import { useMantraStore } from '@/store/mantraStore';
import { useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/authStore';
import { persistence } from '@/services/persistence/localStorageAdapter';
import { formatIndianNumber, getTodayKey } from '@/utils/normalize';
import { PRESET_MANTRAS, DEITY_SYMBOLS } from '@/features/mantra/mantraData';
import { isFirebaseConfigured } from '@/services/firebase/firebase';

const QUICK_MANTRAS = PRESET_MANTRAS.slice(0, 6);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { selectMantra, selectedMantra } = useMantraStore();
  const { activeSession } = useSessionStore();
  const { activeAnushthaan, loadAnushthaans, getCompletedDays, getStreakDays } = useAnushthaanStore();
  const { user } = useAuthStore();
  const [todayCount, setTodayCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const [syncBannerDismissed, setSyncBannerDismissed] = useState(
    () => localStorage.getItem('sync-banner-dismissed') === '1'
  );
  const firebaseReady = isFirebaseConfigured();
  // Show sync banner only if: firebase configured + not logged in + user has data + not dismissed
  const showSyncBanner = firebaseReady && !user && lifetimeCount > 0 && !syncBannerDismissed;

  const dismissSyncBanner = () => {
    localStorage.setItem('sync-banner-dismissed', '1');
    setSyncBannerDismissed(true);
  };

  useEffect(() => {
    (async () => {
      const [today, streakData, lifetime] = await Promise.all([
        persistence.getDailyStats(getTodayKey()),
        persistence.getStreak(),
        persistence.getLifetimeStats(),
      ]);
      if (today) setTodayCount(today.count);
      if (streakData) setStreak(streakData.current);
      if (lifetime) setLifetimeCount(lifetime.totalCount);
    })();
    loadAnushthaans();
  }, []);

  const handleQuickStart = (mantraId: string) => {
    const mantra = PRESET_MANTRAS.find((m) => m.id === mantraId);
    if (mantra) {
      selectMantra(mantra);
      navigate('/jap');
    }
  };

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-start pt-12 px-5 pb-4">
        {/* Logo / Title */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="text-5xl mb-3" aria-hidden="true">🕉️</div>
          <h1 className="font-devanagari text-3xl text-gold-400 mb-1">
            नाम जप
          </h1>
          <p className="text-text-secondary text-sm max-w-xs mx-auto">
            Voice-based digital jap counter.{' '}
            <span className="text-text-muted">Chant naturally — AI counts.</span>
          </p>
          {/* Sync status chip — shown when logged in */}
          {user && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/30">
              <Cloud size={11} className="text-success" />
              <span className="text-xs text-success">Synced — {user.displayName?.split(' ')[0]}</span>
            </div>
          )}
        </div>

        {/* Stats strip */}
        {(todayCount > 0 || lifetimeCount > 0) && (
          <div className="w-full max-w-sm grid grid-cols-3 gap-3 mb-6 animate-fade-in">
            <div className="spiritual-card p-3 text-center">
              <div className="text-lg font-bold text-text-primary">
                {formatIndianNumber(todayCount)}
              </div>
              <div className="text-xs text-text-muted">Today</div>
            </div>
            <div className="spiritual-card p-3 text-center">
              <div className="text-lg font-bold text-gold-400 flex items-center justify-center gap-1">
                {streak > 0 && <Flame size={14} className="text-orange-400" />}
                {streak}
              </div>
              <div className="text-xs text-text-muted">Day Streak</div>
            </div>
            <div className="spiritual-card p-3 text-center">
              <div className="text-lg font-bold text-text-primary">
                {formatIndianNumber(lifetimeCount)}
              </div>
              <div className="text-xs text-text-muted">Lifetime</div>
            </div>
          </div>
        )}

        {/* ── Cloud Sync Banner ── show when not logged in + has data */}
        {showSyncBanner && (
          <div className="w-full max-w-sm mb-4 animate-slide-up">
            <div className="spiritual-card p-4 border-blue-500/20 bg-blue-500/5 relative">
              {/* Dismiss */}
              <button
                onClick={dismissSyncBanner}
                className="absolute top-2 right-2 text-text-muted hover:text-text-primary p-1"
                aria-label="Dismiss"
              >
                ✕
              </button>
              <div className="flex gap-3">
                <div className="text-2xl flex-shrink-0">☁️</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    Apna jap data save karein
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 mb-3">
                    Google se sign in karein — aapka {formatIndianNumber(lifetimeCount)} jap ka data
                    kabhi bhi, kisi bhi device pe available rahega.
                  </p>
                  <button
                    onClick={() => navigate('/settings')}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    <Cloud size={14} />
                    Cloud Backup Enable Karein
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Continue active session */}
        {activeSession && (
          <div className="w-full max-w-sm mb-4 animate-slide-up">
            <div className="spiritual-card p-4 border-gold-600/30 bg-gradient-gold-soft">
              <p className="text-xs text-text-muted mb-1">Session in progress</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-devanagari text-gold-400 text-lg">
                    {activeSession.mantraId}
                  </span>
                  <div className="text-2xl font-bold text-text-primary">
                    {formatIndianNumber(activeSession.count)}
                  </div>
                </div>
                <button
                  onClick={() => navigate('/jap')}
                  className="btn-primary px-5 py-2 text-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick mantra selection */}
        <div className="w-full max-w-sm mb-5">
          <p className="text-xs text-text-muted mb-3 text-center tracking-widest uppercase">
            Choose Mantra
          </p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_MANTRAS.map((m) => (
              <button
                key={m.id}
                onClick={() => handleQuickStart(m.id)}
                className={`spiritual-card flex flex-col items-center p-3 gap-1.5 transition-all duration-200 ${
                  selectedMantra?.id === m.id ? 'spiritual-card-selected' : ''
                }`}
                aria-label={`Start jap with ${m.displayName}`}
              >
                <span className="text-xl" aria-hidden="true">
                  {DEITY_SYMBOLS[m.id] ?? '🙏'}
                </span>
                <span className="font-devanagari text-sm text-gold-400 leading-tight text-center truncate w-full">
                  {m.displayName}
                </span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => navigate('/select')}
              className="btn-secondary flex-1 text-sm py-2"
            >
              All Mantras
            </button>
            <button
              onClick={() => navigate('/select?custom=1')}
              className="btn-secondary flex-1 text-sm py-2"
            >
              + Custom
            </button>
          </div>
        </div>

        {/* Active Anushthaan Banner */}
        {activeAnushthaan && (
          <div className="w-full max-w-sm mb-4 animate-slide-up">
            <button
              onClick={() => navigate('/anushthaan')}
              className="spiritual-card w-full p-4 text-left"
              aria-label="View active anushthaan"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🪔</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-widest">Active Anushthaan</p>
                  <p className="text-sm font-medium text-text-primary truncate">{activeAnushthaan.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 flex-1 bg-bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold-500 rounded-full"
                        style={{ width: `${Math.min(100,(getCompletedDays(activeAnushthaan)/activeAnushthaan.durationDays)*100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gold-400 flex-shrink-0">
                      {getCompletedDays(activeAnushthaan)}/{activeAnushthaan.durationDays}
                    </span>
                  </div>
                </div>
                <Flame size={16} className="text-orange-400 flex-shrink-0" />
                <span className="text-sm font-bold text-orange-400">{getStreakDays(activeAnushthaan)}</span>
              </div>
            </button>
          </div>
        )}

        {/* Primary CTA + Satsang */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={() => {
              if (selectedMantra) {
                navigate('/jap');
              } else {
                navigate('/select');
              }
            }}
            className="btn-primary w-full text-lg py-4 shadow-glow-gold animate-glow-pulse"
            aria-label="Start jap session"
          >
            <Mic size={20} />
            Start Jap
          </button>
          <button
            onClick={() => navigate('/satsang')}
            className="btn-secondary w-full py-3"
            aria-label="Satsang mode — group jap"
          >
            <Users size={18} />
            Satsang Mode — Milke Jap Karein
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-text-muted text-center mt-4 max-w-xs">
          🔒 Microphone used only during active Jap. Audio is not stored.
        </p>
      </div>

      {/* Bottom navigation */}
      <nav
        className="border-t border-bg-elevated bg-bg-surface/80 backdrop-blur-sm safe-bottom"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around py-2 px-4">
          <button onClick={() => navigate('/')} className="nav-item active" aria-current="page">
            <Mic size={20} />
            <span className="text-xs">Jap</span>
          </button>
          <button onClick={() => navigate('/history')} className="nav-item">
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
