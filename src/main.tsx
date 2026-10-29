import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserModeProvider } from './context/UserModeContext';
import { initSirenSettings } from './utils/sirenAudio';
import './index.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const MARKER_SVG_URI = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#2563eb" stroke="#ffffff" stroke-width="1.5"/><circle cx="12.5" cy="12.5" r="5" fill="#ffffff"/></svg>');
const SHADOW_SVG_URI = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="41" height="41" viewBox="0 0 41 41"><ellipse cx="13" cy="37" rx="10" ry="3.5" fill="rgba(0,0,0,0.28)"/></svg>');

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: MARKER_SVG_URI,
  iconUrl: MARKER_SVG_URI,
  shadowUrl: SHADOW_SVG_URI,
});

initSirenSettings();

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <UserModeProvider>
          <App />
        </UserModeProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
