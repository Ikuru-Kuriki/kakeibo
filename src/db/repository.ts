import type {
  AppSettings,
  Budget,
  Category,
  CategoryInput,
  Id,
  RecurringRule,
  RecurringRuleInput,
  Transaction,
  TransactionInput,
  YearMonth,
} from '../domain/types';
import { DEFAULT_SETTINGS } from '../domain/types';
import { isValidAmount } from '../domain/money';
import { isValidISODate, periodRange } from '../domain/period';
import { occurrenceDate, occurrenceKey, pendingOccurrences, type PendingOccurrence } from '../domain/recurring';
import { db } from './db';
import { newMeta, now } from './meta';

/**
 * データアクセス層。UI は Dexie を直接触らず、必ずこのモジュールを経由する。
 * （将来クラウド同期やストレージ変更をするときの差し替え点）
 * 読み取り関数はすべて論理削除済みのデータを除外する。
 */

const alive = <T extends { deletedAt: string | null }>(row: T) => row.deletedAt === null;

// ---------- Settings ----------

export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get('app');
  const { key: _key, ...rest } = row ?? { key: 'app' as const };
  return { ...DEFAULT_SETTINGS, ...rest };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, key: 'app' });
}

// ---------- Transactions ----------

function validateTransaction(input: TransactionInput): void {
  if (!isValidISODate(input.date)) throw new Error(`不正な日付: ${input.date}`);
  if (!isValidAmount(input.amount)) throw new Error('金額は1円以上の整数で入力してください');
  if (input.type !== 'income' && input.type !== 'expense') throw new Error('不正な種別');
}

export async function listTransactionsInPeriod(ym: YearMonth): Promise<Transaction[]> {
  const { monthStartDay } = await getSettings();
  const { start, endExclusive } = periodRange(ym, monthStartDay);
  const rows = await db.transactions
    .where('date')
    .between(start, endExclusive, true, false)
    .filter(alive)
    .toArray();
  // 日付の新しい順、同日なら登録の新しい順
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  validateTransaction(input);
  const row: Transaction = { ...newMeta(), ...input, memo: input.memo.trim() };
  await db.transactions.add(row);
  return row;
}

export async function updateTransaction(id: Id, patch: Partial<TransactionInput>): Promise<void> {
  const current = await db.transactions.get(id);
  if (!current || !alive(current)) throw new Error('取引が見つかりません');
  const next = { ...current, ...patch };
  validateTransaction(next);
  await db.transactions.put({ ...next, memo: next.memo.trim(), updatedAt: now() });
}

export async function deleteTransaction(id: Id): Promise<void> {
  const t = now();
  await db.transactions.update(id, { deletedAt: t, updatedAt: t });
}

// ---------- Categories ----------

export async function listCategories({ includeArchived = false } = {}): Promise<Category[]> {
  const rows = await db.categories.orderBy('order').filter(alive).toArray();
  return includeArchived ? rows : rows.filter((c) => !c.archived);
}

async function assertUniqueName(name: string, type: Category['type'], exceptId?: Id): Promise<void> {
  const dup = (await db.categories.filter(alive).toArray()).find(
    (c) => c.type === type && c.name === name && c.id !== exceptId,
  );
  if (dup) throw new Error(`「${name}」は既にあります${dup.archived ? '（アーカイブ済み）' : ''}`);
}

export async function addCategory(input: CategoryInput): Promise<Category> {
  const name = input.name.trim();
  if (!name) throw new Error('カテゴリ名を入力してください');
  await assertUniqueName(name, input.type);
  const last = await db.categories.orderBy('order').last();
  const row: Category = {
    ...newMeta(),
    name,
    type: input.type,
    color: input.color,
    order: input.order ?? (last ? last.order + 1 : 0),
    archived: false,
  };
  await db.categories.add(row);
  return row;
}

export async function updateCategory(
  id: Id,
  patch: Partial<Pick<Category, 'name' | 'color' | 'order' | 'archived'>>,
): Promise<void> {
  // 種別（type）は既存取引との整合性が崩れるため変更不可
  const current = await db.categories.get(id);
  if (!current || !alive(current)) throw new Error('カテゴリが見つかりません');
  const next = { ...patch };
  if (next.name !== undefined) {
    next.name = next.name.trim();
    if (!next.name) throw new Error('カテゴリ名を入力してください');
    await assertUniqueName(next.name, current.type, id);
  }
  await db.categories.update(id, { ...next, updatedAt: now() });
}

/** 同じ種別の中で表示順を1つ上（-1）または下（+1）へ動かす */
export async function moveCategory(id: Id, direction: -1 | 1): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const target = await db.categories.get(id);
    if (!target) return;
    const siblings = (await db.categories.orderBy('order').filter(alive).toArray()).filter(
      (c) => c.type === target.type && c.archived === target.archived,
    );
    const index = siblings.findIndex((c) => c.id === id);
    const other = siblings[index + direction];
    if (!other) return;
    const t = now();
    await db.categories.update(target.id, { order: other.order, updatedAt: t });
    await db.categories.update(other.id, { order: target.order, updatedAt: t });
  });
}

/** カテゴリは削除せずアーカイブする（過去の取引の表示を壊さないため） */
export async function archiveCategory(id: Id, archived = true): Promise<void> {
  await updateCategory(id, { archived });
}

// ---------- Budgets ----------

export async function listBudgets(ym: YearMonth): Promise<Budget[]> {
  return db.budgets.where('yearMonth').equals(ym).filter(alive).toArray();
}

