/**
 * App.tsx — Root Application with all routes
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { MantraSelectPage } from '@/pages/MantraSelectPage';
import { JapPage } from '@/pages/JapPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { StatsPage } from '@/pages/StatsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AnushthaanPage } from '@/pages/AnushthaanPage';
import { SatsangPage } from '@/pages/SatsangPage';
import { OnboardingPage, hasCompletedOnboarding, markOnboardingComplete } from '@/pages/OnboardingPage';
import { DebugPage } from '@/pages/DebugPage';
import { useSettingsStore } from '@/store/settingsStore';
import { useMantraStore } from '@/store/mantraStore';
import { useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/authStore';
import { initializePersistence } from '@/services/persistence/localStorageAdapter';
import { initFirebase } from '@/services/firebase/firebase';

// ─── App Initializer ──────────────────────────────────────────────

const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loadSettings, settings } = useSettingsStore();
  const { loadCustomMantras } = useMantraStore();
  const { loadActiveSession } = useSessionStore();
  const { initialize: initAuth } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Initialize Firebase (graceful if unconfigured)
      initFirebase();

      await initializePersistence();
      await Promise.all([
        loadSettings(),
        loadCustomMantras(),
        loadActiveSession(),
      ]);

      setReady(true);
    })();
  }, []);

  // Initialize Firebase auth listener after settings load
  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, [initAuth]);

  // Apply theme
  useEffect(() => {
    const html = document.documentElement;
    const apply = (dark: boolean) => {
      html.classList.toggle('dark', dark);
      html.classList.toggle('light', !dark);
    };

    if (settings.theme === 'light') {
      apply(false);
    } else if (settings.theme === 'dark') {
      apply(true);
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [settings.theme]);

  // Apply font size
  useEffect(() => {
    const root = document.documentElement;
    const sizes: Record<string, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xlarge: '20px',
    };
    root.style.fontSize = sizes[settings.fontSizeLevel ?? 'medium'] ?? '16px';
  }, [settings.fontSizeLevel]);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl animate-pulse-soft">🕉️</div>
          <div className="w-6 h-6 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ─── Root ─────────────────────────────────────────────────────────

const App: React.FC = () => {
  // Redirect new users to onboarding
  const isFirstTime = !hasCompletedOnboarding();

  return (
    <BrowserRouter>
      <AppInitializer>
        <Routes>
          {/* Onboarding */}
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Home redirect for new users */}
          {isFirstTime && (
            <Route path="/" element={<Navigate to="/onboarding" replace />} />
          )}

          {/* Main app */}
          <Route path="/" element={<HomePage />} />
          <Route path="/select" element={<MantraSelectPage />} />
          <Route path="/jap" element={<JapPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/anushthaan" element={<AnushthaanPage />} />
          <Route path="/satsang" element={<SatsangPage />} />

          {/* Dev only */}
          {import.meta.env.DEV && (
            <Route path="/debug" element={<DebugPage />} />
          )}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppInitializer>
    </BrowserRouter>
  );
};

export default App;
