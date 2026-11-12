import { initDb, run, queryAll, queryOne, uid } from './database';
import type { DeckWithCounts } from './types';

const SEED_DECK_ID = 'seed-neuro-deck';

const SEED_CARDS: Array<{ question: string; answer: string }> = [
  {
    question: 'فرکانس باند آلفا در EEG چقدر است و در کجا بیشترین فعالیت را دارد؟',
    answer: 'باند آلفا در محدوده $8{-}13$ هرتز است و بیشترین فعالیت را در وضعیت آرام‌سازی با چشم‌بسته در منطقه اکسیپیتال (پس‌سری) دارد.',
  },
  {
    question: 'تعریف پدیده Mu Suppression و اهمیت آن در BCI چیست؟',
    answer: 'Mu Suppression کاهش توان باند $8{-}13$ هرتز در قشر حرکتی هنگام اجرا یا تماشای حرکت است. این پدیشه پایه‌ی رابط مغز-رایانه مبتنی بر حرکت (Motor-BCI) را تشکیل می‌دهد.',
  },
  {
    question: 'معادله توان نسبی یک باند فرکانسی چگونه محاسبه می‌شود؟',
    answer: 'توان نسبی باند $i$ برابر است با $P_i = \\frac{\\sum_{f \\in B_i} |X(f)|^2}{\\sum_{f} |X(f)|^2}$ که در آن $X(f)$ تبدیل فوریه سیگنال EEG است.',
  },
];

const now = () => Date.now();

export async function ensureSeeded(): Promise<void> {
  await initDb();
  const existing = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM decks');
  if (existing && existing.c > 0) return;

  const ts = now();
  run('INSERT INTO decks (id, name, created_at) VALUES (?, ?, ?)', [
    SEED_DECK_ID,
    'علوم اعصاب',
    ts,
  ]);

  for (const c of SEED_CARDS) {
    run(
      'INSERT INTO cards (id, deck_id, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [uid('card_'), SEED_DECK_ID, c.question, c.answer, ts, ts]
    );
  }
}

export function getAllDecks(): DeckWithCounts[] {
  const nowTs = now();
  return queryAll<DeckWithCounts>(
    `SELECT d.id, d.name, d.created_at,
       (SELECT COUNT(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
       (SELECT COUNT(*) FROM cards c
          LEFT JOIN reviews r ON r.card_id = c.id
          WHERE c.deck_id = d.id
            AND (r.next_due IS NULL OR r.next_due <= ?)) AS due_count
     FROM decks d
     ORDER BY d.created_at DESC`,
    [nowTs]
  );
}

export function createDeck(name: string): string {
  const id = uid('deck_');
  const ts = now();
  run('INSERT INTO decks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [id, name.trim(), ts, ts]);
  return id;
}

export function getDeck(id: string) {
  return queryOne<{ id: string; name: string; created_at: number }>(
    'SELECT id, name, created_at FROM decks WHERE id = ?',
    [id]
  );
}

export function renameDeck(id: string, name: string): void {
  run('UPDATE decks SET name = ?, updated_at = ? WHERE id = ?', [name.trim(), now(), id]);
}

export function deleteDeck(id: string): void {
  run('DELETE FROM decks WHERE id = ?', [id]);
}

export function getCardsInDeck(deckId: string) {
  return queryAll<{ id: string; question: string; answer: string; card_type: string; blank_answer: string | null; flagged: number; created_at: number; updated_at: number }>(
    'SELECT id, question, answer, card_type, blank_answer, flagged, created_at, updated_at FROM cards WHERE deck_id = ? ORDER BY created_at ASC',
    [deckId]
  );
}

export function addCard(deckId: string, question: string, answer: string, cardType: string = 'standard', blankAnswer: string | null = null): string {
  const id = uid('card_');
  const ts = now();
  run(
    'INSERT INTO cards (id, deck_id, question, answer, card_type, blank_answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, deckId, question, answer, cardType, blankAnswer, ts, ts]
  );
  return id;
}

export function updateCard(id: string, question: string, answer: string, cardType?: string, blankAnswer?: string | null): void {
  const fields: string[] = ['question = ?', 'answer = ?', 'updated_at = ?'];
  const params: unknown[] = [question, answer, now()];
  if (cardType !== undefined) {
    fields.push('card_type = ?');
    params.push(cardType);
  }
  if (blankAnswer !== undefined) {
    fields.push('blank_answer = ?');
    params.push(blankAnswer);
  }
  params.push(id);
  run(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`, params);
}

export function toggleFlagCard(id: string, flagged: boolean): void {
  run('UPDATE cards SET flagged = ?, updated_at = ? WHERE id = ?', [flagged ? 1 : 0, now(), id]);
}

export function deleteCard(id: string): void {
  run('DELETE FROM cards WHERE id = ?', [id]);
}

export function countCards(): number {
  const r = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM cards');
  return r ? Number(r.c) : 0;
}

export async function resetAllData(): Promise<void> {
  run('DELETE FROM reviews');
  run('DELETE FROM card_tags');
  run('DELETE FROM tags');
  run('DELETE FROM cards');
  run('DELETE FROM decks');
  run('DELETE FROM settings');
  await ensureSeeded();
}

export function addCardsBulk(deckId: string, rows: { question: string; answer: string }[]): number {
  for (const r of rows) addCard(deckId, r.question, r.answer);
  return rows.length;
}
