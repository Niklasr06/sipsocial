const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function parseDate(iso: string): Date {
  // YYYY-MM-DD -> Date local time
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDateLong(iso: string): string {
  const d = parseDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

export function formatDateShort(iso: string): string {
  const d = parseDate(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} – ${end} Uhr`;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function overlapMinutes(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const start = Math.max(toMinutes(aStart), toMinutes(bStart));
  const end = Math.min(toMinutes(aEnd), toMinutes(bEnd));
  return Math.max(0, end - start);
}

export function todayIso(): string {
  const d = new Date();
  return formatIso(d);
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return formatIso(d);
}

export function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isPast(iso: string, time?: string): boolean {
  const d = parseDate(iso);
  if (time) {
    const [h, m] = time.split(':').map(Number);
    d.setHours(h, m || 0, 0, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }
  return d.getTime() < Date.now();
}
