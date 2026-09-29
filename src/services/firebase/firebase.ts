/**
 * firebase.ts
 *
 * Firebase initialization.
 * Config is loaded from environment variables (VITE_ prefix).
 *
 * To enable cloud sync:
 * 1. Create a Firebase project at console.firebase.google.com
 * 2. Enable Authentication (Google provider) and Firestore
 * 3. Create .env.local with your config values:
 *
 *    VITE_FIREBASE_API_KEY=xxx
 *    VITE_FIREBASE_AUTH_DOMAIN=xxx
 *    VITE_FIREBASE_PROJECT_ID=xxx
 *    VITE_FIREBASE_STORAGE_BUCKET=xxx
 *    VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
 *    VITE_FIREBASE_APP_ID=xxx
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if config is present (config can be absent in dev)
export const isFirebaseConfigured = (): boolean =>
  !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
  );

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let messaging: Messaging | null = null;

export function initFirebase(): void {
  if (!isFirebaseConfigured()) {
    console.info('[Firebase] Config not found — cloud sync disabled');
    return;
  }

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  auth = getAuth(app);
  db = getFirestore(app);

  // Initialize messaging only if supported (requires HTTPS)
  isSupported().then((supported) => {
    if (supported && app) {
      messaging = getMessaging(app);
    }
  });
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export function getFirebaseDb(): Firestore | null {
  return db;
}

export function getFirebaseMessaging(): Messaging | null {
  return messaging;
}
