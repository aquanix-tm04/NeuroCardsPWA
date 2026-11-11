import { getAllSettings, setSetting } from '@/db/settings';
import { countDueToday } from '@/db/sm2';

export async function requestReminderPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function todayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function checkReminder(): void {
  const settings = getAllSettings();
  if (settings.reminder_enabled !== '1' || !settings.reminder_time) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const [hh, mm] = settings.reminder_time.split(':').map(Number);
  if (now.getHours() < hh || (now.getHours() === hh && now.getMinutes() < mm)) return;

  const today = todayKey(now);
  if (settings.reminder_last_fired === today) return;

  const due = countDueToday();
  if (due > 0) {
    new Notification('NeuroCards', { body: `${due} card(s) due today`, icon: '/icon.svg' });
  }
  setSetting('reminder_last_fired', today);
}

/** Fires the daily reminder while the app is open. */
export function startReminderWatcher(): () => void {
  checkReminder();
  const id = window.setInterval(checkReminder, 60_000);
  return () => window.clearInterval(id);
}
