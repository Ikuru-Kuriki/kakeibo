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
  memo: string;
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
export type TransactionInput = Pick<Transaction, 'date' | 'amount' | 'type' | 'categoryId' | 'memo'>;
export type CategoryInput = Pick<Category, 'name' | 'type' | 'color'> & Partial<Pick<Category, 'order'>>;
