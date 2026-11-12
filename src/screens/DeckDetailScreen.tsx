import { useState, useCallback } from 'react';
import { Brain, ListChecks, Plus, Pencil, Trash2, Inbox, Flag, ImageIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNav } from '@/context/NavContext';
import { useAuth } from '@/context/AuthContext';
import { TopBar } from '@/components/TopBar';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { LatexContent } from '@/components/LatexContent';
import { CardImages } from '@/components/CardImages';
import { getDeck, getCardsInDeck, renameDeck, deleteDeck, addCard, updateCard, deleteCard, toggleFlagCard } from '@/db/repos';
import { getLocalCardImages, uploadCardImage, removeCardImage } from '@/lib/images';

interface Props {
  deckId: string;
}

export function DeckDetailScreen({ deckId }: Props) {
  const { t } = useApp();
  const { navigate, goBack } = useNav();
  const { user } = useAuth();

  const [deck, setDeck] = useState(() => getDeck(deckId));
  const [cards, setCards] = useState(() => getCardsInDeck(deckId));
  const [showEditDeck, setShowEditDeck] = useState(false);
  const [deckName, setDeckName] = useState(deck?.name ?? '');
  const [showDeleteDeck, setShowDeleteDeck] = useState(false);

  const [editingCard, setEditingCard] = useState<{ id: string; question: string; answer: string; card_type: string; blank_answer: string | null } | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardQ, setCardQ] = useState('');
  const [cardA, setCardA] = useState('');
  const [cardType, setCardType] = useState<'standard' | 'blank'>('standard');
  const [blankAnswer, setBlankAnswer] = useState('');
  const [cardImagesState, setCardImagesState] = useState<Array<{ id: string; url: string | null }>>([]);
  const [uploading, setUploading] = useState(false);

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

  const loadCardImages = useCallback((cardId: string) => {
    setCardImagesState(getLocalCardImages(cardId));
  }, []);

  const handleSaveCard = () => {
    if (!cardQ.trim() || !cardA.trim()) return;
    if (editingCard) {
      updateCard(editingCard.id, cardQ, cardA, cardType, cardType === 'blank' ? blankAnswer : null);
    } else {
      addCard(deckId, cardQ, cardA, cardType, cardType === 'blank' ? blankAnswer : null);
    }
    setEditingCard(null);
    setShowAddCard(false);
    setCardQ('');
    setCardA('');
    setCardType('standard');
    setBlankAnswer('');
    setCardImagesState([]);
    refresh();
  };

  const openEditCard = (card: { id: string; question: string; answer: string; card_type: string; blank_answer: string | null }) => {
    setEditingCard({ id: card.id, question: card.question, answer: card.answer, card_type: card.card_type || 'standard', blank_answer: card.blank_answer });
    setCardQ(card.question);
    setCardA(card.answer);
    setCardType((card.card_type as 'standard' | 'blank') || 'standard');
    setBlankAnswer(card.blank_answer ?? '');
    loadCardImages(card.id);
  };

  const openAddCard = () => {
    setEditingCard(null);
    setCardQ('');
    setCardA('');
    setCardType('standard');
    setBlankAnswer('');
    setCardImagesState([]);
    setShowAddCard(true);
  };

  const handleDeleteCard = (id: string) => {
    deleteCard(id);
    refresh();
  };

  const handleToggleFlag = (id: string, current: number) => {
    toggleFlagCard(id, current !== 1);
    refresh();
  };

  const handleImageUpload = async (file: File) => {
    if (!editingCard || !user) return;
    setUploading(true);
    try {
      await uploadCardImage(editingCard.id, file, user, cardImagesState.length);
      loadCardImages(editingCard.id);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleImageRemove = async (imageId: string, storagePath: string) => {
    try {
      await removeCardImage(imageId, storagePath);
      if (editingCard) loadCardImages(editingCard.id);
    } catch (err) {
      console.error('Remove error:', err);
    }
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
            onClick={() => useNav().navigate({ name: 'quiz', deckId })}
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
            {cards.map((card) => {
              const images = getLocalCardImages(card.id);
              return (
                <div key={card.id} className="card-surface group p-4">
                  <button
                    onClick={() => openEditCard(card)}
                    className="block w-full text-right"
                  >
                    <div className="flex items-center gap-2">
                      {card.card_type === 'blank' && (
                        <span className="rounded bg-accent-100 px-1.5 py-0.5 text-[10px] font-medium text-accent-600 dark:bg-accent-700/20 dark:text-accent-400">
                          {t('fillBlank')}
                        </span>
                      )}
                      {card.flagged === 1 && (
                        <Flag size={14} className="text-accent-500" />
                      )}
                      <LatexContent
                        text={card.question}
                        className="flex-1 text-sm font-medium text-ink-900 dark:text-white"
                      />
                    </div>
                  </button>
                  {images.length > 0 && <CardImages images={images} />}
                  <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2 dark:border-ink-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleFlag(card.id, card.flagged)}
                        className={`text-xs transition hover:text-accent-500 ${card.flagged === 1 ? 'text-accent-500' : 'text-ink-400 dark:text-ink-500'}`}
                        aria-label={t('flagCard')}
                      >
                        <Flag size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-xs text-ink-400 transition hover:text-red-500 dark:text-ink-500"
                        aria-label={t('delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => openEditCard(card)}
                      className="text-xs text-brand-600 dark:text-brand-400"
                    >
                      {t('edit')}
                    </button>
                  </div>
                </div>
              );
            })}
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
        onClose={() => { setEditingCard(null); setShowAddCard(false); setCardImagesState([]); }}
        title={editingCard ? t('edit') : t('addCard')}
        footer={
          <>
            <button onClick={() => { setEditingCard(null); setShowAddCard(false); setCardImagesState([]); }} className="ghost-btn flex-1">
              {t('cancel')}
            </button>
            <button onClick={handleSaveCard} className="primary-btn flex-1" disabled={!cardQ.trim() || !cardA.trim() || (cardType === 'blank' && !blankAnswer.trim())}>
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
            <p className="mt-1 text-[11px] text-ink-400">LaTeX: $...$ · $\alpha$</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">{t('cardType')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCardType('standard')}
                className={`rounded-xl py-2.5 text-sm font-medium transition ${cardType === 'standard' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-200'}`}
              >
                {t('standardCard')}
              </button>
              <button
                onClick={() => setCardType('blank')}
                className={`rounded-xl py-2.5 text-sm font-medium transition ${cardType === 'blank' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-700 dark:text-ink-200'}`}
              >
                {t('blankCard')}
              </button>
            </div>
          </div>
          {cardType === 'blank' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">{t('blankAnswerHint')}</label>
              <input
                value={blankAnswer}
                onChange={(e) => setBlankAnswer(e.target.value)}
                placeholder={t('blankAnswerHint')}
                className="field-input"
              />
            </div>
          )}

          {/* Image upload for existing cards */}
          {editingCard && user && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">{t('images')}</label>
              {cardImagesState.length > 0 && (
                <div className="mb-2 grid grid-cols-3 gap-2">
                  {cardImagesState.map((img) => (
                    <div key={img.id} className="relative">
                      {img.url && <img src={img.url} alt="" className="h-20 w-full rounded-lg object-cover" />}
                      <button
                        onClick={() => handleImageRemove(img.id, getLocalCardImages(editingCard.id).find((i) => i.id === img.id)?.storage_path ?? '')}
                        className="absolute end-1 top-1 rounded-full bg-black/50 p-0.5 text-white"
                        aria-label={t('removeImage')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {cardImagesState.length < 3 && (
                <label className="ghost-btn w-full cursor-pointer text-sm">
                  <ImageIcon size={16} />
                  {uploading ? '…' : t('addImage')}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUpload(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
