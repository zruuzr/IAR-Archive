import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/heritage.css';
import './styles/heritage-books.css';
import { HeritageDemo } from './components/heritage/HeritageDemo';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HeritageDemo />
  </StrictMode>
);
