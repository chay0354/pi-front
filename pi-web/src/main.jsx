import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import {SessionProvider} from './auth/session';
import {AccessibilityProvider} from './a11y/AccessibilityProvider';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessionProvider>
      <AccessibilityProvider>
        <App />
      </AccessibilityProvider>
    </SessionProvider>
  </StrictMode>,
);
