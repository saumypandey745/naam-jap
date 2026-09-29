/**
 * MalaRing.tsx
 *
 * Visual mala ring showing progress toward 108 jap.
 * Uses SVG circles for the 108 beads.
 */

import React from 'react';

interface MalaRingProps {
  progress: number; // 0-107 (currentMalaProgress)
  malaCount: number;
  size?: number;
}

export const MalaRing: React.FC<MalaRingProps> = ({
  progress,
  malaCount,
  size = 80,
}) => {
  const total = 108;
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (progress / total) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-1" role="progressbar" aria-valuenow={progress} aria-valuemax={108} aria-label={`Mala progress: ${progress} of 108`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(201, 132, 42, 0.12)"
          strokeWidth="4"
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="url(#malaGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          strokeDashoffset="0"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="malaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9842A" />
            <stop offset="100%" stopColor="#E8A94A" />
          </linearGradient>
        </defs>
        {/* Center text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill="#E8A94A"
          fontSize="11"
          fontWeight="600"
          fontFamily="Inter, sans-serif"
        >
          {progress}
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fill="rgba(197, 186, 168, 0.6)"
          fontSize="8"
          fontFamily="Inter, sans-serif"
        >
          /108
        </text>
      </svg>
      {malaCount > 0 && (
        <span className="text-xs text-gold-500 font-medium">
          {malaCount} Mala{malaCount > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};
