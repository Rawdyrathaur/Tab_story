import React from 'react';
import { createRoot } from 'react-dom/client';
import { db } from './db';
import { ThemeProvider } from './context/ThemeProvider';

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
      <App />
    </ThemeProvider>
  </React.StrictMode>
);