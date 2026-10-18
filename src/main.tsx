import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initSirenSettings } from './utils/sirenAudio';

// 1. Core Styles
import './index.css';

// 2. Leaflet Map Styles (Offline Safe - Bundled locally without relying on unpkg.com CDN)
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet Default Marker Icon Fix for Vite Bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Initialize siren audio preloading & event listeners
initSirenSettings();

// Mount Root React Tree
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
// Mobile Viewport Height (100vh) adjustment for Android mobile address bar
if (typeof window !== 'undefined') {
  const setAppHeight = () => {
    document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
  };
  window.addEventListener('resize', setAppHeight);
  setAppHeight();
}

// Enhanced PWA Service Worker Registration & Update Detection
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ PWA Service Worker registered successfully:', registration.scope);

          // නව Update එකක් ඇති විට පරීක්ෂා කිරීම
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('🔄 New app version available. Will activate on next load.');
                  } else {
                    console.log('⚡ Content is cached for offline use.');
                  }
                }
              });
            }
          });

          // පසුබිමෙන් නිතර Update පරීක්ෂා කිරීම
          registration.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration skipped/notice:', err);
        });
    });
  }
} catch (e) {
  console.warn('Service Worker register notice:', e);
}
