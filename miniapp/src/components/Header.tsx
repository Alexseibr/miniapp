import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  return (
    <header className="container" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Marketplace</h2>
      <nav style={{ display: 'flex', gap: 10 }}>
        <Link to="/market" className={location.pathname.startsWith('/market') ? 'active' : ''}>
          Маркетплейс
        </Link>
        <Link to="/season/march8_tulips" className={location.pathname.includes('season') ? 'active' : ''}>
          Витрина 8 марта
        </Link>
        <Link to="/create">Продать</Link>
      </nav>
    </header>
  );
};

export default Header;
