import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

// Register PWA Service Worker safely without process.env crashes
try {
  const isProd = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.PROD : true;
  if ('serviceWorker' in navigator && isProd) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  }
} catch (e) {
  console.warn('SW register notice:', e);
}
