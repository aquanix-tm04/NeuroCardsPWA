import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

const IDB_NAME = 'neurocards-db';
const IDB_STORE = 'sqlite';
const IDB_KEY = 'neurocards.sqlite';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'standard',
  blank_answer TEXT,
  flagged INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS card_tags (
  card_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (card_id, tag_id),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  confidence INTEGER,
  reviewed_at INTEGER NOT NULL,
  next_due INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS card_images (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_reviews_card ON reviews(card_id);
CREATE INDEX IF NOT EXISTS idx_reviews_due ON reviews(next_due);
CREATE INDEX IF NOT EXISTS idx_card_tags_card ON card_tags(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tags_tag ON card_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_card_images_card ON card_images(card_id);
`;

const MIGRATION_SQL = `
ALTER TABLE decks ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE decks ADD COLUMN synced INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cards ADD COLUMN card_type TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE cards ADD COLUMN blank_answer TEXT;
ALTER TABLE cards ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cards ADD COLUMN synced INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reviews ADD COLUMN confidence INTEGER;
ALTER TABLE reviews ADD COLUMN synced INTEGER NOT NULL DEFAULT 0;
`;

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(IDB_STORE)) {
        idb.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIdb(): Promise<Uint8Array | null> {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIdb(data: Uint8Array): Promise<void> {
  const idb = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(data, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function uid(prefix = ''): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}${ts}${rnd}`;
}

export async function initDb(): Promise<Database> {
  if (db) return db;
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });
  }
  const saved = await loadFromIdb();
  db = saved ? new SQL.Database(saved) : new SQL.Database();
  db.run(SCHEMA_SQL);
  try {
    db.run(MIGRATION_SQL);
  } catch {
    // Columns already exist
  }
  await persist();
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export async function persist(): Promise<void> {
  if (!db) return;
  if (saveTimer) clearTimeout(saveTimer);
  await new Promise<void>((resolve) => {
    saveTimer = setTimeout(() => {
      if (!db) return resolve();
      const data = db.export();
      saveToIdb(data)
        .then(() => resolve())
        .catch(() => resolve());
    }, 250);
  });
}

export function persistSync(): void {
  if (!db) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!db) return;
    const data = db.export();
    saveToIdb(data).catch(() => {});
  }, 250);
}

// --- Query helpers ---

export type Row = Record<string, unknown>;

export function exec(sql: string, params: unknown[] = []): Row[] {
  const d = getDb();
  const stmt = d.prepare(sql);
  try {
    stmt.bind(params as (string | number | null | Uint8Array)[]);
    const rows: Row[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as Row);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

export function run(sql: string, params: unknown[] = []): void {
  const d = getDb();
  const stmt = d.prepare(sql);
  try {
    stmt.bind(params as (string | number | null | Uint8Array)[]);
    stmt.step();
  } finally {
    stmt.free();
  }
  persistSync();
}

export function queryOne<T extends Row = Row>(sql: string, params: unknown[] = []): T | null {
  const rows = exec(sql, params);
  return (rows[0] as T) ?? null;
}

export function queryAll<T extends Row = Row>(sql: string, params: unknown[] = []): T[] {
  return exec(sql, params) as T[];
}
