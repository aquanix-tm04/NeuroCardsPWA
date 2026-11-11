import { type ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-700 dark:text-ink-300">
          {icon}
        </div>
      )}
      <div>
        <p className="text-base font-semibold text-ink-700 dark:text-ink-200">{title}</p>
        {message && <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">{message}</p>}
      </div>
      {action}
    </div>
  );
}
