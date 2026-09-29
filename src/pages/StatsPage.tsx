/**
 * StatsPage.tsx — Full Stats Dashboard
 *
 * Features:
 * - Today/Week/Month/Lifetime stats cards
 * - Daily jap bar chart (7/30/90 day)
 * - Calendar heatmap
 * - Per-mantra breakdown
 * - Personal records
 * - Day streak with streak shield
 * - Achievements gallery
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Mic, BookOpen, BarChart2, Settings, Award,
  Flame, Trophy, Star, Calendar, TrendingUp
} from 'lucide-react';
import { persistence } from '@/services/persistence/localStorageAdapter';
import { DailyStats, LifetimeStats, Streak, ACHIEVEMENTS } from '@/types/stats';
import { formatIndianNumber, formatDuration, getTodayKey } from '@/utils/normalize';
import { CalendarHeatmap } from '@/features/stats/CalendarHeatmap';
import { JapBarChart } from '@/features/stats/JapBarChart';
import { PRESET_MANTRAS } from '@/features/mantra/mantraData';
import { getTithiInfo, getVaarInfo, getVisheshDivas } from '@/utils/tithi';
import { useMantraStore } from '@/store/mantraStore';

type ChartRange = 7 | 30 | 90;

export const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedMantra } = useMantraStore();

  const [lifetime, setLifetime] = useState<LifetimeStats | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [today, setToday] = useState<DailyStats | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>(7);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tithi = getTithiInfo();
  const vaar = getVaarInfo();
  const vishesh = getVisheshDivas();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [lt, st, todayStats] = await Promise.all([
          persistence.getLifetimeStats(),
          persistence.getStreak(),
          persistence.getDailyStats(getTodayKey()),
        ]);
        setLifetime(lt);
        setStreak(st);
        setToday(todayStats);

        // Load 1 year of daily stats for heatmap
        const endDate = getTodayKey();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        const statsRange = await persistence.getDailyStatsRange(
          startDate.toISOString().slice(0, 10),
          endDate,
        );
        setDailyStats(statsRange);

        const unlocked = await persistence.getUnlockedAchievements?.() ?? [];
        setUnlockedAchievements(unlocked.map((a) => a.id));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Per-mantra breakdown
  const mantraBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const s of dailyStats) {
      for (const [id, count] of Object.entries(s.mantras)) {
        totals[id] = (totals[id] ?? 0) + count;
      }
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [dailyStats]);

  const totalYearJap = useMemo(
    () => dailyStats.reduce((s, d) => s + d.count, 0),
    [dailyStats],
  );

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-spiritual flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayCount = today?.count ?? 0;
  const todayMalas = today?.malaCount ?? 0;
  const weekStats = dailyStats.filter((s) => {
    const d = new Date(s.date);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 86400000;
    return diff <= 7;
  });
  const weekCount = weekStats.reduce((s, d) => s + d.count, 0);

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col">
      <header className="px-4 pt-safe-top safe-top pb-3 border-b border-bg-elevated sticky top-0 bg-bg-base/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-2 -ml-2">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Stats</h1>
          <span className="ml-auto text-xs text-text-muted">Aapki Sadhna</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">

          {/* Tithi Display */}
          <div className="spiritual-card p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Calendar size={13} className="text-gold-400" />
                <span className="text-xs text-gold-400">
                  {vaar.hindi} · {tithi.tithiHindi}
                </span>
              </div>
              {vishesh && (
                <p className="text-xs text-text-secondary">{vishesh}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">{tithi.paksha}</p>
            </div>
          </div>

          {/* Streak Banner */}
          {streak && streak.current > 0 && (
            <div className="spiritual-card p-4 bg-gradient-to-r from-orange-900/30 to-bg-elevated flex items-center gap-4">
              <div className="text-4xl">🔥</div>
              <div className="flex-1">
                <p className="text-text-primary font-bold text-xl">{streak.current} Din Streak!</p>
                <p className="text-text-muted text-xs">
                  Best: {streak.longest} din · Lagaataar jap ka silsila jaari hai
                </p>
              </div>
              {streak.shieldAvailable && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-600/30">
                  🛡️ Shield
                </span>
              )}
            </div>
          )}

          {/* Today / Week / Lifetime Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="spiritual-card p-3 text-center">
              <p className="text-xs text-text-muted mb-1">Aaj</p>
              <p className="text-xl font-bold text-text-primary">{formatIndianNumber(todayCount)}</p>
              <p className="text-xs text-gold-400">{todayMalas} Mala</p>
            </div>
            <div className="spiritual-card p-3 text-center">
              <p className="text-xs text-text-muted mb-1">Iss Hafte</p>
              <p className="text-xl font-bold text-text-primary">{formatIndianNumber(weekCount)}</p>
              <p className="text-xs text-text-muted">{weekStats.length} din active</p>
            </div>
            <div className="spiritual-card p-3 text-center">
              <p className="text-xs text-text-muted mb-1">Sab</p>
              <p className="text-xl font-bold text-gold-400">{formatIndianNumber(lifetime?.totalCount ?? 0)}</p>
              <p className="text-xs text-text-muted">{lifetime?.totalMalaCount ?? 0} Mala</p>
            </div>
          </div>

          {/* Lifetime detail */}
          <div className="spiritual-card p-4">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-3">Lifetime</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <Trophy size={16} className="text-gold-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">{formatIndianNumber(lifetime?.totalCount ?? 0)}</p>
                  <p className="text-xs text-text-muted">Total Jap</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base flex-shrink-0">📿</span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{lifetime?.totalMalaCount ?? 0}</p>
                  <p className="text-xs text-text-muted">Total Mala</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base flex-shrink-0">⏱️</span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{formatDuration(lifetime?.totalDuration ?? 0)}</p>
                  <p className="text-xs text-text-muted">Jap Samay</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Star size={16} className="text-gold-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-text-primary">{lifetime?.totalSessions ?? 0}</p>
                  <p className="text-xs text-text-muted">Sessions</p>
                </div>
              </div>
              {lifetime?.bestDayCount && (
                <div className="flex items-center gap-3">
                  <TrendingUp size={16} className="text-success flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{formatIndianNumber(lifetime.bestDayCount)}</p>
                    <p className="text-xs text-text-muted">Best Din</p>
                  </div>
                </div>
              )}
              {totalYearJap > 0 && (
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-indigo-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{formatIndianNumber(totalYearJap)}</p>
                    <p className="text-xs text-text-muted">Is Saal</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="spiritual-card p-4">
            {/* Range selector */}
            <div className="flex gap-2 mb-4">
              {([7, 30, 90] as ChartRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    chartRange === r
                      ? 'border-gold-600/60 bg-gold-600/20 text-gold-400'
                      : 'border-bg-elevated text-text-muted'
                  }`}
                >
                  {r} Din
                </button>
              ))}
            </div>
            <JapBarChart dailyStats={dailyStats} days={chartRange} />
          </div>

          {/* Per-Mantra Breakdown */}
          {mantraBreakdown.length > 0 && (
            <div className="spiritual-card p-4">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-3">Mantra Breakdown</p>
              {(() => {
                const maxCount = Math.max(...mantraBreakdown.map(([, c]) => c));
                return mantraBreakdown.map(([id, count]) => {
                  const mantra = PRESET_MANTRAS.find((m) => m.id === id);
                  const pct = (count / maxCount) * 100;
                  return (
                    <div key={id} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-devanagari text-text-primary">
                          {mantra?.displayName ?? id}
                        </span>
                        <span className="text-xs text-gold-400">{formatIndianNumber(count)}</span>
                      </div>
                      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold-500/70 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Calendar Heatmap */}
          <div className="spiritual-card p-4">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
              <Calendar size={11} className="inline mr-1" />
              Jap Calendar
            </p>
            <CalendarHeatmap dailyStats={dailyStats} />
          </div>

          {/* Achievements */}
          <div className="spiritual-card p-4">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-3">
              <Award size={11} className="inline mr-1" />
              Achievements
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = unlockedAchievements.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl border transition-all ${
                      unlocked
                        ? 'border-gold-600/40 bg-gold-600/10'
                        : 'border-bg-elevated bg-bg-elevated/30 opacity-50'
                    }`}
                  >
                    <div className={`text-2xl mb-1 ${!unlocked ? 'grayscale' : ''}`}>{a.icon}</div>
                    <p className={`text-xs font-medium ${unlocked ? 'text-gold-300' : 'text-text-muted'}`}>
                      {a.title}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">{a.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-bg-elevated bg-bg-surface/80 backdrop-blur-sm safe-bottom">
        <div className="flex items-center justify-around py-2 px-4">
          <button onClick={() => navigate('/')} className="nav-item"><Mic size={20} /><span className="text-xs">Jap</span></button>
          <button onClick={() => navigate('/history')} className="nav-item"><BookOpen size={20} /><span className="text-xs">History</span></button>
          <button onClick={() => navigate('/stats')} className="nav-item active" aria-current="page"><BarChart2 size={20} /><span className="text-xs">Stats</span></button>
          <button onClick={() => navigate('/anushthaan')} className="nav-item"><Award size={20} /><span className="text-xs">Anushthaan</span></button>
          <button onClick={() => navigate('/settings')} className="nav-item"><Settings size={20} /><span className="text-xs">Settings</span></button>
        </div>
      </nav>
    </div>
  );
};
