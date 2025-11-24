import React from 'react';
import ReactDOM from 'react-dom/client';
import { Router } from 'wouter';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Router base="/miniapp">
      <App />
    </Router>
  </React.StrictMode>
);
