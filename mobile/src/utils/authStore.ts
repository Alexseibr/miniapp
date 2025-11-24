import { User } from '../types/user';

const TOKEN_KEY = 'kufar-mobile:token';
const USER_KEY = 'kufar-mobile:user';

function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export const authStore = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  saveSession: (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.replace('/auth');
  },
  getUser: getStoredUser
};
