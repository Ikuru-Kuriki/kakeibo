import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';

export default function BudgetPage() {
  return (
    <>
      <PageHeader title="来月の予算" />
      <Placeholder
        items={[
          'カテゴリごとの来月予算入力',
          '参考値: 今月の実績（途中）・先月の確定実績・直近3か月平均',
          '前月予算のコピー',
        ]}
      />
    </>
  );
}
