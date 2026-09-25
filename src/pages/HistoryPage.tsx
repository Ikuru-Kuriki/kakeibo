import { Link, useNavigate, useParams } from 'react-router';
import MonthRecord from '../components/MonthRecord';
import MonthSwitcher from '../components/MonthSwitcher';
import PageHeader from '../components/PageHeader';
import { addMonths, currentPeriod } from '../domain/period';
import { useSettings } from '../hooks/useData';

export default function HistoryPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { monthStartDay } = useSettings();
  const current = currentPeriod(monthStartDay);
  // 既定は前月（今月は「今月の記録」画面で扱う）。今月より先は表示しない
  const requested = params.ym && /^\d{4}-\d{2}$/.test(params.ym) ? params.ym : addMonths(current, -1);
  const ym = requested > current ? current : requested;

  return (
    <>
      <PageHeader title="履歴">
        <MonthSwitcher value={ym} max={current} picker onChange={(next) => navigate(`/history/${next}`)} />
      </PageHeader>
      <p className="mb-4 text-sm text-slate-500">
        過去の月の取引を確認・追加・修正できます。
        <Link to={`/summary/${ym}`} className="ml-2 text-slate-700 underline hover:text-slate-900">
          この月のサマリー（グラフ）を見る →
        </Link>
      </p>
      <MonthRecord ym={ym} />
    </>
  );
}
