import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';
import TopBar from './TopBar';

// Placeholder officer identity. TODO: read this from AuthProvider
// (context/AuthProvider.jsx) once auth exists and drop the defaults.
const PLACEHOLDER_OFFICER = {
  name: 'Dooshima Aker',
  region: 'Benue State ADP · Makurdi zone',
};

// Persistent chrome for every authenticated route. Sidebar and TopBar are the
// same navigation at two widths — CSS picks one, so there is no resize state.
export default function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <TopBar />
      <Sidebar
        officerName={PLACEHOLDER_OFFICER.name}
        officerRegion={PLACEHOLDER_OFFICER.region}
      />

      <main className="w-full min-w-0 max-w-[1240px] flex-1 p-[32px_20px_64px] md:p-[48px_40px_80px]">
        <Outlet />
      </main>
    </div>
  );
}
