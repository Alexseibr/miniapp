import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AUTH_TOKEN_KEY, fetchWithAuth, getAuthToken } from "@/lib/auth";
import type { CurrentUser } from "@/types/user";

const AUTH_HEADER_MESSAGE = "Войдите, чтобы просматривать эту страницу.";

type UserWithRole = CurrentUser & { role?: string };

export default function Header() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(() => getAuthToken());
  const hasToken = Boolean(authToken);

  useEffect(() => {
    const handleStorage = () => {
      setAuthToken(getAuthToken());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!hasToken) {
      setCurrentUser(null);
      return;
    }

    const loadUser = async () => {
      setIsLoading(true);
      try {
        const response = await fetchWithAuth("/api/users/me");
        if (!response.ok) {
          throw new Error(AUTH_HEADER_MESSAGE);
        }
        const data = await response.json();
        setCurrentUser(data);
      } catch (error) {
        console.error(error);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [hasToken]);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setCurrentUser(null);
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
          <Button size="sm" onClick={() => navigate("/account")}>Войти</Button>
        )}
      </div>
    </header>
  );
}
