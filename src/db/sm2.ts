import { queryAll, queryOne, run, uid } from './database';
import type { Rating, Review } from './types';

export interface Sm2State {
  ease: number;
  interval: number;
  repetitions: number;
  next_due: number;
}

/**
 * SM-2 spaced repetition algorithm.
 * rating: 1=Again, 2=Hard, 3=Good, 4=Easy
 */
export function sm2(prev: Sm2State | null, rating: Rating, now: number = Date.now()): Sm2State {
  const ease = prev?.ease ?? 2.5;
  const interval = prev?.interval ?? 0;
  const repetitions = prev?.repetitions ?? 0;

  let newEase = ease;
  let newReps = repetitions;
  let newInterval: number;

  if (rating === 1) {
    // Again — reset
    newReps = 0;
    newInterval = 1; // show again within a day
    newEase = Math.max(1.3, ease - 0.2);
  } else {
    const q = rating === 2 ? 3 : rating === 3 ? 4 : 5; // map to quality scale
    newReps = repetitions + 1;

    if (newReps === 1) {
      newInterval = rating === 4 ? 2 : 1;
    } else if (newReps === 2) {
      newInterval = rating === 4 ? 6 : rating === 3 ? 3 : 2;
    } else {
      newInterval = Math.round(interval * ease);
      if (rating === 2) newInterval = Math.max(1, Math.round(newInterval * 0.8));
      if (rating === 4) newInterval = Math.round(newInterval * 1.3);
    }

    newEase = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const nextDue = now + newInterval * dayMs;

  return {
    ease: Math.round(newEase * 100) / 100,
    interval: newInterval,
    repetitions: newReps,
    next_due: nextDue,
  };
}

export function getCardState(cardId: string): Sm2State | null {
  const last = queryOne<{ rating: number; reviewed_at: number; next_due: number }>(
    'SELECT rating, reviewed_at, next_due FROM reviews WHERE card_id = ? ORDER BY reviewed_at DESC LIMIT 1',
    [cardId]
  );
  if (!last) return null;
  // Reconstruct approximate state from review history
  const all = queryAll<{ rating: number; reviewed_at: number; next_due: number }>(
    'SELECT rating, reviewed_at, next_due FROM reviews WHERE card_id = ? ORDER BY reviewed_at ASC',
    [cardId]
  );
  let state: Sm2State | null = null;
  for (const r of all) {
    state = sm2(state, r.rating as Rating, r.reviewed_at);
  }
  return state;
}

export function recordReview(cardId: string, rating: Rating, confidence?: number): Review {
  const state = getCardState(cardId);
  const next = sm2(state, rating);
  const review: Review = {
    id: uid('rev_'),
    card_id: cardId,
    rating,
    confidence: confidence ?? null,
    reviewed_at: Date.now(),
    next_due: next.next_due,
  };
  run(
    'INSERT INTO reviews (id, card_id, rating, confidence, reviewed_at, next_due) VALUES (?, ?, ?, ?, ?, ?)',
    [review.id, review.card_id, review.rating, review.confidence, review.reviewed_at, review.next_due]
  );
  return review;
}

export function undoLastReview(cardId: string): void {
  const last = queryOne<{ id: string }>(
    'SELECT id FROM reviews WHERE card_id = ? ORDER BY reviewed_at DESC LIMIT 1',
    [cardId]
  );
  if (last) run('DELETE FROM reviews WHERE id = ?', [last.id]);
}

export function previewIntervals(cardId: string): Record<Rating, { label: string; days: number }> {
  const state = getCardState(cardId);
  const dayMs = 24 * 60 * 60 * 1000;
  const results = {} as Record<Rating, { label: string; days: number }>;
  for (const r of [1, 2, 3, 4] as Rating[]) {
    const next = sm2(state, r);
    const days = Math.round((next.next_due - Date.now()) / dayMs);
    results[r] = { label: days <= 0 ? '<1d' : `${days}d`, days };
  }
  return results;
}

export function getDueCards(deckId?: string, limit?: number): Array<{ id: string; question: string; answer: string; deck_id: string; deck_name: string; card_type: string; blank_answer: string | null; flagged: number }> {
  const now = Date.now();
  let sql = `SELECT c.id, c.question, c.answer, c.deck_id, d.name AS deck_name, c.card_type, c.blank_answer, c.flagged
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     LEFT JOIN (
       SELECT card_id, MAX(next_due) AS next_due
       FROM reviews GROUP BY card_id
     ) r ON r.card_id = c.id
     WHERE r.next_due IS NULL OR r.next_due <= ?`;
  const params: unknown[] = [now];
  if (deckId) {
    sql += ' AND c.deck_id = ?';
    params.push(deckId);
  }
  sql += ' ORDER BY COALESCE(r.next_due, 0) ASC';
  if (limit) sql += ` LIMIT ${limit}`;
  return queryAll(sql, params);
}

export function countDueToday(): number {
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

export function getAllCardsWithDeck(): Array<{ id: string; question: string; answer: string; deck_id: string; deck_name: string; card_type: string; blank_answer: string | null; flagged: number }> {
  return queryAll(
    `SELECT c.id, c.question, c.answer, c.deck_id, d.name AS deck_name, c.card_type, c.blank_answer, c.flagged
     FROM cards c JOIN decks d ON d.id = c.deck_id
     ORDER BY d.created_at DESC, c.created_at ASC`
  );
}
