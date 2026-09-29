/**
 * cloudSyncService.ts
 *
 * Firebase Firestore sync service.
 * Bidirectionally syncs sessions, stats, and settings across devices.
 *
 * Architecture:
 * - All writes go to localStorage FIRST (offline-first)
 * - Firestore is synced asynchronously in the background
 * - Conflict resolution: server wins for older data, local wins for recent
 *
 * Data structure in Firestore:
 *   /users/{uid}/sessions/{sessionId}
 *   /users/{uid}/stats/lifetime
 *   /users/{uid}/stats/daily/{date}
 *   /users/{uid}/streak
 *   /users/{uid}/settings
 *   /users/{uid}/anushthaans/{id}
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { JapSession } from '@/types/session';
import { DailyStats, LifetimeStats, Streak, Anushthaan } from '@/types/stats';
import { UserSettings } from '@/types/settings';

function userRef(uid: string) {
  const db = getFirebaseDb();
  if (!db) return null;
  return doc(db, 'users', uid);
}

// ─── Session sync ──────────────────────────────────────────

export async function syncSessionToCloud(
  uid: string,
  session: JapSession,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'sessions', session.id),
      { ...session, _syncedAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // Offline — will sync when reconnected via persistence
  }
}

export async function fetchCloudSessions(
  uid: string,
  limitCount = 100,
): Promise<JapSession[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'users', uid, 'sessions'),
      orderBy('startedAt', 'desc'),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as JapSession);
  } catch {
    return [];
  }
}

// ─── Lifetime stats sync ────────────────────────────────────

export async function syncLifetimeStats(
  uid: string,
  stats: LifetimeStats,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'stats', 'lifetime'),
      { ...stats, _syncedAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // ignore
  }
}

export async function fetchCloudLifetimeStats(
  uid: string,
): Promise<LifetimeStats | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'stats', 'lifetime'));
    return snap.exists() ? (snap.data() as LifetimeStats) : null;
  } catch {
    return null;
  }
}

// ─── Settings sync ──────────────────────────────────────────

export async function syncSettingsToCloud(
  uid: string,
  settings: UserSettings,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'settings', 'main'),
      { ...settings, _syncedAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // ignore
  }
}

export async function fetchCloudSettings(
  uid: string,
): Promise<UserSettings | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'settings', 'main'));
    return snap.exists() ? (snap.data() as UserSettings) : null;
  } catch {
    return null;
  }
}

// ─── Streak sync ────────────────────────────────────────────

export async function syncStreak(uid: string, streak: Streak): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'streak', 'main'),
      { ...streak, _syncedAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // ignore
  }
}

// ─── Anushthaan sync ────────────────────────────────────────

export async function syncAnushthaan(
  uid: string,
  anushthaan: Anushthaan,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await setDoc(
      doc(db, 'users', uid, 'anushthaans', anushthaan.id),
      { ...anushthaan, _syncedAt: serverTimestamp() },
      { merge: true },
    );
  } catch {
    // ignore
  }
}

// ─── Satsang Mode (real-time group jap) ────────────────────

export interface SatsangRoom {
  id: string;
  name: string;
  mantraId: string;
  mantraDisplayName: string;
  createdBy: string;
  createdAt: number;
  participants: Record<string, { name: string; count: number; lastSeen: number }>;
  totalCount: number;
}

export function subscribeSatsangRoom(
  roomId: string,
  callback: (room: SatsangRoom) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  if (!db) return () => {};
  return onSnapshot(doc(db, 'satsang', roomId), (snap) => {
    if (snap.exists()) callback(snap.data() as SatsangRoom);
  });
}

export async function updateSatsangCount(
  roomId: string,
  uid: string,
  displayName: string,
  delta: number,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    const roomDoc = doc(db, 'satsang', roomId);
    const snap = await getDoc(roomDoc);
    if (!snap.exists()) return;
    const room = snap.data() as SatsangRoom;
    const currentCount = room.participants[uid]?.count ?? 0;
    await setDoc(
      roomDoc,
      {
        participants: {
          [uid]: {
            name: displayName,
            count: currentCount + delta,
            lastSeen: Date.now(),
          },
        },
        totalCount: (room.totalCount ?? 0) + delta,
        _updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    // ignore
  }
}

export async function createSatsangRoom(
  uid: string,
  name: string,
  mantraId: string,
  mantraDisplayName: string,
): Promise<string> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase not initialized');

  const roomId = `${uid.slice(0, 8)}-${Date.now().toString(36)}`;
  await setDoc(doc(db, 'satsang', roomId), {
    id: roomId,
    name,
    mantraId,
    mantraDisplayName,
    createdBy: uid,
    createdAt: Date.now(),
    participants: {},
    totalCount: 0,
  });
  return roomId;
}
