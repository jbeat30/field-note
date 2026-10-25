import { create } from 'zustand';

// 화면·임시 상태 전용 (서버에서 받은 데이터 복사 보관 금지)
type UiState = {
  isQuickAddOpen: boolean;
  setQuickAddOpen: (isOpen: boolean) => void;
  isAlertsOpen: boolean;
  setAlertsOpen: (isOpen: boolean) => void;
};

const initialUiState = { isQuickAddOpen: false, isAlertsOpen: false };

export const useUiStore = create<UiState>((set) => ({
  ...initialUiState,
  setQuickAddOpen: (isOpen) => set({ isQuickAddOpen: isOpen }),
  setAlertsOpen: (isOpen) => set({ isAlertsOpen: isOpen }),
}));

export const resetUiStore = () => useUiStore.setState(initialUiState);
