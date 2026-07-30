import { Navigate, Route, Routes } from 'react-router-dom';

import AppShell from './src/components/layout/AppShell';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Analytics from './pages/Analytics';
import Diagnosis from './pages/Diagnosis';
import Profile from './pages/Profile';
import Resources from './pages/Resources';
import Training from './pages/Training';
import AddFarmer from './pages/farmers/AddFarmer';
import FarmerDetail from './pages/farmers/FarmerDetail';
import Farmers from './pages/farmers/Farmers';


// /alerts has no page module in the repo yet (pages/alerts/ holds only a
// README), so it stays on this stub to keep the nav item resolvable.
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
        <Route path="/farmers" element={<Farmers />} />
        <Route path="/farmers/new" element={<AddFarmer />} />
        <Route path="/farmers/:id" element={<FarmerDetail />} />
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
