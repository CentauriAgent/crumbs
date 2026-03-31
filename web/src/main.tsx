import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { connectNDK } from './lib/ndk';

// Connect to relays on startup
connectNDK().catch(err => console.warn('NDK connect error:', err));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
