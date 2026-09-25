import { addMonths, lastDayOfPeriod, parseYearMonth } from './period';
import type { ISODate, RecurringRule, YearMonth } from './types';

/**
 * 固定費の「確認待ち」を求める純粋関数。
 * 固定費は毎月自動では記帳せず、確認待ちに並べてユーザーが確定（またはスキップ）する。
 */

export interface PendingOccurrence {
  rule: RecurringRule;
  /** 表示名（小分類の名前） */
  name: string;
  /** 何月分か */
  month: YearMonth;
  /** 予定日 */
  date: ISODate;
}

export const occurrenceKey = (ruleId: string, month: YearMonth) => `${ruleId}:${month}`;

/** その月の予定日（その月にない日は月末） */
export function occurrenceDate(month: YearMonth, dayOfMonth: number): ISODate {
  const last = lastDayOfPeriod(month);
  const lastDay = Number(last.slice(8));
  const { year, month: m } = parseYearMonth(month);
  const day = Math.min(Math.max(Math.trunc(dayOfMonth), 1), lastDay);
  return `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 開始月から今月（終了月があればそこまで）の各月のうち、
 * まだ確定もスキップもしていないものを日付順に返す。
 * handled: 確定済み（削除した取引も含む）の occurrenceKey の集合
 */
export function pendingOccurrences(
  rules: readonly RecurringRule[],
  handled: ReadonlySet<string>,
  current: YearMonth,
  names: ReadonlyMap<string, string> = new Map(),
): PendingOccurrence[] {
  const result: PendingOccurrence[] = [];
  for (const rule of rules) {
    if (rule.deletedAt) continue;
    const last = rule.endMonth && rule.endMonth < current ? rule.endMonth : current;
    for (let month = rule.startMonth; month <= last; month = addMonths(month, 1)) {
      if (rule.skippedMonths.includes(month) || handled.has(occurrenceKey(rule.id, month))) continue;
      const name = names.get(rule.subcategoryId) ?? '（名前なし）';
      result.push({ rule, name, month, date: occurrenceDate(month, rule.dayOfMonth) });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
