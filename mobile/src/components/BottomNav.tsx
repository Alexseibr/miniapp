import { NavLink } from 'react-router-dom';
import { Home, Heart, User, PlusSquare } from 'lucide-react';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center text-xs ${isActive ? 'text-primary font-semibold' : 'text-gray-500'}`;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
      <div className="max-w-phone mx-auto grid grid-cols-4 gap-2 py-2">
        <NavLink to="/" className={linkClass}>
          <Home size={22} />
          Домой
        </NavLink>
        <NavLink to="/my-ads" className={linkClass}>
          <PlusSquare size={22} />
          Мои
        </NavLink>
        <NavLink to="/favorites" className={linkClass}>
          <Heart size={22} />
          Избранное
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          <User size={22} />
          Профиль
        </NavLink>
      </div>
    </nav>
  );
}
