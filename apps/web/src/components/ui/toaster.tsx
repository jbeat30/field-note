import { Toast } from 'radix-ui';

import { cn } from '../../lib/cn';
import { useToastStore } from '../../stores/toastStore';

const TONE = {
  info: 'border-border bg-surface text-foreground',
  success: 'border-success bg-success-subtle text-success',
  danger: 'border-danger bg-danger-subtle text-danger',
};

// 앱 틀에 한 번만 배치, 5초 뒤 자동으로 사라지고 스크린 리더가 내용 낭독
export const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts);
  const remove = useToastStore((state) => state.remove);

  return (
    <Toast.Provider duration={5000} label="알림">
      {toasts.map((item) => (
        <Toast.Root
          key={item.id}
          onOpenChange={(open) => !open && remove(item.id)}
          className={cn(
            'flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-card print:hidden',
            TONE[item.tone],
          )}
        >
          <Toast.Description>{item.message}</Toast.Description>
          {item.action && (
            <Toast.Action altText={item.action.label} asChild>
              <button
                type="button"
                onClick={item.action.onClick}
                className="-my-1 min-h-touch shrink-0 rounded-full px-3 font-bold underline-offset-2 hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-foreground"
              >
                {item.action.label}
              </button>
            </Toast.Action>
          )}
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed inset-x-0 bottom-36 z-60 mx-auto flex w-full max-w-md list-none flex-col gap-2 px-4 outline-none md:bottom-20" />
    </Toast.Provider>
  );
};