/** 予算を設定（upsert）。amount に null を渡すと未設定に戻す */
export async function setBudget(ym: YearMonth, categoryId: Id, amount: number | null): Promise<void> {
  if (amount !== null && !isValidAmount(amount, { allowZero: true })) {
    throw new Error('予算は0円以上の整数で入力してください');
  }
  await db.transaction('rw', db.budgets, async () => {
    const existing = await db.budgets.where({ yearMonth: ym, categoryId }).first();
    const t = now();
    if (amount === null) {
      if (existing && alive(existing)) await db.budgets.update(existing.id, { deletedAt: t, updatedAt: t });
      return;
    }
    if (existing) {
      await db.budgets.update(existing.id, { amount, deletedAt: null, updatedAt: t });
    } else {
      await db.budgets.add({ ...newMeta(), yearMonth: ym, categoryId, amount });
    }
  });
}

/** from 月の予算を to 月へコピー（to 月に既にあるカテゴリは上書きしない） */
export async function copyBudgets(from: YearMonth, to: YearMonth): Promise<number> {
  const source = await listBudgets(from);
  const existing = new Set((await listBudgets(to)).map((b) => b.categoryId));
  const targets = source.filter((b) => !existing.has(b.categoryId));
  for (const b of targets) await setBudget(to, b.categoryId, b.amount);
  return targets.length;
}

// ---------- Recurring（固定費） ----------

function validateRecurring(input: RecurringRuleInput): void {
  if (!input.name.trim()) throw new Error('名前を入力してください');
  if (!isValidAmount(input.amount)) throw new Error('金額は1円以上の整数で入力してください');
  if (!Number.isInteger(input.dayOfMonth) || input.dayOfMonth < 1 || input.dayOfMonth > 31) {
    throw new Error('日は1〜31で入力してください');
  }
  if (!/^\d{4}-\d{2}$/.test(input.startMonth)) throw new Error('開始月を入力してください');
  if (input.endMonth !== null && input.endMonth < input.startMonth) throw new Error('終了月は開始月以降にしてください');
  if (!input.categoryId) throw new Error('カテゴリを選択してください');
}

export async function listRecurring(): Promise<RecurringRule[]> {
  const rows = await db.recurring.filter(alive).toArray();
  return rows.sort((a, b) => a.dayOfMonth - b.dayOfMonth || a.name.localeCompare(b.name));
}

export async function addRecurring(input: RecurringRuleInput): Promise<RecurringRule> {
  validateRecurring(input);
  const row: RecurringRule = { ...newMeta(), ...input, name: input.name.trim(), skippedMonths: [] };
  await db.recurring.add(row);
  return row;
}

export async function updateRecurring(id: Id, patch: Partial<RecurringRuleInput>): Promise<void> {
  const current = await db.recurring.get(id);
  if (!current || !alive(current)) throw new Error('固定費が見つかりません');
  const next = { ...current, ...patch };
  validateRecurring(next);
  await db.recurring.put({ ...next, name: next.name.trim(), updatedAt: now() });
}

/** 固定費を削除する。確定済みの取引はそのまま残る */
export async function deleteRecurring(id: Id): Promise<void> {
  const t = now();
  await db.recurring.update(id, { deletedAt: t, updatedAt: t });
}

/** 確認待ちの固定費。確定済みの取引は、後で削除したものも「対応済み」とみなす */
export async function listPendingRecurring(current: YearMonth): Promise<PendingOccurrence[]> {
  const rules = await listRecurring();
  if (rules.length === 0) return [];
  const confirmed = await db.transactions
    .where('recurringId')
    .anyOf(rules.map((r) => r.id))
    .toArray();
  const handled = new Set(
    confirmed.filter((t) => t.recurringMonth).map((t) => occurrenceKey(t.recurringId!, t.recurringMonth!)),
  );
  return pendingOccurrences(rules, handled, current);
}

/** 確認待ちを確定して取引にする（金額・日付は変更可） */
export async function confirmRecurring(
  ruleId: Id,
  month: YearMonth,
  override: { amount?: number; date?: string } = {},
): Promise<Transaction> {
  return db.transaction('rw', db.transactions, db.recurring, async () => {
    const rule = await db.recurring.get(ruleId);
    if (!rule || !alive(rule)) throw new Error('固定費が見つかりません');
    const done = await db.transactions
      .where('recurringId')
      .equals(ruleId)
      .filter((t) => t.recurringMonth === month)
      .count();
    if (done > 0 || rule.skippedMonths.includes(month)) throw new Error('この月の分は対応済みです');
    const input: TransactionInput = {
      date: override.date ?? occurrenceDate(month, rule.dayOfMonth),
      amount: override.amount ?? rule.amount,
      type: rule.type,
      categoryId: rule.categoryId,
      memo: rule.name,
    };
    validateTransaction(input);
    const row: Transaction = { ...newMeta(), ...input, recurringId: ruleId, recurringMonth: month };
    await db.transactions.add(row);
    return row;
  });
}

/** 確認待ちを「この月はなし」にする */
export async function skipRecurring(ruleId: Id, month: YearMonth): Promise<void> {
  const rule = await db.recurring.get(ruleId);
  if (!rule) return;
  if (rule.skippedMonths.includes(month)) return;
  await db.recurring.update(ruleId, { skippedMonths: [...rule.skippedMonths, month], updatedAt: now() });
}

/** 最も古い取引の日付（取引がなければ null） */
export async function earliestTransactionDate(): Promise<string | null> {
  const first = await db.transactions.orderBy('date').filter(alive).first();
  return first?.date ?? null;
}
