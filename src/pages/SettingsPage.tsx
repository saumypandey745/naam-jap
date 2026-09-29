/**
 * SettingsPage.tsx — Full Settings
 *
 * Sections:
 * - Appearance (theme, font size)
 * - Jap Settings (mala size, manual/voice, sensitivity)
 * - Sound & Haptic (ambient, bell, vibration)
 * - Daily Goal & Reminder
 * - Spiritual (sankalp, deity image, tithi display)
 * - Cloud Sync (Firebase Google login)
 * - Privacy
 * - About / Debug
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Moon, Sun, Monitor, Bell, Mic, Shield,
  Vibrate, Volume2, VolumeX, User, LogOut, Cloud,
  ChevronRight, ChevronDown, Award, Mic as MicIcon, BookOpen,
  BarChart2, Settings as SettingsIcon
} from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import { DEFAULT_SETTINGS, MalaSize, AmbientSound, FontSizeLevel } from '@/types/settings';
import { isFirebaseConfigured } from '@/services/firebase/firebase';

// ─── Section wrapper ──────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <p className="text-xs text-text-muted uppercase tracking-widest mb-2 px-1">{title}</p>
    <div className="spiritual-card overflow-hidden divide-y divide-bg-elevated">
      {children}
    </div>
  </div>
);

// ─── Row primitives ──────────────────────────────────────────────

const ToggleRow: React.FC<{
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}> = ({ label, description, value, onChange, icon }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    {icon && <span className="text-gold-400/70">{icon}</span>}
    <div className="flex-1 min-w-0">
      <p className="text-sm text-text-primary">{label}</p>
      {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
    </div>
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
        value ? 'bg-gold-600' : 'bg-bg-card'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const SliderRow: React.FC<{
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}> = ({ label, description, value, min, max, step, format, onChange }) => (
  <div className="px-4 py-3">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-text-primary">{label}</p>
      <span className="text-sm text-gold-400">{format ? format(value) : value}</span>
    </div>
    {description && <p className="text-xs text-text-muted mb-2">{description}</p>}
    <input
      type="range"
      className="w-full accent-gold-500"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
    <div className="flex justify-between text-xs text-text-muted mt-1">
      <span>{format ? format(min) : min}</span>
      <span>{format ? format(max) : max}</span>
    </div>
  </div>
);

const SelectRow: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}> = ({ label, value, options, onChange, icon }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    {icon && <span className="text-gold-400/70">{icon}</span>}
    <p className="text-sm text-text-primary flex-1">{label}</p>
    <select
      className="text-sm text-text-primary bg-bg-elevated border border-bg-card rounded-lg px-2 py-1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

// ─── Main SettingsPage ────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { user, signIn, signOut: authSignOut, isFirebaseAvailable } = useAuthStore();
  const { permission, requestPermission, scheduleReminder, cancelReminder } = useNotifications();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const firebaseReady = isFirebaseAvailable && isFirebaseConfigured();

  const handleReminderToggle = async (v: boolean) => {
    if (v && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    updateSettings({ reminderSettings: { ...settings.reminderSettings, enabled: v } });
    if (v) {
      scheduleReminder({ ...settings.reminderSettings, enabled: true });
    } else {
      cancelReminder();
    }
  };

  return (
    <div className="min-h-dvh bg-spiritual flex flex-col">
      <header className="px-4 pt-safe-top safe-top pb-3 border-b border-bg-elevated sticky top-0 bg-bg-base/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2 -ml-2">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 pb-24 max-w-2xl mx-auto w-full">

        {/* ── Appearance ──────────────────────────── */}
        <Section title="Appearance">
          <SelectRow
            label="Theme"
            icon={<Moon size={16} />}
            value={settings.theme}
            options={[
              { value: 'dark', label: '🌙 Dark' },
              { value: 'light', label: '☀️ Light' },
              { value: 'system', label: '⚙️ System' },
            ]}
            onChange={(v) => updateSettings({ theme: v as typeof settings.theme })}
          />
          <SelectRow
            label="Font Size"
            value={settings.fontSizeLevel ?? 'medium'}
            options={[
              { value: 'small', label: 'Small' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
              { value: 'xlarge', label: 'Extra Large' },
            ]}
            onChange={(v) => updateSettings({ fontSizeLevel: v as FontSizeLevel })}
          />
        </Section>

        {/* ── Jap Settings ────────────────────────── */}
        <Section title="Jap Settings">
          <SelectRow
            label="Mala Size"
            icon={<span className="text-sm">📿</span>}
            value={String(settings.malaSize ?? 108)}
            options={[
              { value: '27', label: '27 Beads' },
              { value: '54', label: '54 Beads' },
              { value: '108', label: '108 Beads (Standard)' },
              { value: '1008', label: '1008 Beads' },
            ]}
            onChange={(v) => updateSettings({ malaSize: parseInt(v) as MalaSize })}
          />
          <ToggleRow
            label="Screen Always On"
            description="Jap ke dauran screen band na ho"
            icon={<Monitor size={16} />}
            value={settings.keepScreenOn ?? true}
            onChange={(v) => updateSettings({ keepScreenOn: v })}
          />
          <SliderRow
            label="Voice Sensitivity"
            description="Kitni similar awaaz count ho — zyada strict = sirf exact match"
            value={settings.voiceSensitivity ?? 0.72}
            min={0.5}
            max={0.95}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => updateSettings({ voiceSensitivity: v })}
          />
          <ToggleRow
            label="Whisper Mode"
            description="Dhimi awaaz mein bhi detect kare (threshold low)"
            icon={<MicIcon size={16} />}
            value={settings.whisperMode ?? false}
            onChange={(v) => updateSettings({ whisperMode: v })}
          />
        </Section>

        {/* ── Sound & Haptic ──────────────────────── */}
        <Section title="Sound & Haptic">
          <ToggleRow
            label="Jap Sound"
            description="Har jap par click sound"
            icon={<Volume2 size={16} />}
            value={settings.soundEnabled}
            onChange={(v) => updateSettings({ soundEnabled: v })}
          />
          <ToggleRow
            label="Mala Bell"
            description="108 jap par ghanti"
            icon={<Bell size={16} />}
            value={settings.malaCompletionSoundEnabled ?? true}
            onChange={(v) => updateSettings({ malaCompletionSoundEnabled: v })}
          />
          <ToggleRow
            label="Vibration"
            description="Haptic feedback on each jap"
            icon={<Vibrate size={16} />}
            value={settings.hapticEnabled}
            onChange={(v) => updateSettings({ hapticEnabled: v })}
          />
          <SelectRow
            label="Ambient Sound"
            icon={settings.ambientSound === 'none' ? <VolumeX size={16} /> : <Volume2 size={16} />}
            value={settings.ambientSound ?? 'none'}
            options={[
              { value: 'none', label: 'None' },
              { value: 'silence', label: '🔇 Silence' },
              { value: 'temple-bells', label: '🔔 Temple Bells' },
              { value: 'river', label: '🌊 River' },
              { value: 'rain', label: '🌧️ Rain' },
            ]}
            onChange={(v) => updateSettings({ ambientSound: v as AmbientSound })}
          />
          {settings.ambientSound !== 'none' && (
            <SliderRow
              label="Ambient Volume"
              value={settings.ambientVolume ?? 0.5}
              min={0.1}
              max={1.0}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => updateSettings({ ambientVolume: v })}
            />
          )}
        </Section>

        {/* ── Daily Goal & Reminder ───────────────── */}
        <Section title="Daily Goal & Reminder">
          <div className="px-4 py-3">
            <label className="block text-sm text-text-primary mb-2">Daily Jap Target</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[108, 216, 1008, 10800].map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ dailyGoalTarget: t })}
                  className={`py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    settings.dailyGoalTarget === t
                      ? 'border-gold-600 bg-gold-600/20 text-gold-400'
                      : 'border-bg-elevated text-text-muted'
                  }`}
                >
                  {t.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
            <button
              onClick={() => updateSettings({ dailyGoalTarget: undefined })}
              className="text-xs text-text-muted hover:text-error transition-colors"
            >
              Goal hatao
            </button>
          </div>

          <ToggleRow
            label="Daily Reminder"
            description="Har roz jap ke liye notification"
            icon={<Bell size={16} />}
            value={settings.reminderSettings?.enabled ?? false}
            onChange={handleReminderToggle}
          />
          {settings.reminderSettings?.enabled && (
            <div className="px-4 py-3 flex items-center gap-3">
              <p className="text-sm text-text-primary flex-1">Reminder Time</p>
              <input
                type="time"
                className="spiritual-input w-32 text-sm"
                value={`${String(settings.reminderSettings.hour).padStart(2, '0')}:${String(settings.reminderSettings.minute).padStart(2, '0')}`}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':').map(Number);
                  const updated = {
                    ...settings.reminderSettings,
                    hour: h,
                    minute: m,
                  };
                  updateSettings({ reminderSettings: updated });
                  scheduleReminder(updated);
                }}
              />
            </div>
          )}
        </Section>

        {/* ── Spiritual ───────────────────────────── */}
        <Section title="Spiritual">
          <ToggleRow
            label="Sankalp Mode"
            description="Session se pehle sankalp lo"
            icon={<span className="text-sm">🪔</span>}
            value={settings.sankalpModeEnabled ?? false}
            onChange={(v) => updateSettings({ sankalpModeEnabled: v })}
          />
          <ToggleRow
            label="Deity Image"
            description="Jap screen par Bhagwaan ki tasveer"
            icon={<span className="text-sm">🕉️</span>}
            value={settings.showDeityImage ?? true}
            onChange={(v) => updateSettings({ showDeityImage: v })}
          />
          <ToggleRow
            label="Tithi Display"
            description="Aaj ki tithi aur vaar dikhao"
            icon={<span className="text-sm">📅</span>}
            value={settings.showTithiDisplay ?? true}
            onChange={(v) => updateSettings({ showTithiDisplay: v })}
          />
        </Section>

        {/* ── Cloud Sync ──────────────────────────── */}
        <Section title="Cloud Sync">
          {!firebaseReady ? (
            <div className="px-4 py-3">
              <p className="text-sm text-text-secondary">
                Firebase config required. Set VITE_FIREBASE_* in .env.local.
              </p>
            </div>
          ) : !user ? (
            <button
              onClick={signIn}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-bg-elevated transition-colors"
            >
              <Cloud size={16} className="text-gold-400/70" />
              <div className="text-left">
                <p className="text-sm text-text-primary">Google se Sign In</p>
                <p className="text-xs text-text-muted">Sabhi devices par sync ho</p>
              </div>
              <ChevronRight size={16} className="text-text-muted ml-auto" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3">
                <User size={16} className="text-gold-400/70" />
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{user.displayName}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
                  Synced
                </span>
              </div>
              <button
                onClick={authSignOut}
                className="flex items-center gap-3 px-4 py-3 w-full hover:bg-bg-elevated transition-colors"
              >
                <LogOut size={16} className="text-error/70" />
                <p className="text-sm text-error">Sign Out</p>
              </button>
            </>
          )}
        </Section>

        {/* ── Privacy ─────────────────────────────── */}
        <Section title="Privacy">
          <div className="px-4 py-3 flex gap-3">
            <Shield size={16} className="text-success mt-0.5 flex-shrink-0" />
            <div className="text-xs text-text-muted space-y-1">
              <p>🔒 Mic sirf active session mein use hota hai</p>
              <p>🚫 Koi audio record ya store nahi hota</p>
              <p>📱 Saara data sirf aapke device par hai (jab tak cloud sync off hai)</p>
              <p>🌐 Voice recognition aapke browser ka feature hai — Google/Apple ke servers pe ja sakta hai</p>
            </div>
          </div>
        </Section>

        {/* ── Reset ───────────────────────────────── */}
        <Section title="Data">
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-bg-elevated transition-colors text-error"
            >
              <p className="text-sm">Settings Reset Karein</p>
            </button>
          ) : (
            <div className="px-4 py-3 flex gap-3">
              <button
                onClick={() => {
                  resetSettings();
                  setShowResetConfirm(false);
                }}
                className="btn-ghost border border-error/40 text-error text-sm px-4 py-2 flex-1"
              >
                Haan, Reset
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="btn-secondary flex-1 text-sm"
              >
                Nahi
              </button>
            </div>
          )}
        </Section>

        {/* ── Dev (DEV only) ──────────────────────── */}
        {import.meta.env.DEV && (
          <Section title="Developer">
            <ToggleRow
              label="Voice Debug Panel"
              description="/debug page enable karo"
              value={settings.showDebugPage ?? false}
              onChange={(v) => updateSettings({ showDebugPage: v })}
            />
            <button
              onClick={() => navigate('/debug')}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-bg-elevated transition-colors"
            >
              <p className="text-sm text-text-primary">Voice Debug Panel Kholein</p>
              <ChevronRight size={16} className="text-text-muted ml-auto" />
            </button>
          </Section>
        )}

        {/* Version */}
        <p className="text-center text-xs text-text-muted pb-4">
          Naam Jap v1.0.0 · Har jap mein Bhagwan ka aashirvaad
        </p>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-bg-elevated bg-bg-surface/80 backdrop-blur-sm safe-bottom">
        <div className="flex items-center justify-around py-2 px-4">
          <button onClick={() => navigate('/')} className="nav-item"><Mic size={20} /><span className="text-xs">Jap</span></button>
          <button onClick={() => navigate('/history')} className="nav-item"><BookOpen size={20} /><span className="text-xs">History</span></button>
          <button onClick={() => navigate('/stats')} className="nav-item"><BarChart2 size={20} /><span className="text-xs">Stats</span></button>
          <button onClick={() => navigate('/anushthaan')} className="nav-item"><Award size={20} /><span className="text-xs">Anushthaan</span></button>
          <button onClick={() => navigate('/settings')} className="nav-item active" aria-current="page"><SettingsIcon size={20} /><span className="text-xs">Settings</span></button>
        </div>
      </nav>
    </div>
  );
};
