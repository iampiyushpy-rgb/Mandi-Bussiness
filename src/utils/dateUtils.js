/**
 * Formats any date string, timestamp, or Date object to DD-MM-YY (e.g. 30-09-26)
 * @param {string | number | Date | null | undefined} rawDate 
 * @returns {string} Formatted date string in "DD-MM-YY" structure
 */
export const formatDisplayDate = (rawDate) => {
  if (!rawDate && rawDate !== 0) return '';
  const s = String(rawDate).trim();
  if (!s || s === '—' || s === '-' || s === 'null' || s === 'undefined' || s === 'Unknown Date') {
    return s || '';
  }

  // If already DD-MM-YY (e.g. 30-09-26)
  if (/^\d{2}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // If DD-MM-YYYY or DD/MM/YYYY (e.g. 30-09-2026 or 30/09/2026)
  const ddmmyyyyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddmmyyyyMatch) {
    const [, d, m, y] = ddmmyyyyMatch;
    const dd = d.padStart(2, '0');
    const mm = m.padStart(2, '0');
    const yy = y.slice(-2);
    return `${dd}-${mm}-${yy}`;
  }

  // If YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss... (e.g. 2026-09-30 or 2026-09-30T10:00:00)
  const yyyymmddMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (yyyymmddMatch) {
    const [, y, m, d] = yyyymmddMatch;
    const dd = d.padStart(2, '0');
    const mm = m.padStart(2, '0');
    const yy = y.slice(-2);
    return `${dd}-${mm}-${yy}`;
  }

  // Fallback using JavaScript Date constructor
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yy = String(d.getFullYear()).slice(-2);
      return `${dd}-${mm}-${yy}`;
    }
  } catch {
    // ignore
  }

  return s;
};
