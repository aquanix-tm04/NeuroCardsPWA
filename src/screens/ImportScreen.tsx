import { useState, useMemo, type DragEvent } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNav } from '@/context/NavContext';
import { TopBar } from '@/components/TopBar';
import { getAllDecks, createDeck, addCardsBulk } from '@/db/repos';
import { parseCsv, type ParsedCsv } from '@/lib/csv';
import { toPersianDigits } from '@/lib/normalize';

const NEW_DECK = '__new__';

export function ImportScreen() {
  const { t, lang } = useApp();
  const { navigate } = useNav();
  const decks = useMemo(() => getAllDecks(), []);

  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [target, setTarget] = useState<string>(decks[0]?.id ?? NEW_DECK);
  const [newDeckName, setNewDeckName] = useState('');
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const num = (n: number) => (lang === 'fa' ? toPersianDigits(n) : String(n));

  const loadFile = (file: File) => {
    setError('');
    setImportedCount(null);
    if (!/\.(csv|txt)$/i.test(file.name) && !file.type.includes('csv') && !file.type.startsWith('text/')) {
      setError(t('importFail'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCsv(String(reader.result ?? ''));
      if (result.validRows === 0) {
        setParsed(null);
        setError(t('importFail'));
        return;
      }
      setFileName(file.name);
      setParsed(result);
    };
    reader.onerror = () => setError(t('importFail'));
    reader.readAsText(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const canImport = !!parsed && (target !== NEW_DECK || newDeckName.trim().length > 0);

  const handleImport = () => {
    if (!parsed || !canImport) return;
    const deckId = target === NEW_DECK ? createDeck(newDeckName) : target;
    const count = addCardsBulk(deckId, parsed.rows);
    setImportedCount(count);
    setParsed(null);
    setFileName('');
  };

  if (importedCount !== null) {
    return (
      <div className="pb-28">
        <TopBar title={t('import')} showBack />
        <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            <CheckCircle2 size={40} />
          </div>
          <p className="text-xl font-bold text-ink-900 dark:text-white">
            {num(importedCount)} {t('importSuccess')}
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setImportedCount(null)} className="ghost-btn">
              <Upload size={16} />
              {t('import')}
            </button>
            <button onClick={() => navigate({ name: 'home' })} className="primary-btn">
              {t('backHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <TopBar title={t('import')} showBack />

      <div className="space-y-5 px-4 pt-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragging
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
              : 'border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-800'
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            <Upload size={26} />
          </div>
          <p className="text-sm text-ink-600 dark:text-ink-300">{t('dragDrop')}</p>
          <label className="primary-btn cursor-pointer">
            {t('chooseFile')}
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadFile(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {parsed && (
          <>
            <section className="card-surface space-y-3 p-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-brand-600 dark:text-brand-400" />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900 dark:text-white">{fileName}</p>
              </div>
              <p className="text-xs text-ink-400 dark:text-ink-500">
                {num(parsed.validRows)} / {num(parsed.totalRows)} {t('cards')}
              </p>
              <div className="overflow-x-auto rounded-xl border border-ink-100 dark:border-ink-700" dir="ltr">
                <table className="w-full text-left text-xs">
                  <tbody>
                    {parsed.preview.map((row, i) => (
                      <tr key={i} className="border-b border-ink-100 last:border-0 dark:border-ink-700">
                        <td className="max-w-[140px] truncate px-2 py-1.5 text-ink-700 dark:text-ink-200">{row[0]}</td>
                        <td className="max-w-[140px] truncate px-2 py-1.5 text-ink-500 dark:text-ink-400">{row[1]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card-surface space-y-3 p-4">
              <label htmlFor="import-deck" className="block text-sm font-semibold text-ink-700 dark:text-ink-200">
                {t('assignDeck')}
              </label>
              <select
                id="import-deck"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="field-input"
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                <option value={NEW_DECK}>+ {t('newDeckName')}</option>
              </select>
              {target === NEW_DECK && (
                <input
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder={t('newDeckName')}
                  className="field-input"
                />
              )}
            </section>

            <button onClick={handleImport} disabled={!canImport} className="primary-btn w-full text-base">
              {t('import')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
