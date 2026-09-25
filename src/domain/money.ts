const yenFormatter = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });

export function formatYen(amount: number): string {
  return yenFormatter.format(amount);
}

/** 金額として妥当か（円単位の整数・0 以上） */
export function isValidAmount(amount: unknown, { allowZero = false } = {}): amount is number {
  return (
    typeof amount === 'number' &&
    Number.isSafeInteger(amount) &&
    (allowZero ? amount >= 0 : amount > 0)
  );
}

/** フォーム入力（"1,200" など）を金額に変換。不正なら null */
export function parseAmount(input: string): number | null {
  const normalized = input.replace(/[,\s，円¥￥]/g, '').replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  if (!/^\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isSafeInteger(n) ? n : null;
}
