import Papa from 'papaparse';

export interface ParsedCsv {
  rows: { question: string; answer: string }[];
  delimiter: string;
  preview: string[][];
  totalRows: number;
  validRows: number;
}

function autoDetectDelimiter(sample: string): string {
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = -1;
  for (const d of candidates) {
    const firstLine = sample.split('\n')[0] ?? '';
    const count = firstLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

export function parseCsv(text: string): ParsedCsv {
  const delimiter = autoDetectDelimiter(text);
  const result = Papa.parse<string[]>(text, {
    delimiter,
    skipEmptyLines: true,
  });

  const rawRows = result.data;
  const preview = rawRows.slice(0, 3);

  // Detect header: if first row contains "question" or "answer" (case-insensitive)
  const firstRow = rawRows[0] ?? [];
  const hasHeader = firstRow.some((c) =>
    ['question', 'answer', 'سوال', 'پاسخ', 'q', 'a'].includes(String(c).toLowerCase().trim())
  );

  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
  const rows: { question: string; answer: string }[] = [];

  for (const r of dataRows) {
    const q = String(r[0] ?? '').trim();
    const a = String(r[1] ?? '').trim();
    if (q && a) {
      rows.push({ question: q, answer: a });
    }
  }

  return {
    rows,
    delimiter,
    preview,
    totalRows: rawRows.length,
    validRows: rows.length,
  };
}

export function exportCsv(items: { question: string; answer: string }[]): string {
  return Papa.unparse(items, { columns: ['question', 'answer'] });
}

export function exportJson(items: unknown): string {
  return JSON.stringify(items, null, 2);
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
