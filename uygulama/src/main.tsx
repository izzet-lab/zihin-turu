import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Yakinda from './Yakinda';
import './stil.css';

const kok = document.getElementById('kok');
if (!kok) throw new Error('#kok bulunamadı');

createRoot(kok).render(
  <StrictMode>
    <Yakinda />
  </StrictMode>,
);
