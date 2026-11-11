import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Undo2, RotateCw, X, CheckCircle2, Brain } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNav } from '@/context/NavContext';
import { TopBar } from '@/components/TopBar';
import { EmptyState } from '@/components/EmptyState';
import { LatexContent } from '@/components/LatexContent';
import { getDueCards, recordReview, undoLastReview } from '@/db/sm2';
import { toPersianDigits } from '@/lib/normalize';
import type { Rating } from '@/db/types';

interface Props {
  deckId?: string;
}

interface StudyCard {
  id: string;
  question: string;
  answer: string;
  deck_id: string;
  deck_name: string;
}

export function StudyScreen({ deckId }: Props) {
  const { t, lang, settings } = useApp();
  const { goBack } = useNav();

  const dailyLimit = Number(settings.daily_limit || '50');
  const showTimer = settings.show_timer === '1';
  const direction = settings.study_direction || 'forward';

  const [cards, setCards] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studied, setStudied] = useState(0);
  const [lastCardId, setLastCardId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    const due = getDueCards(deckId, dailyLimit);
    setCards(due);
  }, [deckId, dailyLimit]);

  useEffect(() => {
    if (!showTimer) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [showTimer]);

  const current = cards[index];

  const grade = useCallback((rating: Rating) => {
    if (!current) return;
    recordReview(current.id, rating);
    setLastCardId(current.id);
    setStudied((s) => s + 1);

    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [current, index, cards.length]);

  const undo = useCallback(() => {
    if (!lastCardId) return;
    undoLastReview(lastCardId);
    setStudied((s) => Math.max(0, s - 1));
    setIndex((i) => Math.max(0, i - 1));
    setFlipped(false);
    setDone(false);
    setLastCardId(null);
  }, [lastCardId]);

  const flip = useCallback(() => setFlipped((f) => !f), []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.code === 'Space') {
        e.preventDefault();
        flip();
      } else if (e.key === '1') grade(1);
      else if (e.key === '2') grade(2);
      else if (e.key === '3') grade(3);
      else if (e.key === '4') grade(4);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flip, grade, done]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const str = `${m}:${sec.toString().padStart(2, '0')}`;
    return lang === 'fa' ? toPersianDigits(str) : str;
  };

  const progress = useMemo(() => {
    if (cards.length === 0) return 0;
    return Math.round((index / cards.length) * 100);
  }, [index, cards.length]);

  // Determine which side is question based on direction
  const showQuestionFront = direction === 'forward' || direction === 'both';

  if (cards.length === 0 && !done) {
    return (
      <div className="pb-24">
        <TopBar title={t('study')} showBack />
        <EmptyState
          icon={<Brain size={28} />}
          title={t('noDue')}
          message={t('finished')}
        />
      </div>
    );
  }

  if (done) {
    return (
      <div className="pb-24">
        <TopBar title={t('study')} showBack />
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            <CheckCircle2 size={40} />
          </div>
          <div>
            <p className="text-2xl font-bold text-ink-900 dark:text-white">
              {lang === 'fa' ? toPersianDigits(studied) : studied} {t('cardsStudied')}
            </p>
            <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">{t('finished')}</p>
          </div>
          <button onClick={goBack} className="primary-btn mt-4">
            {t('backHome')}
          </button>
        </div>
      </div>
    );
  }

  const idxDisplay = lang === 'fa' ? toPersianDigits(index + 1) : index + 1;
  const totalDisplay = lang === 'fa' ? toPersianDigits(cards.length) : cards.length;

  const frontText = showQuestionFront ? current.question : current.answer;
  const backText = showQuestionFront ? current.answer : current.question;
  const frontLabel = showQuestionFront ? t('question') : t('answer');
  const backLabel = showQuestionFront ? t('answer') : t('question');

  const grades: { rating: Rating; label: string; color: string }[] = [
    { rating: 1, label: t('again'), color: 'bg-red-500 hover:bg-red-600' },
    { rating: 2, label: t('hard'), color: 'bg-accent-500 hover:bg-accent-600' },
    { rating: 3, label: t('good'), color: 'bg-brand-500 hover:bg-brand-600' },
    { rating: 4, label: t('easy'), color: 'bg-sky-500 hover:bg-sky-600' },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col pb-24">
      <TopBar title={t('study')} showBack />

      {/* Progress + timer */}
      <div className="px-4 pt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-ink-500 dark:text-ink-400">
            {idxDisplay} / {totalDisplay}
          </span>
          {showTimer && (
            <span className="flex items-center gap-1 text-sm tabular-nums text-ink-400 dark:text-ink-500">
              <RotateCw size={14} />
              {fmtTime(elapsed)}
            </span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex flex-1 flex-col px-4 pt-6">
        <div
          className="flip-scene flex-1 cursor-pointer select-none"
          onClick={flip}
          role="button"
          tabIndex={0}
          aria-label={t('flip')}
          onKeyDown={(e) => e.key === 'Enter' && flip()}
        >
          <div className={`flip-card relative h-full min-h-[320px] ${flipped ? 'flipped' : ''}`}>
            {/* Front */}
            <div className="flip-face card-surface absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-400 dark:bg-ink-700 dark:text-ink-300">
                {frontLabel}
              </span>
              <LatexContent
                text={frontText}
                className="text-xl font-medium leading-relaxed text-ink-900 dark:text-white"
              />
              <p className="absolute bottom-4 text-xs text-ink-300 dark:text-ink-500">{t('tapToFlip')}</p>
            </div>
            {/* Back */}
            <div className="flip-face flip-back card-surface absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                {backLabel}
              </span>
              <LatexContent
                text={backText}
                className="text-lg leading-relaxed text-ink-800 dark:text-ink-100"
              />
            </div>
          </div>
        </div>

        {/* Grading buttons */}
        <div className="mt-6">
          {!flipped ? (
            <button onClick={flip} className="primary-btn w-full">
              <RotateCw size={18} />
              {t('flip')}
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {grades.map((g, i) => (
                <button
                  key={g.rating}
                  onClick={() => grade(g.rating)}
                  className={`flex flex-col items-center gap-1 rounded-xl ${g.color} py-3 text-white transition active:scale-95`}
                >
                  <span className="text-xs font-bold opacity-70">{lang === 'fa' ? toPersianDigits(i + 1) : i + 1}</span>
                  <span className="text-xs font-medium">{g.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex justify-center gap-2">
            {lastCardId && (
              <button onClick={undo} className="ghost-btn text-sm">
                <Undo2 size={16} />
                {t('undo')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
