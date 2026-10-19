import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/nunito';
import './styles/index.css';
import './i18n';
import { initSession } from './auth/session';
import { App } from './app/App';

// Kayıtlı refresh token varsa oturumu arka planda doğrula.
void initSession();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
