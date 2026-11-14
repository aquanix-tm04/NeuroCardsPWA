import { queryAll, queryOne } from './database';

export function getOverallAccuracy(): number {
  const r = queryOne<{ total: number; correct: number }>(
    `SELECT COUNT(*) as total, SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) as correct FROM reviews`
  );
  if (!r || !r.total) return 0;
  return Math.round((Number(r.correct) / Number(r.total)) * 100);
}

export function getRatingBreakdown(): { rating: number; count: number }[] {
  const rows = queryAll<{ rating: number; count: number }>(
    `SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating ORDER BY rating ASC`
  );
  const map = new Map(rows.map((r) => [Number(r.rating), Number(r.count)]));
  return [1, 2, 3, 4].map((rating) => ({ rating, count: map.get(rating) ?? 0 }));
}

export function getActivityHeatmap(days = 30): { date: string; count: number }[] {
  const rows = queryAll<{ d: string; count: number }>(
    `SELECT DATE(reviewed_at / 1000, 'unixepoch', 'localtime') as d, COUNT(*) as count
     FROM reviews
     WHERE reviewed_at >= ?
     GROUP BY d ORDER BY d ASC`,
    [Date.now() - days * 24 * 60 * 60 * 1000]
  );
  return rows.map((r) => ({ date: r.d, count: Number(r.count) }));
}

export function getLeechCards(limit = 20): { id: string; question: string; deck_name: string; again_count: number; total: number }[] {
  return queryAll(
    `SELECT c.id, c.question, d.name AS deck_name,
       SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) AS again_count,
       COUNT(r.id) AS total
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     JOIN reviews r ON r.card_id = c.id
     GROUP BY c.id
     HAVING again_count >= 2
     ORDER BY again_count DESC, total DESC
     LIMIT ?`,
    [limit]
  ).map((r) => ({
    id: r.id as string,
    question: r.question as string,
    deck_name: r.deck_name as string,
    again_count: Number(r.again_count),
    total: Number(r.total),
  }));
}

export function getStreakDays(): number {
  const rows = queryAll<{ d: string }>(
    `SELECT DISTINCT DATE(reviewed_at / 1000, 'unixepoch', 'localtime') as d
     FROM reviews ORDER BY d DESC`
  );
  if (rows.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let cursor = today.getTime();
  let skipped = 0;

  for (const row of rows) {
    const d = new Date(row.d + 'T00:00:00').getTime();
    if (d === cursor) {
      streak++;
      cursor -= 24 * 60 * 60 * 1000;
    } else if (d < cursor) {
      const gapDays = Math.round((cursor - d) / (24 * 60 * 60 * 1000));
      if (gapDays === 2 && skipped === 0) {
        skipped = 1;
        cursor = d;
        streak++;
        cursor -= 24 * 60 * 60 * 1000;
      } else {
        break;
      }
    }
  }
  return streak;
}

export function getReviewsToday(): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const r = queryOne<{ c: number }>(
    'SELECT COUNT(*) as c FROM reviews WHERE reviewed_at >= ?',
    [todayStart.getTime()]
  );
  return r ? Number(r.c) : 0;
}

export function getDueTodayCount(): number {
  const now = Date.now();
  const r = queryOne<{ c: number }>(
    `SELECT COUNT(*) as c FROM cards c
     LEFT JOIN (SELECT card_id, MAX(next_due) AS next_due FROM reviews GROUP BY card_id) r
       ON r.card_id = c.id
     WHERE r.next_due IS NULL OR r.next_due <= ?`,
    [now]
  );
  return r ? Number(r.c) : 0;
}

/** Retention rate: % of reviews rated >= 3 (good/easy) within the last N days. */
export function getRetentionRate(days = 30): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const r = queryOne<{ total: number; retained: number }>(
    `SELECT COUNT(*) as total,
       SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) as retained
     FROM reviews WHERE reviewed_at >= ?`,
    [cutoff]
  );
  if (!r || !r.total) return 0;
  return Math.round((Number(r.retained) / Number(r.total)) * 100);
}

