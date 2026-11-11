import { useState, type ReactNode } from 'react';
import { Globe, Palette, Type, Brain, ListChecks, Database, Bell, Info, Download, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TopBar } from '@/components/TopBar';
import { Modal } from '@/components/Modal';
import { resetAllData, getAllDecks, getCardsInDeck } from '@/db/repos';
import { getAllCardsWithDeck } from '@/db/sm2';
import { exportCsv, exportJson, downloadFile } from '@/lib/csv';
import { requestReminderPermission } from '@/lib/reminder';
import { toPersianDigits } from '@/lib/normalize';
import type { Lang, ThemeMode, FontSize } from '@/lib/theme';

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="card-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700 dark:text-ink-200">
        <span className="text-brand-600 dark:text-brand-400">{icon}</span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1.5 rounded-xl bg-ink-100 p-1 dark:bg-ink-700" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-lg py-2 text-sm font-medium transition ${
            value === o.value
              ? 'bg-white text-brand-700 shadow-sm dark:bg-ink-800 dark:text-brand-300'
              : 'text-ink-500 hover:text-ink-800 dark:text-ink-300 dark:hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-700 dark:text-ink-200">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-500' : 'bg-ink-300 dark:bg-ink-600'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'start-[22px]' : 'start-0.5'}`}
      />
    </button>
  );
}

export function SettingsScreen() {
  const { t, lang, theme, fontSize, settings, updateLang, updateTheme, updateFontSize, updateSetting } = useApp();
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');

  const num = (n: number | string) => (lang === 'fa' ? toPersianDigits(n) : String(n));

  const handleExportCsv = () => {
    const rows = getAllCardsWithDeck().map((c) => ({ question: c.question, answer: c.answer }));
    downloadFile('neurocards.csv', exportCsv(rows), 'text/csv;charset=utf-8');
  };

  const handleExportJson = () => {
    const data = getAllDecks().map((d) => ({
      name: d.name,
      cards: getCardsInDeck(d.id).map((c) => ({ question: c.question, answer: c.answer })),
    }));
    downloadFile('neurocards.json', exportJson(data), 'application/json');
  };

  const handleReset = async () => {
    setResetting(true);
    await resetAllData();
    window.location.hash = '#/';
    window.location.reload();
  };

  const handleReminderToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestReminderPermission();
      if (!granted) {
        setReminderMsg(t('enableReminder'));
        return;
      }
      if (!settings.reminder_time) updateSetting('reminder_time', '20:00');
    }
    setReminderMsg('');
    updateSetting('reminder_enabled', enabled ? '1' : '0');
  };

  return (
    <div className="space-y-4 pb-28">
      <TopBar title={t('settings')} />

      <div className="space-y-4 px-4 pt-4">
        <Section icon={<Globe size={18} />} title={t('language')}>
          <Segmented<Lang>
            value={lang}
            options={[
              { value: 'fa', label: 'فارسی' },
              { value: 'en', label: 'English' },
            ]}
            onChange={updateLang}
          />
        </Section>

        <Section icon={<Palette size={18} />} title={t('theme')}>
          <Segmented<ThemeMode>
            value={theme}
            options={[
              { value: 'auto', label: t('auto') },
              { value: 'light', label: t('light') },
              { value: 'dark', label: t('dark') },
            ]}
            onChange={updateTheme}
          />
        </Section>

        <Section icon={<Type size={18} />} title={t('fontSize')}>
          <Segmented<FontSize>
            value={fontSize}
            options={[
              { value: 'sm', label: t('small') },
              { value: 'md', label: t('medium') },
              { value: 'lg', label: t('large') },
            ]}
            onChange={updateFontSize}
          />
        </Section>

        <Section icon={<Brain size={18} />} title={t('studySettings')}>
          <Row label={t('direction')}>
            <div className="w-56">
              <Segmented
                value={settings.study_direction ?? 'forward'}
                options={[
                  { value: 'forward', label: t('forward') },
                  { value: 'reverse', label: t('reverse') },
                  { value: 'both', label: t('both') },
                ]}
                onChange={(v) => updateSetting('study_direction', v)}
              />
            </div>
          </Row>
          <Row label={`${t('dailyLimit')}: ${num(settings.daily_limit ?? '50')}`}>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={Number(settings.daily_limit ?? '50')}
              onChange={(e) => updateSetting('daily_limit', e.target.value)}
              className="w-40 accent-brand-600"
              aria-label={t('dailyLimit')}
            />
          </Row>
          <Row label={t('showTimer')}>
            <Toggle
              label={t('showTimer')}
              checked={settings.show_timer === '1'}
              onChange={(v) => updateSetting('show_timer', v ? '1' : '0')}
            />
          </Row>
        </Section>

        <Section icon={<ListChecks size={18} />} title={t('quizSettings')}>
          <Row label={t('quizType')}>
            <div className="w-64">
              <Segmented
                value={settings.quiz_type ?? 'mcq'}
                options={[
                  { value: 'mcq', label: t('mcq') },
                  { value: 'typein', label: t('typeIn') },
                  { value: 'tf', label: t('trueFalse') },
                ]}
                onChange={(v) => updateSetting('quiz_type', v)}
              />
            </div>
          </Row>
          <Row label={`${t('questionCount')}: ${num(settings.quiz_count ?? '10')}`}>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={Number(settings.quiz_count ?? '10')}
              onChange={(e) => updateSetting('quiz_count', e.target.value)}
              className="w-40 accent-brand-600"
              aria-label={t('questionCount')}
            />
          </Row>
          <Row label={t('shuffle')}>
            <Toggle
              label={t('shuffle')}
              checked={settings.quiz_shuffle === '1'}
              onChange={(v) => updateSetting('quiz_shuffle', v ? '1' : '0')}
            />
          </Row>
        </Section>

        <Section icon={<Bell size={18} />} title={t('notifications')}>
          <Row label={t('enableReminder')}>
            <Toggle
              label={t('enableReminder')}
              checked={settings.reminder_enabled === '1'}
              onChange={handleReminderToggle}
            />
          </Row>
          {settings.reminder_enabled === '1' && (
            <Row label={t('reminderTime')}>
              <input
                type="time"
                value={settings.reminder_time || '20:00'}
                onChange={(e) => updateSetting('reminder_time', e.target.value)}
                className="field-input w-auto py-2 text-sm"
              />
            </Row>
          )}
          {reminderMsg && <p className="text-xs text-red-500">{reminderMsg}</p>}
        </Section>

        <Section icon={<Database size={18} />} title={t('data')}>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExportCsv} className="ghost-btn text-sm">
              <Download size={16} />
              {t('exportCsv')}
            </button>
            <button onClick={handleExportJson} className="ghost-btn text-sm">
              <Download size={16} />
              {t('exportJson')}
            </button>
          </div>
          <button onClick={() => setShowReset(true)} className="danger-btn w-full text-sm">
            <Trash2 size={16} />
            {t('resetData')}
          </button>
        </Section>

        <Section icon={<Info size={18} />} title={t('about')}>
          <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{t('aboutText')}</p>
        </Section>
      </div>

      <Modal
        open={showReset}
        onClose={() => setShowReset(false)}
        title={t('resetData')}
        footer={
          <>
            <button onClick={() => setShowReset(false)} className="ghost-btn flex-1">{t('cancel')}</button>
            <button onClick={handleReset} disabled={resetting} className="danger-btn flex-1">{t('confirm')}</button>
          </>
        }
      >
        <p className="text-sm text-ink-600 dark:text-ink-300">{t('resetConfirm')}</p>
      </Modal>
    </div>
  );
}
