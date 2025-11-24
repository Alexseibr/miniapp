import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ThemeProvider } from './theme/ThemeProvider';
import { AppRouter } from './router';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </React.StrictMode>,
  );
}
