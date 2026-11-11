import katex from 'katex';
import 'katex/dist/katex.min.css';

const INLINE_RE = /\$([^$]+)\$/g;
const DISPLAY_RE = /\$\$([^$]+)\$\$/g;

function renderMath(expr: string, display: boolean): string {
  try {
    return katex.renderToString(expr, {
      displayMode: display,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return expr;
  }
}

/** Render LaTeX ($...$ and $$...$$) in a string to HTML. */
export function renderLatex(text: string): string {
  // Escape HTML first to prevent injection
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Render display math first ($$...$$), then inline ($...$)
  // We need to handle both without double-processing.
  let result = '';
  let i = 0;
  let remaining = escaped;

  while (remaining.length > 0) {
    const displayStart = remaining.indexOf('$$');
    const inlineStart = remaining.indexOf('$');

    if (displayStart !== -1 && (inlineStart === -1 || displayStart <= inlineStart)) {
      // Output up to $$
      result += remaining.slice(0, displayStart);
      const afterMarker = remaining.slice(displayStart + 2);
      const endIdx = afterMarker.indexOf('$$');
      if (endIdx !== -1) {
        const expr = afterMarker.slice(0, endIdx);
        result += renderMath(expr, true);
        remaining = afterMarker.slice(endIdx + 2);
      } else {
        result += '$$' + afterMarker;
        remaining = '';
      }
    } else if (inlineStart !== -1) {
      result += remaining.slice(0, inlineStart);
      const afterMarker = remaining.slice(inlineStart + 1);
      const endIdx = afterMarker.indexOf('$');
      if (endIdx !== -1) {
        const expr = afterMarker.slice(0, endIdx);
        result += renderMath(expr, false);
        remaining = afterMarker.slice(endIdx + 1);
      } else {
        result += '$' + afterMarker;
        remaining = '';
      }
    } else {
      result += remaining;
      remaining = '';
    }
  }

  // Preserve newlines
  return result.replace(/\n/g, '<br/>');
}
