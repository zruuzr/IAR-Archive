import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/heritage.css';
import './styles/heritage-books.css';
import './styles/heritage-ui.css';
import './styles/heritage-pdf.css';
import { App } from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found in migration.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
