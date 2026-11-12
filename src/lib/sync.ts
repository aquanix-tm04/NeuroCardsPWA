import { supabase } from './supabase';
import { queryAll, run, queryOne } from '@/db/database';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

let currentStatus: SyncStatus = 'idle';
const listeners = new Set<(s: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function onSyncStatusChange(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function setStatus(s: SyncStatus) {
  currentStatus = s;
  for (const cb of listeners) cb(s);
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

interface CloudDeck {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface CloudCard {
  id: string;
  deck_id: string;
  user_id: string;
  question: string;
  answer: string;
  card_type: string;
  blank_answer: string | null;
  flagged: boolean;
  created_at: string;
  updated_at: string;
}

interface CloudReview {
  id: string;
  card_id: string;
  user_id: string;
  rating: number;
  confidence: number | null;
  reviewed_at: string;
  next_due: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toEpoch(ts: string | number): number {
  if (typeof ts === 'number') return ts;
  return new Date(ts).getTime();
}

export async function pushLocalToCloud(): Promise<void> {
  if (!supabase) return;
  if (!isOnline()) { setStatus('offline'); return; }

  setStatus('syncing');

  try {
    const localDecks = queryAll<{ id: string; name: string; created_at: number; updated_at: number; synced: number }>(
      'SELECT id, name, created_at, updated_at, synced FROM decks'
    );

    for (const d of localDecks) {
      const { error } = await supabase.from('decks').upsert({
        id: d.id,
        name: d.name,
        created_at: new Date(d.created_at).toISOString(),
        updated_at: new Date(d.updated_at || d.created_at).toISOString(),
      }, { onConflict: 'id' });
      if (error) throw error;
      run('UPDATE decks SET synced = 1 WHERE id = ?', [d.id]);
    }

    const localCards = queryAll<{ id: string; deck_id: string; question: string; answer: string; card_type: string; blank_answer: string | null; flagged: number; created_at: number; updated_at: number; synced: number }>(
      'SELECT id, deck_id, question, answer, card_type, blank_answer, flagged, created_at, updated_at, synced FROM cards'
    );

    for (const c of localCards) {
      const { error } = await supabase.from('cards').upsert({
        id: c.id,
        deck_id: c.deck_id,
        question: c.question,
        answer: c.answer,
        card_type: c.card_type || 'standard',
        blank_answer: c.blank_answer,
        flagged: c.flagged === 1,
        created_at: new Date(c.created_at).toISOString(),
        updated_at: new Date(c.updated_at).toISOString(),
      }, { onConflict: 'id' });
      if (error) throw error;
      run('UPDATE cards SET synced = 1 WHERE id = ?', [c.id]);
    }

    const localReviews = queryAll<{ id: string; card_id: string; rating: number; confidence: number | null; reviewed_at: number; next_due: number; synced: number }>(
      'SELECT id, card_id, rating, confidence, reviewed_at, next_due, synced FROM reviews WHERE synced = 0'
    );

    for (const r of localReviews) {
      const { error } = await supabase.from('reviews').upsert({
        id: r.id,
        card_id: r.card_id,
        rating: r.rating,
        confidence: r.confidence,
        reviewed_at: new Date(r.reviewed_at).toISOString(),
        next_due: new Date(r.next_due).toISOString(),
      }, { onConflict: 'id' });
      if (error) throw error;
      run('UPDATE reviews SET synced = 1 WHERE id = ?', [r.id]);
    }

    setStatus('synced');
  } catch (err) {
    console.error('Sync push error:', err);
    setStatus('error');
  }
}

export async function pullCloudToLocal(): Promise<void> {
  if (!supabase) return;
  if (!isOnline()) { setStatus('offline'); return; }

  setStatus('syncing');

  try {
    const { data: cloudDecks, error: dErr } = await supabase.from('decks').select('*');
    if (dErr) throw dErr;

    for (const d of cloudDecks as CloudDeck[]) {
      const existing = queryOne<{ id: string; updated_at: number }>(
        'SELECT id, updated_at FROM decks WHERE id = ?', [d.id]
      );
      const cloudUpdated = toEpoch(d.updated_at);
      if (!existing || (existing.updated_at || 0) < cloudUpdated) {
        run(
          'INSERT INTO decks (id, name, created_at, updated_at, synced) VALUES (?, ?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at, synced = 1',
          [d.id, d.name, toEpoch(d.created_at), cloudUpdated]
        );
      }
    }

    const localDeckIds = (queryAll<{ id: string }>('SELECT id FROM decks')).map((d) => d.id);
    if (localDeckIds.length === 0) { setStatus('synced'); return; }

    const { data: cloudCards, error: cErr } = await supabase.from('cards').select('*').in('deck_id', localDeckIds);
    if (cErr) throw cErr;

    for (const c of cloudCards as CloudCard[]) {
      const existing = queryOne<{ id: string; updated_at: number }>(
        'SELECT id, updated_at FROM cards WHERE id = ?', [c.id]
      );
      const cloudUpdated = toEpoch(c.updated_at);
      if (!existing || (existing.updated_at || 0) < cloudUpdated) {
        run(
          `INSERT INTO cards (id, deck_id, question, answer, card_type, blank_answer, flagged, created_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET question = excluded.question, answer = excluded.answer, card_type = excluded.card_type, blank_answer = excluded.blank_answer, flagged = excluded.flagged, updated_at = excluded.updated_at, synced = 1`,
          [c.id, c.deck_id, c.question, c.answer, c.card_type || 'standard', c.blank_answer, c.flagged ? 1 : 0, toEpoch(c.created_at), cloudUpdated]
        );
      }
    }

    const localCardIds = (queryAll<{ id: string }>('SELECT id FROM cards')).map((c) => c.id);
    if (localCardIds.length > 0) {
      const { data: cloudReviews, error: rErr } = await supabase.from('reviews').select('*').in('card_id', localCardIds);
      if (rErr) throw rErr;

      for (const r of cloudReviews as CloudReview[]) {
        const existing = queryOne<{ id: string }>('SELECT id FROM reviews WHERE id = ?', [r.id]);
        if (!existing) {
          run(
            'INSERT INTO reviews (id, card_id, rating, confidence, reviewed_at, next_due, synced) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(id) DO NOTHING',
            [r.id, r.card_id, r.rating, r.confidence, toEpoch(r.reviewed_at), toEpoch(r.next_due)]
          );
        }
      }
    }

    setStatus('synced');
  } catch (err) {
    console.error('Sync pull error:', err);
    setStatus('error');
  }
}

export async function fullSync(): Promise<void> {
  if (!supabase) return;
  if (!isOnline()) { setStatus('offline'); return; }
  await pushLocalToCloud();
  await pullCloudToLocal();
}

export async function transferLocalToCloud(): Promise<{ decks: number; cards: number; reviews: number }> {
  if (!supabase) return { decks: 0, cards: 0, reviews: 0 };
  if (!isOnline()) { setStatus('offline'); return { decks: 0, cards: 0, reviews: 0 }; }

  setStatus('syncing');

  try {
    const localDecks = queryAll<{ id: string; name: string; created_at: number; updated_at: number }>(
      'SELECT id, name, created_at, updated_at FROM decks'
    );
    const SEED_DECK_ID = 'seed-neuro-deck';

    for (const d of localDecks) {
      const { data: existing } = await supabase.from('decks').select('id').eq('id', d.id).maybeSingle();
      if (existing) continue;

      let newId = d.id;
      if (d.id === SEED_DECK_ID) {
        newId = crypto.randomUUID();
        const localCards = queryAll<{ id: string }>('SELECT id FROM cards WHERE deck_id = ?', [d.id]);
        for (const c of localCards) {
          const newCardId = crypto.randomUUID();
          const cardData = queryAll<{ question: string; answer: string; card_type: string; blank_answer: string | null; flagged: number; created_at: number; updated_at: number }>(
            'SELECT question, answer, card_type, blank_answer, flagged, created_at, updated_at FROM cards WHERE id = ?', [c.id]
          )[0];
          if (cardData) {
            const { error: ce } = await supabase.from('cards').insert({
              id: newCardId,
              deck_id: newId,
              question: cardData.question,
              answer: cardData.answer,
              card_type: cardData.card_type || 'standard',
              blank_answer: cardData.blank_answer,
              flagged: cardData.flagged === 1,
              created_at: new Date(cardData.created_at).toISOString(),
              updated_at: new Date(cardData.updated_at).toISOString(),
            });
            if (ce) throw ce;

            const reviews = queryAll<{ rating: number; confidence: number | null; reviewed_at: number; next_due: number }>(
              'SELECT rating, confidence, reviewed_at, next_due FROM reviews WHERE card_id = ?', [c.id]
            );
            for (const r of reviews) {
              const { error: re } = await supabase.from('reviews').insert({
                card_id: newCardId,
                rating: r.rating,
                confidence: r.confidence,
                reviewed_at: new Date(r.reviewed_at).toISOString(),
                next_due: new Date(r.next_due).toISOString(),
              });
              if (re) throw re;
            }
          }
        }
        run('UPDATE cards SET deck_id = ? WHERE deck_id = ?', [newId, d.id]);
        run('DELETE FROM decks WHERE id = ?', [d.id]);
        const { error: de } = await supabase.from('decks').insert({
          id: newId,
          name: d.name,
          created_at: new Date(d.created_at).toISOString(),
          updated_at: new Date(d.updated_at || d.created_at).toISOString(),
        });
        if (de) throw de;
      } else {
        const { error: de } = await supabase.from('decks').upsert({
          id: d.id,
          name: d.name,
          created_at: new Date(d.created_at).toISOString(),
          updated_at: new Date(d.updated_at || d.created_at).toISOString(),
        }, { onConflict: 'id' });
        if (de) throw de;

        const localCards = queryAll<{ id: string; question: string; answer: string; card_type: string; blank_answer: string | null; flagged: number; created_at: number; updated_at: number }>(
          'SELECT id, question, answer, card_type, blank_answer, flagged, created_at, updated_at FROM cards WHERE deck_id = ?', [d.id]
        );

        for (const c of localCards) {
          const { error: ce } = await supabase.from('cards').upsert({
            id: c.id,
            deck_id: d.id,
            question: c.question,
            answer: c.answer,
            card_type: c.card_type || 'standard',
            blank_answer: c.blank_answer,
            flagged: c.flagged === 1,
            created_at: new Date(c.created_at).toISOString(),
            updated_at: new Date(c.updated_at).toISOString(),
          }, { onConflict: 'id' });
          if (ce) throw ce;

          const reviews = queryAll<{ id: string; rating: number; confidence: number | null; reviewed_at: number; next_due: number }>(
            'SELECT id, rating, confidence, reviewed_at, next_due FROM reviews WHERE card_id = ?', [c.id]
          );
          for (const r of reviews) {
            const { error: re } = await supabase.from('reviews').upsert({
              id: r.id,
              card_id: c.id,
              rating: r.rating,
              confidence: r.confidence,
              reviewed_at: new Date(r.reviewed_at).toISOString(),
              next_due: new Date(r.next_due).toISOString(),
            }, { onConflict: 'id' });
            if (re) throw re;
          }
        }
      }
    }

    setStatus('synced');
    const deckCount = localDecks.length;
    const cardCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM cards')?.c ?? 0;
    const reviewCount = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM reviews')?.c ?? 0;
    return { decks: deckCount, cards: cardCount, reviews: reviewCount };
  } catch (err) {
    console.error('Transfer error:', err);
    setStatus('error');
    throw err;
  }
}

export async function deleteCloudAccount(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('reviews').delete().eq('user_id', userId);
  await supabase.from('cards').delete().eq('user_id', userId);
  await supabase.from('decks').delete().eq('user_id', userId);
  await supabase.from('user_settings').delete().eq('user_id', userId);
}

export function initOnlineWatcher(): () => void {
  const onOnline = () => { fullSync(); };
  const onOffline = () => { setStatus('offline'); };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
