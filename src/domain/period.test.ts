import { describe, expect, it } from 'vitest';
import { addMonths, isValidISODate, periodOf, periodRange } from './period';

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
