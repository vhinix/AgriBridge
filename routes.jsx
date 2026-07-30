import { Navigate, Route, Routes } from 'react-router-dom';

import AppShell from './src/components/layout/AppShell';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Analytics from './pages/farmers/Analytics';
import Diagnosis from './pages/farmers/Diagnosis';
import Profile from './pages/farmers/Profile';
import Resources from './pages/farmers/Resources';
import Training from './pages/farmers/Training';

// /alerts and /farmers have no page module in the repo yet (pages/alerts/ holds
// only a README, and there is no Farmers page file). They stay on this stub so
// all eight nav destinations resolve; swap in the real pages when they land.
function Pending({ title }) {
  return <h1 className="text-[28px] leading-tight md:text-[34px]">{title}</h1>;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth screen renders outside the shell. */}
      <Route path="/login" element={<Login />} />

      {/* Everything else renders inside the persistent shell. */}
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<Pending title="Alerts" />} />
        <Route path="/farmers" element={<Pending title="Farmers" />} />
        <Route path="/diagnosis" element={<Diagnosis />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/training" element={<Training />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
