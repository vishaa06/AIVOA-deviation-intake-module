/**
 * Normalizes a date string into YYYY-MM-DD, the ONLY format an
 * <input type="date"> will actually render.
 *
 * DECISION: the AI extraction prompt now explicitly asks for ISO format,
 * but LLM output isn't 100% guaranteed even with a clear instruction. This
 * is a defensive second layer so a stray "17-09-2026" (DD-MM-YYYY) or
 * "09/17/2026" (MM/DD/YYYY) from the model still displays correctly instead
 * of silently rendering as a blank date field (the actual bug that was
 * reported — the value WAS extracted, it just couldn't render).
 */
export function normalizeDateForInput(raw) {
  if (!raw) return ''
  const value = String(raw).trim()

  // Already ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  // DD-MM-YYYY or DD/MM/YYYY (what the model used to return before the prompt fix)
  let m = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo}-${d}`
  }

  // YYYY/MM/DD
  m = value.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (m) {
    const [, y, mo, d] = m
    return `${y}-${mo}-${d}`
  }

  // Unrecognized format — leave blank rather than feed the <input type="date">
  // a value it will just silently reject.
  return ''
}
