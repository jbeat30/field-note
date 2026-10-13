import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'danger';

export type ToastItem = { id: number; message: string; tone: ToastTone };

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
export const toast = (message: string, tone: ToastTone = 'info') =>
  useToastStore.setState((state) => ({
    toasts: [...state.toasts, { id: nextId++, message, tone }],
  }));

export const resetToastStore = () => useToastStore.setState({ toasts: [] });
