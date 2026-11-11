import { useState, useCallback } from 'react';
import { Brain, ListChecks, Plus, Pencil, Trash2, Inbox } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNav } from '@/context/NavContext';
import { TopBar } from '@/components/TopBar';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { getDeck, getCardsInDeck, renameDeck, deleteDeck, addCard, updateCard, deleteCard } from '@/db/repos';
import { LatexContent } from '@/components/LatexContent';

interface Props {
  deckId: string;
}

export function DeckDetailScreen({ deckId }: Props) {
  const { t } = useApp();
  const { navigate, goBack } = useNav();

  const [deck, setDeck] = useState(() => getDeck(deckId));
  const [cards, setCards] = useState(() => getCardsInDeck(deckId));
  const [showEditDeck, setShowEditDeck] = useState(false);
  const [deckName, setDeckName] = useState(deck?.name ?? '');
  const [showDeleteDeck, setShowDeleteDeck] = useState(false);

  const [editingCard, setEditingCard] = useState<{ id: string; question: string; answer: string } | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardQ, setCardQ] = useState('');
  const [cardA, setCardA] = useState('');

  const refresh = useCallback(() => {
    setDeck(getDeck(deckId));
    setCards(getCardsInDeck(deckId));
  }, [deckId]);

  const handleRenameDeck = () => {
    if (!deckName.trim()) return;
    renameDeck(deckId, deckName);
    setShowEditDeck(false);
    refresh();
  };

  const handleDeleteDeck = () => {
    deleteDeck(deckId);
    goBack();
  };

  const handleSaveCard = () => {
    if (!cardQ.trim() || !cardA.trim()) return;
    if (editingCard) {
      updateCard(editingCard.id, cardQ, cardA);
    } else {
      addCard(deckId, cardQ, cardA);
    }
    setEditingCard(null);
    setShowAddCard(false);
    setCardQ('');
    setCardA('');
    refresh();
  };

  const openEditCard = (id: string, question: string, answer: string) => {
    setEditingCard({ id, question, answer });
    setCardQ(question);
    setCardA(answer);
  };

  const openAddCard = () => {
    setEditingCard(null);
    setCardQ('');
    setCardA('');
    setShowAddCard(true);
  };

  const handleDeleteCard = (id: string) => {
    deleteCard(id);
    refresh();
  };

  const cardModalOpen = showAddCard || editingCard !== null;

  return (
    <div className="pb-24">
      <TopBar title={deck?.name ?? ''} showBack />

      <div className="space-y-4 px-4 pt-4">
        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => navigate({ name: 'study', deckId })}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-brand-600 py-3.5 text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            <Brain size={22} />
            <span className="text-xs font-medium">{t('studyDeck')}</span>
          </button>
          <button
            onClick={() => navigate({ name: 'quiz', deckId })}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-ink-100 py-3.5 text-ink-700 transition hover:bg-ink-200 active:scale-[0.98] dark:bg-ink-700 dark:text-ink-100 dark:hover:bg-ink-600"
          >
            <ListChecks size={22} />
            <span className="text-xs font-medium">{t('quizDeck')}</span>
          </button>
          <button
            onClick={openAddCard}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-ink-100 py-3.5 text-ink-700 transition hover:bg-ink-200 active:scale-[0.98] dark:bg-ink-700 dark:text-ink-100 dark:hover:bg-ink-600"
          >
            <Plus size={22} />
            <span className="text-xs font-medium">{t('addCard')}</span>
          </button>
        </div>

        {/* Deck management */}
        <div className="flex gap-2">
          <button onClick={() => { setDeckName(deck?.name ?? ''); setShowEditDeck(true); }} className="ghost-btn flex-1 text-sm">
            <Pencil size={16} />
            {t('editDeck')}
          </button>
          <button onClick={() => setShowDeleteDeck(true)} className="danger-btn flex-1 text-sm">
            <Trash2 size={16} />
            {t('deleteDeck')}
          </button>
        </div>

        {/* Card list */}
        {cards.length === 0 ? (
          <EmptyState
            icon={<Inbox size={28} />}
            title={t('noCards')}
            action={
              <button onClick={openAddCard} className="primary-btn">
                <Plus size={18} />
                {t('addCard')}
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="card-surface group p-4"
              >
                <button
                  onClick={() => openEditCard(card.id, card.question, card.answer)}
                  className="block w-full text-right"
                >
                  <LatexContent
                    text={card.question}
                    className="text-sm font-medium text-ink-900 dark:text-white"
                  />
                </button>
                <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2 dark:border-ink-700">
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="text-xs text-ink-400 transition hover:text-red-500 dark:text-ink-500"
                    aria-label={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => openEditCard(card.id, card.question, card.answer)}
                    className="text-xs text-brand-600 dark:text-brand-400"
                  >
                    {t('edit')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit deck modal */}
      <Modal
        open={showEditDeck}
        onClose={() => setShowEditDeck(false)}
        title={t('editDeck')}
        footer={
          <>
            <button onClick={() => setShowEditDeck(false)} className="ghost-btn flex-1">{t('cancel')}</button>
            <button onClick={handleRenameDeck} className="primary-btn flex-1" disabled={!deckName.trim()}>
              {t('save')}
            </button>
          </>
        }
      >
        <input
          autoFocus
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder={t('deckName')}
          className="field-input"
        />
      </Modal>

      {/* Delete deck confirm */}
      <Modal
        open={showDeleteDeck}
        onClose={() => setShowDeleteDeck(false)}
        title={t('deleteDeck')}
        footer={
          <>
            <button onClick={() => setShowDeleteDeck(false)} className="ghost-btn flex-1">{t('cancel')}</button>
            <button onClick={handleDeleteDeck} className="danger-btn flex-1">{t('delete')}</button>
          </>
        }
      >
        <p className="text-sm text-ink-600 dark:text-ink-300">{t('deleteDeckConfirm')}</p>
      </Modal>

      {/* Add / edit card modal */}
      <Modal
        open={cardModalOpen}
        onClose={() => { setEditingCard(null); setShowAddCard(false); }}
        title={editingCard ? t('edit') : t('addCard')}
        footer={
          <>
            <button onClick={() => { setEditingCard(null); setShowAddCard(false); }} className="ghost-btn flex-1">
              {t('cancel')}
            </button>
            <button onClick={handleSaveCard} className="primary-btn flex-1" disabled={!cardQ.trim() || !cardA.trim()}>
              {t('save')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">{t('question')}</label>
            <textarea
              autoFocus
              value={cardQ}
              onChange={(e) => setCardQ(e.target.value)}
              className="field-input min-h-20 resize-y"
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">{t('answer')}</label>
            <textarea
              value={cardA}
              onChange={(e) => setCardA(e.target.value)}
              className="field-input min-h-24 resize-y"
              rows={4}
            />
            <p className="mt-1 text-[11px] text-ink-400">LaTeX: $...$ · $\\alpha$</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
