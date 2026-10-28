import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import AdminScreen from './admin/AdminScreen.jsx';
import {SessionProvider} from './auth/session';
import {AccessibilityProvider} from './a11y/AccessibilityProvider';

const isAdmin = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

createRoot(document.getElementById('root')).render(
  isAdmin ? (
    <StrictMode>
      <AdminScreen />
    </StrictMode>
  ) : (
    <StrictMode>
      <SessionProvider>
        <AccessibilityProvider>
          <App />
        </AccessibilityProvider>
      </SessionProvider>
    </StrictMode>
  ),
);
