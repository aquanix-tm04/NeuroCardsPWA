export type ThemeMode = 'auto' | 'light' | 'dark';
export type Lang = 'fa' | 'en';
export type FontSize = 'sm' | 'md' | 'lg';

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const isDark =
    mode === 'dark' ||
    (mode === 'auto' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
}

export function applyFontSize(size: FontSize): void {
  document.documentElement.dataset.fs = size;
}

export function applyLang(lang: Lang): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
}

// Listen to system theme changes when in auto mode
let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

export function watchSystemTheme(cb: () => void): void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaListener) mq.removeEventListener('change', mediaListener);
  mediaListener = () => cb();
  mq.addEventListener('change', mediaListener);
}
