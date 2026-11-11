interface Props {
  label?: string;
  className?: string;
}

export function Loading({ label, className }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 ${className ?? ''}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500 dark:border-ink-700 dark:border-t-brand-400" />
      {label && <p className="text-sm text-ink-400 dark:text-ink-500">{label}</p>}
    </div>
  );
}
