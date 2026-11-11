import { queryOne, queryAll, run } from './database';

const DEFAULTS: Record<string, string> = {
  lang: 'fa',
  theme: 'auto',
  font_size: 'md',
  study_direction: 'forward',
  daily_limit: '50',
  show_timer: '0',
  quiz_type: 'mcq',
  quiz_count: '10',
  quiz_shuffle: '1',
  reminder_time: '',
  reminder_enabled: '0',
};

export function getSetting(key: string): string {
  const row = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? DEFAULTS[key] ?? '';
}

export function setSetting(key: string, value: string): void {
  run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

export function getAllSettings(): Record<string, string> {
  const rows = queryAll<{ key: string; value: string }>('SELECT key, value FROM settings');
  const out: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) {
    out[r.key] = r.value;
  }
  return out;
}
