import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initObservability, track } from './observability';
import './theme/tokens.css';

// Observability ДО рендера, чтобы ловить ошибки самой инициализации App.
initObservability();
track('app_opened');

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('#root not found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
