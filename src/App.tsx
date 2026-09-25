import { useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router';
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

function NavList({ pendingCount, onNavigate }: { pendingCount: number; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2.5 text-base md:py-2 md:text-sm ${
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
  );
}

export default function App() {
  const pendingCount = usePendingRecurring()?.length ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const currentLabel = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.label ?? '家計簿';

  return (
    <div className="min-h-screen md:flex">
      {/* スマホ: 上部のバーとメニュー */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
        <span className="font-bold">
          家計簿 <span className="font-normal text-slate-500">／ {currentLabel}</span>
        </span>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label="メニュー"
          onClick={() => setMenuOpen((v) => !v)}
          className="relative rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        >
          {menuOpen ? '閉じる' : 'メニュー'}
          {!menuOpen && pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 size-3 rounded-full bg-amber-500" aria-hidden />
          )}
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-20 md:hidden">
          <button
            type="button"
            aria-label="メニューを閉じる"
            className="absolute inset-0 bg-slate-900/30"
            onClick={() => setMenuOpen(false)}
          />
          <nav id="mobile-menu" className="absolute inset-x-0 top-[53px] border-b border-slate-200 bg-white p-3 shadow-lg">
            <NavList pendingCount={pendingCount} onNavigate={() => setMenuOpen(false)} />
            <div className="mt-3" onClick={() => setMenuOpen(false)}>
              <BackupStatus />
            </div>
          </nav>
        </div>
      )}

      {/* PC: 左のサイドバー */}
      <nav className="hidden w-52 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <h1 className="mb-6 px-2 text-lg font-bold">家計簿</h1>
        <NavList pendingCount={pendingCount} />
        <div className="sticky bottom-4 mt-auto pt-6">
          <BackupStatus />
        </div>
      </nav>

      <main className="min-w-0 flex-1 px-4 py-5 md:p-8">
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
