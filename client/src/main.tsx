import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BillingProvider } from './app/BillingProvider';
import { DataProvider } from './app/DataProvider';
import { ToastProvider } from './components/ui/Toast';
import './index.css';
import { registerServiceWorker } from './app/registerSw';
import { LaunchIntro } from './components/LaunchIntro';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/* The intro lives at the app root: it runs once on launch, never on route changes. */}
      <LaunchIntro />
      <ToastProvider>
        <DataProvider>
          <BillingProvider>
            <App />
          </BillingProvider>
        </DataProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
