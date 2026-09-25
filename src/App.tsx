import { Navigate, NavLink, Route, Routes } from 'react-router';
import RecordPage from './pages/RecordPage';
import SummaryPage from './pages/SummaryPage';
import BudgetPage from './pages/BudgetPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import RecurringPage from './pages/RecurringPage';
import TrendsPage from './pages/TrendsPage';
import { usePendingRecurring } from './hooks/useData';
import BackupStatus from './components/BackupStatus';

const NAV_ITEMS = [
  { to: '/record', label: '今月の記録' },
  { to: '/summary', label: '月次サマリー' },
  { to: '/trends', label: '推移' },
  { to: '/budget', label: '予算設定' },
  { to: '/history', label: '履歴' },
  { to: '/recurring', label: '固定費' },
  { to: '/settings', label: '設定' },
] as const;

export default function App() {
  const pendingCount = usePendingRecurring()?.length ?? 0;
  return (
    <div className="flex min-h-screen">
      <nav className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
        <h1 className="mb-6 px-2 text-lg font-bold">家計簿</h1>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm ${
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <span className="flex items-center justify-between">
                  {item.label}
                  {item.to === '/recurring' && pendingCount > 0 && (
                    <span
                      className="rounded-full bg-amber-500 px-2 text-xs font-medium text-white"
                      aria-label={`確認待ち${pendingCount}件`}
                    >
                      {pendingCount}
                    </span>
                  )}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sticky bottom-4 mt-auto pt-6">
          <BackupStatus />
        </div>
      </nav>
      <main className="flex-1 p-8">
        <Routes>
          <Route path="/" element={<Navigate to="/record" replace />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/summary/:ym" element={<SummaryPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/budget/:ym" element={<BudgetPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:ym" element={<HistoryPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/record" replace />} />
        </Routes>
      </main>
    </div>
  );
}
