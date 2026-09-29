/**
 * MantraCard.tsx
 *
 * Mantra selection card component.
 */

import React from 'react';
import { Check } from 'lucide-react';
import { MantraConfig } from '@/types/mantra';
import { DEITY_SYMBOLS } from './mantraData';

interface MantraCardProps {
  mantra: MantraConfig;
  isSelected: boolean;
  onSelect: (mantra: MantraConfig) => void;
}

export const MantraCard: React.FC<MantraCardProps> = ({
  mantra,
  isSelected,
  onSelect,
}) => {
  const symbol = DEITY_SYMBOLS[mantra.id] ?? '🙏';

  return (
    <button
      onClick={() => onSelect(mantra)}
      className={`spiritual-card w-full text-left p-4 flex flex-col gap-2 cursor-pointer transition-all duration-200 ${
        isSelected ? 'spiritual-card-selected' : ''
      }`}
      aria-pressed={isSelected}
      aria-label={`Select ${mantra.displayName}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Symbol */}
          <span className="text-2xl" aria-hidden="true">{symbol}</span>
          {/* Display name */}
          <span className="font-devanagari text-lg text-gold-400 leading-tight truncate">
            {mantra.displayName}
          </span>
          {/* Description */}
          {mantra.description && (
            <span className="text-xs text-text-muted leading-tight line-clamp-2">
              {mantra.description}
            </span>
          )}
        </div>
        {/* Check mark */}
        {isSelected && (
          <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-gold-600 flex items-center justify-center" aria-hidden="true">
            <Check size={12} className="text-bg-base" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Language badge */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-text-muted border border-bg-card">
          {mantra.language === 'hi-IN' ? 'Hindi' : mantra.language === 'en-US' ? 'English' : 'Sanskrit'}
        </span>
        {mantra.isCustom && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-900/30 text-gold-400 border border-gold-700/30">
            Custom
          </span>
        )}
      </div>
    </button>
  );
};
