import { create } from 'zustand';

interface UiState {
  message: string | null;
  type: 'info' | 'error' | 'success';
  showMessage: (message: string, type?: UiState['type']) => void;
  clear: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  message: null,
  type: 'info',
  showMessage(message, type = 'info') {
    set({ message, type });
  },
  clear() {
    set({ message: null });
  }
}));
