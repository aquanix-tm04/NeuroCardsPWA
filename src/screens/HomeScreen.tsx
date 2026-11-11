import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, Upload, Flame, Layers, ChevronLeft, Brain } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNav } from '@/context/NavContext';
import { TopBar } from '@/components/TopBar';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { getAllDecks, createDeck } from '@/db/repos';
import { countDueToday } from '@/db/sm2';
import { getStreakDays } from '@/db/stats';
import { getAllCardsWithDeck } from '@/db/sm2';
import { searchNormalize, toPersianDigits } from '@/lib/normalize';
import type { DeckWithCounts } from '@/db/types';

export function HomeScreen() {
  const { t, lang } = useApp();
  const { navigate } = useNav();
  const [query, setQuery] = useState('');
  const [decks, setDecks] = useState<DeckWithCounts[]>(() => getAllDecks());
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');

  const dueToday = useMemo(() => countDueToday(), []);
  const streak = useMemo(() => getStreakDays(), []);

  const refresh = useCallback(() => setDecks(getAllDecks()), []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const norm = searchNormalize(query);
    const all = getAllCardsWithDeck();
    return all.filter((c) =>
      searchNormalize(c.question).includes(norm) || searchNormalize(c.answer).includes(norm)
    ).slice(0, 30);
  }, [query]);

  const handleCreateDeck = () => {
    if (!newDeckName.trim()) return;
    createDeck(newDeckName);
    setNewDeckName('');
    setShowNewDeck(false);
    refresh();
  };

  return (
    <div className="pb-24">
      <TopBar />

      <div className="space-y-4 px-4 pt-4">
        {/* Search */}
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="field-input pr-11"
            aria-label={t('search')}
          />
        </div>

        {/* Summary card */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
              <Brain size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900 dark:text-white">
                {lang === 'fa' ? toPersianDigits(dueToday) : dueToday}
              </p>
              <p className="text-xs text-ink-400 dark:text-ink-500">{t('dueToday')}</p>
            </div>
          </div>
          <div className="card-surface flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-700/20 dark:text-accent-400">
              <Flame size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink-900 dark:text-white">
                {lang === 'fa' ? toPersianDigits(streak) : streak}
              </p>
              <p className="text-xs text-ink-400 dark:text-ink-500">{t('streak')}</p>
            </div>
          </div>
        </div>

        {/* Search results or deck list */}
        {searchResults ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-400 dark:text-ink-500">
              {searchResults.length > 0
                ? `${searchResults.length} ${t('cards')}`
                : t('noResults')}
            </p>
            {searchResults.map((card) => (
              <button
                key={card.id}
                onClick={() => navigate({ name: 'deck', deckId: card.deck_id })}
                className="card-surface block w-full p-4 text-right transition active:scale-[0.99]"
              >
                <p className="truncate text-sm font-medium text-ink-900 dark:text-white">
                  {card.question}
                </p>
                <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">{card.deck_name}</p>
              </button>
            ))}
            {searchResults.length === 0 && (
              <EmptyState icon={<Search size={28} />} title={t('noResults')} />
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink-700 dark:text-ink-200">
                {t('allDecks')}
              </h2>
              <button
                onClick={() => navigate({ name: 'import' })}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
              >
                <Upload size={16} />
                {t('import')}
              </button>
            </div>

            {decks.length === 0 ? (
              <EmptyState
                icon={<Layers size={28} />}
                title={t('noDecks')}
                message={t('newDeck')}
                action={
                  <button onClick={() => setShowNewDeck(true)} className="primary-btn">
                    <Plus size={18} />
                    {t('newDeck')}
                  </button>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {decks.map((deck) => {
                  const cardCount = lang === 'fa' ? toPersianDigits(deck.card_count) : deck.card_count;
                  const dueCount = lang === 'fa' ? toPersianDigits(deck.due_count) : deck.due_count;
                  return (
                    <button
                      key={deck.id}
                      onClick={() => navigate({ name: 'deck', deckId: deck.id })}
                      className="card-surface flex w-full items-center gap-3 p-4 text-right transition active:scale-[0.99]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                        <Layers size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink-900 dark:text-white">
                          {deck.name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400 dark:text-ink-500">
                          {cardCount} {t('cards')}
                          {deck.due_count > 0 && (
                            <span className="text-accent-600 dark:text-accent-400"> · {dueCount} {t('due')}</span>
                          )}
                        </p>
                      </div>
                      {deck.due_count > 0 && (
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-100 px-2 text-xs font-bold text-accent-600 dark:bg-accent-700/20 dark:text-accent-400">
                          {dueCount}
                        </span>
                      )}
                      <ChevronLeft size={18} className="text-ink-300 dark:text-ink-600" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating + button */}
      {!searchResults && (
        <button
          onClick={() => setShowNewDeck(true)}
          className="fixed bottom-24 end-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition hover:bg-brand-700 active:scale-95 dark:shadow-brand-900/40"
          aria-label={t('newDeck')}
        >
          <Plus size={26} />
        </button>
      )}

      <Modal
        open={showNewDeck}
        onClose={() => setShowNewDeck(false)}
        title={t('newDeck')}
        footer={
          <>
            <button onClick={() => setShowNewDeck(false)} className="ghost-btn flex-1">
              {t('cancel')}
            </button>
            <button onClick={handleCreateDeck} className="primary-btn flex-1" disabled={!newDeckName.trim()}>
              {t('save')}
            </button>
          </>
        }
      >
        <input
          autoFocus
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
          placeholder={t('deckName')}
          className="field-input"
          onKeyDown={(e) => e.key === 'Enter' && handleCreateDeck()}
        />
      </Modal>
    </div>
  );
}
