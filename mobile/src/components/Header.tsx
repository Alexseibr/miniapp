import { Link } from 'react-router-dom';
import { useResolvedCity } from '../hooks/useResolvedCity';

export function Header() {
  const { city } = useResolvedCity();

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div>
        <div className="text-xs text-gray-500">Ваш город</div>
        <div className="text-base font-semibold">{city?.name || 'Загрузка...'}</div>
      </div>
      <Link to="/settings" className="text-sm font-medium text-primary">
        Сменить
      </Link>
    </header>
  );
}
