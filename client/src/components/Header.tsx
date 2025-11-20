import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { currentUser, isLoading, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <Link to="/" className="app-logo">
          Куфор-код
        </Link>
      </div>

      <nav className="app-nav">
        <Link to="/" className="app-nav__link">
          Объявления
        </Link>
        <Link to="/favorites" className="app-nav__link">
          Избранное
        </Link>
        <Link to="/account" className="app-nav__link">
          Личный кабинет
        </Link>
        {currentUser?.role === "admin" && (
          <Link to="/admin" className="app-nav__link">
            Админка
          </Link>
        )}
      </nav>

      <div className="app-header__actions">
        {isLoading ? (
          <span className="app-nav__link muted">Загрузка…</span>
        ) : currentUser ? (
          <div className="app-user">
            <div className="app-user__info">
              <span className="app-user__name">{currentUser.name || currentUser.username}</span>
              {currentUser.phone && <span className="app-user__meta">{currentUser.phone}</span>}
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Выход
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => navigate("/login")}>Войти</Button>
        )}
      </div>
    </header>
  );
}
