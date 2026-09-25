import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';
import { currentPeriod, formatYearMonthJa } from '../domain/period';
import { useSettings } from '../hooks/useData';

export default function RecordPage() {
  const { monthStartDay } = useSettings();
  return (
    <>
      <PageHeader title={`今月の記録（${formatYearMonthJa(currentPeriod(monthStartDay))}）`} />
      <Placeholder
        items={[
          '収支入力フォーム（日付・種別・金額・カテゴリ・メモ）',
          '今月の取引一覧（編集・削除）',
          '今月の収入・支出・収支の合計',
        ]}
      />
    </>
  );
}
