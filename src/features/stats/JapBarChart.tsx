/**
 * JapBarChart.tsx
 *
 * Simple bar chart for weekly/monthly jap counts.
 * Pure CSS bars — no external chart library needed.
 */

import React, { useMemo } from 'react';
import { DailyStats } from '@/types/stats';
import { formatIndianNumber } from '@/utils/normalize';

interface JapBarChartProps {
  dailyStats: DailyStats[];
  days?: number; // 7, 30, 90
  label?: string;
}

function getLast(stats: DailyStats[], count: number): { date: string; jap: number }[] {
  const result: { date: string; jap: number }[] = [];
  const today = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const found = stats.find((s) => s.date === dateStr);
    result.push({ date: dateStr, jap: found?.count ?? 0 });
  }
  return result;
}

function getDayLabel(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  if (days <= 7) {
    // Day abbreviation
    return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
  } else if (days <= 31) {
    return date.getDate().toString();
  } else {
    // Month + day
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }
}

export const JapBarChart: React.FC<JapBarChartProps> = ({
  dailyStats,
  days = 7,
  label,
}) => {
  const data = useMemo(() => getLast(dailyStats, days), [dailyStats, days]);
  const maxJap = useMemo(() => Math.max(1, ...data.map((d) => d.jap)), [data]);
  const totalJap = useMemo(() => data.reduce((s, d) => s + d.jap, 0), [data]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted uppercase tracking-widest">
          {label ?? `Last ${days} Days`}
        </span>
        <span className="text-xs text-text-primary font-medium">
          {formatIndianNumber(totalJap)} total
        </span>
      </div>

      {/* Bars */}
      <div
        className="flex items-end gap-1 h-24"
        role="img"
        aria-label={`Jap bar chart — last ${days} days`}
      >
        {data.map(({ date, jap }) => {
          const heightPct = (jap / maxJap) * 100;
          const isToday = date === today;
          return (
            <div
              key={date}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${date}: ${formatIndianNumber(jap)}`}
            >
              <div className="relative w-full flex items-end" style={{ height: '80px' }}>
                <div
                  className={`w-full rounded-t-sm transition-all duration-500 ${
                    isToday
                      ? 'bg-gold-400'
                      : jap > 0
                      ? 'bg-gold-600/60'
                      : 'bg-bg-elevated'
                  }`}
                  style={{ height: `${Math.max(heightPct, jap > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className={`text-xs ${isToday ? 'text-gold-400' : 'text-text-muted'}`}
                style={{ fontSize: days > 30 ? '8px' : '10px' }}>
                {getDayLabel(date, days)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
