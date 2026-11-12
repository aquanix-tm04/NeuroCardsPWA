/*
# NeuroCards Cloud Schema — Decks, Cards, Reviews, Images, Settings

1. New Tables
- `decks`: user-owned flashcard decks (id, name, user_id, created_at, updated_at)
- `cards`: flashcards belonging to a deck (id, deck_id, user_id, question, answer, card_type, blank_answer, created_at, updated_at, flagged)
- `card_images`: images attached to cards (id, card_id, user_id, storage_path, display_order, created_at)
- `reviews`: spaced-repetition review records (id, card_id, user_id, rating, confidence, reviewed_at, next_due)
- `user_settings`: per-user app settings (user_id, key, value, updated_at)
- `review_overrides`: user overrides of auto-check results (id, card_id, user_id, user_answer, stored_answer, was_correct, created_at)

2. Relationships
- cards.deck_id -> decks(id) ON DELETE CASCADE
- card_images.card_id -> cards(id) ON DELETE CASCADE
- reviews.card_id -> cards(id) ON DELETE CASCADE
- review_overrides.card_id -> cards(id) ON DELETE CASCADE
- All user_id columns -> auth.users(id) ON DELETE CASCADE

3. Security (RLS)
- RLS enabled on all tables.
- All policies scoped TO authenticated with auth.uid() = user_id ownership checks.
- user_id columns DEFAULT auth.uid() so client inserts without passing user_id succeed.
- Grants: SELECT, INSERT, UPDATE, DELETE on all tables TO authenticated only.

4. Notes
- card_type: 'standard' | 'blank' (fill-in-the-blank). blank_answer stores the hidden text.
- confidence: 1-5 self-rating before flipping (optional, null if not used).
- flagged: boolean for cards the user wants to revisit later.
- updated_at used for sync conflict resolution (last-write-wins).
*/

CREATE TABLE IF NOT EXISTS decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON decks TO authenticated;

DROP POLICY IF EXISTS "select_own_decks" ON decks;
CREATE POLICY "select_own_decks" ON decks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_decks" ON decks;
CREATE POLICY "insert_own_decks" ON decks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_decks" ON decks;
CREATE POLICY "update_own_decks" ON decks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_decks" ON decks;
CREATE POLICY "delete_own_decks" ON decks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  card_type text NOT NULL DEFAULT 'standard',
  blank_answer text,
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON cards TO authenticated;

DROP POLICY IF EXISTS "select_own_cards" ON cards;
CREATE POLICY "select_own_cards" ON cards FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cards" ON cards;
CREATE POLICY "insert_own_cards" ON cards FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cards" ON cards;
CREATE POLICY "update_own_cards" ON cards FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cards" ON cards;
CREATE POLICY "delete_own_cards" ON cards FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS card_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE card_images ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON card_images TO authenticated;

DROP POLICY IF EXISTS "select_own_card_images" ON card_images;
CREATE POLICY "select_own_card_images" ON card_images FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_card_images" ON card_images;
CREATE POLICY "insert_own_card_images" ON card_images FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_card_images" ON card_images;
CREATE POLICY "update_own_card_images" ON card_images FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_card_images" ON card_images;
CREATE POLICY "delete_own_card_images" ON card_images FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL,
  confidence int,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  next_due timestamptz NOT NULL
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON reviews TO authenticated;

DROP POLICY IF EXISTS "select_own_reviews" ON reviews;
CREATE POLICY "select_own_reviews" ON reviews FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_reviews" ON reviews;
CREATE POLICY "insert_own_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_reviews" ON reviews;
CREATE POLICY "update_own_reviews" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reviews" ON reviews;
CREATE POLICY "delete_own_reviews" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;

DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON user_settings;
CREATE POLICY "delete_own_settings" ON user_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS review_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_answer text NOT NULL,
  stored_answer text NOT NULL,
  was_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE review_overrides ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON review_overrides TO authenticated;

DROP POLICY IF EXISTS "select_own_overrides" ON review_overrides;
CREATE POLICY "select_own_overrides" ON review_overrides FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_overrides" ON review_overrides;
CREATE POLICY "insert_own_overrides" ON review_overrides FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_overrides" ON review_overrides;
CREATE POLICY "delete_own_overrides" ON review_overrides FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for card images
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own images" ON storage.objects;
CREATE POLICY "Users can upload own images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'card-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read card images" ON storage.objects;
CREATE POLICY "Anyone can read card images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'card-images');

DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'card-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cards_deck ON cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_card ON reviews(card_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_next_due ON reviews(next_due);
CREATE INDEX IF NOT EXISTS idx_card_images_card ON card_images(card_id);
CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);