/** Daily review counts for the last N days, oldest first. */
export function getDailyReviewCounts(days = 14): { date: string; count: number }[] {
  const rows = queryAll<{ d: string; count: number }>(
    `SELECT DATE(reviewed_at / 1000, 'unixepoch', 'localtime') as d, COUNT(*) as count
     FROM reviews
     WHERE reviewed_at >= ?
     GROUP BY d ORDER BY d ASC`,
    [Date.now() - days * 24 * 60 * 60 * 1000]
  );
  return rows.map((r) => ({ date: r.d, count: Number(r.count) }));
}

/** Daily retention (rating >= 3 pct) for the last N days, oldest first. */
export function getDailyRetention(days = 14): { date: string; rate: number; total: number }[] {
  const rows = queryAll<{ d: string; total: number; retained: number }>(
    `SELECT DATE(reviewed_at / 1000, 'unixepoch', 'localtime') as d,
       COUNT(*) as total,
       SUM(CASE WHEN rating >= 3 THEN 1 ELSE 0 END) as retained
     FROM reviews
     WHERE reviewed_at >= ?
     GROUP BY d ORDER BY d ASC`,
    [Date.now() - days * 24 * 60 * 60 * 1000]
  );
  return rows.map((r) => ({
    date: r.d,
    total: Number(r.total),
    rate: r.total > 0 ? Math.round((Number(r.retained) / Number(r.total)) * 100) : 0,
  }));
}

/** Longest streak ever (with one-skip-per-week forgiveness). */
export function getLongestStreak(): number {
  const rows = queryAll<{ d: string }>(
    `SELECT DISTINCT DATE(reviewed_at / 1000, 'unixepoch', 'localtime') as d
     FROM reviews ORDER BY d ASC`
  );
  if (rows.length === 0) return 0;

  const DAY = 24 * 60 * 60 * 1000;
  let best = 0;
  let current = 0;
  let cursor = new Date(rows[0].d + 'T00:00:00').getTime();
  let lastSkips = 0;

  for (const row of rows) {
    const d = new Date(row.d + 'T00:00:00').getTime();
    if (d === cursor) {
      current++;
      cursor += DAY;
    } else if (d > cursor) {
      const gapDays = Math.round((d - cursor) / DAY);
      if (gapDays === 2 && lastSkips === 0) {
        lastSkips = 1;
        current++;
        cursor = d + DAY;
      } else {
        best = Math.max(best, current);
        current = 1;
        cursor = d + DAY;
        lastSkips = 0;
      }
    }
  }
  return Math.max(best, current);
}

/** Per-deck retention rate and total reviews. */
export function getDeckStats(): { deck_id: string; deck_name: string; total: number; retained: number; rate: number }[] {
  const rows = queryAll<{ deck_id: string; deck_name: string; total: number; retained: number }>(
    `SELECT d.id as deck_id, d.name as deck_name,
       COUNT(r.id) as total,
       SUM(CASE WHEN r.rating >= 3 THEN 1 ELSE 0 END) as retained
     FROM decks d
     JOIN cards c ON c.deck_id = d.id
     LEFT JOIN reviews r ON r.card_id = c.id
     GROUP BY d.id, d.name
     HAVING total > 0
     ORDER BY total DESC`
  );
  return rows.map((r) => ({
    deck_id: r.deck_id as string,
    deck_name: r.deck_name as string,
    total: Number(r.total),
    retained: Number(r.retained),
    rate: r.total > 0 ? Math.round((Number(r.retained) / Number(r.total)) * 100) : 0,
  }));
}

/** Total cards studied (cards with at least one review). */
export function getTotalCardsStudied(): number {
  const r = queryOne<{ c: number }>(
    `SELECT COUNT(DISTINCT card_id) as c FROM reviews`
  );
  return r ? Number(r.c) : 0;
}
