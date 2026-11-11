import { useState, useMemo, useEffect, useCallback } from 'react';
import { ListChecks, CheckCircle2, XCircle, Shuffle, ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNav } from '@/context/NavContext';
import { TopBar } from '@/components/TopBar';
import { EmptyState } from '@/components/EmptyState';
import { LatexContent } from '@/components/LatexContent';
import { getAllDecks } from '@/db/repos';
import { getAllCardsWithDeck } from '@/db/sm2';
import { normalizeForMatch, stripLatex, toPersianDigits } from '@/lib/normalize';

type QuizType = 'mcq' | 'typein' | 'tf';

interface QuizCard {
  id: string;
  question: string;
  answer: string;
  deck_id: string;
  deck_name: string;
}

interface Props {
  deckId?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizScreen({ deckId }: Props) {
  const { t, lang, settings } = useApp();
  const { goBack } = useNav();

  const decks = useMemo(() => getAllDecks(), []);
  const [phase, setPhase] = useState<'setup' | 'quiz' | 'done'>('setup');

  // Setup state
  const [selectedDeckId, setSelectedDeckId] = useState(deckId ?? 'all');
  const [quizType, setQuizType] = useState<QuizType>((settings.quiz_type as QuizType) || 'mcq');
  const [questionCount, setQuestionCount] = useState(Number(settings.quiz_count || '10'));
  const [useShuffle, setUseShuffle] = useState(settings.quiz_shuffle === '1');

  // Quiz state
  const [quizCards, setQuizCards] = useState<QuizCard[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<{ card: QuizCard; correct: boolean; userAnswer: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [tfChoice, setTfChoice] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pool, setPool] = useState<QuizCard[]>([]);

  // MCQ distractors are drawn from the whole deck, not just the picked questions
  const options = useMemo(() => {
    if (quizType !== 'mcq' || !quizCards[quizIndex]) return [];
    const current = quizCards[quizIndex];
    const others = pool.filter((c) => c.id !== current.id && c.deck_id === current.deck_id);
    const distractors = shuffle(others).slice(0, 3);
    const opts = shuffle([current, ...distractors]);
    return opts.map((c) => ({ id: c.id, answer: c.answer }));
  }, [quizType, quizCards, quizIndex, pool]);

  const startQuiz = useCallback((cardsOverride?: QuizCard[]) => {
    const source = selectedDeckId === 'all'
      ? getAllCardsWithDeck()
      : getAllCardsWithDeck().filter((c) => c.deck_id === selectedDeckId);
    setPool(source);

    let picked = cardsOverride ?? (useShuffle ? shuffle(source) : source);
    if (!cardsOverride) {
      picked = picked.slice(0, questionCount);
    }
    setQuizCards(picked);
    setQuizIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setTypedAnswer('');
    setTfChoice(null);
    setSubmitted(false);
    setPhase('quiz');
  }, [selectedDeckId, useShuffle, questionCount]);

  // For True/False: shows either the card's own answer or another card's answer
  const tfDisplay = useMemo(() => {
    if (quizType !== 'tf' || !quizCards[quizIndex]) return null;
    const current = quizCards[quizIndex];
    const wrong = quizCards.find((c) => c.id !== current.id);
    if (!wrong || Math.random() > 0.5) return { text: current.answer, isCorrect: true };
    return { text: wrong.answer, isCorrect: false };
  }, [quizType, quizCards, quizIndex]);

  const checkAnswer = useCallback((): boolean => {
    const current = quizCards[quizIndex];
    if (quizType === 'mcq') {
      return selectedOption !== null && options[selectedOption]?.id === current.id;
    }
    if (quizType === 'typein') {
      return normalizeForMatch(typedAnswer) === normalizeForMatch(stripLatex(current.answer));
    }
    if (quizType === 'tf') {
      return tfChoice === tfDisplay?.isCorrect;
    }
    return false;
  }, [quizType, quizCards, quizIndex, selectedOption, options, typedAnswer, tfChoice, tfDisplay]);

  const handleSubmit = () => {
    if (quizType === 'mcq' && selectedOption === null) return;
    if (quizType === 'typein' && !typedAnswer.trim()) return;
    if (quizType === 'tf' && tfChoice === null) return;

    const correct = checkAnswer();
    const current = quizCards[quizIndex];
    const userAnswer =
      quizType === 'mcq' ? (selectedOption !== null ? options[selectedOption]?.answer ?? '' : '') :
      quizType === 'typein' ? typedAnswer :
      tfChoice ? t('trueLabel') : t('falseLabel');

    setAnswers((a) => [...a, { card: current, correct, userAnswer }]);
    setSubmitted(true);
  };

  const handleNext = () => {
    if (quizIndex + 1 >= quizCards.length) {
      setPhase('done');
    } else {
      setQuizIndex((i) => i + 1);
      setSelectedOption(null);
      setTypedAnswer('');
      setTfChoice(null);
      setSubmitted(false);
    }
  };

  const retryWrong = () => {
    const wrongCards = answers.filter((a) => !a.correct).map((a) => a.card);
    if (wrongCards.length === 0) {
      setPhase('setup');
      return;
    }
    startQuiz(wrongCards);
  };

  // --- Setup phase ---
  if (phase === 'setup') {
    const totalCards = getAllCardsWithDeck().length;
    if (totalCards === 0) {
      return (
        <div className="pb-24">
          <TopBar title={t('quiz')} showBack={!!deckId} />
          <EmptyState icon={<ListChecks size={28} />} title={t('noCards')} />
        </div>
      );
    }

    return (
      <div className="pb-24">
        <TopBar title={t('quiz')} showBack={!!deckId} />
        <div className="space-y-5 px-4 pt-4">
          {/* Deck selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
              {t('allDecks')}
            </label>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="field-input"
            >
              <option value="all">{t('allDecks')}</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Quiz type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
              {t('quizType')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'mcq', label: t('mcq') },
                { v: 'typein', label: t('typeIn') },
                { v: 'tf', label: t('trueFalse') },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setQuizType(opt.v)}
                  className={`rounded-xl py-3 text-sm font-medium transition ${
                    quizType === opt.v
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-700 dark:text-ink-200 dark:hover:bg-ink-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-600 dark:text-ink-300">
              {t('questionCount')}: {lang === 'fa' ? toPersianDigits(questionCount) : questionCount}
            </label>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>

          {/* Shuffle toggle */}
          <button
            onClick={() => setUseShuffle((s) => !s)}
            className="flex w-full items-center justify-between rounded-xl bg-ink-100 px-4 py-3 dark:bg-ink-700"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
              <Shuffle size={18} />
              {t('shuffle')}
            </span>
            <div className={`h-6 w-11 rounded-full p-0.5 transition ${useShuffle ? 'bg-brand-500' : 'bg-ink-300 dark:bg-ink-600'}`}>
              <div className={`h-5 w-5 rounded-full bg-white transition ${useShuffle ? 'translate-x-0' : '-translate-x-5 rtl:translate-x-5'}`} />
            </div>
          </button>

          <button onClick={() => startQuiz()} className="primary-btn w-full text-base">
            {t('start')}
          </button>
        </div>
      </div>
    );
  }

  // --- Done phase ---
  if (phase === 'done') {
    const correctCount = answers.filter((a) => a.correct).length;
    const wrongAnswers = answers.filter((a) => !a.correct);
    const pct = Math.round((correctCount / answers.length) * 100);

    return (
      <div className="pb-24">
        <TopBar title={t('quiz')} showBack />
        <div className="px-4 pt-4">
          {/* Score */}
          <div className="card-surface flex flex-col items-center gap-2 p-8 text-center">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${pct >= 70 ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400' : 'bg-accent-50 text-accent-600 dark:bg-accent-700/20 dark:text-accent-400'}`}>
              <span className="text-2xl font-bold">
                {lang === 'fa' ? toPersianDigits(pct) : pct}%
              </span>
            </div>
            <p className="text-lg font-bold text-ink-900 dark:text-white">{t('score')}</p>
            <p className="text-sm text-ink-400 dark:text-ink-500">
              {lang === 'fa' ? toPersianDigits(correctCount) : correctCount} {t('correct')} · {lang === 'fa' ? toPersianDigits(wrongAnswers.length) : wrongAnswers.length} {t('wrong')}
            </p>
          </div>

          {/* Wrong answers review */}
          {wrongAnswers.length > 0 && (
            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-bold text-ink-600 dark:text-ink-300">{t('reviewWrong')}</h3>
              {wrongAnswers.map((a, i) => (
                <div key={i} className="card-surface p-4">
                  <div className="flex items-start gap-2">
                    <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                    <div className="min-w-0 flex-1">
                      <LatexContent text={a.card.question} className="text-sm font-medium text-ink-900 dark:text-white" />
                      <div className="mt-2 border-t border-ink-100 pt-2 dark:border-ink-700">
                        <p className="text-xs text-ink-400">{t('answer')}:</p>
                        <LatexContent text={a.card.answer} className="text-sm text-brand-700 dark:text-brand-300" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex gap-2">
            <button onClick={() => setPhase('setup')} className="ghost-btn flex-1">
              <ArrowLeft size={18} className="rotate-180" />
              {t('backHome')}
            </button>
            {wrongAnswers.length > 0 && (
              <button onClick={retryWrong} className="primary-btn flex-1">
                {t('retryWrong')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Quiz phase ---
  const current = quizCards[quizIndex];
  const idxDisplay = lang === 'fa' ? toPersianDigits(quizIndex + 1) : quizIndex + 1;
  const totalDisplay = lang === 'fa' ? toPersianDigits(quizCards.length) : quizCards.length;
  const isCorrect = submitted && answers[answers.length - 1]?.correct;

  return (
    <div className="flex min-h-[100dvh] flex-col pb-24">
      <TopBar title={t('quiz')} showBack />

      <div className="px-4 pt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-ink-500 dark:text-ink-400">
            {idxDisplay} / {totalDisplay}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((quizIndex) / quizCards.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-6">
        {/* Question */}
        <div className="card-surface p-5">
          <span className="mb-2 block text-xs font-medium text-ink-400">{t('question')}</span>
          <LatexContent text={current.question} className="text-lg font-medium leading-relaxed text-ink-900 dark:text-white" />
        </div>

        {/* Answer area */}
        <div className="mt-4 flex-1">
          {quizType === 'mcq' && (
            <div className="space-y-2">
              {options.map((opt, i) => {
                const isSelected = selectedOption === i;
                const isCorrectOpt = opt.id === current.id;
                let cls = 'border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800';
                if (submitted) {
                  if (isCorrectOpt) cls = 'border-brand-500 bg-brand-50 dark:bg-brand-900/20';
                  else if (isSelected) cls = 'border-red-400 bg-red-50 dark:bg-red-950/20';
                  else cls = 'border-ink-200 dark:border-ink-700 opacity-60';
                } else if (isSelected) {
                  cls = 'border-brand-500 bg-brand-50 dark:bg-brand-900/20';
                }
                return (
                  <button
                    key={opt.id}
                    disabled={submitted}
                    onClick={() => setSelectedOption(i)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-right transition ${cls}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-300 text-xs font-bold dark:border-ink-600">
                      {lang === 'fa' ? toPersianDigits(['۱', '۲', '۳', '۴'][i] ?? (i + 1)) : String.fromCharCode(65 + i)}
                    </span>
                    <LatexContent text={opt.answer} className="flex-1 text-sm text-ink-800 dark:text-ink-100" />
                  </button>
                );
              })}
            </div>
          )}

          {quizType === 'typein' && (
            <div>
              <input
                autoFocus
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                disabled={submitted}
                placeholder={t('typeAnswer')}
                className="field-input text-base"
                onKeyDown={(e) => e.key === 'Enter' && !submitted && handleSubmit()}
              />
              {submitted && (
                <div className="mt-3 card-surface p-4">
                  <p className="text-xs text-ink-400">{t('answer')}:</p>
                  <LatexContent text={current.answer} className="mt-1 text-sm text-brand-700 dark:text-brand-300" />
                </div>
              )}
            </div>
          )}

          {quizType === 'tf' && tfDisplay && (
            <div className="space-y-3">
              <div className="card-surface p-4">
                <p className="mb-1 text-xs text-ink-400">{t('answer')}:</p>
                <LatexContent text={tfDisplay.text} className="text-base text-ink-800 dark:text-ink-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={submitted}
                  onClick={() => setTfChoice(true)}
                  className={`rounded-xl border-2 py-4 text-base font-bold transition ${
                    tfChoice === true
                      ? submitted
                        ? (answers[answers.length - 1]?.correct ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-500')
                        : 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                      : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-200'
                  }`}
                >
                  <CheckCircle2 size={22} className="mx-auto mb-1" />
                  {t('trueLabel')}
                </button>
                <button
                  disabled={submitted}
                  onClick={() => setTfChoice(false)}
                  className={`rounded-xl border-2 py-4 text-base font-bold transition ${
                    tfChoice === false
                      ? submitted
                        ? (answers[answers.length - 1]?.correct ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-500')
                        : 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-500'
                      : 'border-ink-200 text-ink-600 dark:border-ink-700 dark:text-ink-200'
                  }`}
                >
                  <XCircle size={22} className="mx-auto mb-1" />
                  {t('falseLabel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Submit / Next */}
        <div className="mt-5">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={
                (quizType === 'mcq' && selectedOption === null) ||
                (quizType === 'typein' && !typedAnswer.trim()) ||
                (quizType === 'tf' && tfChoice === null)
              }
              className="primary-btn w-full text-base"
            >
              {t('submit')}
            </button>
          ) : (
            <div className="space-y-2">
              <div className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium ${isCorrect ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300' : 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'}`}>
                {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                {isCorrect ? t('correct') : t('wrong')}
              </div>
              <button onClick={handleNext} className="primary-btn w-full text-base">
                {quizIndex + 1 >= quizCards.length ? t('backHome') : t('next')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
