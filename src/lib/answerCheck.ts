import { normalizeForMatch, stripLatex } from './normalize';

export interface CheckResult {
  correct: boolean;
  score: number;
  matched: string[];
  missed: string[];
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'as', 'and',
  'or', 'but', 'not', 'this', 'that', 'it', 'its', 'has', 'have', 'had',
  'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must',
  'در', 'به', 'از', 'با', 'و', 'یا', 'که', 'است', 'هست', 'بود', 'شد',
  'می', 'ها', 'های', 'این', 'آن', 'را', 'برای', 'تا', 'هم', 'نه',
]);

function tokenize(text: string): string[] {
  const cleaned = stripLatex(text);
  return normalizeForMatch(cleaned)
    .split(/[\s،,.؛:!?؛(){}[\]"'«»\-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function extractKeyPhrases(text: string): string[] {
  const cleaned = stripLatex(text);
  const norm = normalizeForMatch(cleaned);
  const sentences = norm.split(/[،,.؛!؟\n]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  const phrases: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter((w) => w.length > 1 && !STOPWORDS.has(w));
    if (words.length === 0) continue;
    if (words.length <= 3) {
      phrases.push(sentence);
    } else {
      for (let i = 0; i < words.length; i++) {
        if (words[i].length > 2) phrases.push(words[i]);
      }
      if (words.length >= 4) {
        const half = Math.ceil(words.length / 2);
        phrases.push(words.slice(0, half).join(' '));
        phrases.push(words.slice(half).join(' '));
      }
    }
  }
  return phrases;
}

export function checkAnswer(userAnswer: string, storedAnswer: string): CheckResult {
  const userNorm = normalizeForMatch(stripLatex(userAnswer));
  const keyPhrases = extractKeyPhrases(storedAnswer);

  if (keyPhrases.length === 0) {
    return { correct: userNorm.length > 0, score: userNorm.length > 0 ? 100 : 0, matched: [], missed: [] };
  }

  const userTokens = new Set(tokenize(userAnswer));
  const matched: string[] = [];
  const missed: string[] = [];

  for (const phrase of keyPhrases) {
    const phraseTokens = tokenize(phrase);
    if (phraseTokens.length === 0) continue;
    const hitCount = phraseTokens.filter((t) => userTokens.has(t)).length;
    const ratio = hitCount / phraseTokens.length;
    if (ratio >= 0.6) {
      matched.push(phrase);
    } else {
      missed.push(phrase);
    }
  }

  const total = keyPhrases.length;
  const hit = matched.length;
  const score = Math.round((hit / total) * 100);

  return {
    correct: score >= 90,
    score,
    matched,
    missed,
  };
}
