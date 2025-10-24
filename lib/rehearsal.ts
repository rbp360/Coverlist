export type RagStatus = 'green' | 'amber' | 'red' | null;

export function ragStatusFromISO(iso?: string, now: Date = new Date()): RagStatus {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const yyyy = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const dd = parseInt(m[3], 10);
  const then = Date.UTC(yyyy, mm - 1, dd);
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.floor((todayUTC - then) / (1000 * 60 * 60 * 24));
  if (days <= 31) return 'green';
  if (days <= 90) return 'amber';
  return 'red';
}

export function ragClassFromISO(iso?: string): string | null {
  const status = ragStatusFromISO(iso);
  if (status === 'green') return 'text-green-400';
  if (status === 'amber') return 'text-yellow-400';
  if (status === 'red') return 'text-red-400';
  return null;
}

// Format ISO (YYYY-MM-DD) to DD/MM/YY
export function formatISOToDDMMYY(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const yyyy = m[1];
  const mm = m[2];
  const dd = m[3];
  const yy = yyyy.slice(-2);
  return `${dd}/${mm}/${yy}`;
}

// Parse a variety of user-friendly inputs into ISO (YYYY-MM-DD):
// - With separators: D/M/YY, DD/MM/YY, D/M/YYYY, DD/MM/YYYY (also accepts '-', '.', ' ')
// - Without separators: DDMMYY (6 digits), DDMMYYYY (8 digits)
// Returns '' to indicate clearing when input is empty/whitespace
// Returns null to indicate invalid format
export function parseFlexibleDateToISO(input: string): string | null {
  const s = input.trim();
  if (!s) return '';

  // Only digits (no separators)
  if (/^\d+$/.test(s)) {
    if (s.length === 6) {
      const dd = parseInt(s.slice(0, 2), 10);
      const mm = parseInt(s.slice(2, 4), 10);
      const yy = parseInt(s.slice(4, 6), 10);
      return validateYMD(2000 + yy, mm, dd);
    }
    if (s.length === 8) {
      const dd = parseInt(s.slice(0, 2), 10);
      const mm = parseInt(s.slice(2, 4), 10);
      const yyyy = parseInt(s.slice(4, 8), 10);
      return validateYMD(yyyy, mm, dd);
    }
    return null;
  }

  // Allow various separators
  const parts = s.split(/[^\d]+/).filter(Boolean);
  if (parts.length !== 3) return null;
  const dd = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  const yearStr = parts[2];
  const yyyy = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null;
  return validateYMD(yyyy, mm, dd);
}

function validateYMD(yyyy: number, mm: number, dd: number): string | null {
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd)
    return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
