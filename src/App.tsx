import { HashRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import ExamDetailPage from './pages/ExamDetailPage.tsx';
import ExamPage from './pages/ExamPage.tsx';
import ImportPage from './pages/ImportPage.tsx';
import LibraryPage from './pages/LibraryPage.tsx';
import MistakesPage from './pages/MistakesPage.tsx';
import NewsPage from './pages/NewsPage.tsx';
import ResultsPage from './pages/ResultsPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import StatsPage from './pages/StatsPage.tsx';
import StudyPage from './pages/StudyPage.tsx';

const NAV = [
  { to: '/', label: 'Study', end: true },
  { to: '/mistakes', label: 'Wrong answers' },
  { to: '/stats', label: 'Stats' },
  { to: '/news', label: 'News' },
  { to: '/library', label: 'Library' },
  { to: '/import', label: 'Import' },
  { to: '/settings', label: 'Settings' },
];

function Layout() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" aria-label="deca-cated home">
            <img src="/favicon.svg" alt="" />
            <span>deca-cated</span>
          </NavLink>
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/session/:id" element={<ExamPage />} />
        <Route element={<Layout />}>
          <Route index element={<StudyPage />} />
          <Route path="mistakes" element={<MistakesPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/:id" element={<ExamDetailPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="results/:id" element={<ResultsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
