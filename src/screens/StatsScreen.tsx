import { useMemo } from 'react';
import { Flame, Target, Flag, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TopBar } from '@/components/TopBar';
import { EmptyState } from '@/components/EmptyState';
import { LatexContent } from '@/components/LatexContent';
import { getOverallAccuracy, getRatingBreakdown, getActivityHeatmap, getLeechCards, getStreakDays } from '@/db/stats';
import type { Rating } from '@/db/types';
import { toPersianDigits } from '@/lib/normalize';

const DAY_MS = 24 * 60 * 60 * 1000;

const RATING_KEYS: Record<Rating, string> = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' };

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function StatsScreen() {
  const { t, lang } = useApp();
  const num = (n: number) => (lang === 'fa' ? toPersianDigits(n) : String(n));

  const accuracy = useMemo(() => getOverallAccuracy(), []);
  const breakdown = useMemo(() => getRatingBreakdown(), []);
  const streak = useMemo(() => getStreakDays(), []);
  const leeches = useMemo(() => getLeechCards(), []);
  const activity = useMemo(() => getActivityHeatmap(30), []);

  const totalReviews = breakdown.reduce((sum, b) => sum + b.count, 0);
  const maxBreakdown = Math.max(1, ...breakdown.map((b) => b.count));

  const heatmap = useMemo(() => {
    const counts = new Map(activity.map((a) => [a.date, a.count]));
    const cells: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = dateKey(new Date(Date.now() - i * DAY_MS));
      cells.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return cells;
  }, [activity]);
  const maxHeat = Math.max(1, ...heatmap.map((c) => c.count));

  const heatClass = (count: number) => {
    if (count === 0) return 'bg-ink-100 dark:bg-ink-700';
    const ratio = count / maxHeat;
    if (ratio > 0.75) return 'bg-brand-600';
    if (ratio > 0.5) return 'bg-brand-500';
    if (ratio > 0.25) return 'bg-brand-400';
    return 'bg-brand-200 dark:bg-brand-800';
  };

  if (totalReviews === 0) {
    return (
      <div className="pb-28">
        <TopBar title={t('stats')} />
        <EmptyState icon={<Target size={28} />} title={t('noResults')} message={t('studyDeck')} />
      </div>
    );
  }

  const barColors: Record<Rating, string> = {
    1: 'bg-red-500',
    2: 'bg-accent-500',
    3: 'bg-brand-500',
    4: 'bg-sky-500',
  };

  return (
    <div className="pb-28">
      <TopBar title={t('stats')} />

      <div className="space-y-4 px-4 pt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="card-surface flex flex-col items-center gap-1 p-4 text-center">
            <Target size={20} className="text-brand-600 dark:text-brand-400" />
            <p className="text-xl font-bold text-ink-900 dark:text-white">{num(accuracy)}%</p>
            <p className="text-[11px] text-ink-400 dark:text-ink-500">{t('accuracy')}</p>
          </div>
          <div className="card-surface flex flex-col items-center gap-1 p-4 text-center">
            <Flame size={20} className="text-accent-500" />
            <p className="text-xl font-bold text-ink-900 dark:text-white">{num(streak)}</p>
            <p className="text-[11px] text-ink-400 dark:text-ink-500">{t('streak')}</p>
          </div>
          <div className="card-surface flex flex-col items-center gap-1 p-4 text-center">
            <Flag size={20} className="text-sky-500" />
            <p className="text-xl font-bold text-ink-900 dark:text-white">{num(totalReviews)}</p>
            <p className="text-[11px] text-ink-400 dark:text-ink-500">{t('totalReviews')}</p>
          </div>
        </div>

        <section className="card-surface p-5">
          <h2 className="mb-4 text-sm font-bold text-ink-700 dark:text-ink-200">{t('breakdown')}</h2>
          <div className="space-y-3">
            {breakdown.map((b) => (
              <div key={b.rating}>
                <div className="mb-1 flex justify-between text-xs text-ink-500 dark:text-ink-400">
                  <span>{t(RATING_KEYS[b.rating as Rating])}</span>
                  <span className="tabular-nums">{num(b.count)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
                  <div
                    className={`h-full rounded-full ${barColors[b.rating as Rating]} transition-all duration-500`}
                    style={{ width: `${(b.count / maxBreakdown) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-4 text-sm font-bold text-ink-700 dark:text-ink-200">{t('activity')}</h2>
          <div className="grid grid-cols-10 gap-1.5" dir="ltr">
            {heatmap.map((cell) => (
              <div
                key={cell.date}
                title={`${cell.date}: ${cell.count}`}
                aria-label={`${cell.date}: ${cell.count}`}
                className={`heat-cell aspect-square rounded-md ${heatClass(cell.count)} hover:scale-110`}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-ink-400">
            <span>{t('less')}</span>
            {['bg-ink-100 dark:bg-ink-700', 'bg-brand-200 dark:bg-brand-800', 'bg-brand-400', 'bg-brand-600'].map((c) => (
              <span key={c} className={`h-3 w-3 rounded-sm ${c}`} />
            ))}
            <span>{t('more')}</span>
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-700 dark:text-ink-200">
            <AlertTriangle size={16} className="text-accent-500" />
            {t('leechCards')}
          </h2>
          {leeches.length === 0 ? (
            <EmptyState title={t('noResults')} />
          ) : (
            <div className="space-y-2">
              {leeches.map((card) => (
                <div key={card.id} className="card-surface p-4">
                  <LatexContent text={card.question} className="text-sm font-medium text-ink-900 dark:text-white" />
                  <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">
                    {card.deck_name} · {num(card.again_count)} / {num(card.total)} {t('again')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
