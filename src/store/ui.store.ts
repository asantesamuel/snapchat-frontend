import { create } from 'zustand';

interface UiState {
  // which modal is currently open, null if none
  activeModal: string | null;
  openModal: (name: string) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}));