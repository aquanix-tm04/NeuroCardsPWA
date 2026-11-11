import { useMemo } from 'react';
import { renderLatex } from '@/lib/latex';

interface Props {
  text: string;
  className?: string;
}

export function LatexContent({ text, className }: Props) {
  const html = useMemo(() => renderLatex(text), [text]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
