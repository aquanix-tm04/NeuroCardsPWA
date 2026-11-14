import { useMemo } from 'react';
import { Flame, Target, Flag, AlertTriangle, TrendingUp, Award, Layers, BarChart3 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TopBar } from '@/components/TopBar';
import { EmptyState } from '@/components/EmptyState';
import { LatexContent } from '@/components/LatexContent';
import {
  getOverallAccuracy,
  getRatingBreakdown,
  getActivityHeatmap,
  getLeechCards,
  getStreakDays,
  getRetentionRate,
  getDailyReviewCounts,
  getDailyRetention,
  getLongestStreak,
  getDeckStats,
  getTotalCardsStudied,
} from '@/db/stats';
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
  const numF = (n: number) => (lang === 'fa' ? toPersianDigits(n.toFixed(1)) : n.toFixed(1));

  const accuracy = useMemo(() => getOverallAccuracy(), []);
  const breakdown = useMemo(() => getRatingBreakdown(), []);
  const streak = useMemo(() => getStreakDays(), []);
  const longestStreak = useMemo(() => getLongestStreak(), []);
  const leeches = useMemo(() => getLeechCards(), []);
  const activity = useMemo(() => getActivityHeatmap(30), []);
  const retention = useMemo(() => getRetentionRate(30), []);
  const cardsStudied = useMemo(() => getTotalCardsStudied(), []);
  const deckStats = useMemo(() => getDeckStats(), []);
  const dailyCounts = useMemo(() => getDailyReviewCounts(14), []);
  const dailyRetention = useMemo(() => getDailyRetention(14), []);

  const totalReviews = breakdown.reduce((sum, b) => sum + b.count, 0);
  const maxBreakdown = Math.max(1, ...breakdown.map((b) => b.count));

  // 14-day review bar chart data — fill gaps for days with zero reviews
  const reviewBars = useMemo(() => {
    const counts = new Map(dailyCounts.map((d) => [d.date, d.count]));
    const bars: { date: string; count: number; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(Date.now() - i * DAY_MS);
      const key = dateKey(dt);
      const count = counts.get(key) ?? 0;
      const label = lang === 'fa'
        ? toPersianDigits(`${dt.getMonth() + 1}/${dt.getDate()}`)
        : `${dt.getMonth() + 1}/${dt.getDate()}`;
      bars.push({ date: key, count, label });
    }
    return bars;
  }, [dailyCounts, lang]);
  const maxReview = Math.max(1, ...reviewBars.map((b) => b.count));
  const avgPerDay = totalReviews > 0 ? totalReviews / 14 : 0;
  const bestDay = Math.max(0, ...reviewBars.map((b) => b.count));

  // 14-day retention line chart data — fill gaps
  const retentionPoints = useMemo(() => {
    const map = new Map(dailyRetention.map((d) => [d.date, d]));
    const pts: { date: string; rate: number; total: number; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(Date.now() - i * DAY_MS);
      const key = dateKey(dt);
      const entry = map.get(key);
      const label = lang === 'fa'
        ? toPersianDigits(`${dt.getMonth() + 1}/${dt.getDate()}`)
        : `${dt.getMonth() + 1}/${dt.getDate()}`;
      pts.push({
        date: key,
        rate: entry?.rate ?? 0,
        total: entry?.total ?? 0,
        label,
      });
    }
    return pts;
  }, [dailyRetention, lang]);

  // Build SVG polyline points for retention line
  const retentionLine = useMemo(() => {
    const w = 100;
    const h = 60;
    const step = pts => {
      if (pts.length === 0) return '';
      return pts
        .map((p, i) => {
          const x = (i / Math.max(1, pts.length - 1)) * w;
          const y = h - (p.rate / 100) * h;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    };
    return step(retentionPoints);
  }, [retentionPoints]);

  // Heatmap (30 days)
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
        <EmptyState
          icon={<BarChart3 size={28} />}
          title={t('noResults')}
          message={t('noActivityYet')}
        />
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
        {/* Top metric cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={<Target size={18} className="text-brand-600 dark:text-brand-400" />} value={`${num(accuracy)}%`} label={t('accuracy')} />
          <MetricCard icon={<TrendingUp size={18} className="text-emerald-500" />} value={`${num(retention)}%`} label={t('retentionRate')} />
          <MetricCard icon={<Flame size={18} className="text-accent-500" />} value={num(streak)} label={t('streak')} />
          <MetricCard icon={<Award size={18} className="text-amber-500" />} value={num(longestStreak)} label={t('longestStreak')} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MetricCard icon={<Flag size={18} className="text-sky-500" />} value={num(totalReviews)} label={t('totalReviews')} />
          <MetricCard icon={<Layers size={18} className="text-violet-500" />} value={num(cardsStudied)} label={t('cardsStudied')} />
          <MetricCard icon={<BarChart3 size={18} className="text-teal-500" />} value={numF(avgPerDay)} label={t('avgPerDay')} />
        </div>

        {/* Review trend — 14-day bar chart */}
        <section className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-700 dark:text-ink-200">
              <BarChart3 size={16} className="text-brand-500" />
              {t('reviewTrend')}
            </h2>
            <span className="text-[11px] text-ink-400 dark:text-ink-500">
              {t('bestDay')}: {num(bestDay)}
            </span>
          </div>
          <div className="flex items-end justify-between gap-1" dir="ltr" style={{ height: '120px' }}>
            {reviewBars.map((bar) => (
              <div key={bar.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-[20px] rounded-t-md transition-all duration-500 ${
                      bar.count > 0
                        ? 'bg-gradient-to-t from-brand-400 to-brand-600'
                        : 'bg-ink-100 dark:bg-ink-700'
                    }`}
                    style={{ height: bar.count > 0 ? `${Math.max(4, (bar.count / maxReview) * 100)}%` : '3px' }}
                    title={`${bar.date}: ${bar.count}`}
                  />
                </div>
                <span className="text-[8px] text-ink-400 dark:text-ink-500">{bar.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Retention trend — 14-day line chart */}
        <section className="card-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-700 dark:text-ink-200">
            <TrendingUp size={16} className="text-emerald-500" />
            {t('retentionTrend')}
          </h2>
          <div className="relative" dir="ltr">
            <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-32 w-full">
              <line x1="0" y1="60" x2="100" y2="60" className="stroke-ink-200 dark:stroke-ink-700" strokeWidth="0.3" />
              <line x1="0" y1="30" x2="100" y2="30" className="stroke-ink-200 dark:stroke-ink-700" strokeWidth="0.2" strokeDasharray="1 1" />
              <line x1="0" y1="0" x2="100" y2="0" className="stroke-ink-200 dark:stroke-ink-700" strokeWidth="0.2" strokeDasharray="1 1" />
              {retentionLine && (
                <polyline
                  points={retentionLine}
                  fill="none"
                  className="stroke-emerald-500"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {retentionPoints.map((p, i) => {
                if (p.total === 0) return null;
                const x = (i / Math.max(1, retentionPoints.length - 1)) * 100;
                const y = 60 - (p.rate / 100) * 60;
                return (
                  <circle
                    key={p.date}
                    cx={x}
                    cy={y}
                    r="1"
                    className="fill-emerald-600 dark:fill-emerald-400"
                  />
                );
              })}
            </svg>
            <div className="mt-1 flex justify-between text-[8px] text-ink-400 dark:text-ink-500" dir="ltr">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[8px] text-ink-400 dark:text-ink-500">
            {retentionPoints.filter((_, i) => i % 3 === 0).map((p) => (
              <span key={p.date}>{p.label}</span>
            ))}
          </div>
        </section>

        {/* Answer breakdown */}
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

        {/* Activity heatmap */}
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

        {/* Per-deck stats */}
        {deckStats.length > 0 && (
          <section className="card-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-700 dark:text-ink-200">
              <Layers size={16} className="text-violet-500" />
              {t('perDeck')}
            </h2>
            <div className="space-y-3">
              {deckStats.map((ds) => (
                <div key={ds.deck_id}>
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
                    <span className="truncate font-medium text-ink-700 dark:text-ink-200">{ds.deck_name}</span>
                    <span className="tabular-nums whitespace-nowrap">
                      {num(ds.rate)}% · {num(ds.total)} {t('reviews')}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        ds.rate >= 80 ? 'bg-emerald-500' : ds.rate >= 60 ? 'bg-brand-500' : 'bg-accent-500'
                      }`}
                      style={{ width: `${ds.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Leech cards */}
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

function MetricCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card-surface flex flex-col items-center gap-1.5 p-3.5 text-center">
      {icon}
      <p className="text-lg font-bold leading-tight text-ink-900 dark:text-white">{value}</p>
      <p className="text-[10px] leading-tight text-ink-400 dark:text-ink-500">{label}</p>
    </div>
  );
}
