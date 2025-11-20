import { RouteObject } from 'react-router-dom';
import MarketPage from './pages/MarketPage';
import SeasonPage from './pages/SeasonPage';
import AdViewPage from './pages/AdViewPage';
import CreateAdPage from './pages/CreateAdPage';

export const routes: RouteObject[] = [
  { path: '/', element: <MarketPage /> },
  { path: '/market', element: <MarketPage /> },
  { path: '/season/:seasonCode', element: <SeasonPage /> },
  { path: '/ad/:id', element: <AdViewPage /> },
  { path: '/create', element: <CreateAdPage /> },
];
