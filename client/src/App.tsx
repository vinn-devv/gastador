import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useData } from './app/DataProvider';
import { Shell } from './app/Shell';
import { Banner, ScreenSkeleton } from './components/ui/Bits';
import { Page } from './components/ui/PageHeader';
import Home from './pages/Home';

const Onboarding = lazy(() => import('./pages/Onboarding'));
const Activity = lazy(() => import('./pages/Activity'));
const ExpenseEditor = lazy(() => import('./pages/ExpenseEditor'));
const Snap = lazy(() => import('./pages/Snap'));
const SnapConfirm = lazy(() => import('./pages/SnapConfirm'));
const Insights = lazy(() => import('./pages/Insights'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const Preferences = lazy(() => import('./pages/settings/Preferences'));
const Categories = lazy(() => import('./pages/settings/Categories'));
const Savings = lazy(() => import('./pages/settings/Savings'));
const Backup = lazy(() => import('./pages/settings/Backup'));
const Unlock = lazy(() => import('./pages/settings/Unlock'));
const Privacy = lazy(() => import('./pages/settings/Privacy'));
const About = lazy(() => import('./pages/settings/About'));
const AllowanceList = lazy(() => import('./pages/settings/Allowance').then((m) => ({ default: m.AllowanceList })));
const CycleEditor = lazy(() => import('./pages/settings/Allowance').then((m) => ({ default: m.CycleEditor })));

export default function App() {
  const { world, error } = useData();
  if (error && !world) {
    return (
      <Page className="pt-10">
        <Banner tone="bad" title="Gastador could not open its storage on this device">
          {error.message} If you are using a private window, try a normal one. Nothing has been lost.
        </Banner>
      </Page>
    );
  }
  if (!world) return <ScreenSkeleton />;
  if (!world.settings.onboardingCompleted) {
    return (
      <Suspense fallback={<ScreenSkeleton />}>
        <Onboarding />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="activity" element={<Activity />} />
          <Route path="activity/:id" element={<ExpenseEditor />} />
          <Route path="snap" element={<Snap />} />
          <Route path="snap/confirm" element={<SnapConfirm />} />
          <Route path="insights" element={<Insights />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/preferences" element={<Preferences />} />
          <Route path="settings/allowance" element={<AllowanceList />} />
          <Route path="settings/allowance/:id" element={<CycleEditor />} />
          <Route path="settings/categories" element={<Categories />} />
          <Route path="settings/savings" element={<Savings />} />
          <Route path="settings/backup" element={<Backup />} />
          <Route path="settings/unlock" element={<Unlock />} />
          <Route path="settings/privacy" element={<Privacy />} />
          <Route path="settings/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
