import { describe, expect, it } from 'vitest';
import { isValidAmount, parseAmount } from './money';

describe('parseAmount', () => {
  it('カンマ・全角・円記号を許容する', () => {
    expect(parseAmount('1,200')).toBe(1200);
    expect(parseAmount('１２００円')).toBe(1200);
    expect(parseAmount('¥3,000')).toBe(3000);
  });
  it('小数や負数は不正', () => {
    expect(parseAmount('12.5')).toBeNull();
    expect(parseAmount('-100')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });
});

describe('isValidAmount', () => {
  it('正の整数のみ（allowZero で 0 も可）', () => {
    expect(isValidAmount(100)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(0, { allowZero: true })).toBe(true);
    expect(isValidAmount(1.5)).toBe(false);
  });
});
