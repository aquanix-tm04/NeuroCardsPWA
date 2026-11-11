import { Home, Brain, ListChecks, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { useNav } from '@/context/NavContext';
import { useApp } from '@/context/AppContext';

export function TabBar() {
  const { tab, navigate } = useNav();
  const { t } = useApp();

  const items = [
    { key: 'home', icon: Home, label: t('home') },
    { key: 'study', icon: Brain, label: t('study') },
    { key: 'quiz', icon: ListChecks, label: t('quiz') },
    { key: 'stats', icon: BarChart3, label: t('stats') },
    { key: 'settings', icon: SettingsIcon, label: t('settings') },
  ] as const;

  return (
    <nav
      className="tab-bar fixed bottom-0 left-1/2 z-40 flex w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-ink-200/70 bg-white/90 px-2 pt-1.5 backdrop-blur-md dark:border-ink-700/70 dark:bg-ink-900/90"
      role="tablist"
      aria-label="Navigation"
    >
      {items.map(({ key, icon: Icon, label }) => {
        const active = tab === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => navigate({ name: key as 'home' | 'study' | 'quiz' | 'stats' | 'settings' })}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 transition ${
              active ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400 dark:text-ink-500'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 2} />
            <span className="text-[10px] font-medium leading-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
