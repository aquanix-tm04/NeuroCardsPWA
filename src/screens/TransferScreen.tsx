import { useState } from 'react';
import { CloudUpload, CheckCircle2, AlertCircle, SkipForward } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useNav } from '@/context/NavContext';
import { transferLocalToCloud, fullSync } from '@/lib/sync';
import { getAllLocalDataForSync } from '@/db/repos';

interface Props {
  onComplete: () => void;
}

export function TransferScreen({ onComplete }: Props) {
  const { t } = useApp();
  const { user } = useAuth();
  const { navigate } = useNav();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const localData = getAllLocalDataForSync();
  const deckCount = localData.decks.length;
  const cardCount = localData.cards.length;
  const reviewCount = localData.reviews.length;
  const hasData = deckCount > 0;

  const handleTransfer = async () => {
    setLoading(true);
    setError('');
    try {
      await transferLocalToCloud();
      await fullSync();
      setDone(true);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await fullSync();
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  const finish = () => { onComplete(); navigate({ name: 'home' }); };

  if (done) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-8">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            <CheckCircle2 size={40} />
          </div>
          <p className="text-xl font-bold text-ink-900 dark:text-white">{t('transferSuccess')}</p>
          <p className="text-sm text-ink-400 dark:text-ink-500">
            {user?.email}
          </p>
          <button onClick={finish} className="primary-btn w-full">
            {t('backHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <CloudUpload size={32} />
          </div>
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">{t('transferData')}</h2>
          <p className="text-sm text-ink-400 dark:text-ink-500">{t('transferConfirm')}</p>
        </div>

        {hasData && (
          <div className="card-surface space-y-2 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink-500 dark:text-ink-400">{t('allDecks')}</span>
              <span className="font-bold text-ink-900 dark:text-white">{deckCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500 dark:text-ink-400">{t('cards')}</span>
              <span className="font-bold text-ink-900 dark:text-white">{cardCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-500 dark:text-ink-400">{t('totalReviews')}</span>
              <span className="font-bold text-ink-900 dark:text-white">{reviewCount}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="space-y-2">
          {hasData && (
            <button onClick={handleTransfer} disabled={loading} className="primary-btn w-full text-base">
              {loading ? '…' : t('transferData')}
            </button>
          )}
          <button onClick={handleSkip} disabled={loading} className="ghost-btn w-full text-sm">
            <SkipForward size={16} />
            {t('transferSkip')}
          </button>
        </div>
      </div>
    </div>
  );
}
