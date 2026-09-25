import MonthRecord from '../components/MonthRecord';
import PageHeader from '../components/PageHeader';
import { currentPeriod, formatYearMonthJa } from '../domain/period';
import { useSettings } from '../hooks/useData';

export default function RecordPage() {
  const { monthStartDay } = useSettings();
  const ym = currentPeriod(monthStartDay);
  return (
    <>
      <PageHeader title={`今月の記録（${formatYearMonthJa(ym)}）`} />
      <MonthRecord ym={ym} showPending />
    </>
  );
}
