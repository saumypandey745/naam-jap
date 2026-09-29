/**
 * authStore.ts
 *
 * Zustand store for Firebase authentication state.
 */

import { create } from 'zustand';
import { AuthUser, signInWithGoogle, signOutUser, onAuthChanged } from '@/services/firebase/authService';
import { isFirebaseConfigured } from '@/services/firebase/firebase';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isFirebaseAvailable: boolean;

  initialize: () => () => void; // returns unsubscribe
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,
  isFirebaseAvailable: isFirebaseConfigured(),

  initialize(): () => void {
    if (!isFirebaseConfigured()) {
      set({ isLoading: false });
      return () => {};
    }
    return onAuthChanged((user) => {
      set({ user, isLoading: false });
    });
  },

  async signIn() {
    set({ isLoading: true });
    const user = await signInWithGoogle();
    set({ user, isLoading: false });
  },

  async signOut() {
    await signOutUser();
    set({ user: null });
  },
}));
