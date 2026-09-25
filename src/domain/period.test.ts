import { describe, expect, it } from 'vitest';
import { addDays, addMonths, defaultEntryDate, formatDateJa, formatMonthDayJa, isValidISODate, lastDayOfPeriod, periodOf, periodRange } from './period';

describe('addMonths', () => {
  it('年をまたいで加減算できる', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-09', -12)).toBe('2025-09');
  });
});

describe('periodRange', () => {
  it('カレンダー月（開始日1）', () => {
    expect(periodRange('2026-09')).toEqual({ start: '2026-09-01', endExclusive: '2026-10-01' });
    expect(periodRange('2026-12')).toEqual({ start: '2026-12-01', endExclusive: '2027-01-01' });
  });
  it('開始日を変えても計算できる（将来の給料日基準用）', () => {
    expect(periodRange('2026-09', 25)).toEqual({ start: '2026-09-25', endExclusive: '2026-10-25' });
  });
});

describe('periodOf', () => {
  it('カレンダー月', () => {
    expect(periodOf('2026-09-01')).toBe('2026-09');
    expect(periodOf('2026-09-30')).toBe('2026-09');
  });
  it('開始日より前の日付は前の期間', () => {
    expect(periodOf('2026-09-24', 25)).toBe('2026-08');
    expect(periodOf('2026-09-25', 25)).toBe('2026-09');
    expect(periodOf('2026-01-10', 25)).toBe('2025-12');
  });
});

describe('isValidISODate', () => {
  it('存在しない日付を弾く', () => {
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-9-1')).toBe(false);
  });
});

describe('lastDayOfPeriod / defaultEntryDate', () => {
  it('期間の最終日（うるう年・開始日つき）', () => {
    expect(lastDayOfPeriod('2028-02')).toBe('2028-02-29');
    expect(lastDayOfPeriod('2026-12')).toBe('2026-12-31');
    expect(lastDayOfPeriod('2026-09', 25)).toBe('2026-10-24');
  });
  it('今日が期間内なら今日、そうでなければ最終日', () => {
    expect(defaultEntryDate('2026-09', 1, '2026-09-25')).toBe('2026-09-25');
    expect(defaultEntryDate('2026-08', 1, '2026-09-25')).toBe('2026-08-31');
  });
});

describe('formatMonthDayJa', () => {
  it('月/日（曜日）', () => {
    expect(formatMonthDayJa('2026-09-25')).toBe('9/25（金）');
    expect(formatMonthDayJa('2026-09-27')).toBe('9/27（日）');
  });
});

describe('addDays / formatDateJa', () => {
  it('月・年をまたいで日付をずらす', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
  it('年/月/日（曜日）', () => {
    expect(formatDateJa('2026-09-25')).toBe('2026/9/25（金）');
  });
});
