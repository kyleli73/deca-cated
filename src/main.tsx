import '@fontsource-variable/inter';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { setupServiceWorker } from './sw.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void setupServiceWorker();
