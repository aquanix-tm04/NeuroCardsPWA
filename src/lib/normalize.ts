/** Normalize Persian/Arabic text for search & answer matching. */
const PERSIAN_DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const ARABIC_TO_PERSIAN: Record<string, string> = {
  'ي': 'ی', 'ك': 'ک', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا',
  'ة': 'ه', 'ؤ': 'و', 'ئ': 'ی',
};

export function normalizePersian(text: string): string {
  let out = text;
  for (const [ar, pe] of Object.entries(ARABIC_TO_PERSIAN)) {
    out = out.split(ar).join(pe);
  }
  for (const [pd, en] of Object.entries(PERSIAN_DIGITS)) {
    out = out.split(pd).join(en);
  }
  return out;
}

export function normalizeForMatch(text: string): string {
  return normalizePersian(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripLatex(text: string): string {
  // Remove inline and display math for search purposes
  return text.replace(/\$\$[^$]+\$\$/g, ' ').replace(/\$[^$]+\$/g, ' ');
}

export function searchNormalize(text: string): string {
  return normalizeForMatch(stripLatex(text));
}

/** Convert digits in a string to Persian digits (for display). */
export function toPersianDigits(input: string | number): string {
  const map = '۰۱۲۳۴۵۶۷۸۹';
  return String(input).replace(/[0-9]/g, (d) => map[Number(d)]);
}
