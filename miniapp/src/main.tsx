import React from 'react';
import ReactDOM from 'react-dom/client';

function TestApp() {
  return (
    <div style={{ padding: '20px', fontSize: '24px', color: 'black' }}>
      <h1>Hello from React!</h1>
      <p>If you see this, React is working.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);
