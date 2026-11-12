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
