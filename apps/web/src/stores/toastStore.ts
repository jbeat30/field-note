import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'danger';

// 되돌리기 같은 한 번 누르는 동작: 누르면 안내가 닫힘
export type ToastAction = { label: string; onClick: () => void };

export type ToastItem = { id: number; message: string; tone: ToastTone; action?: ToastAction };

type ToastState = {
  toasts: ToastItem[];
  remove: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

// 어느 곳에서든 호출해 잠깐 보였다 사라지는 안내를 띄움
export const toast = (message: string, tone: ToastTone = 'info', action?: ToastAction) =>
  useToastStore.setState((state) => ({
    toasts: [...state.toasts, { id: nextId++, message, tone, action }],
  }));

export const resetToastStore = () => useToastStore.setState({ toasts: [] });
