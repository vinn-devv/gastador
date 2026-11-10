const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

export function isValidDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

function toUtcMs(date: string): number {
  const m = DATE_RE.exec(date);
  if (!m) throw new RangeError(`Invalid date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUtcMs(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function toLocalDateString(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function manilaDateOf(instant: Date | string | number): string {
  const ms = instant instanceof Date ? instant.getTime() : new Date(instant).getTime();
  if (!Number.isFinite(ms)) throw new RangeError('Invalid instant');
  return fromUtcMs(ms + MANILA_OFFSET_MS);
}

export function manilaToday(now: Date = new Date()): string {
  return manilaDateOf(now);
}

export function toManilaInput(instant: Date | string): string {
  const ms = (instant instanceof Date ? instant.getTime() : new Date(instant).getTime()) + MANILA_OFFSET_MS;
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function nowManilaInput(now: Date = new Date()): string {
  return toManilaInput(now);
}

export function fromManilaInput(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  if (!isValidDate(date)) return null;
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  if (hour > 23 || minute > 59) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour, minute) - MANILA_OFFSET_MS).toISOString();
}

export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function daysInclusive(start: string, end: string): number {
  return diffDays(start, end) + 1;
}

export function addMonths(date: string, months: number): string {
  const m = DATE_RE.exec(date);
  if (!m) throw new RangeError(`Invalid date: ${date}`);
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const target = month + months;
  const targetYear = year + Math.floor(target / 12);
  const targetMonth = ((target % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${pad(targetYear, 4)}-${pad(targetMonth + 1)}-${pad(Math.min(day, lastDay))}`;
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function formatDate(date: string, withYear = true): string {
  const m = DATE_RE.exec(date);
  if (!m) return date;
  const base = `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}`;
  return withYear ? `${base}, ${m[1]}` : base;
}

export function formatRange(start: string, end: string): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDate(start, !sameYear)} – ${formatDate(end, true)}`;
}

export function formatDayHeading(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  const weekday = WEEKDAYS[new Date(toUtcMs(date)).getUTCDay()];
  return `${weekday}, ${formatDate(date, date.slice(0, 4) !== today.slice(0, 4))}`;
}

export function formatTime(instant: string): string {
  const d = new Date(new Date(instant).getTime() + MANILA_OFFSET_MS);
  const h = d.getUTCHours();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(d.getUTCMinutes())} ${suffix}`;
}

export function manilaHour(now: Date = new Date()): number {
  return new Date(now.getTime() + MANILA_OFFSET_MS).getUTCHours();
}

export function manilaHourMinute(now: Date = new Date()): string {
  const d = new Date(now.getTime() + MANILA_OFFSET_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function weekdayIndex(date: string): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

export function weekStart(date: string): string {
  return addDays(date, -((weekdayIndex(date) + 6) % 7));
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function legacyDateToManila(value: string): string | null {
  if (DATE_RE.test(value)) return isValidDate(value) ? value : null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) return fromUtcMs(ms);
  return manilaDateOf(d);
}

export type DateDisplayFormat = "DMY" | "MDY" | "YMD" | "DMMM";

export function formatDateWithPreference(date: string, format: DateDisplayFormat): string {
  const match = DATE_RE.exec(date);
  if (!match) return date;
  const year = match[1];
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (format === "DMY") return `${pad(day)}/${pad(month)}/${year}`;
  if (format === "MDY") return `${pad(month)}/${pad(day)}/${year}`;
  if (format === "YMD") return `${year}-${pad(month)}-${pad(day)}`;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
