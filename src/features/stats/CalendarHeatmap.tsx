/**
 * CalendarHeatmap.tsx
 *
 * GitHub-style yearly jap calendar heatmap.
 * Shows intensity of jap practice for each day of the year.
 */

import React, { useMemo } from 'react';
import { DailyStats } from '@/types/stats';

interface CalendarHeatmapProps {
  dailyStats: DailyStats[];
  year?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getIntensity(count: number, maxCount: number): number {
  if (count === 0) return 0;
  if (maxCount === 0) return 0;
  const ratio = count / maxCount;
  if (ratio < 0.15) return 1;
  if (ratio < 0.35) return 2;
  if (ratio < 0.6) return 3;
  if (ratio < 0.85) return 4;
  return 5;
}

const INTENSITY_COLORS = [
  'bg-bg-elevated',           // 0 — no activity
  'bg-gold-900/40',           // 1 — very light
  'bg-gold-800/50',           // 2 — light
  'bg-gold-700/70',           // 3 — medium
  'bg-gold-500/85',           // 4 — high
  'bg-gold-400',              // 5 — maximum
];

function getDatesForYear(year: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, 0, 1);
  while (d.getFullYear() === year) {
    dates.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  dailyStats,
  year = new Date().getFullYear(),
}) => {
  const statsMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of dailyStats) m[s.date] = s.count;
    return m;
  }, [dailyStats]);

  const maxCount = useMemo(
    () => Math.max(1, ...dailyStats.map((s) => s.count)),
    [dailyStats],
  );

  const dates = useMemo(() => getDatesForYear(year), [year]);

  // Group into weeks (columns)
  const firstDay = new Date(year, 0, 1).getDay(); // 0=Sun
  const weeks: (string | null)[][] = [];
  let currentWeek: (string | null)[] = Array(firstDay).fill(null);

  for (const date of dates) {
    currentWeek.push(date);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const totalJap = useMemo(() => dailyStats.reduce((s, d) => s + d.count, 0), [dailyStats]);
  const activeDays = dailyStats.filter((d) => d.count > 0).length;

  return (
    <div className="w-full">
      {/* Summary */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">{year} Jap Calendar</span>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{activeDays} active days</span>
          <span>·</span>
          <span>{totalJap.toLocaleString('en-IN')} total</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-0.5" style={{ minWidth: `${weeks.length * 14}px` }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((date, di) => {
                if (!date) {
                  return <div key={di} className="w-3 h-3" />;
                }
                const count = statsMap[date] ?? 0;
                const intensity = getIntensity(count, maxCount);
                const title = count > 0
                  ? `${date}: ${count.toLocaleString('en-IN')} jap`
                  : date;
                return (
                  <div
                    key={di}
                    title={title}
                    className={`w-3 h-3 rounded-sm ${INTENSITY_COLORS[intensity]} transition-colors`}
                    aria-label={title}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Month labels */}
      <div className="flex gap-0.5 mt-1 overflow-x-hidden" style={{ paddingLeft: `${firstDay * 14}px` }}>
        {MONTHS.map((month, idx) => {
          // Approximate column position for each month
          const daysBeforeMonth = new Date(year, idx, 1).getTime() - new Date(year, 0, 1).getTime();
          const daysBefore = Math.floor(daysBeforeMonth / 86400000);
          const weeksBefore = Math.floor((daysBefore + firstDay) / 7);
          return (
            <div
              key={month}
              className="text-xs text-text-muted"
              style={{
                position: 'absolute',
                marginLeft: `${weeksBefore * 14}px`,
                fontSize: '9px',
              }}
            >
              {idx % 2 === 0 ? month : ''}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-text-muted">Less</span>
        {INTENSITY_COLORS.map((color, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${color}`} />
        ))}
        <span className="text-xs text-text-muted">More</span>
      </div>
    </div>
  );
};
