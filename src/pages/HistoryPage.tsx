import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';

export default function HistoryPage() {
  return (
    <>
      <PageHeader title="履歴" />
      <Placeholder items={['月の切り替え（前月・翌月・年月選択）', '選択月の取引一覧とサマリー']} />
    </>
  );
}
