/**
 * useNotifications.ts
 *
 * PWA push notification and local reminder scheduling.
 *
 * Strategy:
 * - Request notification permission on first setup
 * - Store reminder time in settings
 * - Use ServiceWorker Background Sync + scheduled notifications
 * - For Firebase Cloud Messaging: register FCM token
 */

import { useEffect, useCallback, useState } from 'react';
import { getFirebaseMessaging } from '@/services/firebase/firebase';
import { getToken } from 'firebase/messaging';
import { DailyReminderSettings } from '@/types/settings';

export interface NotificationPermissionState {
  permission: NotificationPermission | 'unsupported';
  fcmToken: string | null;
  requestPermission: () => Promise<boolean>;
  scheduleReminder: (settings: DailyReminderSettings) => void;
  cancelReminder: () => void;
}

const REMINDER_KEY = 'naam-jap:v1:reminder-timer';
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';

export function useNotifications(): NotificationPermissionState {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  // Try to get FCM token if permission granted and Firebase configured
  useEffect(() => {
    if (permission !== 'granted' || !VAPID_KEY) return;
    const messaging = getFirebaseMessaging();
    if (!messaging) return;
    getToken(messaging, { vapidKey: VAPID_KEY })
      .then((token) => setFcmToken(token))
      .catch(() => {});
  }, [permission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);

  const scheduleReminder = useCallback((settings: DailyReminderSettings) => {
    if (!settings.enabled || permission !== 'granted') return;

    // Calculate ms until next reminder time
    const now = new Date();
    const next = new Date();
    next.setHours(settings.hour, settings.minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1); // tomorrow

    const msUntil = next.getTime() - now.getTime();

    // Clear existing timer
    const existingId = localStorage.getItem(REMINDER_KEY);
    if (existingId) clearTimeout(parseInt(existingId));

    // Schedule
    const timerId = window.setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('नाम जप याद है? 🙏', {
          body: `${settings.label} — आज का जप करें`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'daily-reminder',
        });
      }
      // Reschedule for tomorrow
      scheduleReminder(settings);
    }, msUntil);

    localStorage.setItem(REMINDER_KEY, timerId.toString());
  }, [permission]);

  const cancelReminder = useCallback(() => {
    const existingId = localStorage.getItem(REMINDER_KEY);
    if (existingId) {
      clearTimeout(parseInt(existingId));
      localStorage.removeItem(REMINDER_KEY);
    }
  }, []);

  return {
    permission,
    fcmToken,
    requestPermission,
    scheduleReminder,
    cancelReminder,
  };
}
