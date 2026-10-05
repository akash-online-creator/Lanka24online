import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
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
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('PWA Service Worker registered:', reg.scope);
        // Force immediate check for updated service worker
        reg.update();
      }).catch((err) => {
        console.warn('SW registration notice:', err);
      });
    });
  }
} catch (e) {
  console.warn('SW register notice:', e);
}
