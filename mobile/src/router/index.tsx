import { createBrowserRouter } from 'react-router-dom';
import App from '../App';

// Этот роутер можно использовать вместо BrowserRouter обёртки, если нужна data-router API.
export const router = createBrowserRouter([
  {
    path: '/*',
    element: <App />
  }
]);
