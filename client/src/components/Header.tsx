import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const navigate = useNavigate();
  const { currentUser, token, logout, loadingUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

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
        {isAdmin && (
          <Link to="/admin" className="app-nav__link">
            Админка
          </Link>
        )}
      </nav>

      <div className="app-header__actions">
        {loadingUser ? (
          <span className="app-nav__link muted">Загрузка…</span>
        ) : token && currentUser ? (
          <div className="app-user">
            <div className="app-user__info">
              <span className="app-user__name">{currentUser.name || currentUser.username}</span>
              {currentUser.phone && <span className="app-user__meta">{currentUser.phone}</span>}
            </div>
            <button className="app-button" onClick={handleLogout}>
              Выход
            </button>
          </div>
        ) : (
          <button className="app-button" onClick={() => navigate("/login")}>Войти</button>
        )}
      </div>
    </header>
  );
}
