import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSyncStatus, onSyncStatusChange, fullSync, type SyncStatus } from '@/lib/sync';
import { useApp } from '@/context/AppContext';

export function SyncIndicator() {
  const { t } = useApp();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());

  useEffect(() => onSyncStatusChange(setStatus), []);

  const handleClick = () => {
    if (status !== 'syncing') fullSync();
  };

  const config: Record<SyncStatus, { icon: typeof Cloud; color: string; label: string }> = {
    idle: { icon: Cloud, color: 'text-ink-400 dark:text-ink-500', label: '' },
    syncing: { icon: RefreshCw, color: 'text-brand-500', label: t('syncing') },
    synced: { icon: CheckCircle2, color: 'text-brand-600 dark:text-brand-400', label: t('synced') },
    error: { icon: AlertCircle, color: 'text-red-500', label: t('syncError') },
    offline: { icon: CloudOff, color: 'text-ink-400 dark:text-ink-500', label: t('waitingSync') },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition ${color} hover:bg-ink-100 dark:hover:bg-ink-700`}
      aria-label={label || t('syncStatus')}
    >
      <Icon size={16} className={status === 'syncing' ? 'animate-spin' : ''} />
      {label && <span>{label}</span>}
    </button>
  );
}
