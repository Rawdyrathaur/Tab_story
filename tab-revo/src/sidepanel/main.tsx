import React from 'react';
import { createRoot } from 'react-dom/client';
import { db } from './db';
import { ThemeProvider } from './context/ThemeProvider';
import { LocalizationProvider } from '../i18n/LocalizationProvider';

declare global {
  interface Window {
    db: typeof db;
  }
}

window.db = db;
// Add this import right here!
import './styles/global.css';
import { App } from './App'; 

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LocalizationProvider><App /></LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
