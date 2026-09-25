import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';

export default function SummaryPage() {
  return (
    <>
      <PageHeader title="月次サマリー" />
      <Placeholder
        items={['カテゴリ別支出の円グラフ', 'カテゴリ別支出の棒グラフ', '予算と実績の比較バー']}
      />
    </>
  );
}
