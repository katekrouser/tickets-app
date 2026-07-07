/**
 * Frontend entry point. Mounts the app: global providers (TanStack Query + auth) wrap the router.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import '@/app/styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
);
