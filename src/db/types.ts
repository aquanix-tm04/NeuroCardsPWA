export type Deck = {
  id: string;
  name: string;
  created_at: number;
  updated_at?: number;
};

export type CardType = 'standard' | 'blank';

export interface Card {
  id: string;
  deck_id: string;
  question: string;
  answer: string;
  card_type?: CardType;
  blank_answer?: string | null;
  flagged?: boolean;
  created_at: number;
  updated_at: number;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Review {
  id: string;
  card_id: string;
  rating: number; // 1=again,2=hard,3=good,4=easy
  confidence?: number | null; // 1-5, self-rated before flip
  reviewed_at: number;
  next_due: number;
}

export type Rating = 1 | 2 | 3 | 4;

export const RATING_LABELS: Record<Rating, string> = {
  1: 'دوباره',
  2: 'سخت',
  3: 'خوب',
  4: 'آسان',
};

export interface CardWithStats extends Card {
  deck_name?: string;
  due_count?: number;
  total_reviews?: number;
  again_count?: number;
  ease?: number;
  interval?: number;
  repetitions?: number;
  next_due?: number;
}

export type DeckWithCounts = Deck & {
  card_count: number;
  due_count: number;
};

export interface CardImage {
  id: string;
  card_id: string;
  storage_path: string;
  display_order: number;
  created_at: number;
}
