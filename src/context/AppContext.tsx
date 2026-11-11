import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { ensureSeeded } from '@/db/repos';
import { getSetting, setSetting, getAllSettings } from '@/db/settings';
import { applyTheme, applyFontSize, applyLang, watchSystemTheme, type ThemeMode, type Lang, type FontSize } from '@/lib/theme';
import { t as translate } from '@/lib/i18n';

interface AppContextValue {
  ready: boolean;
  lang: Lang;
  theme: ThemeMode;
  fontSize: FontSize;
  settings: Record<string, string>;
  t: (key: string) => string;
  updateLang: (l: Lang) => void;
  updateTheme: (tm: ThemeMode) => void;
  updateFontSize: (fs: FontSize) => void;
  updateSetting: (key: string, value: string) => void;
  refreshSettings: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Lang>('fa');
  const [theme, setTheme] = useState<ThemeMode>('auto');
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [settings, setSettings] = useState<Record<string, string>>({});

  const refreshSettings = useCallback(() => {
    const all = getAllSettings();
    setSettings(all);
    return all;
  }, []);

  useEffect(() => {
    (async () => {
      await ensureSeeded();
      const all = getAllSettings();
      const l = (all.lang as Lang) || 'fa';
      const tm = (all.theme as ThemeMode) || 'auto';
      const fs = (all.font_size as FontSize) || 'md';
      setLang(l);
      setTheme(tm);
      setFontSize(fs);
      setSettings(all);
      applyLang(l);
      applyTheme(tm);
      applyFontSize(fs);
      setReady(true);
    })();
  }, []);

  // React to system theme changes in auto mode
  useEffect(() => {
    if (!ready) return;
    watchSystemTheme(() => {
      const current = getSetting('theme');
      if (current === 'auto') applyTheme('auto');
    });
  }, [ready]);

  const updateLang = useCallback((l: Lang) => {
    setLang(l);
    setSetting('lang', l);
    applyLang(l);
    setSettings((s) => ({ ...s, lang: l }));
  }, []);

  const updateTheme = useCallback((tm: ThemeMode) => {
    setTheme(tm);
    setSetting('theme', tm);
    applyTheme(tm);
    setSettings((s) => ({ ...s, theme: tm }));
  }, []);

  const updateFontSize = useCallback((fs: FontSize) => {
    setFontSize(fs);
    setSetting('font_size', fs);
    applyFontSize(fs);
    setSettings((s) => ({ ...s, font_size: fs }));
  }, []);

  const updateSetting = useCallback((key: string, value: string) => {
    setSetting(key, value);
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const tFn = useCallback((key: string) => translate(key, lang), [lang]);

  return (
    <AppContext.Provider
      value={{ ready, lang, theme, fontSize, settings, t: tFn, updateLang, updateTheme, updateFontSize, updateSetting, refreshSettings }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
