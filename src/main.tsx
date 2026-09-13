// Browser global shims for CommonJS modules (e.g. docx, pngjs)
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).exports = (window as any).exports || {};
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

