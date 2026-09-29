/**
 * MantraSelectPage.tsx
 *
 * Full mantra selection screen with search, presets, custom creation,
 * and meaning panel (tap → see meaning → Start Jap).
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Search, Plus, Trash2, X, BookOpen,
  Clock, Star, Mic
} from 'lucide-react';
import { useMantraStore } from '@/store/mantraStore';
import { MantraCard } from '@/features/mantra/MantraCard';
import { PRESET_MANTRAS, DEITY_SYMBOLS } from '@/features/mantra/mantraData';
import { MantraConfig, SupportedLanguage, CustomMantraInput } from '@/types/mantra';
import { normalizeText } from '@/utils/normalize';

// ─── Meaning Drawer ───────────────────────────────────────────────

const MeaningDrawer: React.FC<{
  mantra: MantraConfig;
  onStart: () => void;
  onClose: () => void;
}> = ({ mantra, onStart, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="spiritual-card w-full max-w-lg rounded-b-none rounded-t-3xl p-6 animate-slide-up max-h-[82vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <span className="text-3xl">{DEITY_SYMBOLS[mantra.id] ?? '🙏'}</span>
          <h2 className="font-devanagari text-2xl text-gold-400 mt-1">{mantra.displayName}</h2>
          {mantra.deity && <p className="text-xs text-text-muted mt-0.5">{mantra.deity}</p>}
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {/* Meaning */}
      {mantra.meaning && (
        <div className="flex flex-col gap-4 mb-5">
          {mantra.meaning.shortMeaning && (
            <div className="bg-bg-elevated/60 rounded-xl p-4 border border-gold-800/30">
              <p className="text-xs text-gold-400/70 uppercase tracking-widest mb-1">Arth (Meaning)</p>
              <p className="text-text-secondary text-sm leading-relaxed">{mantra.meaning.shortMeaning}</p>
            </div>
          )}
          {mantra.meaning.mahatmya && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Star size={10} /> Mahatmya
              </p>
              <p className="text-text-secondary text-sm leading-relaxed">{mantra.meaning.mahatmya}</p>
            </div>
          )}
          {mantra.meaning.source && (
            <p className="text-xs text-text-muted flex items-center gap-1.5">
              <BookOpen size={11} /> {mantra.meaning.source}
            </p>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {mantra.bestTime && (
          <div className="bg-bg-elevated/40 rounded-xl p-3">
            <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
              <Clock size={10} /> Shreshtha Samay
            </p>
            <p className="text-sm text-text-secondary">{mantra.bestTime}</p>
          </div>
        )}
        {mantra.recommendedFor && (
          <div className="bg-bg-elevated/40 rounded-xl p-3">
            <p className="text-xs text-text-muted mb-1 flex items-center gap-1">
              <Star size={10} /> Labh
            </p>
            <p className="text-sm text-text-secondary">{mantra.recommendedFor}</p>
          </div>
        )}
      </div>

      <button onClick={onStart} className="btn-primary w-full">
        <Mic size={18} />
        {mantra.displayName} Jap Shuru Karein
      </button>
    </div>
  </div>
);

// ─── Custom Mantra Form ───────────────────────────────────────────

const CustomMantraForm: React.FC<{
  onSave: (input: CustomMantraInput) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [displayName, setDisplayName] = useState('');
  const [originalScript, setOriginalScript] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('hi-IN');
  const [aliases, setAliases] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { setError('Display name is required'); return; }
    if (!originalScript.trim()) { setError('Mantra text is required'); return; }
    if (originalScript.trim().length < 2) { setError('Mantra too short'); return; }
    const aliasList = aliases.split(',').map((a) => a.trim()).filter(Boolean);
    onSave({ displayName: displayName.trim(), originalScript: originalScript.trim(), language, aliases: aliasList });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="spiritual-card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Custom Mantra</h2>
          <button onClick={onCancel} className="btn-ghost p-1.5" aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {error && <p className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5" htmlFor="displayName">Display Name *</label>
            <input id="displayName" className="spiritual-input" placeholder="e.g. श्री राम or My Mantra" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5" htmlFor="originalScript">Mantra Text *</label>
            <input id="originalScript" className="spiritual-input font-devanagari text-lg" placeholder="e.g. राम or Om Shanti" value={originalScript} onChange={(e) => setOriginalScript(e.target.value)} maxLength={200} />
            <p className="text-xs text-text-muted mt-1">Type exactly as you will chant it.</p>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5" htmlFor="language">Recognition Language *</label>
            <select id="language" className="spiritual-input" value={language} onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}>
              <option value="hi-IN">Hindi / Devanagari (hi-IN)</option>
              <option value="en-US">English / Romanized (en-US)</option>
              <option value="sa-IN">Sanskrit (sa-IN)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5" htmlFor="aliases">Alternate Pronunciations (optional)</label>
            <input id="aliases" className="spiritual-input" placeholder="e.g. Raam, Raam Ji (comma-separated)" value={aliases} onChange={(e) => setAliases(e.target.value)} />
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Save Mantra</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────

export const MantraSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showCustomForm = searchParams.get('custom') === '1';

  const { selectedMantra, selectMantra, customMantras, createCustomMantra, deleteCustomMantra } = useMantraStore();
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(showCustomForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewMantra, setPreviewMantra] = useState<MantraConfig | null>(null);

  const allMantras = useMemo(() => [...PRESET_MANTRAS, ...customMantras], [customMantras]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allMantras;
    const q = normalizeText(query);
    return allMantras.filter(
      (m) =>
        normalizeText(m.displayName).includes(q) ||
        normalizeText(m.originalScript).includes(q) ||
        m.deity?.toLowerCase().includes(q) ||
        m.normalizedForms.some((f) => f.includes(q)),
    );
  }, [allMantras, query]);

  const handleCardTap = (mantra: MantraConfig) => {
    if (mantra.meaning || mantra.bestTime) {
      setPreviewMantra(mantra);
    } else {
      selectMantra(mantra);
      navigate('/jap');
    }
  };

  const handleStartJap = () => {
    if (!previewMantra) return;
    selectMantra(previewMantra);
    setPreviewMantra(null);
    navigate('/jap');
  };

  const handleCreateCustom = async (input: CustomMantraInput) => {
    const created = await createCustomMantra(input);
    selectMantra(created);
    setShowForm(false);
    navigate('/jap');
  };

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col">
      <header className="px-4 pt-safe-top safe-top pb-3 border-b border-bg-elevated sticky top-0 bg-bg-base/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2" aria-label="Go back">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Choose Your Mantra</h1>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10" aria-hidden="true" />
          <input
            className="spiritual-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search mantras, deity, language..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search mantras"
          />
        </div>
        <p className="text-xs text-text-muted mt-2">Mantra tap karein — arth aur mahatmya padhein</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p>No mantras found for "{query}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {filtered.map((m) => (
              <div key={m.id} className="relative">
                <MantraCard mantra={m} isSelected={selectedMantra?.id === m.id} onSelect={handleCardTap} />
                {m.isCustom && (
                  <button
                    onClick={() => setConfirmDeleteId(m.id)}
                    className="absolute top-2 right-2 btn-ghost p-1 text-text-muted hover:text-error"
                    aria-label={`Delete ${m.displayName}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="px-4 py-3 border-t border-bg-elevated safe-bottom">
        <button onClick={() => setShowForm(true)} className="btn-secondary w-full max-w-2xl mx-auto flex" aria-label="Create custom mantra">
          <Plus size={18} /> Create Custom Mantra
        </button>
      </div>

      {previewMantra && <MeaningDrawer mantra={previewMantra} onStart={handleStartJap} onClose={() => setPreviewMantra(null)} />}
      {showForm && <CustomMantraForm onSave={handleCreateCustom} onCancel={() => setShowForm(false)} />}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="spiritual-card p-6 max-w-xs w-full text-center animate-scale-in">
            <p className="text-text-primary mb-4">Delete this custom mantra?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => { deleteCustomMantra(confirmDeleteId); setConfirmDeleteId(null); }} className="btn-primary flex-1 bg-error/80">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
