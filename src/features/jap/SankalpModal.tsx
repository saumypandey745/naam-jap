/**
 * SankalpModal.tsx
 *
 * Pre-session sankalp (intention) setting dialog.
 * Shows before a jap session starts when sankalpModeEnabled.
 */

import React, { useState } from 'react';

interface SankalpModalProps {
  mantraName: string;
  onConfirm: (sankalp: string) => void;
  onSkip: () => void;
}

const SANKALP_SUGGESTIONS = [
  'Apne parivaar ki sukh-shanti ke liye',
  'Mokshaprapthi ke liye',
  'Antar shanti aur shaanti ke liye',
  'Bhakti marg mein dridh hone ke liye',
  'Bhagwan ki kripa prapt karne ke liye',
  'Swasthya aur arogya ke liye',
];

export const SankalpModal: React.FC<SankalpModalProps> = ({
  mantraName,
  onConfirm,
  onSkip,
}) => {
  const [sankalp, setSankalp] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (s: string) => {
    setSelected(s);
    setSankalp(s);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="spiritual-card w-full max-w-md p-6 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🪔</div>
          <h2 className="text-text-primary font-semibold text-lg">Sankalp Lo</h2>
          <p className="text-text-muted text-sm mt-1">
            <span className="text-gold-400 font-devanagari">{mantraName}</span> jap shuru karne se pehle apna sankalp nishchit karein
          </p>
        </div>

        {/* Suggestions */}
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Sujhav</p>
          {SANKALP_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSelect(s)}
              className={`text-left text-sm px-3 py-2 rounded-xl border transition-all ${
                selected === s
                  ? 'border-gold-600/60 bg-gold-600/15 text-gold-300'
                  : 'border-bg-elevated text-text-secondary hover:border-gold-800/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <textarea
          className="spiritual-input resize-none w-full mb-4"
          rows={2}
          value={sankalp}
          onChange={(e) => {
            setSankalp(e.target.value);
            setSelected(null);
          }}
          placeholder="Ya apna sankalp likhein..."
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onSkip} className="btn-secondary flex-1 text-sm">
            Baad Mein
          </button>
          <button
            onClick={() => onConfirm(sankalp)}
            className="btn-primary flex-1"
          >
            🙏 Jap Shuru Karein
          </button>
        </div>
      </div>
    </div>
  );
};
