export function titleCaseWords(input: string): string {
  if (!input) return '';
  return input
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
        .join('-'),
    )
    .join(' ');
}

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function shortMonthYY(dateInput?: string | Date): string {
  let d: Date;
  if (!dateInput) d = new Date();
  else if (dateInput instanceof Date) d = dateInput;
  else {
    // Try parse ISO (YYYY-MM-DD) or fallback to Date parsing
    const isoMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [_, y, m, dd] = isoMatch;
      d = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(dd, 10)));
    } else {
      d = new Date(dateInput);
      if (isNaN(d.getTime())) d = new Date();
    }
  }
  const month = MONTHS_SHORT[d.getUTCMonth()];
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${month} ${yy}`;
}

export function buildRehearsalPlaylistName(projectName: string, date?: string | Date) {
  return `${titleCaseWords(projectName)} - Rehearsal - ${shortMonthYY(date)}`;
}

export function buildSetlistPlaylistName(projectName: string, setlistName: string, date?: string) {
  return `${titleCaseWords(projectName)} - ${titleCaseWords(setlistName)} - ${shortMonthYY(date)}`;
}
