import { useEffect } from 'react';
import { useNavigate, useRoutes } from 'react-router-dom';
import Header from './components/Header';
import { routes } from './router';
import { useTelegramInit } from './telegramInit';

const App = () => {
  const startParam = useTelegramInit();
  const navigate = useNavigate();
  const element = useRoutes(routes);

  useEffect(() => {
    if (!startParam) return;
    switch (startParam) {
      case 'market_all':
        navigate('/market?scope=all', { replace: true });
        break;
      case 'niche_farm':
        navigate('/market?niche=farm', { replace: true });
        break;
      case 'niche_crafts':
        navigate('/market?niche=crafts', { replace: true });
        break;
      case 'season_march8_tulips':
        navigate('/season/march8_tulips', { replace: true });
        break;
      default:
        break;
    }
  }, [navigate, startParam]);

  return (
    <div className="app">
      <Header />
      <main className="container">{element}</main>
    </div>
  );
};

export default App;
