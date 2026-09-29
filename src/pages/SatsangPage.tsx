/**
 * SatsangPage.tsx
 *
 * Real-time group jap via Firebase Firestore.
 * Users join a room and their counts are combined and displayed live.
 * Supports BOTH tap mode and voice mode.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Plus, Copy, Share2, Mic, MicOff, LogIn, Hand } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMantraStore } from '@/store/mantraStore';
import { useVoiceEngine } from '@/features/voice/useVoiceEngine';
import {
  SatsangRoom, subscribeSatsangRoom, updateSatsangCount, createSatsangRoom
} from '@/services/firebase/cloudSyncService';
import { isFirebaseConfigured } from '@/services/firebase/firebase';
import { formatIndianNumber } from '@/utils/normalize';
import { PRESET_MANTRAS } from '@/features/mantra/mantraData';
import { JapDetectedEvent } from '@/types/voice';

const DEMO_ROOM: SatsangRoom = {
  id: 'demo',
  name: 'Ram Satsang',
  mantraId: 'ram',
  mantraDisplayName: 'श्री राम',
  createdBy: 'system',
  createdAt: Date.now(),
  participants: {},
  totalCount: 0,
};

export const SatsangPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signIn, isFirebaseAvailable } = useAuthStore();
  const { selectedMantra } = useMantraStore();
  const [room, setRoom] = useState<SatsangRoom | null>(null);
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mantraId, setMantraId] = useState(selectedMantra?.id ?? 'ram');
  const [mantraName, setMantraName] = useState('Ram Satsang');
  const [isCreating, setIsCreating] = useState(false);
  const [japCount, setJapCount] = useState(0);
  const [view, setView] = useState<'landing' | 'create' | 'join' | 'room'>('landing');
  const [inputMode, setInputMode] = useState<'tap' | 'voice'>('tap');
  const [interimText, setInterimText] = useState('');

  const firebaseReady = isFirebaseAvailable && isFirebaseConfigured();

  // Mantra config for voice engine
  const activeMantraConfig = useMemo(() => {
    if (room) return PRESET_MANTRAS.find((m) => m.id === room.mantraId) ?? null;
    return PRESET_MANTRAS.find((m) => m.id === mantraId) ?? null;
  }, [room, mantraId]);

  // Called when voice engine detects a valid jap
  const handleVoiceJap = useCallback(async (event: JapDetectedEvent) => {
    const count = event.repetitions;
    setJapCount((c) => c + count);
    if (user && roomId && firebaseReady) {
      await updateSatsangCount(roomId, user.uid, user.displayName ?? 'Devotee', count);
    }
  }, [user, roomId, firebaseReady]);

  const { voiceState, interimTranscript, errorMessage, isSupported, start, stop } = useVoiceEngine({
    mantraConfig: activeMantraConfig,
    onJapDetected: handleVoiceJap,
  });

  // Keep interim text updated
  useEffect(() => { setInterimText(interimTranscript); }, [interimTranscript]);

  // Stop voice when leaving room
  useEffect(() => {
    if (view !== 'room') stop();
  }, [view, stop]);

  // Subscribe to room updates
  useEffect(() => {
    if (!roomId || !firebaseReady) return;
    const unsub = subscribeSatsangRoom(roomId, setRoom);
    return unsub;
  }, [roomId, firebaseReady]);

  const handleCreate = async () => {
    if (!user || !firebaseReady) return;
    setIsCreating(true);
    try {
      const selectedM = PRESET_MANTRAS.find((m) => m.id === mantraId);
      const id = await createSatsangRoom(
        user.uid, mantraName, mantraId, selectedM?.displayName ?? mantraId,
      );
      setRoomId(id);
      setView('room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setRoomId(joinCode.trim());
    setView('room');
  };

  const handleTap = async () => {
    setJapCount((c) => c + 1);
    if (user && roomId && firebaseReady) {
      await updateSatsangCount(roomId, user.uid, user.displayName ?? 'Devotee', 1);
    }
  };

  const toggleVoice = async () => {
    if (inputMode === 'tap') {
      setInputMode('voice');
      await start();
    } else {
      setInputMode('tap');
      stop();
    }
  };

  const copyRoomId = () => navigator.clipboard?.writeText(roomId);
  const shareRoom = () => {
    const text = `🙏 Hamare saath jap karein! Room Code: ${roomId} — Naam Jap App mein join karein.`;
    if (navigator.share) navigator.share({ text });
    else navigator.clipboard?.writeText(text);
  };

  const totalInRoom = room ? Object.values(room.participants).reduce((s, p) => s + p.count, 0) : 0;
  const participantCount = room ? Object.keys(room.participants).length : 0;

  const isListening = voiceState === 'listening' || voiceState === 'processing';

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col">
      <header className="px-4 pt-safe-top safe-top pb-3 border-b border-bg-elevated">
        <div className="flex items-center gap-3">
          <button onClick={() => { stop(); navigate(-1); }} className="btn-ghost p-2 -ml-2">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Satsang Mode</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-600/20 text-gold-400 border border-gold-600/30 ml-auto">
            <Users size={10} className="inline" /> Group Jap
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto">

          {/* Firebase not configured */}
          {!firebaseReady && (
            <div className="spiritual-card p-6 text-center">
              <div className="text-4xl mb-3">🔥</div>
              <h2 className="text-text-primary font-semibold mb-2">Firebase Setup Required</h2>
              <p className="text-text-secondary text-sm mb-4">
                Satsang Mode ke liye Firebase config chahiye.
              </p>
            </div>
          )}

          {/* Not logged in */}
          {firebaseReady && !user && (
            <div className="spiritual-card p-6 text-center animate-fade-in">
              <div className="text-4xl mb-3">🙏</div>
              <h2 className="text-text-primary font-semibold mb-2">Sign In for Satsang</h2>
              <p className="text-text-secondary text-sm mb-5">
                Group jap ke liye Google account se sign in karein.
              </p>
              <button onClick={signIn} className="btn-primary w-full">
                <LogIn size={18} /> Google se Sign In
              </button>
            </div>
          )}

          {/* Landing */}
          {firebaseReady && user && view === 'landing' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="text-center mb-2">
                <div className="text-4xl mb-2">🕉️</div>
                <p className="text-text-secondary text-sm">
                  Milke jap karein — saath ka jap aur bhi prasannakar hota hai!
                </p>
              </div>
              <button onClick={() => setView('create')} className="btn-primary">
                <Plus size={18} /> Naya Satsang Banao
              </button>
              <button onClick={() => setView('join')} className="btn-secondary">
                <LogIn size={18} /> Room Join Karo
              </button>
            </div>
          )}

          {/* Create */}
          {firebaseReady && user && view === 'create' && (
            <div className="flex flex-col gap-4 animate-slide-up">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Satsang Naam</label>
                <input className="spiritual-input" value={mantraName} onChange={(e) => setMantraName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Mantra</label>
                <select className="spiritual-input" value={mantraId} onChange={(e) => setMantraId(e.target.value)}>
                  {PRESET_MANTRAS.map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setView('landing')} className="btn-secondary flex-1">Wapas</button>
                <button onClick={handleCreate} disabled={isCreating} className="btn-primary flex-1">
                  {isCreating ? 'Ban raha hai...' : 'Satsang Banao'}
                </button>
              </div>
            </div>
          )}

          {/* Join */}
          {firebaseReady && user && view === 'join' && (
            <div className="flex flex-col gap-4 animate-slide-up">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Room Code</label>
                <input
                  className="spiritual-input"
                  placeholder="Friend ne jo code bheja hai..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setView('landing')} className="btn-secondary flex-1">Wapas</button>
                <button onClick={handleJoin} className="btn-primary flex-1">Join Karo</button>
              </div>
            </div>
          )}

          {/* Active Room */}
          {view === 'room' && (
            <div className="flex flex-col items-center gap-5 animate-fade-in">
              {/* Room info */}
              {room && (
                <div className="w-full spiritual-card p-4 text-center">
                  <p className="font-devanagari text-gold-400 text-xl">{room.mantraDisplayName}</p>
                  <p className="text-text-muted text-sm">{room.name}</p>
                </div>
              )}

              {/* Share room */}
              {roomId && (
                <div className="w-full flex gap-2 items-center">
                  <span className="text-xs text-text-muted px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-card font-mono flex-1 truncate">
                    {roomId}
                  </span>
                  <button onClick={copyRoomId} className="btn-ghost border border-bg-elevated px-3 py-1.5 rounded-lg">
                    <Copy size={14} />
                  </button>
                  <button onClick={shareRoom} className="btn-ghost border border-bg-elevated px-3 py-1.5 rounded-lg">
                    <Share2 size={14} />
                  </button>
                </div>
              )}

              {/* Group counter */}
              <div className="text-center">
                <div className="text-6xl font-bold text-text-primary">{formatIndianNumber(totalInRoom)}</div>
                <div className="text-text-muted text-sm mt-1">Milke Jap</div>
                <div className="text-xs text-text-muted mt-1">
                  <Users size={11} className="inline mr-1" />{participantCount} Sadhak
                </div>
              </div>

              {/* My count */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gold-400">{formatIndianNumber(japCount)}</div>
                <div className="text-text-muted text-xs">Mera Jap</div>
              </div>

              {/* ── Mode Toggle ── */}
              <div className="flex gap-2 p-1 bg-bg-elevated rounded-xl">
                <button
                  onClick={() => { setInputMode('tap'); stop(); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    inputMode === 'tap'
                      ? 'bg-gold-600/80 text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Hand size={14} /> Tap
                </button>
                <button
                  onClick={() => { if (!isSupported) return; setInputMode('voice'); start(); }}
                  disabled={!isSupported}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    inputMode === 'voice'
                      ? 'bg-gold-600/80 text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  } ${!isSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Mic size={14} /> Voice
                </button>
              </div>

              {/* TAP button */}
              {inputMode === 'tap' && (
                <button
                  onClick={handleTap}
                  className="btn-primary w-28 h-28 rounded-full text-4xl shadow-glow-gold"
                  aria-label="Ek jap karo"
                >
                  🙏
                </button>
              )}

              {/* VOICE mode UI */}
              {inputMode === 'voice' && (
                <div className="flex flex-col items-center gap-3 w-full">
                  {/* Mic button */}
                  <button
                    onClick={toggleVoice}
                    className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-glow-gold ${
                      isListening
                        ? 'bg-error/80 animate-pulse scale-105'
                        : 'bg-gold-600/80 hover:bg-gold-500'
                    }`}
                    aria-label={isListening ? 'Voice band karo' : 'Voice shuru karo'}
                  >
                    {isListening ? <MicOff size={36} className="text-white" /> : <Mic size={36} className="text-white" />}
                  </button>

                  {/* Status */}
                  <p className="text-xs text-text-muted text-center">
                    {isListening
                      ? '🎤 Sun raha hoon... mantra bolo'
                      : 'Mic button dabao — chanting start karo'}
                  </p>

                  {/* Interim transcript */}
                  {interimText && (
                    <div className="w-full bg-bg-elevated/60 rounded-xl px-4 py-2 text-center">
                      <p className="text-text-muted text-xs italic">{interimText}</p>
                    </div>
                  )}

                  {/* Error */}
                  {errorMessage && (
                    <p className="text-xs text-error text-center">{errorMessage}</p>
                  )}

                  {!isSupported && (
                    <p className="text-xs text-error text-center">
                      Aapka browser voice recognition support nahi karta
                    </p>
                  )}
                </div>
              )}

              {/* Participant list */}
              {room && Object.entries(room.participants).length > 0 && (
                <div className="w-full">
                  <p className="text-xs text-text-muted uppercase tracking-widest mb-2">Sadhak</p>
                  {Object.entries(room.participants)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([uid, p]) => (
                      <div key={uid} className="flex items-center justify-between py-2 border-b border-bg-elevated">
                        <span className="text-text-secondary text-sm">{p.name}</span>
                        <span className="text-gold-400 font-medium">{formatIndianNumber(p.count)}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
