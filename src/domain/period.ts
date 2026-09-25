import type { ISODate, YearMonth } from './types';

/**
 * 「月」の区切りを扱うモジュール。
 * 月の範囲計算はすべてここを経由させ、月の開始日の変更（給料日基準など）に
 * この1ファイルの修正だけで追従できるようにする。
 *
 * 規約: monthStartDay = d のとき、期間 "YYYY-MM" は YYYY-MM-d から翌月の d 日前日まで。
 * d = 1 ならカレンダー月と一致する。
 */

export interface PeriodRange {
  /** 期間の初日（含む） */
  start: ISODate;
  /** 期間の翌日（含まない）。Dexie の between(start, end, true, false) にそのまま渡せる */
  endExclusive: ISODate;
}

const pad = (n: number, len = 2) => String(n).padStart(len, '0');

export function clampStartDay(day: number): number {
  if (!Number.isInteger(day)) return 1;
  return Math.min(Math.max(day, 1), 28);
}

export function parseYearMonth(ym: YearMonth): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) throw new Error(`不正な年月: ${ym}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw new Error(`不正な年月: ${ym}`);
  return { year, month };
}

export function formatYearMonth(year: number, month: number): YearMonth {
  return `${pad(year, 4)}-${pad(month)}`;
}

export function isValidISODate(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const { year, month } = parseYearMonth(ym);
  const index = year * 12 + (month - 1) + delta;
  return formatYearMonth(Math.floor(index / 12), (index % 12) + 1);
}

export function periodRange(ym: YearMonth, monthStartDay = 1): PeriodRange {
  const day = clampStartDay(monthStartDay);
  const next = parseYearMonth(addMonths(ym, 1));
  const { year, month } = parseYearMonth(ym);
  return {
    start: `${formatYearMonth(year, month)}-${pad(day)}`,
    endExclusive: `${formatYearMonth(next.year, next.month)}-${pad(day)}`,
  };
}

/** 日付が属する期間（年月）を返す */
export function periodOf(date: ISODate, monthStartDay = 1): YearMonth {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const ym = formatYearMonth(y, m);
  return d >= clampStartDay(monthStartDay) ? ym : addMonths(ym, -1);
}

export function toISODate(date: Date): ISODate {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function currentPeriod(monthStartDay = 1): YearMonth {
  return periodOf(today(), monthStartDay);
}

/** 表示用: "2026-09" → "2026年9月" */
export function formatYearMonthJa(ym: YearMonth): string {
  const { year, month } = parseYearMonth(ym);
  return `${year}年${month}月`;
}

/** 期間の最終日 */
export function lastDayOfPeriod(ym: YearMonth, monthStartDay = 1): ISODate {
  const [y, m, d] = periodRange(ym, monthStartDay).endExclusive.split('-').map(Number) as [number, number, number];
  return toISODate(new Date(y, m - 1, d - 1));
}

/** 入力フォームの日付の初期値。今日がその期間内なら今日、そうでなければ期間の最終日 */
export function defaultEntryDate(ym: YearMonth, monthStartDay = 1, todayDate: ISODate = today()): ISODate {
  return periodOf(todayDate, monthStartDay) === ym ? todayDate : lastDayOfPeriod(ym, monthStartDay);
}

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** 表示用: "2026-09-25" → "9/25（金）" */
export function formatMonthDayJa(date: ISODate): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${m}/${d}（${WEEKDAYS_JA[new Date(y, m - 1, d).getDay()]}）`;
}

/** 日付を n 日ずらす */
export function addDays(date: ISODate, n: number): ISODate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return toISODate(new Date(y, m - 1, d + n));
}

/** 表示用: "2026-09-25" → "2026/9/25（金）" */
export function formatDateJa(date: ISODate): string {
  return `${date.slice(0, 4)}/${formatMonthDayJa(date)}`;
}
