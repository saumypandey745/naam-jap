/**
 * SatsangPage.tsx
 *
 * Real-time group jap via Firebase Firestore.
 * Users join a room and their counts are combined and displayed live.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Plus, Copy, Share2, Mic, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMantraStore } from '@/store/mantraStore';
import {
  SatsangRoom, subscribeSatsangRoom, updateSatsangCount, createSatsangRoom
} from '@/services/firebase/cloudSyncService';
import { isFirebaseConfigured } from '@/services/firebase/firebase';
import { formatIndianNumber } from '@/utils/normalize';
import { PRESET_MANTRAS } from '@/features/mantra/mantraData';

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
  const [room, setRoom] = useState<SatsangRoom | null>(null);
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mantraId, setMantraId] = useState('ram');
  const [mantraName, setMantraName] = useState('Ram Satsang');
  const [isCreating, setIsCreating] = useState(false);
  const [japCount, setJapCount] = useState(0);
  const [view, setView] = useState<'landing' | 'create' | 'join' | 'room'>('landing');

  const firebaseReady = isFirebaseAvailable && isFirebaseConfigured();

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
      const selectedMantra = PRESET_MANTRAS.find((m) => m.id === mantraId);
      const id = await createSatsangRoom(
        user.uid,
        mantraName,
        mantraId,
        selectedMantra?.displayName ?? mantraId,
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

  const handleJap = async () => {
    if (!user || !roomId || !firebaseReady) {
      setJapCount((c) => c + 1);
      return;
    }
    setJapCount((c) => c + 1);
    await updateSatsangCount(roomId, user.uid, user.displayName ?? 'Devotee', 1);
  };

  const copyRoomId = () => {
    navigator.clipboard?.writeText(roomId);
  };

  const shareRoom = () => {
    const text = `🙏 Hamare saath jap karein! Room Code: ${roomId} — Naam Jap App mein join karein.`;
    if (navigator.share) navigator.share({ text });
    else navigator.clipboard?.writeText(text);
  };

  const totalInRoom = room
    ? Object.values(room.participants).reduce((s, p) => s + p.count, 0)
    : 0;
  const participantCount = room ? Object.keys(room.participants).length : 0;

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col">
      <header className="px-4 pt-safe-top safe-top pb-3 border-b border-bg-elevated">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2">
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
                VITE_FIREBASE_* environment variables set karein.
              </p>
              <p className="text-xs text-text-muted">See README for instructions.</p>
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
                <LogIn size={18} />
                Google se Sign In
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
                <Plus size={18} />
                Naya Satsang Banao
              </button>
              <button onClick={() => setView('join')} className="btn-secondary">
                <LogIn size={18} />
                Room Join Karo
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
            <div className="flex flex-col items-center gap-6 animate-fade-in">
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
                  <Users size={11} className="inline mr-1" />
                  {participantCount} Sadhak
                </div>
              </div>

              {/* My count */}
              <div className="text-center">
                <div className="text-2xl font-bold text-gold-400">{formatIndianNumber(japCount)}</div>
                <div className="text-text-muted text-xs">Mera Jap</div>
              </div>

              {/* Jap button */}
              <button
                onClick={handleJap}
                className="btn-primary w-28 h-28 rounded-full text-4xl shadow-glow-gold"
                aria-label="Ek jap karo"
              >
                🙏
              </button>

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
