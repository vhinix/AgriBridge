import { BrowserRouter } from 'react-router-dom';

import AuthProvider from './context/AuthProvider';
import AppRoutes from './routes';

// AuthProvider sits outside the router so every route, and the AppShell chrome
// around them, resolves useAuth(). It needs no router context of its own.
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
