import { create } from 'zustand';

// 화면·임시 상태 전용 (서버에서 받은 데이터를 복사해 두지 않는다)
type UiState = {
  isQuickAddOpen: boolean;
  setQuickAddOpen: (isOpen: boolean) => void;
};

const initialUiState = { isQuickAddOpen: false };

export const useUiStore = create<UiState>((set) => ({
  ...initialUiState,
  setQuickAddOpen: (isOpen) => set({ isQuickAddOpen: isOpen }),
}));

export const resetUiStore = () => useUiStore.setState(initialUiState);
