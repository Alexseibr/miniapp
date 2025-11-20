import { create } from 'zustand';
import { getMe } from '../api/users';

interface UserState {
  user: any;
  loading: boolean;
  loadMe: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,
  loadMe: async () => {
    set({ loading: true });
    try {
      const data = await getMe();
      set({ user: data, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },
}));
