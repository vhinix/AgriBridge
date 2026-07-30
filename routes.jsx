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
import AlertDetail from './pages/alerts/AlertDetail';
import Alerts from './pages/alerts/Alerts';
import Relay from './pages/alerts/Relay';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth screen renders outside the shell. */}
      <Route path="/login" element={<Login />} />

      {/* Everything else renders inside the persistent shell. */}
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/alerts/:id" element={<AlertDetail />} />
        <Route path="/alerts/:id/relay" element={<Relay />} />
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
