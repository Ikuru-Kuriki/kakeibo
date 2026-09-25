/**
 * ドメインモデル。UI・DB 実装に依存しない型だけを置く。
 *
 * 規約:
 * - ID は UUID 文字列（将来のクラウド同期で端末間衝突しないため）
 * - 金額は円単位の整数（小数を使わない）。符号は常に正で、収支の向きは type で表す
 * - 日付は "YYYY-MM-DD"、年月は "YYYY-MM" のローカル日付文字列
 * - createdAt / updatedAt / deletedAt は ISO 8601 の日時文字列。削除は論理削除
 */

export type Id = string;
/** "YYYY-MM-DD" */
export type ISODate = string;
/** "YYYY-MM" */
export type YearMonth = string;
/** ISO 8601 日時 */
export type Timestamp = string;

export type EntryType = 'income' | 'expense';

/** 同期・履歴管理用の共通メタデータ */
export interface SyncMeta {
  id: Id;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** 論理削除日時。未削除なら null */
  deletedAt: Timestamp | null;
}

export interface Transaction extends SyncMeta {
  date: ISODate;
  /** 円・正の整数 */
  amount: number;
  type: EntryType;
  categoryId: Id;
  /** 小分類（なければ null） */
  subcategoryId?: Id | null;
  memo: string;
  /** 固定費から確定した取引なら、その固定費の ID */
  recurringId?: Id | null;
  /** 固定費の何月分か */
  recurringMonth?: YearMonth | null;
}

/** 固定費（毎月の定期的な取引）のルール */
export interface RecurringRule extends SyncMeta {
  type: EntryType;
  categoryId: Id;
  /** 小分類（固定費の名前として表示する） */
  subcategoryId: Id;
  /** 目安の金額（確定時に変更できる） */
  amount: number;
  /** 毎月の日（1〜31。その月にない日は月末） */
  dayOfMonth: number;
  /** 開始月 */
  startMonth: YearMonth;
  /** 終了月（なければ null） */
  endMonth: YearMonth | null;
  /** 「今月はなし」にした月 */
  skippedMonths: YearMonth[];
}

export type RecurringRuleInput = Pick<
  RecurringRule,
  'type' | 'categoryId' | 'subcategoryId' | 'amount' | 'dayOfMonth' | 'startMonth' | 'endMonth'
>;

/** 小分類（カテゴリの下の分類。例: 住居 › 家賃） */
export interface Subcategory extends SyncMeta {
  categoryId: Id;
  name: string;
  order: number;
  /** アーカイブ済みは候補に出さないが、過去の取引の表示には使う */
  archived: boolean;
}

export interface Category extends SyncMeta {
  name: string;
  type: EntryType;
  /** グラフ用の色（#RRGGBB） */
  color: string;
  /** 表示順（昇順） */
  order: number;
  /** アーカイブ済みは新規入力の選択肢に出さないが、過去データの表示には使う */
  archived: boolean;
}

export interface Budget extends SyncMeta {
  yearMonth: YearMonth;
  categoryId: Id;
  /** 円・0 以上の整数 */
  amount: number;
}

export interface AppSettings {
  /**
   * 月の開始日（1〜28）。現在はカレンダー月（1）固定で運用するが、
   * 給料日基準などに切り替えられるよう集計ロジックはこの値を参照する。
   */
  monthStartDay: number;
  /** 翌月予算が未設定のとき、前月予算を初期値として提示するか */
  carryOverBudget: boolean;
  /** 最後にバックアップをエクスポートした日時。未実施なら null */
  lastBackupAt: Timestamp | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  monthStartDay: 1,
  carryOverBudget: true,
  lastBackupAt: null,
};

/** 入力用（メタデータはリポジトリ層で付与する） */
export type TransactionInput = Pick<Transaction, 'date' | 'amount' | 'type' | 'categoryId' | 'memo'> &
  Partial<Pick<Transaction, 'subcategoryId'>>;
export type CategoryInput = Pick<Category, 'name' | 'type' | 'color'> & Partial<Pick<Category, 'order'>>;
