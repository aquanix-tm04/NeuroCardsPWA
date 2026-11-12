import { type ReactNode } from 'react';
import { ChevronLeft, Monitor, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNav } from '@/context/NavContext';
import { useAuth } from '@/context/AuthContext';
import { SyncIndicator } from '@/components/SyncIndicator';
import type { ThemeMode } from '@/lib/theme';

interface Props {
  title?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
}

export function TopBar({ title, showBack, rightAction }: Props) {
  const { t, theme, updateTheme } = useApp();
  const { goBack, navigate } = useNav();
  const { state: authState } = useAuth();

  const cycleTheme = () => {
    const order: ThemeMode[] = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    updateTheme(next);
  };

  const ThemeIcon = theme === 'auto' ? Monitor : theme === 'dark' ? Moon : Sun;

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-2 border-b border-ink-200/60 bg-white/90 px-3 py-2.5 backdrop-blur-md dark:border-ink-700/60 dark:bg-ink-900/90"
      style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}
    >
      {showBack ? (
        <button
          onClick={goBack}
          className="icon-btn"
          aria-label={t('backHome')}
        >
          <ChevronLeft size={22} className="rotate-180 rtl:rotate-0" />
        </button>
      ) : null}

      <h1 className="flex-1 truncate text-lg font-bold text-ink-900 dark:text-white">
        {title ?? t('appName')}
      </h1>

      {authState === 'authenticated' && <SyncIndicator />}

      {rightAction}

      <button onClick={cycleTheme} className="icon-btn" aria-label={t('theme')}>
        <ThemeIcon size={20} />
      </button>

      {!showBack && (
        <button
          onClick={() => navigate({ name: 'settings' })}
          className="icon-btn"
          aria-label={t('settings')}
        >
          <SettingsIcon size={20} />
        </button>
      )}
    </header>
  );
}
