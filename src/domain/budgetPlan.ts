import { averageExpenseByCategory } from './aggregate';
import { addMonths } from './period';
import type { Id, Transaction, YearMonth } from './types';

/**
 * 予算設定画面で参考として並べる月。
 * target = 予算を決める月、current = 今日が属する月。
 */
export interface ReferenceMonths {
  /** target の前月（予算と実績を並べる） */
  prev: YearMonth;
  /** prev が集計途中（今月）か */
  prevInProgress: boolean;
  /** target の前々月の実績 */
  before: YearMonth;
  /** 平均をとる、締まった（集計が終わった）直近 3 か月（古い順） */
  averageMonths: YearMonth[];
}

export function referenceMonths(target: YearMonth, current: YearMonth): ReferenceMonths {
  const prev = addMonths(target, -1);
  const lastClosed = [prev, addMonths(current, -1)].sort()[0]!;
  return {
    prev,
    prevInProgress: prev === current,
    before: addMonths(target, -2),
    averageMonths: [-2, -1, 0].map((d) => addMonths(lastClosed, d)),
  };
}

/**
 * 記録のある月だけでカテゴリ別の月平均支出を求める。
 * 使い始めたばかりで記録のない月を 0 円として平均すると低く出すぎるため除外する。
 */
export function averageOverRecordedMonths(monthly: readonly (readonly Transaction[])[]): {
  average: Map<Id, number>;
  months: number;
} {
  const recorded = monthly.filter((txs) => txs.length > 0);
  return { average: averageExpenseByCategory(recorded), months: recorded.length };
}
